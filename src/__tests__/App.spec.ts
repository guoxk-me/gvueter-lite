import { mount } from '@vue/test-utils'

import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { nextTick } from 'vue'
import App from '../App.vue'
import { i18n } from '../i18n'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.className = ''
    i18n.global.locale.value = 'en-US'
  })

  it('renders the app title from i18n messages', () => {
    const wrapper = mount(App, {
      global: {
        plugins: [i18n],
      },
    })

    expect(wrapper.text()).toContain('You did it!')
  })

  it('loads app messages from YAML locale files', () => {
    expect(i18n.global.availableLocales).toEqual(['en-US', 'zh-CN'])
    expect(i18n.global.t('app.title')).toBe('You did it!')
  })

  it('toggles the persisted document color mode', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [i18n],
      },
    })

    await wrapper.get('[data-test="color-mode-toggle"]').trigger('click')
    await nextTick()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('gvueter-lite-color-mode')).toBe('dark')

    await wrapper.get('[data-test="color-mode-toggle"]').trigger('click')
    await nextTick()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('gvueter-lite-color-mode')).toBe('light')
  })

  it('switches and persists the app language', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [i18n],
      },
    })

    await wrapper.get('[data-test="language-switch-zh-CN"]').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('完成了！')
    expect(localStorage.getItem('gvueter-lite-language')).toBe('zh-CN')

    await wrapper.get('[data-test="language-switch-en-US"]').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('You did it!')
    expect(localStorage.getItem('gvueter-lite-language')).toBe('en-US')
  })

  it('restores the persisted app language', async () => {
    localStorage.setItem('gvueter-lite-language', 'zh-CN')

    vi.resetModules()
    const { i18n: savedLanguageI18n } = await import('../i18n')
    const { default: SavedLanguageApp } = await import('../App.vue')

    const wrapper = mount(SavedLanguageApp, {
      global: {
        plugins: [savedLanguageI18n],
      },
    })

    expect(wrapper.text()).toContain('完成了！')
  })
})
