import { createI18n } from 'vue-i18n'
import enUS from '@locales/en-US.yaml'
import zhCN from '@locales/zh-CN.yaml'

export type SupportedLocale = 'zh-CN' | 'en-US'

// AI modified: load locale messages from external YAML configurations.
export const messages = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

const STORAGE_KEY = 'gvueter-lite-locale'

export function getInitialLocale(): SupportedLocale {
  if (typeof window === 'undefined') return 'zh-CN'
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'zh-CN' || saved === 'en-US') {
    return saved
  }
  return navigator.language.startsWith('zh') ? 'zh-CN' : 'en-US'
}

export function syncDocumentLang(locale: SupportedLocale): void {
  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('lang', locale)
  }
}

const initialLocale = getInitialLocale()
syncDocumentLang(initialLocale)

// AI modified: configure vue-i18n for login with persistent locale and html[lang] sync.
export const i18n = createI18n({
  legacy: false,
  locale: initialLocale,
  fallbackLocale: 'zh-CN',
  messages,
})

export function setLocale(locale: SupportedLocale): void {
  i18n.global.locale.value = locale
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, locale)
  }
  syncDocumentLang(locale)
}
