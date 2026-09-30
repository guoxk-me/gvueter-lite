import { describe, expect, it } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import ConnectionFailure from './ConnectionFailure.vue'

const messages = {
  en: {
    request: {
      connectionTitle: 'Unable to connect',
      connectionDescription: 'Please try again.',
      retry: 'Try again',
      retrying: 'Connecting…',
    },
  },
}

describe('initial connection recovery', () => {
  it('offers retry and prevents a second attempt while connecting', async () => {
    const wrapper = mount(ConnectionFailure, {
      props: { isRetrying: false },
      global: { plugins: [createI18n({ legacy: false, locale: 'en', messages })] },
    })
    expect(wrapper.get('[role="alert"]').text()).toContain('Unable to connect')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    await wrapper.setProps({ isRetrying: true })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.get('button').text()).toBe('Connecting…')
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
    wrapper.unmount()
  })
})
