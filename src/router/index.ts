import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import NProgress from 'nprogress'
import { setupLayouts } from 'virtual:generated-layouts'
import DashboardPage from '@/components/dashboard/DashboardPage.vue'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import LoginPage from '@/components/login/LoginPage.vue'
import { useAuth } from '@/composables/use-auth'
import { clearPrivateQueries, queryClient } from '@/composables/query-client'
import { setUnauthorizedAction } from '@/composables/request'
import 'nprogress/nprogress.css'

// AI modified: configure nprogress for route navigation.
NProgress.configure({ showSpinner: false })

const routes: RouteRecordRaw[] = [
  { path: '/', name: 'login', component: LoginPage },
  // AI modified: invitation recipients set credentials before they have a session.
  {
    path: '/invitations/accept',
    name: 'accept-invitation',
    component: () => import('@/components/users/AcceptInvitationPage.vue'),
  },
  {
    path: '/dashboard',
    component: AdminLayout,
    // AI modified: keep one persistent authenticated shell instead of wrapping its child routes again.
    meta: { requiresAuth: true, layout: false },
    // AI modified: authenticated pages share one shell while each page owns only its content.
    children: [
      { path: '', name: 'dashboard', component: DashboardPage },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/components/users/UsersPage.vue'),
      },
      // AI modified: personal model settings use the same authenticated shell as conversations.
      {
        path: 'assistant/settings',
        name: 'assistant-settings',
        component: () => import('@/components/assistant/AssistantSettingsPage.vue'),
      },
      // AI modified: the assistant page shares the authenticated dashboard shell and its drawer state.
      {
        path: 'assistant',
        name: 'assistant',
        component: () => import('@/components/assistant/AssistantPage.vue'),
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
  clearPrivateQueries()
  void router.replace({ name: 'login' })
})

// AI modified: validate the server session before exposing the protected dashboard and show progress feedback.
router.beforeEach(async (to) => {
  NProgress.start()
  const { loadSession } = useAuth()
  let hasSession = false
  try {
    // AI modified: every navigation asks the server, without cached or retried auth decisions.
    queryClient.removeQueries({ queryKey: ['session'] })
    hasSession =
      (await queryClient.fetchQuery({
        queryKey: ['session'],
        queryFn: loadSession,
        retry: false,
      })) !== null
  } catch {
    hasSession = false
  }

  if (to.meta.requiresAuth && !hasSession) return { name: 'login' }
  if (to.name === 'login' && hasSession) return { name: 'dashboard' }
  return true
})

router.afterEach(() => {
  NProgress.done()
})

router.onError(() => {
  NProgress.done()
})
