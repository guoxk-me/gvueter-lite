import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { usersApi } from './users-api'

const businessRequest = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))
vi.mock('@/http/http-client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/http/http-client')>()),
  http: businessRequest,
}))

describe('usersApi', () => {
  beforeEach(() => {
    for (const request of Object.values(businessRequest)) request.mockReset()
  })

  it('reads paginated users through the shared client', async () => {
    businessRequest.get.mockResolvedValueOnce({ rows: [], total: 0 })
    const page = await usersApi.fetchUsers({
      pageIndex: 2,
      pageSize: 7,
      search: 'lin',
      status: 'active',
    })
    expect(page).toEqual({ rows: [], total: 0 })
    expect(businessRequest.get).toHaveBeenCalledWith('admin/users', {
      silent: true,
      params: { search: 'lin', status: 'active', pageIndex: 2, pageSize: 7 },
    })
  })

  it('sends writes without an explicit CSRF token request', async () => {
    businessRequest.post.mockResolvedValueOnce({ id: 'user-1' })
    await usersApi.createUser('Lin', 'lin@example.com', 'password123')
    expect(businessRequest.post).toHaveBeenCalledOnce()
    expect(businessRequest.post).toHaveBeenCalledWith(
      'admin/users',
      {
        name: 'Lin',
        email: 'lin@example.com',
        password: 'password123',
      },
      { silent: true },
    )
  })

  it('keeps public invitation requests outside protected 401 redirects', async () => {
    businessRequest.post.mockResolvedValueOnce({
      email: 'lin@example.com',
      expiresAt: '2026-10-01',
    })
    await usersApi.getInvitation('secret')
    expect(businessRequest.post).toHaveBeenCalledWith(
      'invitations/preview',
      { token: 'secret' },
      { auth: false, silent: true },
    )
  })
})
