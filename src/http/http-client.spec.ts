import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import axios, { AxiosError, CanceledError, type AxiosResponse } from 'axios'
import { HttpClient } from '@/http/http-client'

let http: HttpClient

const transport = vi.hoisted(() => ({ request: vi.fn(), create: vi.fn() }))
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  transport.create.mockImplementation(() => ({ request: transport.request }))
  return { ...actual, default: { ...actual.default, create: transport.create } }
})

describe('shared HTTP client', () => {
  beforeEach(() => {
    transport.request.mockReset()
    http = new HttpClient()
    http.setUnauthorizedAction(() => {})
  })

  it('exposes verb methods that return only application data', async () => {
    transport.request.mockResolvedValue({
      status: 200,
      data: { code: 200, message: 'OK', data: { id: 'user-1' }, errors: null },
    })

    await expect(http.get('session')).resolves.toEqual({ id: 'user-1' })
    await expect(http.post('session/login', { email: 'user@example.com' })).resolves.toEqual({
      id: 'user-1',
    })
    await http.put('admin/users/user-1', { name: 'Lin' })
    await http.patch('admin/users/user-1', { name: 'Lee' })
    await http.delete('admin/users/user-1')

    expect(
      transport.request.mock.calls.map(([config]) => [config.method, config.url, config.data]),
    ).toEqual([
      ['GET', 'session', undefined],
      ['POST', 'session/login', { email: 'user@example.com' }],
      ['PUT', 'admin/users/user-1', { name: 'Lin' }],
      ['PATCH', 'admin/users/user-1', { name: 'Lee' }],
      ['DELETE', 'admin/users/user-1', undefined],
    ])
  })

  it('rejects paths that could escape the same-origin API boundary', async () => {
    await expect(http.get('https://example.com/private')).rejects.toMatchObject({
      code: 'INVALID_PATH',
    })
    await expect(http.get('https://app.invalid/api/private')).rejects.toMatchObject({
      code: 'INVALID_PATH',
    })
    await expect(http.get('../private')).rejects.toMatchObject({ code: 'INVALID_PATH' })
    expect(transport.request).not.toHaveBeenCalled()
  })

  it('reports HTTP status consistently and delegates 401 policy to the router', async () => {
    const redirect = vi.fn()
    http.setUnauthorizedAction(redirect)
    const unauthorized = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 401,
      data: { code: 401, message: 'Unauthorized', data: null, errors: null },
    } as AxiosResponse)
    transport.request.mockRejectedValueOnce(unauthorized).mockRejectedValueOnce(unauthorized)

    await expect(http.get('session')).rejects.toMatchObject({ status: 401, code: 'HTTP_401' })
    expect(transport.request.mock.calls.map(([config]) => config.url)).toEqual([
      'session',
      'session/refresh',
    ])
    expect(redirect).toHaveBeenCalledOnce()
  })

  it('refreshes an expired session once and retries the protected request', async () => {
    const unauthorized = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 401,
      data: { code: 401, message: 'Unauthorized', data: null, errors: null },
    } as AxiosResponse)
    transport.request
      .mockRejectedValueOnce(unauthorized)
      .mockResolvedValueOnce({ status: 200, data: { code: 200, message: 'OK', data: null } })
      .mockResolvedValueOnce({
        status: 200,
        data: { code: 200, message: 'OK', data: { id: 'user-1' } },
      })

    await expect(http.get('session')).resolves.toEqual({ id: 'user-1' })
    expect(transport.request.mock.calls.map(([config]) => config.url)).toEqual([
      'session',
      'session/refresh',
      'session',
    ])
  })

  it('does not refresh when login credentials are rejected', async () => {
    transport.request.mockRejectedValueOnce(
      new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 401,
        data: { code: 401, message: 'Unauthorized', data: null, errors: null },
      } as AxiosResponse),
    )
    await expect(http.post('session/login', {})).rejects.toMatchObject({ status: 401 })
    expect(transport.request).toHaveBeenCalledOnce()
  })

  it('shares one refresh across concurrent protected requests', async () => {
    const unauthorized = new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 401,
      data: { code: 401, message: 'Unauthorized', data: null, errors: null },
    } as AxiosResponse)
    let finishRefresh: (() => void) | undefined
    const pendingRefresh = new Promise<unknown>((resolve) => {
      finishRefresh = () => resolve({ status: 200, data: { code: 200, message: 'OK', data: null } })
    })
    let protectedAttempts = 0
    transport.request.mockImplementation(({ url }: { url: string }) => {
      if (url === 'session/refresh') return pendingRefresh
      protectedAttempts += 1
      if (protectedAttempts <= 2) return Promise.reject(unauthorized)
      return Promise.resolve({ status: 200, data: { code: 200, message: 'OK', data: { id: url } } })
    })

    const users = http.get('admin/users')
    const invites = http.get('admin/invitations')
    await vi.waitFor(() => {
      expect(
        transport.request.mock.calls.filter(([config]) => config.url === 'session/refresh'),
      ).toHaveLength(1)
    })
    finishRefresh?.()
    await expect(Promise.all([users, invites])).resolves.toEqual([
      { id: 'admin/users' },
      { id: 'admin/invitations' },
    ])
  })
})

function defer<T>() {
  let resolve!: (response: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((accept, decline) => {
    resolve = accept
    reject = decline
  })
  return { promise, resolve, reject }
}

function httpFailure(status: number): AxiosError {
  return new AxiosError('Failed', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    data: { code: status, message: 'Failure', data: null },
  } as AxiosResponse)
}

const success = { status: 200, data: { code: 200, message: 'OK', data: { id: 'user-1' } } }

describe('HTTP recovery boundaries', () => {
  beforeEach(() => {
    transport.request.mockReset()
    http = new HttpClient()
  })

  it('surfaces refresh outages without signing out and permits a later recovery', async () => {
    const onUnauthorized = vi.fn()
    http.setUnauthorizedAction(onUnauthorized)
    transport.request
      .mockRejectedValueOnce(httpFailure(401))
      .mockRejectedValueOnce(httpFailure(503))
    await expect(http.get('admin/users')).rejects.toMatchObject({ status: 503, code: 'HTTP_503' })
    expect(onUnauthorized).not.toHaveBeenCalled()
    transport.request
      .mockRejectedValueOnce(httpFailure(401))
      .mockResolvedValueOnce(success)
      .mockResolvedValueOnce(success)
    await expect(http.get('admin/users')).resolves.toEqual({ id: 'user-1' })
  })

  it('replays a late old 401 without starting another refresh', async () => {
    const lateResponse = defer<unknown>()
    let lateAttempts = 0
    let firstAttempts = 0
    transport.request.mockImplementation(({ url }: { url: string }) => {
      if (url === 'admin/late' && lateAttempts++ === 0) return lateResponse.promise
      if (url === 'admin/first' && firstAttempts++ === 0) return Promise.reject(httpFailure(401))
      return Promise.resolve(success)
    })
    const late = http.get('admin/late')
    await http.get('admin/first')
    lateResponse.reject(httpFailure(401))
    await expect(late).resolves.toEqual({ id: 'user-1' })
    expect(
      transport.request.mock.calls.filter(([request]) => request.url === 'session/refresh'),
    ).toHaveLength(1)
  })

  it('holds new requests while refreshing and cancels only the individual waiter', async () => {
    const refresh = defer<unknown>()
    let attempts = 0
    transport.request.mockImplementation(({ url }: { url: string }) => {
      if (url === 'session/refresh') return refresh.promise
      if (url === 'admin/first' && attempts++ === 0) return Promise.reject(httpFailure(401))
      return Promise.resolve(success)
    })
    const first = http.get('admin/first')
    await vi.waitFor(() => expect(transport.request).toHaveBeenCalledTimes(2))
    const controller = new AbortController()
    const cancelled = http
      .get('admin/cancelled', { signal: controller.signal })
      .catch((error: unknown) => error)
    const second = http.get('admin/second')
    expect(transport.request).toHaveBeenCalledTimes(2)
    controller.abort()
    expect(axios.isCancel(await cancelled)).toBe(true)
    refresh.resolve(success)
    await expect(Promise.all([first, second])).resolves.toHaveLength(2)
    expect(
      transport.request.mock.calls.some(([request]) => request.url === 'admin/cancelled'),
    ).toBe(false)
  })

  it('aborts old transport and rejects late responses after a session switch', async () => {
    const oldResponse = defer<unknown>()
    transport.request.mockReturnValueOnce(oldResponse.promise)
    const oldRequest = http.get('admin/users').catch((error: unknown) => error)
    const oldSignal = transport.request.mock.calls[0]?.[0].signal as AbortSignal
    http.resetAuthState()
    expect(oldSignal.aborted).toBe(true)
    expect(axios.isCancel(await oldRequest)).toBe(true)
    oldResponse.resolve(success)
    transport.request.mockResolvedValueOnce(success)
    await expect(http.get('admin/users')).resolves.toEqual({ id: 'user-1' })
  })

  it('ignores an old refresh completion while a new session is refreshing', async () => {
    const oldRefresh = defer<unknown>()
    const newRefresh = defer<unknown>()
    transport.request
      .mockRejectedValueOnce(httpFailure(401))
      .mockReturnValueOnce(oldRefresh.promise)
    const old = http.get('admin/old').catch((error: unknown) => error)
    await vi.waitFor(() => expect(transport.request).toHaveBeenCalledTimes(2))
    http.resetAuthState()
    expect(axios.isCancel(await old)).toBe(true)
    transport.request
      .mockRejectedValueOnce(httpFailure(401))
      .mockReturnValueOnce(newRefresh.promise)
    const next = http.get('admin/new')
    await vi.waitFor(() => expect(transport.request).toHaveBeenCalledTimes(4))
    oldRefresh.resolve(success)
    await Promise.resolve()
    const waiting = http.get('admin/waiting')
    expect(transport.request).toHaveBeenCalledTimes(4)
    transport.request.mockResolvedValue(success)
    newRefresh.resolve(success)
    await expect(Promise.all([next, waiting])).resolves.toHaveLength(2)
  })

  it('locks invalid refresh sessions, handles expiry once and unlocks after login reset', async () => {
    const onUnauthorized = vi.fn()
    http.setUnauthorizedAction(onUnauthorized)
    transport.request
      .mockRejectedValueOnce(httpFailure(401))
      .mockRejectedValueOnce(httpFailure(401))
    await expect(http.get('admin/users')).rejects.toMatchObject({ status: 401 })
    await expect(http.get('admin/users')).rejects.toMatchObject({ status: 401 })
    expect(transport.request).toHaveBeenCalledTimes(2)
    expect(onUnauthorized).toHaveBeenCalledOnce()
    transport.request.mockResolvedValue(success)
    await expect(http.post('session/login')).resolves.toEqual({ id: 'user-1' })
    http.resetAuthState()
    await expect(http.get('admin/users')).resolves.toEqual({ id: 'user-1' })
  })

  it('stops after one replay and does not refresh public or explicitly unmanaged requests', async () => {
    const onUnauthorized = vi.fn()
    http.setUnauthorizedAction(onUnauthorized)
    transport.request
      .mockRejectedValueOnce(httpFailure(401))
      .mockResolvedValueOnce(success)
      .mockRejectedValueOnce(httpFailure(401))
    await expect(http.get('admin/users')).rejects.toMatchObject({ status: 401 })
    expect(transport.request).toHaveBeenCalledTimes(3)
    http.resetAuthState()
    onUnauthorized.mockClear()
    transport.request.mockRejectedValue(httpFailure(401))
    await expect(http.get('session/login?next=dashboard')).rejects.toMatchObject({ status: 401 })
    await expect(http.post('invitations/accept', {}, { auth: false })).rejects.toMatchObject({
      status: 401,
    })
    await expect(http.get('admin/users', { auth: false })).rejects.toMatchObject({ status: 401 })
    expect(onUnauthorized).not.toHaveBeenCalled()
    expect(transport.request).toHaveBeenCalledTimes(6)
  })

  it('preserves errors and cancellation while honoring silent and callback failures', async () => {
    const onError = vi.fn().mockRejectedValue(new Error('UI callback failed'))
    http.setErrorAction(onError)
    const cause = new AxiosError('Timeout', 'ETIMEDOUT')
    transport.request.mockRejectedValue(cause)
    await expect(http.get('admin/users', { silent: true })).rejects.toMatchObject({
      code: 'TIMEOUT',
      cause,
    })
    expect(onError).not.toHaveBeenCalled()
    await expect(http.get('admin/users')).rejects.toMatchObject({ code: 'TIMEOUT' })
    expect(onError).toHaveBeenCalledOnce()
    const cancelled = new CanceledError('Cancelled')
    transport.request.mockRejectedValue(cancelled)
    await expect(http.get('admin/users')).rejects.toBe(cancelled)
    expect(onError).toHaveBeenCalledOnce()
  })

  it('reads backend message arrays and preserves business codes', async () => {
    transport.request.mockResolvedValue({
      status: 200,
      data: { code: 422, message: ['Email required', 'Name required'], data: null },
    })
    await expect(http.get('admin/users')).rejects.toMatchObject({
      status: 200,
      code: 'API_422',
      businessCode: 422,
      message: 'Email required; Name required',
    })
    transport.request.mockRejectedValue(
      new AxiosError('Bad request', 'ERR_BAD_REQUEST', undefined, undefined, {
        status: 400,
        data: { message: ['Email required', 'Name required'] },
      } as AxiosResponse),
    )
    await expect(http.get('admin/users')).rejects.toMatchObject({
      message: 'Email required; Name required',
    })
  })

  it('returns full raw responses, including 204, and still enforces recovery and paths', async () => {
    const rawResponse = { status: 204, data: '', headers: { 'x-request-id': 'export-1' } }
    transport.request
      .mockRejectedValueOnce(httpFailure(401))
      .mockResolvedValueOnce(success)
      .mockResolvedValueOnce(rawResponse)
    await expect(
      http.requestRaw({ method: 'GET', url: 'admin/export', responseType: 'blob' }),
    ).resolves.toBe(rawResponse)
    await expect(
      http.requestRaw({ method: 'GET', url: 'https://example.com' }),
    ).rejects.toMatchObject({ code: 'INVALID_PATH' })
    expect(transport.request).toHaveBeenCalledTimes(3)
  })

  it('rejects malformed refresh responses instead of replaying with an unconfirmed session', async () => {
    transport.request
      .mockRejectedValueOnce(httpFailure(401))
      .mockResolvedValueOnce({ status: 200, data: '<html>offline</html>' })
    await expect(http.get('admin/users')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
    expect(transport.request).toHaveBeenCalledTimes(2)
  })

  it('copies headers and preserves the original write body when replaying', async () => {
    const headers = { 'X-Example': 'kept' }
    const body = { name: 'Updated' }
    transport.request
      .mockImplementationOnce((config: AxiosResponse['config']) => {
        config.data = '{"name":"serialized"}'
        return Promise.reject(httpFailure(401))
      })
      .mockResolvedValueOnce(success)
      .mockResolvedValueOnce(success)
    await http.post('admin/users', body, { headers })
    expect(transport.request.mock.calls[2]?.[0].data).toBe(body)
    expect(headers).toEqual({ 'X-Example': 'kept' })
  })
})
