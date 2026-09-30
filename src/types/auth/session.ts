// AI modified: group pure types by stable concepts instead of implementation filenames.

export interface AuthenticatedUser {
  id: string
  email: string
  name: string
  image?: string | null
}

export interface LoginCredentials {
  email: string
  password: string
  rememberMe: boolean
}
