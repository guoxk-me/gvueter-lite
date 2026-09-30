import type { FormSection } from '@/types/form/fields'
import type { UploadFileResult } from '@/types/form/upload'

// AI modified: unit tests for ConfigurableForm verifying active field projection, conditional validation, array repeater, and dirty state.
import { describe, expect, it, vi } from 'vite-plus/test'
import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { z } from 'zod'
import ConfigurableForm from './ConfigurableForm.vue'
import FormUpload from './FormUpload.vue'
import { Select } from '@/components/ui/select'
import { projectActiveValues } from './active-field-values'
import { i18n } from '@/i18n'

describe('ConfigurableForm', () => {
  it('projects active values and strips hidden fields', () => {
    interface TestDraft {
      role: string
      secretCode?: string
      adminNotes?: string
    }

    const sections: FormSection<TestDraft>[] = [
      {
        fields: [
          { name: 'role', label: 'Role', type: 'text' },
          {
            name: 'secretCode',
            label: 'Secret',
            type: 'text',
            visibleWhen: (v) => v.role === 'admin',
            clearOnHide: true,
          },
          {
            name: 'adminNotes',
            label: 'Notes',
            type: 'textarea',
            visibleWhen: (v) => v.role === 'admin',
          },
        ],
      },
    ]

    // When role is member, secretCode and adminNotes should not be projected
    const memberDraft: TestDraft = {
      role: 'member',
      secretCode: 'classified',
      adminNotes: 'note',
    }
    const projectedMember = projectActiveValues(memberDraft, sections)
    expect(projectedMember).toEqual({ role: 'member' })
    // With clearOnHide, draft secretCode was wiped
    expect(memberDraft.secretCode).toBeUndefined()

    // When role is admin, both should be projected
    const adminDraft: TestDraft = {
      role: 'admin',
      secretCode: '123456',
      adminNotes: 'approved',
    }
    const projectedAdmin = projectActiveValues(adminDraft, sections)
    expect(projectedAdmin).toEqual({
      role: 'admin',
      secretCode: '123456',
      adminNotes: 'approved',
    })
  })

  it('strips _uiKey from repeated array items on submission', () => {
    interface TestDraft {
      items: Array<{ name: string; _uiKey?: string }>
    }

    const sections: FormSection<TestDraft, TestDraft['items'][number]>[] = [
      {
        fields: [
          {
            name: 'items',
            label: 'Items',
            type: 'array',
            arrayConfig: {
              fields: [{ name: 'name', label: 'Name', type: 'text' }],
            },
          },
        ],
      },
    ]

    const draft: TestDraft = {
      items: [
        { name: 'Item 1', _uiKey: 'temp-key-1' },
        { name: 'Item 2', _uiKey: 'temp-key-2' },
      ],
    }

    const projected = projectActiveValues(draft, sections)
    expect(projected.items).toEqual([{ name: 'Item 1' }, { name: 'Item 2' }])
  })

  it('validates submission using Zod schema and allows valid submit', async () => {
    const schema = z.object({
      name: z.string().min(2, '姓名至少 2 个字符'),
      email: z.string().email('邮箱格式不正确'),
    })

    const sections: FormSection<object>[] = [
      {
        fields: [
          { name: 'name', label: '姓名', type: 'text' },
          { name: 'email', label: '邮箱', type: 'text' },
        ],
      },
    ]

    const wrapper = mount(ConfigurableForm, {
      props: {
        defaultValues: { name: 'A', email: 'invalid-email' },
        validationSchema: schema,
        sections,
      },
      global: {
        plugins: [i18n],
      },
    })

    // Trigger submit with invalid initial values
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeFalsy()
    expect(wrapper.text()).toContain('姓名至少 2 个字符')

    // Fix values and submit again
    const nameInput = wrapper.find('#input-name')
    await nameInput.setValue('张三')
    const emailInput = wrapper.find('#input-email')
    await emailInput.setValue('zhangsan@example.com')

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')?.[0]).toEqual([
      { name: '张三', email: 'zhangsan@example.com' },
    ])
  })

  it('does not fail validation for a hidden field that would otherwise be required', async () => {
    // When isCompany is false, companyName is hidden and optional; when true, companyName is required.
    const schema = z.discriminatedUnion('isCompany', [
      z.object({
        isCompany: z.literal(false),
      }),
      z.object({
        isCompany: z.literal(true),
        companyName: z.string().min(1, '公司名必填'),
      }),
    ])

    const sections: FormSection<object>[] = [
      {
        fields: [
          { name: 'isCompany', label: '是否企业', type: 'checkbox' },
          {
            name: 'companyName',
            label: '企业名称',
            type: 'text',
            visibleWhen: (draft) => 'isCompany' in draft && draft.isCompany === true,
          },
        ],
      },
    ]

    const wrapper = mount(ConfigurableForm, {
      props: {
        defaultValues: { isCompany: false, companyName: '' },
        validationSchema: schema,
        sections,
      },
      global: {
        plugins: [i18n],
      },
    })

    // Submitting when isCompany is false should pass because companyName is omitted from projection
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeTruthy()
    expect(wrapper.emitted('submit')?.[0]).toEqual([{ isCompany: false }])
  })

  it('tracks isDirty reactively', async () => {
    const sections: FormSection<object>[] = [
      {
        fields: [{ name: 'name', label: '姓名', type: 'text' }],
      },
    ]

    const wrapper = mount(ConfigurableForm, {
      props: {
        defaultValues: { name: '初始姓名' },
        sections,
      },
      global: {
        plugins: [i18n],
      },
    })

    const nameInput = wrapper.find('#input-name')
    await nameInput.setValue('新姓名')
    await nextTick()

    expect(wrapper.emitted('update:isDirty')).toBeTruthy()
    const dirtyEmits = wrapper.emitted('update:isDirty') || []
    expect(dirtyEmits[dirtyEmits.length - 1]).toEqual([true])
  })

  it('submits changes from checkbox and switch controls', async () => {
    const wrapper = mount(ConfigurableForm, {
      props: {
        defaultValues: { isEnabled: false, hasAccess: false },
        sections: [
          {
            fields: [
              { name: 'isEnabled', label: '启用', type: 'checkbox' },
              { name: 'hasAccess', label: '允许访问', type: 'switch' },
            ],
          },
        ],
      },
      global: { plugins: [i18n] },
    })

    await wrapper.find('[role="checkbox"]').trigger('click')
    await wrapper.find('[role="switch"]').trigger('click')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]).toEqual([{ isEnabled: true, hasAccess: true }])
  })

  it('submits checkbox and switch changes in a repeated row', async () => {
    const wrapper = mount(ConfigurableForm, {
      props: {
        defaultValues: { members: [{ isEnabled: false, hasAccess: false }] },
        sections: [
          {
            fields: [
              {
                name: 'members',
                label: '成员',
                type: 'array',
                arrayConfig: {
                  fields: [
                    { name: 'isEnabled', label: '启用', type: 'checkbox' },
                    { name: 'hasAccess', label: '访问', type: 'switch' },
                  ],
                },
              },
            ],
          },
        ],
      },
      global: { plugins: [i18n] },
    })

    await wrapper.find('[role="checkbox"]').trigger('click')
    await wrapper.find('[role="switch"]').trigger('click')
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        members: [{ isEnabled: true, hasAccess: true }],
      },
    ])
  })

  it('waits until every upload field finishes before submission', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const wrapper = mount(ConfigurableForm, {
      props: {
        defaultValues: { firstFile: null, secondFile: null },
        sections: [
          {
            fields: [
              { name: 'firstFile', label: '文件一', type: 'upload' },
              { name: 'secondFile', label: '文件二', type: 'upload' },
            ],
          },
        ],
      },
      global: { plugins: [i18n] },
    })

    const uploads = wrapper.findAllComponents(FormUpload)
    uploads[0]!.vm.$emit('uploadingCountChange', 1)
    uploads[1]!.vm.$emit('uploadingCountChange', 1)
    uploads[0]!.vm.$emit('uploadingCountChange', 0)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeFalsy()
    expect(alertSpy).toHaveBeenCalledWith('请等待文件上传完成')

    uploads[1]!.vm.$emit('uploadingCountChange', 0)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')?.[0]).toEqual([{ firstFile: null, secondFile: null }])
    alertSpy.mockRestore()
  })

  it('waits for a Tiptap image upload before submission', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})
    let finishUpload!: (image: UploadFileResult) => void
    const wrapper = mount(ConfigurableForm, {
      props: {
        defaultValues: { article: null },
        sections: [
          {
            fields: [
              {
                name: 'article',
                label: '正文',
                type: 'tiptap',
                uploadAdapter: {
                  upload: () =>
                    new Promise<UploadFileResult>((resolve) => {
                      finishUpload = resolve
                    }),
                },
              },
            ],
          },
        ],
      },
      global: { plugins: [i18n] },
    })

    await vi.waitFor(() => expect(wrapper.find('input[type="file"]').exists()).toBe(true))

    const imageInput = wrapper.find('input[type="file"]')
    Object.defineProperty(imageInput.element, 'files', {
      configurable: true,
      value: [new File(['image'], 'picture.png', { type: 'image/png' })],
    })
    await imageInput.trigger('change')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeFalsy()
    expect(alertSpy).toHaveBeenCalledWith('请等待文件上传完成')

    finishUpload({ id: 'image-1', name: 'picture.png', url: 'https://example.com/picture.png' })
    await flushPromises()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toHaveLength(1)
    alertSpy.mockRestore()
  })

  it('shows a repeated field error without marking an untouched draft dirty', async () => {
    const wrapper = mount(ConfigurableForm, {
      props: {
        defaultValues: { members: [{ name: '' }] },
        validationSchema: z.object({
          members: z.array(z.object({ name: z.string().min(1, 'Name required') })),
        }),
        sections: [
          {
            fields: [
              {
                name: 'members',
                label: 'Members',
                type: 'array',
                arrayConfig: { fields: [{ name: 'name', label: 'Name', type: 'text' }] },
              },
            ],
          },
        ],
      },
      global: { plugins: [i18n] },
    })

    await nextTick()
    expect(wrapper.emitted('update:isDirty')).toBeFalsy()
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Name required')
    expect(wrapper.emitted('submit')).toBeFalsy()
  })

  it('keeps numeric and boolean select option types in normal and repeated fields', async () => {
    const wrapper = mount(ConfigurableForm, {
      props: {
        defaultValues: { level: 1, members: [{ hasAccess: false }] },
        sections: [
          {
            fields: [
              {
                name: 'level',
                label: 'Level',
                type: 'select',
                options: [
                  { label: 'One', value: 1 },
                  { label: 'Two', value: 2 },
                ],
              },
              {
                name: 'members',
                label: 'Members',
                type: 'array',
                arrayConfig: {
                  fields: [
                    {
                      name: 'hasAccess',
                      label: 'Access',
                      type: 'select',
                      options: [
                        { label: 'No', value: false },
                        { label: 'Yes', value: true },
                      ],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
      global: { plugins: [i18n] },
    })

    const selects = wrapper.findAllComponents(Select)
    selects[0]!.vm.$emit('update:modelValue', '1')
    selects[1]!.vm.$emit('update:modelValue', '1')
    await nextTick()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')?.[0]).toEqual([
      {
        level: 2,
        members: [{ hasAccess: true }],
      },
    ])
  })

  it('does not accept a file when no upload adapter is configured', async () => {
    const wrapper = mount(FormUpload, { global: { plugins: [i18n] } })
    expect(wrapper.text()).toContain(i18n.global.t('form.uploadAdapterRequired'))
    const fileInput = wrapper.find('input[type="file"]')
    expect(fileInput.attributes('disabled')).toBeDefined()
    Object.defineProperty(fileInput.element, 'files', {
      configurable: true,
      value: [new File(['sample'], 'sample.txt', { type: 'text/plain' })],
    })
    await fileInput.trigger('change')
    expect(wrapper.emitted('update:modelValue')).toBeFalsy()
  })
})
