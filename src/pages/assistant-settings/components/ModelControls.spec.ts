import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vite-plus/test'
import ModelControls from './ModelControls.vue'
import zh from '../../../../locales/zh-CN.yaml'

// AI modified: verify the user's replacement choice and atomic submission through visible controls.
describe('personal model controls', () => {
  function openControls() {
    return mount(ModelControls, {
      props: {
        models: [
          {
            provider: 'deepseek',
            modelId: 'deepseek-chat',
            isEnabled: true,
            isAvailable: true,
            reason: null,
          },
          {
            provider: 'openai',
            modelId: 'gpt-4o-mini',
            isEnabled: true,
            isAvailable: true,
            reason: null,
          },
        ],
        defaultModel: { provider: 'deepseek', modelId: 'deepseek-chat' },
        backupModels: [{ provider: 'openai', modelId: 'gpt-4o-mini' }],
        isBusy: false,
      },
      global: {
        plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zh } })],
        stubs: { SidePanel: { template: '<div v-if="open"><slot /></div>', props: ['open'] } },
      },
    })
  }
  it('requires a replacement before disabling the default and submits its backups together', async () => {
    const wrapper = openControls()
    await wrapper.get('[aria-label="停用模型 deepseek-chat"]').trigger('click')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
    await wrapper.get('select').setValue('openai:gpt-4o-mini')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('change')).toEqual([
      [
        {
          provider: 'deepseek',
          modelId: 'deepseek-chat',
          isEnabled: false,
          defaultModel: { provider: 'openai', modelId: 'gpt-4o-mini' },
          backupModels: [],
        },
      ],
    ])
    expect(wrapper.find('form').exists()).toBe(true)
    await wrapper.setProps({
      models: [
        {
          provider: 'deepseek',
          modelId: 'deepseek-chat',
          isEnabled: false,
          isAvailable: false,
          reason: 'disabled',
        },
        {
          provider: 'openai',
          modelId: 'gpt-4o-mini',
          isEnabled: true,
          isAvailable: true,
          reason: null,
        },
      ],
    })
    expect(wrapper.find('form').exists()).toBe(false)
  })
  it('cannot submit or open switches until server configuration is verified', async () => {
    const wrapper = openControls()
    await wrapper.setProps({ isBusy: true })
    expect(
      wrapper.get('[aria-label="停用模型 deepseek-chat"]').attributes('disabled'),
    ).toBeDefined()
    expect(wrapper.emitted('change')).toBeUndefined()
  })
})
