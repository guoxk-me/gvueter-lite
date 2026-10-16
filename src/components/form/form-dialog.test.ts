import { afterEach, expect, test, vi } from 'vite-plus/test';
import { mount, flushPromises } from '@vue/test-utils';
import { type Component } from 'vue';
import FormDialog from './FormDialog.vue';
import type { FormHandle, GuardOutcome } from './types';
const wrappers: ReturnType<typeof mount>[] = [];
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = '';
});
interface Editor extends FormHandle {
  requestClose: () => Promise<GuardOutcome>;
}
function fixture(
  load: (context: { mode: 'edit'; id: string }) => Promise<{ name: string }>,
  submit = vi.fn(async () => 'saved'),
) {
  const wrapper = mount(FormDialog as Component, {
    attachTo: document.body,
    props: {
      open: true,
      context: { mode: 'edit', id: '1' },
      title: '编辑',
      fields: [{ name: 'name', label: '姓名', control: 'input' }],
      load,
      submit,
    },
  });
  wrappers.push(wrapper);
  return { wrapper, handle: wrapper.vm as unknown as Editor, submit };
}
test('loading gates submission; close/reopen ignores a late old read and snapshots the context', async () => {
  let oldRead!: (values: { name: string }) => void;
  const load = vi.fn((context: { id: string }) =>
    context.id === '1'
      ? new Promise<{ name: string }>((resolve) => {
          oldRead = resolve;
        })
      : Promise.resolve({ name: 'second' }),
  );
  const { wrapper, handle, submit } = fixture(load);
  await flushPromises();
  expect(await handle.submit()).toEqual({ status: 'not-executed' });
  await handle.requestClose();
  await wrapper.setProps({ open: false });
  await wrapper.setProps({ open: true, context: { mode: 'edit', id: '2' } });
  await flushPromises();
  oldRead({ name: 'stale' });
  await flushPromises();
  expect(document.querySelector('input')?.value).toBe('second');
  await wrapper.setProps({ context: { mode: 'edit', id: '3' } });
  await handle.submit();
  expect(submit).toHaveBeenCalledWith({ name: 'second' }, { mode: 'edit', id: '2' });
});
test('initial read failure can retry and new load props never overwrite an active draft', async () => {
  const load = vi
    .fn()
    .mockRejectedValueOnce(new Error('read failed'))
    .mockResolvedValue({ name: 'loaded' });
  const { wrapper } = fixture(load);
  await flushPromises();
  expect(document.body.textContent).toContain('read failed');
  [...document.querySelectorAll('button')]
    .find((button) => button.textContent?.includes('重试读取'))!
    .click();
  await flushPromises();
  expect(document.querySelector('input')?.value).toBe('loaded');
  await wrapper.setProps({ load: async () => ({ name: 'background' }) });
  await flushPromises();
  expect(document.querySelector('input')?.value).toBe('loaded');
  expect(load).toHaveBeenCalledTimes(2);
});
