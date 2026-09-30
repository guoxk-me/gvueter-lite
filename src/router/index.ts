import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import { readonly, shallowRef } from 'vue'
import axios from 'axios'
import { isCancelledError } from '@tanstack/vue-query'
import { setupLayouts } from 'virtual:generated-layouts'
// AI modified: route pages and reusable layouts have separate directory ownership.
// AI modified: routes consume page entries; their supporting components and composables remain private.
import DashboardPage from '@/pages/dashboard/index.vue'
import DefaultLayout from '@/layouts/DefaultLayout.vue'
import LoginPage from '@/pages/login/index.vue'
import { clearSession, useAuth } from '@/composables/use-auth'
import { queryClient } from '@/query-client'
import { http, setUnauthorizedAction } from '@/http/http-client'
import 'nprogress/nprogress.css'

// AI modified: configure nprogress for route navigation.
NProgress.configure({ showSpinner: false })

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'login', component: LoginPage },
  // AI modified: invitation recipients set credentials before they have a session.
  {
    path: '/invitations/accept',
    name: 'accept-invitation',
    component: () => import('@/pages/accept-invitation/index.vue'),
  },
  {
    // AI modified: use a neutral parent path for all signed-in features, not just the dashboard.
    path: '/main',
    component: DefaultLayout,
    // AI modified: keep one persistent authenticated shell instead of wrapping its child routes again.
    meta: { requiresAuth: true, layout: false },
    // AI modified: authenticated pages share one shell while each page owns only its content.
    children: [
      { path: '', name: 'dashboard', component: DashboardPage },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/pages/users/index.vue'),
      },
      // AI modified: personal model settings use the same authenticated shell as conversations.
      {
        path: 'assistant/settings',
        name: 'assistant-settings',
        component: () => import('@/pages/assistant-settings/index.vue'),
      },
      // AI modified: the assistant page shares the default shell and its drawer state.
      {
        path: 'assistant',
        name: 'assistant',
        component: () => import('@/pages/assistant/index.vue'),
      },
    ],
  },
]

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // AI modified: the public pages share their background through the generated layout route.
  routes: setupLayouts(routes),
})

// AI modified: route metadata decides whether a 401 redirects, so public flows can explain errors locally.
setUnauthorizedAction(() => {
  if (!router.currentRoute.value.meta.requiresAuth) return
  clearSession()
  void router.replace({ name: 'login' })
})

// AI modified: first-load failures have a retry surface; later failures preserve the mounted page.
const failedNavigation = shallowRef<string | null>(null)
const isRetryingNavigation = shallowRef(false)
export const navigationFailure = readonly(failedNavigation)
export const isNavigationRetrying = readonly(isRetryingNavigation)

export async function retryNavigation(): Promise<void> {
  if (!failedNavigation.value || isRetryingNavigation.value) return
  isRetryingNavigation.value = true
  try {
    await router.replace(failedNavigation.value)
  } finally {
    isRetryingNavigation.value = false
  }
}

router.beforeEach(async (to, from) => {
  NProgress.start()
  // Public invitations must remain available without a session-service dependency.
  if (to.name === 'accept-invitation') return true
  const { loadSession } = useAuth()
  let hasSession = false
  try {
    queryClient.removeQueries({ queryKey: ['session'] })
    hasSession =
      (await queryClient.fetchQuery({
        queryKey: ['session'],
        queryFn: ({ signal }) => loadSession(signal),
        retry: false,
        meta: { silent: true },
      })) !== null
  } catch (error: unknown) {
    if (!axios.isCancel(error) && !isCancelledError(error)) {
      if (from.matched.length === 0) failedNavigation.value = to.fullPath
      else http.reportError(error)
    }
    return false
  }

  failedNavigation.value = null
  if (to.meta.requiresAuth && !hasSession) return { name: 'login' }
  if (to.name === 'login' && hasSession) return { name: 'dashboard' }
  return true
})

router.afterEach((_to, _from, failure) => {
  if (!failure) failedNavigation.value = null
  NProgress.done()
})

router.onError(() => {
  NProgress.done()
})
