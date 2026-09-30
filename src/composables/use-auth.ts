import { sessionApi } from '@/api/session-api'

import type { AuthenticatedUser, LoginCredentials } from '@/types/auth/session'
// AI modified: shared pure types live in the centralized owner directory.

import { readonly, shallowRef } from 'vue'
import { clearPrivateQueries } from '@/query-client'
import { http, RequestError } from '@/http/http-client'

const currentUser = shallowRef<AuthenticatedUser | null>(null)

// AI modified: one invalidation clears both account state and outstanding private requests.
export function clearSession(): void {
  http.clearAuthState()
  currentUser.value = null
  clearPrivateQueries()
}

function isAuthenticatedUser(user: unknown): user is AuthenticatedUser {
  if (typeof user !== 'object' || user === null) {
    return false
  }
  return (
    'id' in user &&
    typeof user.id === 'string' &&
    'email' in user &&
    typeof user.email === 'string' &&
    'name' in user &&
    typeof user.name === 'string'
  )
}

// AI modified: browser cookies remain the source of truth, and failures clear stale private state.
export function useAuth() {
  async function loadSession(signal?: AbortSignal): Promise<AuthenticatedUser | null> {
    try {
      // AI modified: route guards must revalidate the session with the server on each navigation.
      const sessionUser = await sessionApi.readSession(signal)
      if (!isAuthenticatedUser(sessionUser)) {
        throw new RequestError(200, 'INVALID_SESSION', 'Invalid session')
      }
      currentUser.value = sessionUser
      return sessionUser
    } catch (error: unknown) {
      // AI modified: a temporary outage preserves the last verified user and private cache.
      if (error instanceof RequestError && (error.status === 401 || error.businessCode === 401)) {
        clearSession()
        return null
      }
      throw error
    }
  }

  async function signIn(credentials: LoginCredentials): Promise<AuthenticatedUser> {
    // AI modified: starting a login cancels work belonging to the previous session.
    http.resetAuthState()
    let signedInUser: unknown
    try {
      signedInUser = await sessionApi.signIn(credentials)
    } catch (error: unknown) {
      if (error instanceof RequestError && error.status === 401) {
        throw new RequestError(401, 'INVALID_CREDENTIALS', error.message)
      }
      throw error
    }
    if (!isAuthenticatedUser(signedInUser)) {
      throw new RequestError(200, 'INVALID_SESSION', 'Invalid session')
    }

    http.resetAuthState()
    currentUser.value = null
    clearPrivateQueries()

    // AI modified: confirm the browser accepted the session cookie before entering private pages.
    const sessionUser = await loadSession()
    if (sessionUser?.id !== signedInUser.id) {
      clearSession()
      throw new RequestError(200, 'INVALID_SESSION', 'Invalid session')
    }
    clearPrivateQueries()
    return sessionUser
  }

  async function signOut(): Promise<void> {
    // AI modified: stop old requests before the logout can race an in-flight refresh.
    http.clearAuthState()
    try {
      await sessionApi.signOut()
    } catch (error: unknown) {
      http.resetAuthState()
      throw error
    }
    clearSession()
  }

  return { currentUser: readonly(currentUser), loadSession, signIn, signOut }
}
