import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { nextTick } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'
import { i18n } from '../i18n'
import { routes } from '../router'

function appTestRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes,
  })
}

describe('App', () => {
  let router: ReturnType<typeof appTestRouter>

  beforeEach(async () => {
    localStorage.clear()
    document.documentElement.className = ''
    i18n.global.locale.value = 'en-US'
    router = appTestRouter()
  })

  it('renders the app title from i18n messages', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [i18n, router],
      },
    })

    await router.isReady()
    expect(wrapper.text()).toContain('You did it!')
  })

  it('loads app messages from YAML locale files', () => {
    expect(i18n.global.availableLocales).toEqual(['en-US', 'zh-CN'])
    expect(i18n.global.t('app.title')).toBe('You did it!')
  })

  it('toggles the persisted document color mode', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [i18n, router],
      },
    })

    await router.isReady()
    await wrapper.get('[data-test="color-mode-switch"]').trigger('click')
    await nextTick()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('gvueter-lite-color-mode')).toBe('dark')

    await wrapper.get('[data-test="color-mode-switch"]').trigger('click')
    await nextTick()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('gvueter-lite-color-mode')).toBe('light')
  })

  it('switches and persists the app language', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [i18n, router],
      },
    })

    await router.isReady()

    // AI modified: single icon button cycles through languages from the active locale.
    await wrapper.get('[data-test="language-switch"]').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('完成了！')
    expect(localStorage.getItem('gvueter-lite-language')).toBe('zh-CN')

    // AI modified: second click returns to the fallback English locale.
    await wrapper.get('[data-test="language-switch"]').trigger('click')
    await nextTick()

    expect(wrapper.text()).toContain('You did it!')
    expect(localStorage.getItem('gvueter-lite-language')).toBe('en-US')
  })

  it('restores the persisted app language', async () => {
    localStorage.setItem('gvueter-lite-language', 'zh-CN')

    vi.resetModules()
    const { i18n: savedLanguageI18n } = await import('../i18n')
    const { default: SavedLanguageApp } = await import('../App.vue')

    const router = appTestRouter()
    const wrapper = mount(SavedLanguageApp, {
      global: {
        plugins: [savedLanguageI18n, router],
      },
    })

    await router.isReady()
    expect(wrapper.text()).toContain('完成了！')
  })
})
