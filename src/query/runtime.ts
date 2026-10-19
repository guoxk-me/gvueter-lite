import { inject, shallowRef, watch, type InjectionKey, type Ref } from 'vue';
import { QueryCache, QueryClient } from '@tanstack/vue-query';
import { ApiError } from '@/http';
import { canRetryRead } from './error-policy';
import { createOperationRegistry } from './operation-registry';

export interface QueryIdentity {
  accountId: string;
  context: string;
}
export interface RuntimeOptions {
  identity: Readonly<Ref<QueryIdentity | null>>;
  notify: (message: string, tone?: 'error' | 'success' | 'info') => void;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
}

export function createQueryRuntime(options: RuntimeOptions) {
  const generation = shallowRef(0);
  const operations = createOperationRegistry(options.storage, options.notify);
  const client = new QueryClient({
    queryCache: new QueryCache({
      // AI modified: one cache callback owns read errors, irrespective of observer count.
      onError(error, query) {
        const identity = options.identity.value;
        if (!identity || query.queryKey[0] !== identity.context || !query.isActive()) return;
        if (error instanceof ApiError && error.kind === 'cancelled') return;
        options.notify(error.message);
      },
    }),
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 300_000, retry: canRetryRead, retryDelay: 1000 },
      mutations: { retry: false, networkMode: 'always' },
    },
  });
  const stop = watch(
    () => options.identity.value?.context,
    (_context, previous) => {
      generation.value++;
      if (previous !== undefined) {
        void client.cancelQueries();
        client.clear();
        operations.clear();
      }
      const identity = options.identity.value;
      if (identity) operations.restore(identity.accountId);
    },
    { immediate: true, flush: 'sync' },
  );
  return {
    client,
    operations,
    identity: options.identity,
    generation,
    notify: options.notify,
    dispose() {
      stop();
      client.clear();
    },
  };
}
export type QueryRuntime = ReturnType<typeof createQueryRuntime>;
export const queryRuntimeKey: InjectionKey<QueryRuntime> = Symbol('query-runtime');
export function useQueryRuntime(): QueryRuntime {
  const runtime = inject(queryRuntimeKey);
  if (!runtime) throw new Error('Query runtime is not provided');
  return runtime;
}
