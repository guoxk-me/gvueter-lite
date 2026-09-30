import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import SidePanel from './SidePanel.vue'
import { Sheet } from '@/components/ui/sheet'
import { i18n } from '@/i18n'

describe('SidePanel', () => {
  beforeEach(() => {
    i18n.global.locale.value = 'zh-CN'
  })

  it('renders title and slot content when open', () => {
    const wrapper = mount(SidePanel, {
      props: {
        open: true,
        title: '用户详情',
        description: '查看或修改信息',
      },
      slots: {
        default: '<div id="panel-content">内容区域</div>',
      },
      global: {
        plugins: [i18n],
        stubs: {
          DialogPortal: { template: '<div><slot /></div>' },
          AlertDialogPortal: { template: '<div><slot /></div>' },
        },
      },
    })

    expect(wrapper.text()).toContain('用户详情')
    expect(wrapper.text()).toContain('查看或修改信息')
    expect(wrapper.find('#panel-content').exists()).toBe(true)
  })

  it('closes directly when not dirty', async () => {
    const wrapper = mount(SidePanel, {
      props: {
        open: true,
        title: '编辑',
        isDirty: false,
      },
      slots: {
        footer: '<button id="close-btn" @click="close">关闭</button>',
      },
      global: {
        plugins: [i18n],
        stubs: {
          DialogPortal: { template: '<div><slot /></div>' },
          AlertDialogPortal: { template: '<div><slot /></div>' },
        },
      },
    })

    const closeBtn = wrapper.find('#close-btn')
    await closeBtn.trigger('click')

    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('prompts discard confirmation when dirty', async () => {
    const wrapper = mount(SidePanel, {
      props: {
        open: true,
        title: '编辑',
        isDirty: true,
      },
      global: {
        plugins: [i18n],
        stubs: {
          DialogPortal: { template: '<div><slot /></div>' },
          AlertDialogPortal: { template: '<div><slot /></div>' },
        },
      },
    })

    // Simulate Sheet triggering update:open(false)
    const sheet = wrapper.findComponent(Sheet)
    sheet.vm.$emit('update:open', false)
    await nextTick()

    // Should not emit close yet
    expect(wrapper.emitted('close')).toBeFalsy()

    // Confirm dialog should now be open
    expect(wrapper.text()).toContain('放弃修改')
  })
})
