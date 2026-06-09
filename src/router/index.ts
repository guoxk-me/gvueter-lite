import type { RouteRecordRaw } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'

export const routes: RouteRecordRaw[] = setupLayouts([
  {
    path: '/',
    name: 'home',
    component: async () => import('@/pages/Home.vue'),
  },
  {
    path: '/about',
    name: 'about',
    component: async () => import('@/pages/About.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: async () => import('@/pages/NotFound.vue'),
    meta: { layout: 'simple' },
  },
])

const router = createRouter({
  history: import.meta.env.SSR
    ? createMemoryHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default router
