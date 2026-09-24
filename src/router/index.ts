import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      // AI modified: Basic is the entry point while Core serves as a controls reference.
      redirect: '/basic',
    },
    {
      path: '/basic',
      name: 'Basic',
      component: () => import('@/pages/BasicPage.vue'),
    },
    {
      path: '/core',
      name: 'Core',
      component: () => import('@/pages/CorePage.vue'),
    },
  ],
})

export default router
