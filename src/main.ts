import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { i18n } from './i18n'
import router from './router'
// AI modified: load Tailwind CSS once for the Vue application.
import './style.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
// AI modified: install Vue I18n globally for localized app messages.
app.use(i18n)

app.mount('#app')
