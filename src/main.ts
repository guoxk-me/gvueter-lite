import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'
import router from './router'
import '../styles/theme.css'

// AI modified: register locale messages before mounting the application.
createApp(App).use(i18n).use(router).mount('#app')
