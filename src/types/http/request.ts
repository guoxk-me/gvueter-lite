// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { AxiosRequestConfig } from 'axios'

export type HttpOptions = Pick<
  AxiosRequestConfig,
  | 'headers'
  | 'params'
  | 'signal'
  | 'timeout'
  | 'onUploadProgress'
  | 'onDownloadProgress'
  | 'responseType'
> & {
  // AI modified: auth controls session recovery; HttpOnly cookies are still sent by the browser.
  auth?: boolean
  silent?: boolean
  handleUnauthorized?: boolean
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export type RawRequest = HttpOptions & { method: HttpMethod; url: string; data?: unknown }

export type ErrorAction = (error: RequestFailure) => void | Promise<void>

export interface RequestFailure extends Error {
  readonly status: number
  readonly code: string
  readonly businessCode?: number
}
