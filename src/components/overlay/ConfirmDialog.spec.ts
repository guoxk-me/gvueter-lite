import { describe, expect, it } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import ConfirmDialog from './ConfirmDialog.vue'
import { i18n } from '@/i18n'

describe('ConfirmDialog', () => {
  it('renders title and description when open', () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        open: true,
        title: '确认停用？',
        description: '停用后该用户将无法登录。',
      },
      global: {
        plugins: [i18n],
        stubs: {
          AlertDialogPortal: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('确认停用？')
    expect(wrapper.text()).toContain('停用后该用户将无法登录。')
  })

  it('emits confirm when confirm button is clicked', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        open: true,
        title: '确认停用？',
        description: '停用后该用户将无法登录。',
        confirmText: '立即停用',
      },
      global: {
        plugins: [i18n],
        stubs: {
          AlertDialogPortal: { template: '<div><slot /></div>' },
        },
      },
    })

    const buttons = wrapper.findAll('button')
    const confirmButton = buttons.find((b) => b.text().includes('立即停用'))
    expect(confirmButton).toBeDefined()
    await confirmButton?.trigger('click')

    expect(wrapper.emitted('confirm')).toBeTruthy()
  })

  it('disables buttons and prevents action when loading', async () => {
    const wrapper = mount(ConfirmDialog, {
      props: {
        open: true,
        title: '确认停用？',
        description: '停用后该用户将无法登录。',
        isLoading: true,
      },
      global: {
        plugins: [i18n],
        stubs: {
          AlertDialogPortal: { template: '<div><slot /></div>' },
        },
      },
    })

    const buttons = wrapper.findAll('button')
    for (const button of buttons) {
      expect(button.attributes('disabled')).toBeDefined()
    }
  })
})
