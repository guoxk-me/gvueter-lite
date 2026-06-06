import { createMemoryHistory, createRouter, createWebHistory } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'
import type { RouteRecordRaw } from 'vue-router'

// AI modified: expose shared routes so ViteSSG can create its own router per render.
export const routes: RouteRecordRaw[] = setupLayouts([])

const router = createRouter({
  // AI modified: avoid window-backed history when this module is imported during SSG.
  history: import.meta.env.SSR
    ? createMemoryHistory(import.meta.env.BASE_URL)
    : createWebHistory(import.meta.env.BASE_URL),
  // AI modified: route records pass through layout setup so page routes can opt into configured layouts.
  routes,
})

export default router
