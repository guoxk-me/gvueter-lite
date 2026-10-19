// @vitest-environment node
import { afterAll, afterEach, beforeAll, expect, test, vi } from 'vite-plus/test';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw/http';
import { z } from 'zod';
import { createHttpClient } from './client';
import { ApiError } from './api-error';

const server = setupServer();
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
const baseURL = 'http://gvueter.test/api';
const client = createHttpClient({ baseURL });
const profile = z.object({ name: z.string(), enabled: z.boolean() });

test('JSON methods infer validated payloads and preserve empty strings, false and null', async () => {
  server.use(
    http.get(`${baseURL}/profile`, () => HttpResponse.json({ data: { name: '', enabled: false } })),
  );
  await expect(client.get('/profile', { schema: profile })).resolves.toEqual({
    name: '',
    enabled: false,
  });
  server.use(http.get(`${baseURL}/profile`, () => HttpResponse.json({ data: null })));
  await expect(client.get('/profile', { schema: z.null() })).resolves.toBeNull();
});

test('all JSON methods and dynamic requests send the requested verb and body', async () => {
  const methods: string[] = [];
  server.use(
    http.all(`${baseURL}/profile`, async ({ request }) => {
      methods.push(request.method);
      return HttpResponse.json({
        data: request.method === 'DELETE' ? 'removed' : await request.json(),
      });
    }),
  );
  const schema = z.string();
  await client.post('/profile', 'post', {
    schema,
    headers: { 'Content-Type': 'application/json' },
  });
  await client.put('/profile', { name: 'put' }, { schema: z.object({ name: z.string() }) });
  await client.patch('/profile', false, {
    schema: z.boolean(),
    headers: { 'Content-Type': 'application/json' },
  });
  await client.delete('/profile', { schema });
  await client.request(
    { url: '/profile', method: 'POST', data: 0, headers: { 'Content-Type': 'application/json' } },
    { schema: z.number() },
  );
  expect(methods).toEqual(['POST', 'PUT', 'PATCH', 'DELETE', 'POST']);
});

test('body mode validates the whole response; raw retains status and response headers', async () => {
  server.use(
    http.get(`${baseURL}/health`, () =>
      HttpResponse.json({ ready: true }, { headers: { 'X-Request-Id': 'read-1' } }),
    ),
  );
  await expect(
    client.get('/health', { response: 'body', schema: z.object({ ready: z.boolean() }) }),
  ).resolves.toEqual({ ready: true });
  const response = await client.requestRaw({ url: '/health', responseType: 'json' });
  expect(response.data).toEqual({ ready: true });
  expect(response.status).toBe(200);
  expect(response.headers['x-request-id']).toBe('read-1');
  const validated = await client.requestWithResponse(
    { url: '/health' },
    {
      response: 'body',
      schema: z.object({ ready: z.boolean() }),
    },
  );
  expect(validated.data.ready).toBe(true);
  expect(validated.headers['x-request-id']).toBe('read-1');
});

test('empty responses are explicit and do not discard unexpected bodies', async () => {
  server.use(http.delete(`${baseURL}/profile`, () => new HttpResponse(null, { status: 204 })));
  await expect(client.requestEmpty({ url: '/profile', method: 'DELETE' })).resolves.toBeUndefined();
  await expect(client.delete('/profile', { schema: z.unknown() })).rejects.toMatchObject({
    kind: 'contract',
    status: 204,
  });
  server.use(http.delete(`${baseURL}/profile`, () => HttpResponse.json(null)));
  await expect(client.requestEmpty({ url: '/profile', method: 'DELETE' })).rejects.toMatchObject({
    kind: 'contract',
  });
});

test('optional malformed errors do not erase valid business codes or other fields', async () => {
  server.use(
    http.post(`${baseURL}/profile`, () =>
      HttpResponse.json(
        {
          code: 'INVALID',
          message: '检查邮箱',
          fieldErrors: { email: '邮箱已存在', name: ['wrong shape'] },
          requestId: 123,
        },
        { status: 422, headers: { 'X-Request-Id': 'fallback-id' } },
      ),
    ),
  );
  const failure = await client
    .post('/profile', {}, { schema: profile })
    .catch((error: unknown) => error);
  expect(failure).toMatchObject({
    kind: 'http',
    status: 422,
    code: 'INVALID',
    message: '检查邮箱',
    fieldErrors: { email: '邮箱已存在' },
    requestId: 'fallback-id',
  });
  expect(failure).toBeInstanceOf(ApiError);
  if (failure instanceof ApiError) {
    expect(failure.cause).toBeDefined();
    expect(Object.keys(failure)).not.toContain('cause');
    expect(Object.isFrozen(failure.fieldErrors)).toBe(true);
  }
});

test('invalid success envelopes, JSON and payload schemas fail without losing diagnostics', async () => {
  server.use(http.get(`${baseURL}/profile`, () => HttpResponse.json({ rows: [] })));
  await expect(client.get('/profile', { schema: profile })).rejects.toMatchObject({
    kind: 'contract',
    status: 200,
  });
  server.use(http.get(`${baseURL}/profile`, () => HttpResponse.json({ data: { name: 123 } })));
  await expect(client.get('/profile', { schema: profile })).rejects.toMatchObject({
    kind: 'contract',
    status: 200,
    cause: expect.any(z.ZodError),
  });
  server.use(
    http.get(`${baseURL}/profile`, () =>
      HttpResponse.text('{broken', { headers: { 'Content-Type': 'application/json' } }),
    ),
  );
  await expect(client.get('/profile', { schema: profile })).rejects.toMatchObject({
    kind: 'contract',
  });
});

test('Axios defaults to repeat with overrides and keeps false, zero and empty strings', async () => {
  const urls: URL[] = [];
  server.use(
    http.get(`${baseURL}/profile`, ({ request }) => {
      urls.push(new URL(request.url));
      return HttpResponse.json({ data: true });
    }),
  );
  const params = {
    roles: ['admin', 'editor'],
    enabled: false,
    page: 0,
    keyword: '',
    absent: null,
    missing: undefined,
    none: [],
    special: '空 格+a&b/c',
    mixed: ['first', null, undefined, 'last'],
  };
  await client.get('/profile', { schema: z.boolean(), params });
  expect(urls[0]!.searchParams.getAll('roles')).toEqual(['admin', 'editor']);
  expect(urls[0]!.searchParams.get('enabled')).toBe('false');
  expect(urls[0]!.searchParams.get('page')).toBe('0');
  expect(urls[0]!.searchParams.get('keyword')).toBe('');
  expect(urls[0]!.searchParams.has('absent')).toBe(false);
  expect(urls[0]!.searchParams.has('missing')).toBe(false);
  expect(urls[0]!.searchParams.has('none')).toBe(false);
  expect(urls[0]!.searchParams.get('special')).toBe('空 格+a&b/c');
  expect(urls[0]!.searchParams.getAll('mixed')).toEqual(['first', 'last']);
  await client.get('/profile', { schema: z.boolean(), params, arrayFormat: 'brackets' });
  expect(urls[1]!.searchParams.getAll('roles[]')).toEqual(['admin', 'editor']);
  await client.get('/profile', { schema: z.boolean(), params, arrayFormat: 'indices' });
  expect(urls[2]!.searchParams.get('roles[0]')).toBe('admin');
  expect(urls[2]!.searchParams.get('mixed[3]')).toBe('last');
});

test('invalid query values are rejected before dispatch', async () => {
  const read = vi.fn();
  server.use(
    http.get(`${baseURL}/profile`, () => {
      read();
      return HttpResponse.json({ data: true });
    }),
  );
  await expect(
    client.get('/profile', {
      schema: z.boolean(),
      params: { page: Infinity },
    }),
  ).rejects.toMatchObject({ kind: 'config' });
  expect(read).not.toHaveBeenCalled();
});

test('native request LIFO and response FIFO order, async handlers and ejection are preserved', async () => {
  const local = createHttpClient({ baseURL });
  const order: string[] = [];
  const first = local.interceptors.request.use((config) => {
    order.push('request-first');
    return config;
  });
  const second = local.interceptors.request.use(async (config) => {
    await Promise.resolve();
    order.push('request-second');
    config.headers.set('X-Test', 'ok');
    return config;
  });
  local.interceptors.response.use((response) => {
    order.push('response-first');
    return response;
  });
  local.interceptors.response.use((response) => {
    order.push('response-second');
    return response;
  });
  server.use(
    http.get(`${baseURL}/profile`, ({ request }) => {
      expect(request.headers.get('X-Test')).toBe('ok');
      return HttpResponse.json({ data: true });
    }),
  );
  await local.get('/profile', { schema: z.boolean() });
  expect(order).toEqual(['request-second', 'request-first', 'response-first', 'response-second']);
  local.interceptors.request.eject(first);
  local.interceptors.request.eject(second);
  order.length = 0;
  server.use(http.get(`${baseURL}/profile`, () => HttpResponse.json({ data: true })));
  await local.get('/profile', { schema: z.boolean() });
  expect(order).toEqual(['response-first', 'response-second']);
});

test('response adapters run before schema validation and recovery retains native semantics', async () => {
  const local = createHttpClient({ baseURL });
  server.use(
    http.get(`${baseURL}/profile`, () => HttpResponse.json({ data: false }, { status: 503 })),
  );
  local.interceptors.response.use(undefined, (error: unknown) => {
    // An intentional app interceptor can recover using a complete native response.
    if (typeof error === 'object' && error !== null && 'response' in error) return error.response;
    return Promise.reject(error);
  });
  await expect(local.get('/profile', { schema: z.boolean() })).resolves.toBe(false);
  local.interceptors.response.clear();
  server.use(http.get(`${baseURL}/profile`, () => HttpResponse.json({ custom: 'adapted' })));
  local.interceptors.response.use((response) => ({ ...response, data: { data: 'adapted' } }));
  await expect(local.get('/profile', { schema: z.string() })).resolves.toBe('adapted');
  await expect(local.get('/profile', { schema: z.boolean() })).rejects.toMatchObject({
    kind: 'contract',
  });
});

test('interceptor failures preserve causes; JSON validation is outside Axios rejection callbacks', async () => {
  const local = createHttpClient({ baseURL });
  const cause = new Error('application interceptor failed');
  const read = vi.fn();
  server.use(
    http.get(`${baseURL}/profile`, () => {
      read();
      return HttpResponse.json({ data: false });
    }),
  );
  const id = local.interceptors.request.use(() => {
    throw cause;
  });
  await expect(local.get('/profile', { schema: profile })).rejects.toMatchObject({
    kind: 'interceptor',
    cause,
  });
  expect(read).not.toHaveBeenCalled();
  local.interceptors.request.eject(id);
  const rejected = vi.fn((error: unknown) => Promise.reject(error));
  local.interceptors.response.use(undefined, rejected);
  await expect(local.get('/profile', { schema: profile })).rejects.toMatchObject({
    kind: 'contract',
  });
  expect(rejected).not.toHaveBeenCalled();
});

test('instances isolate headers; per-request defaults do not leak', async () => {
  const local = createHttpClient({ baseURL, timeout: undefined, headers: { 'X-Client': 'one' } });
  const headers: Array<string | null> = [];
  server.use(
    http.get(`${baseURL}/profile`, ({ request }) => {
      headers.push(request.headers.get('X-Client'));
      return HttpResponse.json({ data: true });
    }),
  );
  await local.get('/profile', { schema: z.boolean(), headers: { 'x-client': 'override' } });
  await local.get('/profile', { schema: z.boolean() });
  await client.get('/profile', { schema: z.boolean() });
  expect(headers).toEqual(['override', 'one', null]);
});

test('FormData keeps its boundary and file contents through the common POST path', async () => {
  server.use(
    http.post(`${baseURL}/upload`, async ({ request }) => {
      expect(request.headers.get('content-type')).toContain('multipart/form-data; boundary=');
      const uploaded = await request.formData();
      const file = uploaded.get('file');
      expect(file).toBeInstanceOf(File);
      if (file instanceof File) expect(await file.text()).toBe('hello');
      return HttpResponse.json({ data: { id: 'file-1' } });
    }),
  );
  const body = new FormData();
  body.append('file', new File(['hello'], 'hello.txt', { type: 'text/plain' }));
  await expect(
    client.post('/upload', body, { schema: z.object({ id: z.string() }) }),
  ).resolves.toEqual({ id: 'file-1' });
});

test('HTTP does not retry failures; cancellations and actual transport timeouts are classified', async () => {
  const read = vi.fn();
  server.use(
    http.get(`${baseURL}/profile`, () => {
      read();
      return HttpResponse.error();
    }),
  );
  await expect(client.get('/profile', { schema: profile })).rejects.toMatchObject({
    kind: 'network',
  });
  expect(read).toHaveBeenCalledOnce();
  const controller = new AbortController();
  controller.abort();
  await expect(
    client.get('/profile', { signal: controller.signal, schema: profile }),
  ).rejects.toMatchObject({ kind: 'cancelled' });
  expect(read).toHaveBeenCalledOnce();
  server.use(
    http.get(`${baseURL}/profile`, async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
      return HttpResponse.json({ data: true });
    }),
  );
  await expect(client.get('/profile', { timeout: 20, schema: z.boolean() })).rejects.toMatchObject({
    kind: 'timeout',
  });
});

test('cancellation during async interception prevents sending', async () => {
  const local = createHttpClient({ baseURL });
  let continueRequest!: () => void;
  const entered = new Promise<void>((resolve) => {
    local.interceptors.request.use(async (config) => {
      resolve();
      await new Promise<void>((resume) => {
        continueRequest = resume;
      });
      return config;
    });
  });
  const read = vi.fn();
  server.use(
    http.get(`${baseURL}/profile`, () => {
      read();
      return HttpResponse.json({ data: true });
    }),
  );
  const controller = new AbortController();
  const reading = local.get('/profile', { signal: controller.signal, schema: z.boolean() });
  const assertion = expect(reading).rejects.toMatchObject({ kind: 'cancelled' });
  await entered;
  controller.abort();
  continueRequest();
  await assertion;
  expect(read).not.toHaveBeenCalled();
});
