// AI modified: group pure types by stable concepts instead of implementation filenames.

export interface InvitationLinkResponse {
  invitation: InvitationRecord
  token: string
}

export type InvitationStatus = 'pending' | 'expired' | 'accepted' | 'revoked'

export interface InvitationRecord {
  id: string
  email: string
  status: InvitationStatus
  sentAt: string
  expiresAt: string
}

export interface InvitationQueryParams {
  search?: string
  status?: InvitationStatus | 'all'
  pageIndex: number
  pageSize: number
}
