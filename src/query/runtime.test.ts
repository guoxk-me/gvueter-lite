import { expect, test, vi } from 'vite-plus/test';
import { QueryObserver } from '@tanstack/vue-query';
import { shallowRef } from 'vue';
import { createQueryRuntime, type QueryIdentity } from './runtime';
import { ApiError } from '@/http/api-error';

test('two observers share one terminal error and exactly one retry', async () => {
  const notify = vi.fn();
  const runtime = createQueryRuntime({
    identity: shallowRef<QueryIdentity | null>({ accountId: 'a', context: 'a1' }),
    notify,
  });
  runtime.client.setDefaultOptions({
    queries: { ...runtime.client.getDefaultOptions().queries, retryDelay: 0 },
  });
  const read = vi.fn().mockRejectedValue(new ApiError('读取失败', 'http', 503));
  const first = new QueryObserver(runtime.client, { queryKey: ['a1', 'records'], queryFn: read });
  const second = new QueryObserver(runtime.client, { queryKey: ['a1', 'records'], queryFn: read });
  const unsubscribe1 = first.subscribe(() => undefined),
    unsubscribe2 = second.subscribe(() => undefined);
  await vi.waitFor(() => expect(first.getCurrentResult().isError).toBe(true));
  expect(read).toHaveBeenCalledTimes(2);
  expect(notify).toHaveBeenCalledExactlyOnceWith('读取失败');
  unsubscribe1();
  unsubscribe2();
  runtime.dispose();
});
test('old identity and inactive observers never notify the new page', async () => {
  const identity = shallowRef<QueryIdentity | null>({ accountId: 'a', context: 'a1' });
  const notify = vi.fn();
  const runtime = createQueryRuntime({ identity, notify });
  await expect(
    runtime.client.fetchQuery({
      queryKey: ['a1', 'detail'],
      queryFn: () => Promise.reject(new ApiError('bad', 'http', 403)),
    }),
  ).rejects.toThrow('bad');
  expect(notify).not.toHaveBeenCalled();
  identity.value = { accountId: 'b', context: 'b1' };
  expect(runtime.client.getQueryCache().getAll()).toHaveLength(0);
  runtime.dispose();
});
