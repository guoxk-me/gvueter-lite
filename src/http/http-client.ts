import type { HttpOptions, HttpMethod, RawRequest, ErrorAction } from '@/types/http/request'
// AI modified: shared pure types live in the centralized owner directory.

import axios, {
  AxiosHeaders,
  CanceledError,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios'

export class RequestError extends Error {
  readonly businessCode?: number

  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    details: { cause?: unknown; businessCode?: number } = {},
  ) {
    super(message, { cause: details.cause })
    this.name = 'RequestError'
    this.businessCode = details.businessCode
  }
}

// AI modified: one class owns transport, recovery and cancellation without changing verb calls.
export class HttpClient {
  private readonly transport = axios.create({
    baseURL: '/api/',
    withCredentials: true,
    timeout: 30_000,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
  })

  private unauthorizedAction?: ErrorAction
  private errorAction?: ErrorAction
  private refreshSession?: Promise<void>
  private sessionController = new AbortController()
  private sessionVersion = 0
  private refreshRevision = 0
  private terminalAuthError?: RequestError
  private isUnauthorizedHandled = false

  setUnauthorizedAction(action: ErrorAction): void {
    this.unauthorizedAction = action
  }

  setErrorAction(action: ErrorAction): void {
    this.errorAction = action
  }

  // AI modified: invalidate old requests before another login or logout can replace their session.
  resetAuthState(): void {
    this.sessionVersion++
    this.sessionController.abort()
    this.sessionController = new AbortController()
    this.refreshSession = undefined
    this.refreshRevision = 0
    this.terminalAuthError = undefined
    this.isUnauthorizedHandled = false
  }

  clearAuthState(): void {
    this.resetAuthState()
    this.terminalAuthError = new RequestError(401, 'HTTP_401', 'Unauthorized')
    this.isUnauthorizedHandled = true
  }

  reportError(error: unknown): void {
    if (axios.isCancel(error)) return
    this.invoke(this.errorAction, this.requestFailure(error))
  }

  get<T>(path: string, options?: HttpOptions): Promise<T> {
    return this.request<T>('GET', path, undefined, options)
  }

  post<T>(path: string, body?: unknown, options?: HttpOptions): Promise<T> {
    return this.request<T>('POST', path, body, options)
  }

  put<T>(path: string, body?: unknown, options?: HttpOptions): Promise<T> {
    return this.request<T>('PUT', path, body, options)
  }

  patch<T>(path: string, body?: unknown, options?: HttpOptions): Promise<T> {
    return this.request<T>('PATCH', path, body, options)
  }

  delete<T>(path: string, options?: HttpOptions): Promise<T> {
    return this.request<T>('DELETE', path, undefined, options)
  }

  requestRaw<T>(request: RawRequest): Promise<AxiosResponse<T>> {
    const { method, url, data, ...options } = request
    return this.execute(method, url, data, options, (response) => response as AxiosResponse<T>)
  }

  private request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options: HttpOptions = {},
  ): Promise<T> {
    return this.execute(method, path, body, options, (response) => this.readEnvelope<T>(response))
  }

  private readMessage(body: unknown): string | undefined {
    if (typeof body !== 'object' || body === null || !('message' in body)) return
    if (typeof body.message === 'string') return body.message.trim() || undefined
    if (Array.isArray(body.message)) {
      return (
        body.message
          .filter((message): message is string => typeof message === 'string')
          .join('; ') || undefined
      )
    }
  }

  private requestFailure(error: unknown): RequestError {
    if (error instanceof RequestError) return error
    if (axios.isAxiosError<unknown>(error)) {
      const status = error.response?.status ?? 0
      const isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT'
      const code = isTimeout ? 'TIMEOUT' : status > 0 ? `HTTP_${status}` : 'NETWORK_ERROR'
      return new RequestError(
        status,
        code,
        this.readMessage(error.response?.data) ??
          (isTimeout
            ? 'Request timed out'
            : status === 0
              ? 'Service unavailable'
              : 'Request failed'),
        { cause: error },
      )
    }
    return new RequestError(0, 'REQUEST_FAILED', 'Request failed', { cause: error })
  }

  private readEnvelope<T>(response: AxiosResponse<unknown>): T {
    const body = response.data
    if (
      typeof body !== 'object' ||
      body === null ||
      !('code' in body) ||
      typeof body.code !== 'number'
    ) {
      throw new RequestError(response.status, 'INVALID_RESPONSE', 'Invalid server response')
    }
    if (body.code < 200 || body.code >= 300) {
      throw new RequestError(
        response.status,
        `API_${body.code}`,
        this.readMessage(body) ?? 'Request failed',
        { businessCode: body.code },
      )
    }
    if (!('data' in body)) {
      throw new RequestError(response.status, 'INVALID_RESPONSE', 'Invalid server response')
    }
    return body.data as T
  }

  private apiPath(path: string): string {
    // AI modified: canonical paths enforce /api even for dot segments and endpoint exclusions.
    let url: URL
    try {
      url = new URL(path, 'https://app.invalid/api/')
    } catch {
      throw new RequestError(0, 'INVALID_PATH', 'Invalid API path')
    }
    if (
      path.startsWith('/') ||
      /^[A-Za-z][A-Za-z\d+.-]*:/.test(path) ||
      url.origin !== 'https://app.invalid' ||
      !url.pathname.startsWith('/api/')
    ) {
      throw new RequestError(0, 'INVALID_PATH', 'Invalid API path')
    }
    return url.pathname.slice('/api/'.length)
  }

  private invoke(action: ErrorAction | undefined, error: RequestError): void {
    // AI modified: UI callbacks cannot mask request failures or expose request credentials in logs.
    try {
      void Promise.resolve(action?.(error)).catch(() => {})
    } catch {
      // The request error remains the caller's source of truth.
    }
  }

  private isUnauthorized(error: RequestError): boolean {
    return error.status === 401 || error.businessCode === 401
  }

  private waitFor<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    // AI modified: cancelling one waiter never aborts the refresh shared by other requests.
    return new Promise<T>((resolve, reject) => {
      const cancel = () => reject(new CanceledError('Request cancelled'))
      signal.addEventListener('abort', cancel, { once: true })
      promise.then(
        (response) => {
          signal.removeEventListener('abort', cancel)
          resolve(response)
        },
        (error: unknown) => {
          signal.removeEventListener('abort', cancel)
          reject(error)
        },
      )
      if (signal.aborted) cancel()
    })
  }

  private assertSession(version: number, signal: AbortSignal): void {
    if (signal.aborted || version !== this.sessionVersion)
      throw new CanceledError('Session changed')
    if (this.terminalAuthError) throw this.terminalAuthError
  }

  private renewSession(): Promise<void> {
    if (this.refreshSession) return this.refreshSession
    const version = this.sessionVersion
    const signal = this.sessionController.signal
    const task = Promise.resolve()
      .then(async () => {
        this.assertSession(version, signal)
        const response = await this.waitFor(
          this.transport.request<unknown>({
            method: 'POST',
            url: 'session/refresh',
            signal,
          }),
          signal,
        )
        this.assertSession(version, signal)
        // AI modified: refresh must satisfy the same envelope contract as the application API.
        this.readEnvelope<unknown>(response)
        this.refreshRevision++
      })
      .catch((error: unknown) => {
        if (axios.isCancel(error)) throw error
        this.assertSession(version, signal)
        const failure = this.requestFailure(error)
        if (this.isUnauthorized(failure)) this.terminalAuthError = failure
        throw failure
      })
      .finally(() => {
        // An old session's completion cannot clear the new session's refresh task.
        if (this.refreshSession === task) this.refreshSession = undefined
      })
    this.refreshSession = task
    return task
  }

  private async execute<T>(
    method: HttpMethod,
    path: string,
    body: unknown,
    options: HttpOptions,
    readResponse: (response: AxiosResponse<unknown>) => T,
  ): Promise<T> {
    const version = this.sessionVersion
    const controller = new AbortController()
    const signals = [
      options.signal,
      options.auth === false ? undefined : this.sessionController.signal,
    ]
    const cancel = () => controller.abort()
    for (const signal of signals) {
      signal?.addEventListener?.('abort', cancel)
      if (signal?.aborted) cancel()
    }
    let isManaged = options.auth !== false
    try {
      const endpoint = this.apiPath(path)
      isManaged =
        isManaged &&
        !['session/login', 'session/logout', 'session/refresh'].includes(endpoint) &&
        !endpoint.startsWith('invitations/')
      const check = () => {
        if (controller.signal.aborted) throw new CanceledError('Request cancelled')
        if (isManaged) this.assertSession(version, controller.signal)
      }
      check()
      if (isManaged && this.refreshSession)
        await this.waitFor(this.refreshSession, controller.signal)
      const { headers, params, timeout, onUploadProgress, onDownloadProgress, responseType } =
        options
      const requestHeaders = new AxiosHeaders()
      for (const [name, header] of Object.entries(headers ?? {})) {
        if (header !== undefined) requestHeaders.set(name, header)
      }
      // Copy caller headers; always replay original body, never Axios's serialized error config.
      const config: AxiosRequestConfig = {
        method,
        url: path,
        data: body,
        params,
        timeout,
        onUploadProgress,
        onDownloadProgress,
        responseType,
        signal: controller.signal,
      }
      for (let attempt = 0; attempt < 2; attempt++) {
        check()
        const revision = this.refreshRevision
        try {
          const response = await this.waitFor(
            this.transport.request<unknown>({
              ...config,
              headers: new AxiosHeaders(requestHeaders),
            }),
            controller.signal,
          )
          check()
          if (response.status === 401) throw new RequestError(401, 'HTTP_401', 'Unauthorized')
          return readResponse(response)
        } catch (error: unknown) {
          if (axios.isCancel(error)) throw error
          check()
          const failure = this.requestFailure(error)
          if (!isManaged || !this.isUnauthorized(failure)) throw failure
          if (attempt === 1) {
            this.terminalAuthError = failure
            throw failure
          }
          // AI modified: late 401s reuse an already renewed cookie instead of rotating twice.
          if (revision === this.refreshRevision)
            await this.waitFor(this.renewSession(), controller.signal)
        }
      }
      throw new RequestError(0, 'REQUEST_FAILED', 'Request failed')
    } catch (error: unknown) {
      if (
        axios.isCancel(error) ||
        controller.signal.aborted ||
        (isManaged && version !== this.sessionVersion)
      ) {
        throw axios.isCancel(error) ? error : new CanceledError('Session changed')
      }
      const failure = this.requestFailure(error)
      if (isManaged && this.isUnauthorized(failure) && options.handleUnauthorized !== false) {
        if (!this.isUnauthorizedHandled && this.unauthorizedAction) {
          this.isUnauthorizedHandled = true
          if (!options.silent) this.reportError(failure)
          this.invoke(this.unauthorizedAction, failure)
        }
      } else if (!options.silent) this.reportError(failure)
      throw failure
    } finally {
      for (const signal of signals) signal?.removeEventListener?.('abort', cancel)
    }
  }
}

export const http = new HttpClient()

export function setUnauthorizedAction(action: ErrorAction): void {
  http.setUnauthorizedAction(action)
}
