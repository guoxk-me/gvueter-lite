import { afterEach, expect, test, vi } from 'vite-plus/test';
import { defineComponent, h, shallowRef } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';
import { onlineManager, VueQueryPlugin } from '@tanstack/vue-query';
import { createQueryRuntime, queryRuntimeKey, type QueryIdentity } from './runtime';
import {
  useResourceMutation,
  type ResourceMutationOptions,
  type Verification,
} from './use-resource-mutation';
import { ApiError } from '@/http/api-error';
function fixture(overrides: Partial<ResourceMutationOptions<string, string>> = {}) {
  const identity = shallowRef<QueryIdentity | null>({ accountId: 'a', context: 'a1' });
  const notify = vi.fn();
  const runtime = createQueryRuntime({ identity, notify, storage: sessionStorage });
  let mutation!: ReturnType<typeof useResourceMutation<string, string>>;
  const write = vi.fn(async () => 'saved');
  const verify = vi.fn(async (): Promise<Verification<string>> => ({ status: 'pending' }));
  const confirmed = vi.fn();
  const wrapper = mount(
    defineComponent({
      setup() {
        mutation = useResourceMutation({
          resource: 'contacts',
          scope: (id) => ({ resource: 'contacts', action: 'edit', target: id }),
          write,
          verify,
          onConfirmed: confirmed,
          ...overrides,
        });
        return () => h('div');
      },
    }),
    {
      global: {
        provide: { [queryRuntimeKey as symbol]: runtime },
        plugins: [[VueQueryPlugin, { queryClient: runtime.client }]],
      },
    },
  );
  return {
    mutation,
    runtime,
    identity,
    write,
    verify,
    confirmed,
    notify,
    dispose() {
      mutation.dispose();
      wrapper.unmount();
      runtime.dispose();
    },
  };
}
afterEach(() => {
  sessionStorage.clear();
  onlineManager.setOnline(true);
});
test('unknown write survives editor lifetime, verifies once, and blocks only its target', async () => {
  const testCase = fixture({
    write: async () => {
      throw new ApiError({ message: 'lost', kind: 'network' });
    },
  });
  await expect(testCase.mutation.mutateAsync('1')).rejects.toMatchObject({ kind: 'unknown' });
  await flushPromises();
  expect(testCase.verify).toHaveBeenCalledTimes(1);
  expect(testCase.mutation.isBlocked({ resource: 'contacts', action: 'edit', target: '1' })).toBe(
    true,
  );
  await expect(testCase.mutation.mutateAsync('1')).rejects.toMatchObject({ kind: 'not-executed' });
  expect(testCase.mutation.isBlocked({ resource: 'contacts', action: 'edit', target: '2' })).toBe(
    false,
  );
  const operation = testCase.mutation.unresolved.value[0]!;
  await testCase.mutation.verifyOperation(operation.operationId, true);
  expect(testCase.verify).toHaveBeenCalledTimes(1);
  testCase.verify.mockResolvedValueOnce({ status: 'success', saved: 'confirmed' });
  await testCase.mutation.verifyOperation(operation.operationId);
  expect(testCase.mutation.unresolved.value).toHaveLength(0);
  expect(testCase.confirmed).toHaveBeenCalledWith('confirmed');
  testCase.dispose();
});
test('offline commands are not queued; explicit rejection releases protection', async () => {
  const testCase = fixture();
  onlineManager.setOnline(false);
  await expect(testCase.mutation.mutateAsync('1')).rejects.toMatchObject({ kind: 'not-executed' });
  onlineManager.setOnline(true);
  await flushPromises();
  expect(testCase.write).not.toHaveBeenCalled();
  testCase.dispose();
  const rejected = fixture({
    write: async () => {
      throw new ApiError({ message: 'invalid', kind: 'http', status: 422, code: 'INVALID' });
    },
  });
  await expect(rejected.mutation.mutateAsync('1')).rejects.toMatchObject({ status: 422 });
  expect(rejected.mutation.unresolved.value).toHaveLength(0);
  rejected.dispose();
});
test('late success after identity change cannot update resources or release another operation', async () => {
  let finish!: (saved: string) => void;
  const testCase = fixture({
    write: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const saving = testCase.mutation.mutateAsync('1');
  const assertion = expect(saving).rejects.toMatchObject({ kind: 'not-executed' });
  await flushPromises();
  testCase.identity.value = { accountId: 'b', context: 'b1' };
  finish('saved');
  await assertion;
  expect(testCase.confirmed).not.toHaveBeenCalled();
  expect(testCase.mutation.unresolved.value).toHaveLength(0);
  testCase.dispose();
});
test('refresh restores protection before writing and never repeats an attempted automatic check', async () => {
  const first = fixture({
    write: async () => {
      throw new ApiError({ message: 'lost', kind: 'timeout' });
    },
  });
  await expect(first.mutation.mutateAsync('1')).rejects.toMatchObject({ kind: 'unknown' });
  await flushPromises();
  expect(first.verify).toHaveBeenCalledOnce();
  first.dispose();
  const invalidated = vi.fn();
  const restored = fixture({ onUncertain: invalidated });
  await flushPromises();
  expect(restored.mutation.unresolved.value).toHaveLength(1);
  expect(restored.verify).not.toHaveBeenCalled();
  expect(invalidated).toHaveBeenCalledOnce();
  await expect(restored.mutation.mutateAsync('1')).rejects.toMatchObject({ kind: 'not-executed' });
  expect(restored.write).not.toHaveBeenCalled();
  restored.verify.mockResolvedValueOnce({ status: 'unknown' });
  await restored.mutation.verifyOperation(restored.mutation.unresolved.value[0]!.operationId);
  expect(restored.mutation.unresolved.value).toHaveLength(1);
  restored.verify.mockResolvedValueOnce({ status: 'rejected' });
  await restored.mutation.verifyOperation(restored.mutation.unresolved.value[0]!.operationId);
  expect(restored.mutation.unresolved.value).toHaveLength(0);
  restored.dispose();
});
test('identity must be ready and late verification cannot confirm into a new identity', async () => {
  let finish!: (verification: Verification<string>) => void;
  const testCase = fixture({
    write: async () => {
      throw new ApiError({ message: 'lost', kind: 'network' });
    },
    verify: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  testCase.identity.value = null;
  await expect(testCase.mutation.mutateAsync('1')).rejects.toMatchObject({ kind: 'not-executed' });
  expect(testCase.write).not.toHaveBeenCalled();
  testCase.identity.value = { accountId: 'a', context: 'a2' };
  await expect(testCase.mutation.mutateAsync('1')).rejects.toMatchObject({ kind: 'unknown' });
  await flushPromises();
  testCase.identity.value = { accountId: 'b', context: 'b1' };
  finish({ status: 'success', saved: 'old' });
  await flushPromises();
  expect(testCase.confirmed).not.toHaveBeenCalled();
  expect(testCase.notify).not.toHaveBeenCalled();
  testCase.dispose();
});
