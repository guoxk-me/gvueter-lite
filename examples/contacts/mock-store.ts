import type { Contact, Scenario } from './contracts';
import type { Verification } from '@/query/use-resource-mutation';
interface MockState {
  contacts: Contact[];
  operations: Record<string, Verification<Contact>>;
  nextId: number;
  scenario: Scenario;
  hasWritten: boolean;
}
function initialState(): MockState {
  return {
    contacts: Array.from({ length: 53 }, (_, index) => ({
      id: `contact-${String(index + 1).padStart(3, '0')}`,
      name: `联系人 ${String(index + 1).padStart(2, '0')}`,
      email: `contact${index + 1}@example.test`,
      enabled: index % 3 !== 0,
    })),
    operations: {},
    nextId: 54,
    scenario: 'normal',
    hasWritten: false,
  };
}
let database: Promise<IDBDatabase> | undefined;
function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('gvueter-contact-example-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('server');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return database;
}
// AI modified: each mock write commits atomically before its HTTP response, surviving page reloads.
export async function accessMockServer<T>(
  visit: (state: MockState) => T,
  reset = false,
): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction('server', 'readwrite');
    const store = transaction.objectStore('server');
    const read = store.get('state');
    let answer: T;
    read.onsuccess = () => {
      try {
        const state = reset || !read.result ? initialState() : (read.result as MockState);
        answer = visit(state);
        store.put(state, 'state');
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    };
    transaction.oncomplete = () => resolve(answer);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(new Error('模拟服务事务中止'));
  });
}
