export type ErrorKind =
  | 'cancelled'
  | 'network'
  | 'timeout'
  | 'http'
  | 'contract'
  | 'not-executed'
  | 'unknown';

// AI modified: transport failures carry evidence, never an assumption that a write rolled back.
export class ApiError extends Error {
  readonly kind: ErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly fieldErrors: Readonly<Record<string, string>>;
  readonly requestId?: string;
  constructor(
    message: string,
    kind: ErrorKind,
    status?: number,
    code?: string,
    fieldErrors: Readonly<Record<string, string>> = {},
    requestId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
  }
}

export function isDefiniteRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.kind === 'http' &&
    error.code !== undefined &&
    error.status !== undefined &&
    error.status >= 400 &&
    error.status < 500 &&
    ![408, 425, 429].includes(error.status)
  );
}

export function canRetryRead(failureCount: number, error: unknown): boolean {
  return (
    failureCount < 1 &&
    error instanceof ApiError &&
    (error.kind === 'network' ||
      error.kind === 'timeout' ||
      (error.kind === 'http' && [500, 502, 503, 504].includes(error.status ?? 0)))
  );
}
