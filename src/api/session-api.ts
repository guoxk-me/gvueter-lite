import { http } from '@/http/http-client'
import type { LoginCredentials } from '@/types/auth/session'

// AI modified: endpoint calls are separate from trusted session state and validation.
export const sessionApi = {
  readSession(signal?: AbortSignal): Promise<unknown> {
    return http.get('session', {
      headers: { 'Cache-Control': 'no-cache' },
      signal,
      silent: true,
      handleUnauthorized: false,
    })
  },
  signIn(credentials: LoginCredentials): Promise<unknown> {
    return http.post('session/login', credentials, { auth: false, silent: true })
  },
  signOut(): Promise<null> {
    return http.post('session/logout', undefined, { auth: false, silent: true })
  },
}
