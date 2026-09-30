import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { CanceledError } from 'axios'
import { clearPrivateQueries, queryClient } from '@/query-client'
import { http, RequestError } from '@/http/http-client'

afterEach(() => {
  queryClient.clear()
  http.setErrorAction(() => {})
})

describe('query failure feedback', () => {
  it('reports only the final failure after one temporary read retry', async () => {
    const onError = vi.fn()
    http.setErrorAction(onError)
    const queryFn = vi.fn().mockRejectedValue(new RequestError(503, 'HTTP_503', 'Unavailable'))
    await expect(
      queryClient.fetchQuery({ queryKey: ['failure'], queryFn, retryDelay: 0 }),
    ).rejects.toMatchObject({ status: 503 })
    expect(queryFn).toHaveBeenCalledTimes(2)
    expect(onError).toHaveBeenCalledOnce()
  })

  it('does not report a recovered retry or a locally handled failure', async () => {
    const onError = vi.fn()
    http.setErrorAction(onError)
    const queryFn = vi
      .fn()
      .mockRejectedValueOnce(new RequestError(0, 'NETWORK_ERROR', 'Offline'))
      .mockResolvedValueOnce('Recovered')
    await expect(
      queryClient.fetchQuery({ queryKey: ['recovered'], queryFn, retryDelay: 0 }),
    ).resolves.toBe('Recovered')
    await expect(
      queryClient.fetchQuery({
        queryKey: ['local'],
        queryFn: () => Promise.reject(new RequestError(400, 'HTTP_400', 'Bad request')),
        meta: { silent: true },
      }),
    ).rejects.toMatchObject({ status: 400 })
    expect(onError).not.toHaveBeenCalled()
  })

  it('does not retry cancellation or invalid request configuration', async () => {
    const onError = vi.fn()
    http.setErrorAction(onError)
    const cancelled = vi.fn().mockRejectedValue(new CanceledError())
    await expect(
      queryClient.fetchQuery({ queryKey: ['cancelled'], queryFn: cancelled }),
    ).rejects.toBeInstanceOf(CanceledError)
    expect(cancelled).toHaveBeenCalledOnce()
    expect(onError).not.toHaveBeenCalled()
    const invalid = vi.fn().mockRejectedValue(new RequestError(0, 'INVALID_PATH', 'Invalid path'))
    await expect(
      queryClient.fetchQuery({ queryKey: ['invalid'], queryFn: invalid }),
    ).rejects.toMatchObject({ code: 'INVALID_PATH' })
    expect(invalid).toHaveBeenCalledOnce()
  })

  it('clears private reads without cancelling the session check that invalidated them', async () => {
    queryClient.setQueryData(['users'], ['private'])
    await expect(
      queryClient.fetchQuery({
        queryKey: ['session'],
        queryFn: async () => {
          clearPrivateQueries()
          return null
        },
        retry: false,
        meta: { silent: true },
      }),
    ).resolves.toBeNull()
    expect(queryClient.getQueryData(['users'])).toBeUndefined()
  })
})
