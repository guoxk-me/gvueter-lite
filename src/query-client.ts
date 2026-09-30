import { QueryCache, QueryClient } from '@tanstack/vue-query'
import { http, RequestError } from '@/http/http-client'

// AI modified: only temporary read failures retry; writes and session checks opt out.
export const queryClient = new QueryClient({
  // AI modified: Query reports final failures after retry; queryFn requests use silent: true.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (query.meta?.silent !== true && !(error instanceof RequestError && error.status === 401)) {
        http.reportError(error)
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: (failureCount, error) =>
        failureCount < 1 &&
        error instanceof RequestError &&
        (['NETWORK_ERROR', 'TIMEOUT'].includes(error.code) ||
          [502, 503, 504].includes(error.status)),
    },
    mutations: { retry: false, gcTime: 0 },
  },
})

export function clearPrivateQueries(): void {
  // AI modified: let the active session check finish returning null instead of cancelling itself.
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
  queryClient.getMutationCache().clear()
}
