import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vite-plus/test'
import PreferenceControls from './PreferenceControls.vue'
import { i18n } from '@/i18n'

// AI modified: unit tests for PreferenceControls using @vue/test-utils.
describe('PreferenceControls', () => {
  it('renders theme and locale buttons and handles clicks', async () => {
    const wrapper = mount(PreferenceControls, {
      props: {
        themeMode: 'light',
        locale: 'zh-CN',
      },
      global: {
        plugins: [i18n],
      },
    })

    const buttons = wrapper.findAll('button')
    const themeButton = buttons.at(0)
    const languageButton = buttons.at(1)
    expect(buttons).toHaveLength(2)
    expect(themeButton).toBeDefined()
    expect(languageButton).toBeDefined()

    await themeButton!.trigger('click')
    expect(wrapper.emitted('cycle-theme')).toHaveLength(1)

    await languageButton!.trigger('click')
    expect(wrapper.emitted('toggle-language')).toHaveLength(1)
  })

  it('renders dark mode and english labels correctly', () => {
    const wrapper = mount(PreferenceControls, {
      props: {
        themeMode: 'dark',
        locale: 'en-US',
      },
      global: {
        plugins: [i18n],
      },
    })

    expect(wrapper.text()).toContain('EN')
    const themeButton = wrapper.findAll('button').at(0)
    expect(themeButton?.find('.lucide-moon').exists()).toBe(true)
  })
})
