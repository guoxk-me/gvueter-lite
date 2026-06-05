import { createRouter, createWebHistory } from 'vue-router'
import { setupLayouts } from 'virtual:generated-layouts'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  // AI modified: route records pass through layout setup so page routes can opt into configured layouts.
  routes: setupLayouts([]),
})

export default router
