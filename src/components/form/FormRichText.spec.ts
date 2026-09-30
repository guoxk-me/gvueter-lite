// AI modified: verify code-block language JSON and required image-upload adapter behavior.
import { describe, expect, it, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import type { JSONContent } from '@tiptap/vue-3'
import FormRichText from './FormRichText.vue'

describe('FormRichText', () => {
  it('stores the selected code language in JSON and restores it', async () => {
    const article: JSONContent = {
      type: 'doc',
      content: [
        {
          type: 'codeBlock',
          attrs: { language: 'javascript' },
          content: [{ type: 'text', text: 'const answer = 42' }],
        },
      ],
    }
    const wrapper = mount(FormRichText, { props: { modelValue: article } })
    await vi.waitFor(() =>
      expect(wrapper.find('select[aria-label="代码块语言"]').exists()).toBe(true),
    )
    // AI modified: shared Lowlight configuration must still highlight editable code.
    await vi.waitFor(() => expect(wrapper.find('.hljs-keyword').text()).toBe('const'))

    await wrapper.find('select[aria-label="代码块语言"]').setValue('python')
    const updates = wrapper.emitted('update:modelValue')
    const updatedArticle = updates?.at(-1)?.[0] as JSONContent
    expect(updatedArticle.content?.[0]?.attrs?.language).toBe('python')

    const restored = mount(FormRichText, { props: { modelValue: updatedArticle } })
    await vi.waitFor(() =>
      expect(restored.find('select[aria-label="代码块语言"]').exists()).toBe(true),
    )
    expect(
      (restored.find('select[aria-label="代码块语言"]').element as HTMLSelectElement).value,
    ).toBe('python')
  })

  it('disables image insertion without an upload adapter', async () => {
    const wrapper = mount(FormRichText)
    await vi.waitFor(() =>
      expect(wrapper.find('button[title="图片上传服务未配置"]').exists()).toBe(true),
    )
    expect(wrapper.find('button[title="图片上传服务未配置"]').attributes('disabled')).toBeDefined()
  })
})
