import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import UsersPage from '../index.vue'
import { RequestError } from '@/http/http-client'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { queryClient } from '@/query-client'
import { i18n } from '@/i18n'

const api = vi.hoisted(() => ({
  fetchUsers: vi.fn(),
  fetchInvitations: vi.fn(),
  createUser: vi.fn(),
  updateUserName: vi.fn(),
  updateUserStatus: vi.fn(),
  batchUpdateUserStatus: vi.fn(),
  inviteUser: vi.fn(),
  resendInvitation: vi.fn(),
  revokeInvitation: vi.fn(),
}))

vi.mock('@/api/users-api', () => ({
  usersApi: api,
}))

// AI modified: the user page tests consume a server boundary instead of mutable sample records.
describe('UsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    queryClient.clear()
    i18n.global.locale.value = 'zh-CN'
    api.fetchUsers.mockResolvedValue({
      rows: [
        {
          id: 'user-1',
          name: '林沐言',
          email: 'lin@example.com',
          isEmailVerified: false,
          status: 'active',
          createdAt: '2026-09-29',
        },
      ],
      total: 1,
    })
    api.fetchInvitations.mockResolvedValue({ rows: [], total: 0 })
    api.inviteUser.mockResolvedValue({ invitation: { id: 'inv-1' }, token: 'one-time-token' })
  })

  function createWrapper() {
    return mount(UsersPage, {
      global: {
        plugins: [i18n, [VueQueryPlugin, { queryClient }]],
        stubs: {
          DialogPortal: { template: '<div><slot /></div>' },
          AlertDialogPortal: { template: '<div><slot /></div>' },
        },
      },
    })
  }

  it('loads real users and no longer marks the page as sample data', async () => {
    const wrapper = createWrapper()
    await vi.waitFor(() => expect(wrapper.text()).toContain('林沐言'))
    expect(wrapper.text()).not.toContain('原型示例数据')
    expect(api.fetchUsers).toHaveBeenCalledWith(
      expect.objectContaining({ pageIndex: 0, pageSize: 7 }),
    )
  })

  it('shows a protected-page message when the backend rejects a non-admin', async () => {
    api.fetchUsers.mockRejectedValue(new RequestError(403, 'HTTP_403', 'Forbidden'))
    const wrapper = createWrapper()
    await vi.waitFor(() => expect(wrapper.text()).toContain('此页面仅供管理员使用'))
    expect(wrapper.text()).not.toContain('直接创建')
  })

  it('shows the real one-time invitation link only after the server creates it', async () => {
    const wrapper = createWrapper()
    await nextTick()
    const inviteButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('邀请用户'))
    await inviteButton!.trigger('click')
    expect(wrapper.text()).toContain('系统不会发送邮件')
    await wrapper.find('#input-email').setValue('invitee@example.com')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(api.inviteUser).toHaveBeenCalledWith('invitee@example.com'))
    await vi.waitFor(() =>
      expect(wrapper.find('input[readonly]').attributes('value')).toContain(
        '#token=one-time-token',
      ),
    )
  })

  it('opens direct creation with empty fields and clears the draft after an account is created', async () => {
    api.createUser.mockResolvedValue({ id: 'user-2' })
    const wrapper = createWrapper()
    await nextTick()
    const createButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('直接创建'))
    await createButton!.trigger('click')

    expect(wrapper.find('#input-name').element).toHaveProperty('value', '')
    expect(wrapper.find('#input-email').element).toHaveProperty('value', '')
    expect(wrapper.find('#input-password').element).toHaveProperty('value', '')
    expect(wrapper.find('form').attributes('autocomplete')).toBe('off')
    expect(wrapper.find('#input-password').attributes('autocomplete')).toBe('new-password')

    await wrapper.find('#input-name').setValue('新用户')
    await wrapper.find('#input-email').setValue('new@example.com')
    await wrapper.find('#input-password').setValue('secure-password')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() =>
      expect(api.createUser).toHaveBeenCalledWith('新用户', 'new@example.com', 'secure-password'),
    )
    await vi.waitFor(() => expect(wrapper.find('#input-name').exists()).toBe(false))

    await createButton!.trigger('click')
    expect(wrapper.find('#input-name').element).toHaveProperty('value', '')
    expect(wrapper.find('#input-email').element).toHaveProperty('value', '')
    expect(wrapper.find('#input-password').element).toHaveProperty('value', '')
  })

  it('updates live table copy when switching languages', async () => {
    const wrapper = createWrapper()
    await vi.waitFor(() => expect(wrapper.text()).toContain('林沐言'))
    i18n.global.locale.value = 'en-US'
    await nextTick()
    expect(wrapper.text()).toContain('User Management')
    expect(wrapper.text()).toContain('Email verification')
  })
})
