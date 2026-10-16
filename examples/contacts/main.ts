import { createApp, shallowRef } from 'vue';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { toast } from 'vue-sonner';
import { createQueryRuntime, queryRuntimeKey } from '@/query/runtime';
import type { QueryIdentity } from '@/query/runtime';
import './style.css';
import 'vue-sonner/style.css';

// AI modified: this independent entry is never imported by the production application.
async function start() {
  if (!import.meta.env.DEV || import.meta.env.MODE !== 'examples')
    throw new Error('示例仅在开发模式运行');
  const { network } = await import('virtual:msw');
  const { handlers } = await import('./handlers');
  network.configure({ handlers, onUnhandledFrame: 'bypass' });
  await network.enable();
  let storage: Storage | undefined;
  try {
    storage = sessionStorage;
  } catch {
    /* The runtime reports unavailable persistence. */
  }
  const identity = shallowRef<QueryIdentity | null>({
    accountId: 'example-user',
    context: 'example-session',
  });
  const runtime = createQueryRuntime({
    identity,
    storage,
    notify: (message, tone = 'error') => toast[tone](message),
  });
  const { default: ContactsExample } = await import('./ContactsExample.vue');
  createApp(ContactsExample)
    .provide(queryRuntimeKey, runtime)
    .use(VueQueryPlugin, { queryClient: runtime.client })
    .mount('#app');
}
void start().catch((error) => {
  const root = document.getElementById('app');
  if (root) {
    root.setAttribute('role', 'alert');
    root.textContent = `示例启动失败：${error instanceof Error ? error.message : '未知错误'}`;
  }
});
