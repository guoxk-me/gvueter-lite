import messages from '@intlify/unplugin-vue-i18n/messages'
import { createI18n } from 'vue-i18n'

const defaultLocale = 'en-US'

export const languageStorageKey = 'gvueter-lite-language'
export const supportedLocales = ['en-US', 'zh-CN'] as const
export type SupportedLocale = (typeof supportedLocales)[number]
const supportedLocaleValues: readonly string[] = supportedLocales

export function isSupportedLocale(candidateLocale: string): candidateLocale is SupportedLocale {
  return supportedLocaleValues.includes(candidateLocale)
}

function initialAppLocale(): SupportedLocale {
  if (typeof localStorage === 'undefined') {
    return defaultLocale
  }

  const savedLanguage = localStorage.getItem(languageStorageKey)
  return savedLanguage !== null && isSupportedLocale(savedLanguage) ? savedLanguage : defaultLocale
}

// AI modified: use precompiled locale resources from @intlify/unplugin-vue-i18n.
export const i18n = createI18n({
  legacy: false,
  // AI modified: initialize i18n with the persisted app language before components render.
  locale: initialAppLocale(),
  fallbackLocale: defaultLocale,
  messages,
})
