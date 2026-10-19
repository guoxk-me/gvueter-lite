import { expect, test } from 'vite-plus/test';
import { ApiError } from '@/http';
import { canRetryRead, isDefiniteRejection } from './error-policy';

test('read retries remain bounded and do not replay configuration or contract errors', () => {
  expect(canRetryRead(0, new ApiError({ message: 'offline', kind: 'network' }))).toBe(true);
  expect(canRetryRead(1, new ApiError({ message: 'offline', kind: 'network' }))).toBe(false);
  for (const kind of ['cancelled', 'config', 'contract', 'interceptor'] as const)
    expect(canRetryRead(0, new ApiError({ message: 'failed', kind }))).toBe(false);
  expect(canRetryRead(0, new ApiError({ message: 'denied', kind: 'http', status: 403 }))).toBe(
    false,
  );
  expect(
    isDefiniteRejection(
      new ApiError({ message: 'invalid', kind: 'http', status: 422, code: 'INVALID' }),
    ),
  ).toBe(true);
  expect(
    isDefiniteRejection(new ApiError({ message: 'busy', kind: 'http', status: 429, code: 'BUSY' })),
  ).toBe(false);
});
