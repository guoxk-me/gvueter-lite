import type { InvitationQueryParams, InvitationRecord } from '@/types/users/invitation'
import type { PaginatedResult } from '@/types/http/pagination'
import type { UserQueryParams, UserRecord, UserStatus } from '@/types/users/user'
import type { InvitationLinkResponse } from '@/types/users/invitation'

// AI modified: shared pure types live in the centralized owner directory.

import { http } from '@/http/http-client'

// AI modified: stateless endpoint calls belong to API; reactive workflows stay with callers.
export const usersApi = {
  fetchUsers(params: UserQueryParams): Promise<PaginatedResult<UserRecord>> {
    // AI modified: local page feedback owns errors, including reads after Query retries.
    return http.get('admin/users', {
      silent: true,
      params: {
        search: params.search,
        status: params.status,
        pageIndex: params.pageIndex,
        pageSize: params.pageSize,
      },
    })
  },
  fetchInvitations(params: InvitationQueryParams): Promise<PaginatedResult<InvitationRecord>> {
    return http.get('admin/invitations', {
      silent: true,
      params: {
        search: params.search,
        status: params.status,
        pageIndex: params.pageIndex,
        pageSize: params.pageSize,
      },
    })
  },
  createUser(name: string, email: string, password: string): Promise<UserRecord> {
    return http.post('admin/users', { name, email, password }, { silent: true })
  },
  updateUserName(userId: string, name: string): Promise<void> {
    return http.patch(`admin/users/${encodeURIComponent(userId)}/name`, { name }, { silent: true })
  },
  updateUserStatus(userId: string, status: UserStatus): Promise<void> {
    return http.patch(
      `admin/users/${encodeURIComponent(userId)}/status`,
      { status },
      { silent: true },
    )
  },
  async batchUpdateUserStatus(userIds: string[], status: UserStatus): Promise<number> {
    const response = await http.patch<{ count: number }>(
      'admin/users/status',
      {
        userIds,
        status,
      },
      { silent: true },
    )
    return response.count
  },
  inviteUser(email: string): Promise<InvitationLinkResponse> {
    return http.post('admin/invitations', { email }, { silent: true })
  },
  resendInvitation(invitationId: string): Promise<InvitationLinkResponse> {
    return http.post(`admin/invitations/${encodeURIComponent(invitationId)}/resend`, undefined, {
      silent: true,
    })
  },
  revokeInvitation(invitationId: string): Promise<void> {
    return http.delete(`admin/invitations/${encodeURIComponent(invitationId)}`, { silent: true })
  },
  getInvitation(token: string): Promise<{ email: string; expiresAt: string }> {
    return http.post('invitations/preview', { token }, { auth: false, silent: true })
  },
  acceptInvitation(token: string, name: string, password: string): Promise<void> {
    return http.post('invitations/accept', { token, name, password }, { auth: false, silent: true })
  },
}
