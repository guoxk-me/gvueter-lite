import { afterEach, expect, test, vi } from 'vite-plus/test';
import { flushPromises, mount } from '@vue/test-utils';
import { type Component, shallowRef } from 'vue';
import { VueQueryPlugin } from '@tanstack/vue-query';
import { createQueryRuntime, queryRuntimeKey } from '@/query/runtime';
import { ApiError } from '@/http/api-error';
import DataTable from './DataTable.vue';
import type { TableCommandOutcome, TableRequest } from './types';
interface Row {
  id: string;
  name: string;
}
type Request = TableRequest<{ keyword: string }, { team: string }>;
interface Handle {
  refresh: () => Promise<TableCommandOutcome>;
  submitSearch: () => Promise<TableCommandOutcome>;
  selectedIds: readonly string[];
}
const cleanups: (() => void)[] = [];
afterEach(() => {
  cleanups.splice(0).forEach((cleanup) => cleanup());
});
function fixture(
  read = vi.fn(async (_request: Request) => ({ records: [{ id: '1', name: 'first' }], total: 40 })),
  extra: Record<string, unknown> = {},
  slots = {},
) {
  const notify = vi.fn();
  const identity = shallowRef({ accountId: 'a', context: 'a1' });
  const runtime = createQueryRuntime({ identity, notify });
  const wrapper = mount(DataTable as Component, {
    props: {
      tableId: 'test',
      queryContext: { team: 'a' },
      selectable: true,
      searchDefaults: { keyword: '' },
      searchFields: [{ name: 'keyword', label: '搜索', control: 'input' }],
      columns: [{ id: 'name', title: '姓名', field: 'name', sortField: 'name' }],
      query: (request: Request) => ({
        queryKey: ['a1', 'rows', request],
        queryFn: () => read(request),
      }),
      ...extra,
    },
    slots,
    global: {
      provide: { [queryRuntimeKey as symbol]: runtime },
      plugins: [[VueQueryPlugin, { queryClient: runtime.client }]],
    },
  });
  cleanups.push(() => {
    wrapper.unmount();
    runtime.dispose();
  });
  return { wrapper, read, notify, handle: wrapper.vm as unknown as Handle };
}
async function settled() {
  await flushPromises();
  await flushPromises();
}
test('drafts stay out of paging and refresh; applying search issues one final query', async () => {
  const { wrapper, read, handle } = fixture();
  await settled();
  await wrapper.get('input').setValue('draft');
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '下一页')!
    .trigger('click');
  await settled();
  expect(read.mock.lastCall![0]).toMatchObject({ search: { keyword: '' }, page: 2 });
  await handle.refresh();
  expect(read.mock.lastCall![0].search.keyword).toBe('');
  const count = read.mock.calls.length;
  expect(await handle.submitSearch()).toEqual({ status: 'success' });
  await settled();
  expect(read).toHaveBeenCalledTimes(count + 1);
  expect(read.mock.lastCall![0]).toMatchObject({ search: { keyword: 'draft' }, page: 1 });
});
test('equivalent context retains page; changed context resets once and disabled queries hide cached rows', async () => {
  const { wrapper, read } = fixture();
  await settled();
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '下一页')!
    .trigger('click');
  await settled();
  const count = read.mock.calls.length;
  await wrapper.setProps({ queryContext: { team: 'a' } });
  await settled();
  expect(read).toHaveBeenCalledTimes(count);
  await wrapper.setProps({ queryContext: { team: 'b' } });
  await settled();
  expect(read).toHaveBeenCalledTimes(count + 1);
  expect(read.mock.lastCall![0].page).toBe(1);
  await wrapper.setProps({ queryEnabled: false });
  await settled();
  expect(wrapper.text()).not.toContain('first');
  await wrapper.get('input').setValue('unsubmitted');
  await wrapper.setProps({ queryEnabled: true });
  await settled();
  expect(read.mock.lastCall![0].search.keyword).toBe('');
});
test('refresh failure keeps legal selection and successful refresh intersects current page IDs', async () => {
  const { wrapper, read, handle } = fixture();
  await settled();
  await wrapper.get('[aria-label="选择 1"]').trigger('click');
  expect(handle.selectedIds).toEqual(['1']);
  read.mockRejectedValueOnce(new ApiError('rejected', 'http', 400));
  expect(await handle.refresh()).toEqual({ status: 'failed' });
  expect(handle.selectedIds).toEqual(['1']);
  expect(wrapper.text()).toContain('first');
  read.mockResolvedValueOnce({ records: [{ id: '2', name: 'second' }], total: 1 });
  await handle.refresh();
  await settled();
  expect(handle.selectedIds).toEqual([]);
});
test('new uncached query hides old rows; missing row IDs are explicit contract errors', async () => {
  let finish!: (page: { records: Row[]; total: number }) => void;
  const { wrapper, read, notify } = fixture();
  await settled();
  read.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  await wrapper
    .findAll('button')
    .find((button) => button.text() === '下一页')!
    .trigger('click');
  await settled();
  expect(wrapper.text()).not.toContain('first');
  expect(wrapper.text()).toContain('正在加载');
  finish({ records: [{ id: '', name: 'invalid' }], total: 1 });
  await settled();
  expect(wrapper.text()).toContain('表格行键缺失或非法');
  expect(notify).toHaveBeenCalledWith('表格行键缺失或非法');
});
test('an empty cell slot remains authoritative over a render callback', async () => {
  const render = vi.fn(() => 'fallback');
  const { wrapper } = fixture(
    undefined,
    { columns: [{ id: 'name', title: '姓名', render }] },
    { 'cell-name': () => [] },
  );
  await settled();
  expect(render).not.toHaveBeenCalled();
  expect(wrapper.text()).not.toContain('fallback');
});
