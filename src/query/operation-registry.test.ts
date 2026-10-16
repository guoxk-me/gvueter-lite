import { expect, test, vi } from 'vite-plus/test';
import {
  createOperationRegistry,
  operationStorageKey,
  type PendingOperation,
} from './operation-registry';
function memoryStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
    setItem: (key: string, text: string) => {
      entries.set(key, text);
    },
    removeItem: (key: string) => {
      entries.delete(key);
    },
  };
}
const pending = (): PendingOperation => ({
  operationId: crypto.randomUUID(),
  accountId: 'a',
  resource: 'contacts',
  action: 'edit',
  target: '1',
  status: 'pending',
  verificationAttempted: false,
});
test('reload restores pending writes as unknown only for the confirmed account', () => {
  const storage = memoryStorage();
  const registry = createOperationRegistry(storage, vi.fn());
  const operation = pending();
  registry.add(operation);
  expect(registry.add({ ...pending(), action: 'delete' })).toBe(false);
  const resumed = createOperationRegistry(storage, vi.fn());
  resumed.restore('a');
  expect(resumed.pending.value[0]).toMatchObject({
    status: 'unknown',
    operationId: operation.operationId,
  });
  expect(JSON.parse(storage.getItem(operationStorageKey)!).operations[0]).toEqual({
    ...operation,
    status: 'unknown',
  });
  const otherAccount = createOperationRegistry(storage, vi.fn());
  otherAccount.restore('b');
  expect(otherAccount.pending.value).toHaveLength(0);
});
test('invalid markers do not restore or trigger operations', () => {
  const storage = memoryStorage();
  const notify = vi.fn();
  storage.setItem(
    operationStorageKey,
    JSON.stringify({ version: 1, operations: [{ ...pending(), password: 'never-allowed' }] }),
  );
  const registry = createOperationRegistry(storage, notify);
  registry.restore('a');
  expect(registry.pending.value).toHaveLength(0);
  expect(notify).toHaveBeenCalledOnce();
  storage.setItem(operationStorageKey, '{broken');
  registry.restore('a');
  expect(registry.pending.value).toHaveLength(0);
  expect(notify).toHaveBeenLastCalledWith('操作恢复标记损坏，无法自动恢复，请先核实先前操作。');
});
test('storage failure keeps in-memory conflict protection and warns once', () => {
  const notify = vi.fn();
  const storage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('quota');
    },
    removeItem: () => undefined,
  };
  const registry = createOperationRegistry(storage, notify);
  const operation = pending();
  registry.add(operation);
  registry.update(operation.operationId, { status: 'unknown' });
  expect(registry.pending.value).toHaveLength(1);
  expect(notify).toHaveBeenCalledOnce();
  expect(registry.add(pending())).toBe(false);
});
