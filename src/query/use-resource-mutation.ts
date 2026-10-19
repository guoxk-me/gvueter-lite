import { computed, shallowRef, watch } from 'vue';
import { onlineManager, useMutation } from '@tanstack/vue-query';
import { ApiError } from '@/http';
import { isDefiniteRejection } from './error-policy';
import { useQueryRuntime } from './runtime';
import type { OperationScope, PendingOperation } from './operation-registry';

export type Verification<T> =
  | { status: 'success'; saved: T }
  | { status: 'rejected' | 'pending' | 'unknown' };
export interface ResourceMutationOptions<TInput, TSaved> {
  resource: string;
  scope: (input: TInput) => OperationScope;
  write: (input: TInput, operationId: string) => Promise<TSaved>;
  verify: (operation: PendingOperation) => Promise<Verification<TSaved>>;
  onUncertain?: (operation: PendingOperation) => void;
  onConfirmed: (saved: TSaved) => void | Promise<void>;
}

export function useResourceMutation<TInput, TSaved>(
  options: ResourceMutationOptions<TInput, TSaved>,
) {
  const runtime = useQueryRuntime();
  const checking = shallowRef<ReadonlySet<string>>(new Set());
  const unresolved = computed(() =>
    runtime.operations.pending.value.filter(
      (op) =>
        op.resource === options.resource && op.accountId === runtime.identity.value?.accountId,
    ),
  );
  async function confirmed(saved: TSaved, generation: number) {
    try {
      await options.onConfirmed(saved);
    } catch {
      if (generation === runtime.generation.value)
        runtime.notify('保存已成功，但更新资源失败，请刷新列表。');
    }
  }
  async function verifyOperation(
    operationId: string,
    automatic = false,
  ): Promise<Verification<TSaved>['status'] | 'not-executed'> {
    const op = unresolved.value.find((entry) => entry.operationId === operationId);
    if (
      !op ||
      op.status === 'pending' ||
      !onlineManager.isOnline() ||
      checking.value.has(operationId) ||
      (automatic && op.verificationAttempted)
    )
      return 'not-executed';
    const generation = runtime.generation.value;
    runtime.operations.update(operationId, { verificationAttempted: true });
    checking.value = new Set([...checking.value, operationId]);
    try {
      const verification = await options.verify(op);
      if (generation !== runtime.generation.value) return 'not-executed';
      if (verification.status === 'success' || verification.status === 'rejected') {
        runtime.operations.remove(operationId);
        if (verification.status === 'success') await confirmed(verification.saved, generation);
        if (generation !== runtime.generation.value) return 'not-executed';
        runtime.notify(
          verification.status === 'success' ? '已核实：保存成功。' : '已核实：操作未执行。',
          verification.status === 'success' ? 'success' : 'info',
        );
      } else if (!automatic) runtime.notify('尚无法确认写入结果，相关写入继续受保护。');
      return verification.status;
    } catch {
      if (generation === runtime.generation.value && !automatic)
        runtime.notify('核实失败，相关写入继续受保护。');
      return 'unknown';
    } finally {
      checking.value = new Set([...checking.value].filter((id) => id !== operationId));
    }
  }
  const mutation = useMutation(
    {
      retry: false,
      networkMode: 'always',
      mutationFn: async (input: TInput): Promise<TSaved> => {
        const identity = runtime.identity.value;
        if (!identity || !onlineManager.isOnline())
          throw new ApiError({ message: '当前无法发送，请检查身份和网络。', kind: 'not-executed' });
        const operation: PendingOperation = {
          ...options.scope(input),
          operationId: crypto.randomUUID(),
          accountId: identity.accountId,
          status: 'pending',
          verificationAttempted: false,
        };
        if (!runtime.operations.add(operation))
          throw new ApiError({ message: '先前操作结果待确认，请先核实。', kind: 'not-executed' });
        const generation = runtime.generation.value;
        try {
          const saved = await options.write(input, operation.operationId);
          if (generation !== runtime.generation.value)
            throw new ApiError({ message: '操作所属身份已失效。', kind: 'not-executed' });
          runtime.operations.remove(operation.operationId);
          await confirmed(saved, generation);
          if (generation !== runtime.generation.value)
            throw new ApiError({ message: '操作所属身份已失效。', kind: 'not-executed' });
          return saved;
        } catch (error) {
          if (generation !== runtime.generation.value)
            throw new ApiError({ message: '操作所属身份已失效。', kind: 'not-executed' });
          if (isDefiniteRejection(error)) {
            runtime.operations.remove(operation.operationId);
            throw error;
          }
          // AI modified: transport loss cannot release conflict protection or replay a write.
          runtime.operations.update(operation.operationId, { status: 'unknown' });
          throw new ApiError({
            message: '保存结果待确认。可以关闭窗口，请先核实后再进行相关操作。',
            kind: 'unknown',
          });
        }
      },
    },
    runtime.client,
  );
  const stopOnline = onlineManager.subscribe(() => checkPending());
  const invalidated = new Set<string>();
  function checkPending() {
    for (const op of unresolved.value) {
      if (op.status !== 'unknown') continue;
      if (!invalidated.has(op.operationId)) {
        invalidated.add(op.operationId);
        try {
          options.onUncertain?.(op);
        } catch {
          runtime.notify('待确认资源失效失败，请手动刷新。');
        }
      }
      if (!op.verificationAttempted) void verifyOperation(op.operationId, true);
    }
  }
  const stop = watch(unresolved, checkPending, { immediate: true });
  // Lifetime cleanup is explicit because recovery survives individual editor instances.
  function dispose() {
    stop();
    stopOnline();
  }
  function isBlocked(scope: OperationScope) {
    return unresolved.value.some(
      (op) => op.resource === scope.resource && op.target === scope.target,
    );
  }
  return {
    mutateAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
    unresolved,
    checking,
    verifyOperation,
    isBlocked,
    dispose,
  };
}
