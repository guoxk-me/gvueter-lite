import { ApiError } from '@/http';

// AI modified: rejection evidence and read retries belong to resource coordination.
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
