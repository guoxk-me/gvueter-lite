import { createPinia } from 'pinia'
import { ViteSSG } from 'vite-ssg'

import App from './App.vue'
import { i18n } from './i18n'
import { routes } from './router'
// AI modified: load Tailwind CSS once for the Vue application.
import './style.css'

// AI modified: ViteSSG creates app instances for client hydration and static rendering.
export const createApp = ViteSSG(App, { routes, base: import.meta.env.BASE_URL }, ({ app }) => {
  app.use(createPinia())
  // AI modified: install Vue I18n globally for localized app messages.
  app.use(i18n)
})
