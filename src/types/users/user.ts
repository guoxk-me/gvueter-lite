// AI modified: group pure types by stable concepts instead of implementation filenames.

export type UserStatus = 'active' | 'disabled'

export interface UserRecord {
  id: string
  name: string
  email: string
  isEmailVerified: boolean
  status: UserStatus
  createdAt: string
}

export interface UserQueryParams {
  search?: string
  status?: UserStatus | 'all'
  pageIndex: number
  pageSize: number
}
