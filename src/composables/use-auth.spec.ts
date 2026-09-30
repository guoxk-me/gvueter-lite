import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { queryClient } from '@/query-client'
import { RequestError } from '@/http/http-client'
import { clearSession, useAuth } from './use-auth'

const authRequest = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  resetAuthState: vi.fn(),
  clearAuthState: vi.fn(),
}))
vi.mock('@/http/http-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/http/http-client')>()),
  http: authRequest,
}))

describe('useAuth', () => {
  beforeEach(() => {
    clearSession()
    authRequest.resetAuthState.mockClear()
    authRequest.clearAuthState.mockClear()
    authRequest.get.mockReset()
    authRequest.post.mockReset()
  })

  it('loads the application session and clears it after sign-out', async () => {
    const user = { id: 'user-1', email: 'user@example.com', name: 'Example User' }
    authRequest.get.mockResolvedValueOnce(user)
    authRequest.post.mockResolvedValueOnce(null)
    const auth = useAuth()
    await expect(auth.loadSession()).resolves.toEqual(user)
    await auth.signOut()
    expect(auth.currentUser.value).toBeNull()
    expect(authRequest.get).toHaveBeenCalledWith('session', {
      headers: { 'Cache-Control': 'no-cache' },
      signal: undefined,
      silent: true,
      handleUnauthorized: false,
    })
    expect(authRequest.post).toHaveBeenCalledWith('session/logout', undefined, {
      auth: false,
      silent: true,
    })
    expect(authRequest.clearAuthState).toHaveBeenCalledTimes(2)
  })

  it('treats a session 401 as no user but preserves transport failures', async () => {
    authRequest.get.mockRejectedValueOnce(new RequestError(401, 'HTTP_401', 'Unauthorized'))
    authRequest.get.mockRejectedValueOnce(new RequestError(0, 'NETWORK_ERROR', 'Unavailable'))
    await expect(useAuth().loadSession()).resolves.toBeNull()
    await expect(useAuth().loadSession()).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  })

  it('turns login 401 into a credentials error without redirecting', async () => {
    authRequest.post.mockRejectedValueOnce(new RequestError(401, 'HTTP_401', 'Unauthorized'))
    await expect(
      useAuth().signIn({ email: 'wrong@example.com', password: 'wrong', rememberMe: false }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS', status: 401 })
  })

  it('confirms the browser session after login', async () => {
    const user = { id: 'user-2', email: 'signed-in@example.com', name: 'Signed In' }
    authRequest.post.mockResolvedValueOnce(user)
    authRequest.get.mockResolvedValueOnce(user)
    await expect(
      useAuth().signIn({ email: user.email, password: 'test-password', rememberMe: false }),
    ).resolves.toEqual(user)
  })

  it('rejects a successful sign-in response with no browser session', async () => {
    const user = { id: 'user-3', email: 'no-cookie@example.com', name: 'No Cookie' }
    authRequest.post.mockResolvedValueOnce(user)
    authRequest.get.mockRejectedValueOnce(new RequestError(401, 'HTTP_401', 'Unauthorized'))
    await expect(
      useAuth().signIn({ email: user.email, password: 'test-password', rememberMe: false }),
    ).rejects.toMatchObject({ code: 'INVALID_SESSION' })
  })
  it('retains the verified account and private cache during a temporary session outage', async () => {
    const user = { id: 'retained-user', email: 'retained@example.com', name: 'Retained' }
    authRequest.get.mockResolvedValueOnce(user)
    const auth = useAuth()
    await auth.loadSession()
    queryClient.setQueryData(['users'], { rows: [{ id: 'retained-user' }] })
    authRequest.get.mockRejectedValueOnce(new RequestError(503, 'HTTP_503', 'Unavailable'))
    await expect(auth.loadSession()).rejects.toMatchObject({ status: 503 })
    expect(auth.currentUser.value).toEqual(user)
    expect(queryClient.getQueryData(['users'])).toEqual({ rows: [{ id: 'retained-user' }] })
    expect(authRequest.clearAuthState).not.toHaveBeenCalled()
  })
})
