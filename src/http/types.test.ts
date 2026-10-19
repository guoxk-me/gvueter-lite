import { expectTypeOf, test } from 'vite-plus/test';
import { z } from 'zod';
import { createHttpClient, type HttpResponse } from './index';

// AI modified: vue-tsc compiles these calls without sending requests during tests.
function clientContracts() {
  const client = createHttpClient({ baseURL: '/api' });
  const schema = z.object({ id: z.string(), enabled: z.boolean() });
  const reading = client.get('/contacts', { schema });
  const writing = client.post('/contacts', { enabled: false }, { schema });
  const response = client.requestWithResponse({ url: '/contacts' }, { schema });
  const raw = client.requestRaw({ url: '/contacts', responseType: 'json' });
  const empty = client.requestEmpty({ url: '/contacts', method: 'DELETE' });
  const file = client.download('/contacts/export');
  expectTypeOf(reading).toEqualTypeOf<Promise<{ id: string; enabled: boolean }>>();
  expectTypeOf(writing).toEqualTypeOf<typeof reading>();
  expectTypeOf(response).toEqualTypeOf<Promise<HttpResponse<{ id: string; enabled: boolean }>>>();
  expectTypeOf(raw).toEqualTypeOf<Promise<HttpResponse<unknown>>>();
  expectTypeOf(empty).toEqualTypeOf<Promise<void>>();
  expectTypeOf(file).toEqualTypeOf<Promise<HttpResponse<Blob>>>();
  // @ts-expect-error JSON requests require a runtime schema
  void client.get('/contacts', {});
  // @ts-expect-error method is owned by the GET shortcut
  void client.get('/contacts', { schema, method: 'POST' });
  // @ts-expect-error GET options cannot supply a body
  void client.get('/contacts', { schema, data: {} });
  // @ts-expect-error JSON shortcut cannot switch to binary decoding
  void client.get('/contacts', { schema, responseType: 'blob' });
  // @ts-expect-error individual calls cannot redefine HTTP success
  void client.get('/contacts', { schema, validateStatus: () => true });
  // @ts-expect-error unsupported ambiguous nested query object
  void client.get('/contacts', { schema, params: { filter: { enabled: true } } });
  // @ts-expect-error raw JSON has no unvalidated business generic
  void client.requestRaw<{ id: string }>({ url: '/contacts' });
  // @ts-expect-error schema output is boolean, not a caller-declared string
  void client.get<string>('/contacts', { schema: z.boolean() });
}
void clientContracts;

test('client is available through its public entry', () => {
  expectTypeOf(createHttpClient).toBeFunction();
});
