import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import { queryClient } from './composables/query-client'
import { i18n } from './i18n'
import { router } from './router'
import '../styles/theme.css'

// AI modified: install Pinia before routing so navigation can use shared stores.
const head = createHead()
// AI modified: install the shared query cache before router guards resolve the server session.
createApp(App)
  .use(createPinia())
  .use(VueQueryPlugin, { queryClient })
  .use(head)
  .use(i18n)
  .use(router)
  .mount('#app')
