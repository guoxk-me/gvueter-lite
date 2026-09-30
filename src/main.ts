import { createApp } from 'vue'
import { createHead } from '@unhead/vue/client'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import { toast } from 'vue-sonner'
import { http } from '@/http/http-client'
import { queryClient } from '@/query-client'
import { i18n } from './i18n'
import { router } from './router'
import '../styles/theme.css'

// AI modified: install Pinia before routing so navigation can use shared stores.
const head = createHead()
// AI modified: optional HTTP feedback uses current-language copy and the existing Toast host.
http.setErrorAction((error) => {
  const messages: Record<string, string> = {
    NETWORK_ERROR: i18n.global.t('request.network'),
    TIMEOUT: i18n.global.t('request.timeout'),
    HTTP_401: i18n.global.t('request.unauthorized'),
    HTTP_403: i18n.global.t('request.forbidden'),
    HTTP_502: i18n.global.t('request.unavailable'),
    HTTP_503: i18n.global.t('request.unavailable'),
    HTTP_504: i18n.global.t('request.unavailable'),
    INVALID_RESPONSE: i18n.global.t('request.invalidResponse'),
    REQUEST_FAILED: i18n.global.t('request.failed'),
  }
  toast.error(messages[error.code] ?? error.message)
})
// AI modified: install the shared query cache before router guards resolve the server session.
createApp(App)
  .use(createPinia())
  .use(VueQueryPlugin, { queryClient })
  .use(head)
  .use(i18n)
  .use(router)
  .mount('#app')
