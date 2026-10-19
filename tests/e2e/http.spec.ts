import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { once } from 'node:events';

test('browser HTTP handles file progress, multipart upload, binary errors', async ({ page }) => {
  let uploadContentType = '';
  let uploadBody = '';
  // AI modified: real HTTP is required for browser upload progress; route fulfillment bypasses it.
  const server = createServer((request, response) => {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    response.setHeader('Access-Control-Expose-Headers', 'X-Request-Id');
    if (request.method === 'OPTIONS') {
      response.writeHead(204);
      response.end();
      return;
    }
    if (request.url === '/download') {
      response.setHeader('X-Request-Id', 'file-1');
      response.setHeader('Content-Type', 'text/plain');
      response.end('exported contacts');
    } else if (request.url === '/upload') {
      uploadContentType = request.headers['content-type'] ?? '';
      request.on('data', (chunk: Buffer) => {
        uploadBody += chunk.toString();
      });
      request.on('end', () => {
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ data: true }));
      });
    } else if (request.url === '/failure') {
      response.writeHead(422, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          code: 'INVALID',
          message: '文件无效',
          fieldErrors: { file: '类型不允许' },
        }),
      );
    } else {
      response.writeHead(404);
      response.end();
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('HTTP fixture failed to listen');
  const baseURL = `http://127.0.0.1:${address.port}`;
  try {
    await page.goto('/');
    await expect(page.locator('main')).toBeVisible();
    const result = await page.evaluate(async (baseURL) => {
      const modulePath = '/src/http/index.ts';
      const { createHttpClient, ApiError }: typeof import('../../src/http/index.ts') = await import(
        modulePath
      );
      const client = createHttpClient({ baseURL });
      let downloadEvents = 0;
      let uploadEvents = 0;
      const file = await client.download('/download', {
        onDownloadProgress: () => {
          downloadEvents++;
        },
      });
      const form = new FormData();
      form.append('file', new File(['browser file'], 'contacts.txt', { type: 'text/plain' }));
      const upload = await client.requestRaw({
        url: '/upload',
        method: 'POST',
        data: form,
        responseType: 'json',
        onUploadProgress: () => {
          uploadEvents++;
        },
      });
      let failure;
      try {
        await client.download('/failure');
      } catch (error) {
        if (!(error instanceof ApiError)) throw error;
        failure = {
          kind: error.kind,
          status: error.status,
          code: error.code,
          fieldErrors: error.fieldErrors,
        };
      }
      return {
        text: await file.data.text(),
        requestId: file.headers['x-request-id'],
        upload: upload.data,
        downloadEvents,
        uploadEvents,
        failure,
      };
    }, baseURL);
    expect(result).toMatchObject({
      text: 'exported contacts',
      requestId: 'file-1',
      upload: { data: true },
      failure: { kind: 'http', status: 422, code: 'INVALID', fieldErrors: { file: '类型不允许' } },
    });
    expect(uploadContentType).toContain('multipart/form-data; boundary=');
    expect(uploadBody).toContain('browser file');
    expect(result.downloadEvents).toBeGreaterThan(0);
    expect(result.uploadEvents).toBeGreaterThan(0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('browser cancellation after dispatch does not report a successful response', async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/_http-test/pending', async (route) => {
    // Signal the browser only when the request has actually reached the network boundary.
    await page.evaluate(() => window.dispatchEvent(new Event('http-test-dispatched')));
    await pending;
    await route.fulfill({ status: 200, body: 'late' }).catch(() => undefined);
  });
  await page.goto('/');
  await expect(page.locator('main')).toBeVisible();
  try {
    const kind = await page.evaluate(async () => {
      const modulePath = '/src/http/index.ts';
      const { createHttpClient, ApiError }: typeof import('../../src/http/index.ts') = await import(
        modulePath
      );
      const client = createHttpClient({ baseURL: '/_http-test' });
      const controller = new AbortController();
      window.addEventListener('http-test-dispatched', () => controller.abort(), { once: true });
      try {
        await client.requestRaw({ url: '/pending', signal: controller.signal });
        return 'unexpected-success';
      } catch (error) {
        return error instanceof ApiError ? error.kind : 'unexpected-error';
      }
    });
    expect(kind).toBe('cancelled');
  } finally {
    release();
  }
});
