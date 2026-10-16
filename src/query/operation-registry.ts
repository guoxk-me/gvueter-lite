import { readonly, shallowRef } from 'vue';
import { z } from 'zod';

export const operationStorageKey = 'gvueter:pending-writes:v1';
const operationSchema = z
  .object({
    operationId: z.string().uuid(),
    accountId: z.string().min(1).max(200),
    resource: z.string().min(1).max(100),
    action: z.string().min(1).max(100),
    target: z.string().min(1).max(200),
    status: z.enum(['pending', 'unknown']),
    verificationAttempted: z.boolean(),
  })
  .strict();
const storedSchema = z
  .object({ version: z.literal(1), operations: z.array(operationSchema).max(100) })
  .strict();
export type PendingOperation = z.infer<typeof operationSchema>;
export type OperationScope = Pick<PendingOperation, 'resource' | 'action' | 'target'>;

export function createOperationRegistry(
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | undefined,
  notify: (message: string) => void,
) {
  const pending = shallowRef<PendingOperation[]>([]);
  let warned = false;
  function storageFailed() {
    if (!warned) notify('操作恢复存储不可用：当前保护仍有效，刷新后可能无法恢复。');
    warned = true;
  }
  function persist() {
    try {
      if (!storage) {
        storageFailed();
        return;
      }
      // AI modified: reconstruct a whitelist; request payloads never enter recovery storage.
      storage.setItem(
        operationStorageKey,
        JSON.stringify({
          version: 1,
          operations: pending.value.map((op) => ({
            operationId: op.operationId,
            accountId: op.accountId,
            resource: op.resource,
            action: op.action,
            target: op.target,
            status: op.status,
            verificationAttempted: op.verificationAttempted,
          })),
        }),
      );
    } catch {
      storageFailed();
    }
  }
  function restore(accountId: string) {
    let raw: string | null | undefined;
    try {
      raw = storage?.getItem(operationStorageKey);
    } catch {
      storageFailed();
      return;
    }
    if (!raw) return;
    // AI modified: corrupt JSON and unavailable storage need different recovery feedback.
    try {
      const saved = storedSchema.safeParse(JSON.parse(raw));
      if (!saved.success) {
        notify('操作恢复标记损坏，无法自动恢复，请先核实先前操作。');
        return;
      }
      pending.value = saved.data.operations
        .filter((op) => op.accountId === accountId)
        .map((op) => ({ ...op, status: 'unknown' }));
      persist();
    } catch {
      notify('操作恢复标记损坏，无法自动恢复，请先核实先前操作。');
    }
  }
  function add(operation: PendingOperation) {
    if (pending.value.length >= 100 || !operationSchema.safeParse(operation).success) {
      notify('操作保护登记失败，请先处理现有待确认操作。');
      return false;
    }
    if (
      pending.value.some(
        (op) =>
          op.accountId === operation.accountId &&
          op.resource === operation.resource &&
          op.target === operation.target,
      )
    )
      return false;
    pending.value = [...pending.value, operation];
    persist();
    return true;
  }
  function update(
    operationId: string,
    patch: Partial<Pick<PendingOperation, 'status' | 'verificationAttempted'>>,
  ) {
    pending.value = pending.value.map((op) =>
      op.operationId === operationId ? { ...op, ...patch } : op,
    );
    persist();
  }
  function remove(operationId: string) {
    pending.value = pending.value.filter((op) => op.operationId !== operationId);
    persist();
  }
  function clear() {
    pending.value = [];
    persist();
  }
  return { pending: readonly(pending), restore, add, update, remove, clear };
}
