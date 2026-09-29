import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { getInitialLocale, i18n, messages, setLocale, syncDocumentLang } from './i18n'

// AI modified: tests covering i18n locale switching, storage synchronization, and language headers.
describe('i18n configuration and locale persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('lang')
  })

  it('provides matching translation keys for all sections in zh-CN and en-US', () => {
    const sections = ['preferences', 'login', 'dashboard'] as const
    for (const section of sections) {
      const zhSection = messages['zh-CN'][section]
      const enSection = messages['en-US'][section]
      expect(zhSection).toBeDefined()
      expect(enSection).toBeDefined()
      const zhKeys = Object.keys(zhSection ?? {}).sort()
      const enKeys = Object.keys(enSection ?? {}).sort()
      expect(zhKeys).toEqual(enKeys)
      expect(zhKeys.length).toBeGreaterThan(0)
    }
  })

  it('translates messages loaded from YAML configuration', () => {
    setLocale('zh-CN')
    expect(i18n.global.t('login.title')).toBe('登录仪表盘')
    expect(i18n.global.t('dashboard.title')).toBe('仪表盘')

    setLocale('en-US')
    expect(i18n.global.t('login.title')).toBe('Sign in to Dashboard')
    expect(i18n.global.t('dashboard.title')).toBe('Dashboard')
  })

  it('syncs document lang attribute correctly', () => {
    syncDocumentLang('en-US')
    expect(document.documentElement.getAttribute('lang')).toBe('en-US')

    syncDocumentLang('zh-CN')
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN')
  })

  it('updates i18n locale, storage, and document when setLocale is called', () => {
    setLocale('en-US')
    expect(i18n.global.locale.value).toBe('en-US')
    expect(localStorage.getItem('gvueter-lite-locale')).toBe('en-US')
    expect(document.documentElement.getAttribute('lang')).toBe('en-US')

    setLocale('zh-CN')
    expect(i18n.global.locale.value).toBe('zh-CN')
    expect(localStorage.getItem('gvueter-lite-locale')).toBe('zh-CN')
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN')
  })

  it('reads initial locale from localStorage if available', () => {
    localStorage.setItem('gvueter-lite-locale', 'en-US')
    expect(getInitialLocale()).toBe('en-US')

    localStorage.setItem('gvueter-lite-locale', 'zh-CN')
    expect(getInitialLocale()).toBe('zh-CN')
  })
})
