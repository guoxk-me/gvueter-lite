import axios from 'axios';

export type ErrorKind =
  | 'cancelled'
  | 'network'
  | 'timeout'
  | 'http'
  | 'contract'
  | 'config'
  | 'interceptor'
  | 'not-executed'
  | 'unknown';

export interface ApiErrorOptions {
  message: string;
  kind: ErrorKind;
  status?: number;
  code?: string;
  fieldErrors?: Readonly<Record<string, string>>;
  requestId?: string;
  cause?: unknown;
}

// AI modified: preserve diagnostic causes without exposing them in enumerable error fields.
export class ApiError extends Error {
  readonly kind: ErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly requestId?: string;

  constructor(options: ApiErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = 'ApiError';
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    this.fieldErrors = Object.freeze({ ...options.fieldErrors });
    this.requestId = options.requestId;
  }
}

function isRecord(body: unknown): body is Record<string, unknown> {
  return typeof body === 'object' && body !== null && !Array.isArray(body);
}

async function readErrorBody(body: unknown, contentType: unknown): Promise<unknown> {
  // AI modified: file endpoints can return small JSON errors instead of the requested binary.
  if (typeof contentType !== 'string' || !/\bjson\b/i.test(contentType)) return body;
  let text: string;
  if (body instanceof Blob && body.size <= 65_536) text = await body.text();
  else if (body instanceof ArrayBuffer && body.byteLength <= 65_536)
    text = new TextDecoder().decode(body);
  else if (ArrayBuffer.isView(body) && body.byteLength <= 65_536)
    text = new TextDecoder().decode(body);
  else if (typeof body === 'string' && body.length <= 65_536) text = body;
  else return body;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

export async function toApiError(error: unknown): Promise<ApiError> {
  if (error instanceof ApiError) return error;
  if (axios.isCancel(error))
    return new ApiError({ message: '请求已取消', kind: 'cancelled', cause: error });
  if (axios.isAxiosError<unknown, unknown>(error)) {
    const response = error.response;
    if (error.code === 'ERR_BAD_RESPONSE' && error.cause instanceof SyntaxError)
      return new ApiError({
        message: '服务器返回了无效 JSON',
        kind: 'contract',
        status: response?.status,
        cause: error,
      });
    if (response) {
      let body: unknown;
      try {
        body = await readErrorBody(response.data, response.headers['content-type']);
      } catch {
        /* Preserve the HTTP evidence even if the error body cannot be read. */
      }
      const details = isRecord(body) ? body : {};
      const fieldErrors = isRecord(details.fieldErrors)
        ? Object.fromEntries(
            Object.entries(details.fieldErrors).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          )
        : {};
      const headerId: unknown = response.headers['x-request-id'];
      return new ApiError({
        message:
          typeof details.message === 'string' && details.message.trim()
            ? details.message
            : '请求失败，请稍后重试',
        kind: 'http',
        status: response.status,
        code: typeof details.code === 'string' ? details.code : undefined,
        fieldErrors,
        requestId:
          typeof details.requestId === 'string'
            ? details.requestId
            : typeof headerId === 'string'
              ? headerId
              : undefined,
        cause: error,
      });
    }
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT')
      return new ApiError({ message: '请求超时，请检查网络', kind: 'timeout', cause: error });
    if (error.code === 'ERR_NETWORK' || error.request)
      return new ApiError({ message: '网络连接失败，请稍后重试', kind: 'network', cause: error });
    return new ApiError({ message: '请求配置不正确', kind: 'config', cause: error });
  }
  return new ApiError({ message: '请求处理失败', kind: 'interceptor', cause: error });
}
