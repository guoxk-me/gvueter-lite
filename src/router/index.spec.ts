import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import NProgress from 'nprogress'
import { router } from './index'

const loadSession = vi.hoisted(() => vi.fn())

vi.mock('@/composables/use-auth', async () => {
  const { shallowRef } = await import('vue')
  const currentUser = shallowRef(null)
  return {
    clearSession: vi.fn(),
    useAuth: () => ({ loadSession, currentUser }),
  }
})

vi.mock('nprogress', () => ({
  default: { configure: vi.fn(), start: vi.fn(), done: vi.fn() },
}))

describe('session navigation guard', () => {
  beforeEach(async () => {
    loadSession.mockReset()
    loadSession.mockResolvedValue(null)
    await router.push('/')
    loadSession.mockReset()
    vi.mocked(NProgress.start).mockClear()
    vi.mocked(NProgress.done).mockClear()
  })

  // AI modified: every feature under the renamed parent must retain its existing session guard.
  it.each(['/main', '/main/users', '/main/assistant', '/main/assistant/settings'])(
    'redirects %s when the session is absent',
    async (path) => {
      loadSession.mockResolvedValue(null)

      await router.push(path)

      expect(router.currentRoute.value.name).toBe('login')
      expect(NProgress.start).toHaveBeenCalled()
      expect(NProgress.done).toHaveBeenCalled()
    },
  )

  it('keeps a direct protected navigation when the session is valid', async () => {
    loadSession.mockResolvedValue({ id: 'user-1', email: 'user@example.com', name: 'User' })

    await router.push('/main')

    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(router.currentRoute.value.path).toBe('/main')
    expect(NProgress.done).toHaveBeenCalled()
  })

  it('opens the renamed home path for an already signed-in user visiting login', async () => {
    loadSession.mockResolvedValue({ id: 'user-1', email: 'user@example.com', name: 'User' })

    await router.replace({ path: '/', force: true })

    expect(router.currentRoute.value.name).toBe('dashboard')
    expect(router.currentRoute.value.path).toBe('/main')
    expect(NProgress.done).toHaveBeenCalled()
  })

  it('keeps the current route and finishes progress when session verification fails', async () => {
    loadSession.mockResolvedValue({ id: 'user-1', email: 'user@example.com', name: 'User' })
    await router.push('/main')
    loadSession.mockRejectedValue(new Error('Service unavailable'))

    await router.push('/main/users')

    // AI modified: respect the current guard's outage behavior while checking the renamed route.
    expect(router.currentRoute.value.path).toBe('/main')
    expect(NProgress.done).toHaveBeenCalled()
  })
})

// AI modified: a fresh router is required to exercise a real failed initial navigation.
it('retries the original destination after first-load session verification fails', async () => {
  vi.resetModules()
  const fresh = await import('./index')
  loadSession.mockRejectedValueOnce(new Error('Network unavailable'))
  await fresh.router.push('/main')
  expect(fresh.router.currentRoute.value.matched).toHaveLength(0)
  expect(fresh.navigationFailure.value).toBe('/main')
  loadSession.mockResolvedValue({ id: 'user-1', email: 'user@example.com', name: 'User' })
  await fresh.retryNavigation()
  expect(fresh.router.currentRoute.value.name).toBe('dashboard')
  expect(fresh.navigationFailure.value).toBeNull()
})
