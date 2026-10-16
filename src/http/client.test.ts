// @vitest-environment node
import { afterAll, afterEach, beforeAll, expect, test } from 'vite-plus/test';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { createHttpClient } from './client';
import { ApiError, canRetryRead } from './api-error';
const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const client = createHttpClient('http://gvueter.test/api');
test('HTTP unwraps validated payloads without stripping false or empty strings', async () => {
  server.use(
    http.get('http://gvueter.test/api/profile', () =>
      HttpResponse.json({ data: { name: '', enabled: false } }),
    ),
  );
  await expect(
    client.request({ url: '/profile' }, z.object({ name: z.string(), enabled: z.boolean() })),
  ).resolves.toEqual({ name: '', enabled: false });
});
test('HTTP preserves field errors and treats malformed success as a contract failure', async () => {
  server.use(
    http.post('http://gvueter.test/api/profile', () =>
      HttpResponse.json(
        {
          code: 'INVALID',
          message: '检查邮箱',
          fieldErrors: { email: '邮箱已存在' },
          requestId: 'r1',
        },
        { status: 422 },
      ),
    ),
  );
  await expect(
    client.request({ method: 'POST', url: '/profile' }, z.object({})),
  ).rejects.toMatchObject({
    kind: 'http',
    status: 422,
    fieldErrors: { email: '邮箱已存在' },
    requestId: 'r1',
  });
  server.use(http.get('http://gvueter.test/api/profile', () => HttpResponse.json({ rows: [] })));
  await expect(client.request({ url: '/profile' }, z.array(z.string()))).rejects.toMatchObject({
    kind: 'contract',
  });
});
test('cancelled reads are silent and retry policy is bounded', async () => {
  const controller = new AbortController();
  controller.abort();
  await expect(
    client.request({ url: '/profile', signal: controller.signal }, z.object({})),
  ).rejects.toMatchObject({ kind: 'cancelled' });
  expect(canRetryRead(0, new ApiError('offline', 'network'))).toBe(true);
  expect(canRetryRead(1, new ApiError('offline', 'network'))).toBe(false);
  expect(canRetryRead(0, new ApiError('denied', 'http', 403))).toBe(false);
  expect(canRetryRead(0, new ApiError('cancelled', 'cancelled'))).toBe(false);
});
