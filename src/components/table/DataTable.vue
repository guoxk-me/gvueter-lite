<script
  setup
  lang="ts"
  generic="T extends object, S extends object = Record<string, never>, C = undefined"
>
import {
  computed,
  onActivated,
  onDeactivated,
  onBeforeUnmount,
  shallowRef,
  watch,
  nextTick,
  useSlots,
  type VNodeChild,
} from 'vue';
import { useQuery } from '@tanstack/vue-query';
import {
  useTable,
  tableFeatures,
  rowPaginationFeature,
  rowSortingFeature,
  rowSelectionFeature,
  type RowSelectionState,
} from '@tanstack/vue-table';
import { copySnapshot, snapshotKey } from '@/composables/state-snapshot';
import { useQueryRuntime } from '@/query/runtime';
import { SchemaForm, type FormField, type FormHandle, type SubmitValues } from '@/components/form';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type {
  DataTableColumn,
  DataTableHandle,
  TableQuery,
  TableRequest,
  TableSort,
  TableCommandOutcome,
} from './types';
const props = withDefaults(
  defineProps<{
    tableId: string;
    query: (request: TableRequest<S, C>) => TableQuery<T>;
    columns: readonly DataTableColumn<T>[];
    searchFields?: readonly FormField<S>[];
    searchDefaults?: S;
    queryContext?: C;
    queryEnabled?: boolean;
    selectable?: boolean;
    getRowId?: (row: T) => string | number;
    isRowSelectable?: (row: T) => boolean;
    pageSize?: number;
    pageSizeOptions?: readonly number[];
  }>(),
  { queryEnabled: true, selectable: false, pageSize: 20, pageSizeOptions: () => [10, 20, 50, 100] },
);
defineSlots<{
  toolbar?: (scope: DataTableHandle<T>) => VNodeChild;
  waiting?: () => VNodeChild;
  [name: `cell-${string}`]: (scope: { row: T; value: unknown }) => VNodeChild;
}>();
const slots = useSlots();
const runtime = useQueryRuntime();
const isVisible = shallowRef(true);
const searchRef = shallowRef<FormHandle | null>(null);
const searchConfig = { defaults: copySnapshot(props.searchDefaults ?? ({} as S)) };
const request = shallowRef<TableRequest<S, C>>({
  search: copySnapshot(searchConfig.defaults),
  context: copySnapshot(props.queryContext),
  page: 1,
  pageSize: props.pageSize,
  sort: null,
} as TableRequest<S, C>);
const selection = shallowRef<RowSelectionState>({});
let alive = true;
let command = 0;
const options = computed(() => props.query(copySnapshot(request.value)));
const enabled = computed(
  () =>
    Boolean(runtime.identity.value) &&
    isVisible.value &&
    props.queryEnabled &&
    options.value.enabled !== false,
);
const resource = useQuery(
  computed(() => ({ ...options.value, enabled: enabled.value, placeholderData: undefined })),
  runtime.client,
);
const records = computed(() => (enabled.value ? (resource.data.value?.records ?? []) : []));
const total = computed(() => (enabled.value ? (resource.data.value?.total ?? 0) : 0));
function rowId(row: T): string | number {
  const id: unknown = props.getRowId ? props.getRowId(row) : 'id' in row ? row.id : undefined;
  if (
    (typeof id !== 'string' && typeof id !== 'number') ||
    id === '' ||
    (typeof id === 'number' && !Number.isFinite(id))
  )
    throw new Error('表格行键缺失或非法');
  return id;
}
const contractError = computed(() => {
  try {
    const ids = records.value.map((row) => String(rowId(row)));
    if (new Set(ids).size !== ids.length) return '表格行键重复';
    if (new Set(props.columns.map((column) => column.id)).size !== props.columns.length)
      return '表格列 ID 重复';
    return '';
  } catch (error) {
    return error instanceof Error ? error.message : '表格契约错误';
  }
});
const safeRecords = computed(() => (contractError.value ? [] : records.value));
const selectedRows = computed(() =>
  safeRecords.value.filter(
    (row) => selection.value[String(rowId(row))] && (props.isRowSelectable?.(row) ?? true),
  ),
);
const selectedIds = computed(() => selectedRows.value.map(rowId));
const columns = computed(() =>
  props.columns.map((column) => ({
    id: column.id,
    header: column.title,
    accessorFn: (row: T) => cellValue(column, row),
    enableSorting: Boolean(column.sortField),
  })),
);
// AI modified: TanStack owns row/column mechanics while all query changes pass one coordinator.
const features = tableFeatures({ rowPaginationFeature, rowSortingFeature, rowSelectionFeature });
const table = useTable<typeof features, T>({
  features,
  columns,
  data: safeRecords,
  getRowId: (row) => String(rowId(row)),
  manualPagination: true,
  manualSorting: true,
  autoResetPageIndex: false,
  rowCount: total,
  enableRowSelection: (row) => props.selectable && (props.isRowSelectable?.(row.original) ?? true),
  state: computed(() => ({
    pagination: { pageIndex: request.value.page - 1, pageSize: request.value.pageSize },
    rowSelection: selection.value,
    sorting: request.value.sort
      ? [
          {
            id:
              props.columns.find((column) => column.sortField === request.value.sort?.field)?.id ??
              '',
            desc: request.value.sort.direction === 'desc',
          },
        ]
      : [],
  })),
  onRowSelectionChange: (update) => {
    selection.value = typeof update === 'function' ? update(selection.value) : update;
  },
});
function cellValue(column: DataTableColumn<T>, row: T): unknown {
  return column.read ? column.read(row) : column.field ? row[column.field] : undefined;
}
function clearSelection(ids?: readonly (string | number)[]) {
  if (!ids) {
    selection.value = {};
    return;
  }
  const remaining = { ...selection.value };
  for (const id of ids) delete remaining[String(id)];
  selection.value = remaining;
}
function apply(patch: Partial<TableRequest<S, C>>) {
  command++;
  clearSelection();
  request.value = { ...request.value, ...copySnapshot(patch) };
}
async function waitForQuery(run: number, force = false): Promise<TableCommandOutcome> {
  await nextTick();
  if (!alive || !enabled.value) return { status: 'not-executed' };
  if (run !== command) return { status: 'superseded' };
  // AI modified: join the observer's new-key request instead of issuing a second fast request.
  if (force) await resource.refetch({ cancelRefetch: false });
  else if (resource.isFetching.value) {
    try {
      await runtime.client.fetchQuery(options.value);
    } catch {
      /* QueryCache owns final feedback. */
    }
  }
  if (!alive || !enabled.value) return { status: 'not-executed' };
  if (run !== command) return { status: 'superseded' };
  return { status: resource.isError.value ? 'failed' : 'success' };
}
async function applySearch(search: SubmitValues<S, readonly FormField<S>[]>) {
  const previousKey = snapshotKey(options.value.queryKey);
  apply({ search: copySnapshot(search) as S, page: 1 });
  const completed = await waitForQuery(
    command,
    previousKey === snapshotKey(options.value.queryKey),
  );
  return completed;
}
async function submitSearch(): Promise<TableCommandOutcome> {
  if (!alive || !searchRef.value) return { status: 'not-executed' };
  const submitted = await searchRef.value.submit();
  if (submitted.status === 'success') return submitted.saved as TableCommandOutcome;
  return {
    status: submitted.status === 'validation-failed' ? 'validation-failed' : 'not-executed',
  };
}
async function resetSearch(): Promise<TableCommandOutcome> {
  const previousKey = snapshotKey(options.value.queryKey);
  if ((await searchRef.value?.reset())?.status === 'blocked') return { status: 'not-executed' };
  apply({ search: copySnapshot(searchConfig.defaults), page: 1 });
  return waitForQuery(command, previousKey === snapshotKey(options.value.queryKey));
}
async function refresh(): Promise<TableCommandOutcome> {
  if (!enabled.value) return { status: 'not-executed' };
  return waitForQuery(++command, true);
}
function goToPage(page: number) {
  apply({ page: Math.max(1, page) });
}
function setPageSize(size: unknown) {
  const pageSize = Number(size);
  if (props.pageSizeOptions.includes(pageSize)) apply({ pageSize, page: 1 });
}
function sortColumn(column: DataTableColumn<T>) {
  if (!column.sortField) return;
  const prior = request.value.sort;
  const sort: TableSort | null =
    prior?.field !== column.sortField
      ? { field: column.sortField, direction: 'asc' }
      : prior.direction === 'asc'
        ? { field: column.sortField, direction: 'desc' }
        : null;
  apply({ sort, page: 1 });
}
watch(
  () => snapshotKey(props.queryContext),
  () => apply({ context: copySnapshot(props.queryContext) as C, page: 1 }),
  { flush: 'sync' },
);
watch(
  enabled,
  (allow) => {
    if (!allow) {
      command++;
      clearSelection();
    }
  },
  { flush: 'sync' },
);
watch(
  () => runtime.identity.value?.context,
  () => {
    apply({ page: 1 });
  },
);
watch(
  () => [resource.data.value, resource.dataUpdatedAt.value, resource.isFetching.value],
  () => {
    if (!enabled.value || resource.isFetching.value || resource.isError.value) return;
    selection.value = Object.fromEntries(selectedIds.value.map((id) => [String(id), true]));
  },
);
watch(contractError, (error) => {
  if (error) runtime.notify(error);
});
onActivated(() => {
  isVisible.value = true;
});
onDeactivated(() => {
  isVisible.value = false;
});
onBeforeUnmount(() => {
  alive = false;
  command++;
});
const isLoading = computed(() => enabled.value && resource.isLoading.value);
const isFetching = computed(() => enabled.value && resource.isFetching.value);
const error = computed(() => (enabled.value ? resource.error.value : null));
const RenderCell = (props: { content: () => VNodeChild }) => props.content();
defineExpose({
  refresh,
  submitSearch,
  resetSearch,
  clearSelection,
  selectedIds,
  selectedRows,
  isLoading,
  isFetching,
  error,
});
</script>
<template>
  <section :aria-label="tableId" class="flex flex-col gap-5">
    <SchemaForm
      v-if="searchFields?.length"
      :ref="(instance: unknown) => (searchRef = instance as FormHandle | null)"
      :initial-values="searchConfig.defaults"
      :fields="searchFields"
      :submit="applySearch"
      :protect-reset="false"
    >
      <template #actions
        ><div class="flex gap-2">
          <Button type="submit">搜索</Button
          ><Button type="button" variant="outline" @click="resetSearch">重置搜索</Button>
        </div></template
      >
    </SchemaForm>
    <div class="flex items-center justify-between gap-3">
      <slot
        name="toolbar"
        :selected-ids="selectedIds"
        :selected-rows="selectedRows"
        :refresh="refresh"
        :clear-selection="clearSelection"
        :submit-search="submitSearch"
        :reset-search="resetSearch"
        :is-loading="isLoading"
        :is-fetching="isFetching"
        :error="error"
      /><Button type="button" variant="outline" :disabled="!enabled || isFetching" @click="refresh"
        >刷新</Button
      >
    </div>
    <p v-if="!enabled" role="status"><slot name="waiting">请先满足查询条件。</slot></p>
    <p v-else-if="contractError" role="alert">{{ contractError }}</p>
    <template v-else>
      <p v-if="isLoading" role="status">正在加载列表…</p>
      <p v-else-if="isFetching" role="status">正在刷新…</p>
      <Table>
        <TableHeader
          ><TableRow>
            <TableHead v-if="selectable"
              ><Checkbox
                aria-label="选择当前页"
                :model-value="table.getIsAllPageRowsSelected()"
                :disabled="!safeRecords.length"
                @update:model-value="
                  (checked) => table.toggleAllPageRowsSelected(checked === true)
                "
            /></TableHead>
            <TableHead v-for="column in columns" :key="column.id">
              <Button
                v-if="column.enableSorting"
                variant="ghost"
                @click="sortColumn(props.columns.find((entry) => entry.id === column.id)!)"
                >{{ column.header }}
                {{
                  request.sort?.field ===
                  props.columns.find((entry) => entry.id === column.id)?.sortField
                    ? request.sort?.direction === 'asc'
                      ? '↑'
                      : '↓'
                    : ''
                }}</Button
              ><span v-else>{{ column.header }}</span>
            </TableHead>
          </TableRow></TableHeader
        >
        <TableBody>
          <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
            <TableCell v-if="selectable"
              ><Checkbox
                :aria-label="`选择 ${row.id}`"
                :model-value="row.getIsSelected()"
                :disabled="!row.getCanSelect()"
                @update:model-value="(checked) => row.toggleSelected(checked === true)"
            /></TableCell>
            <TableCell v-for="column in props.columns" :key="column.id">
              <slot
                v-if="slots[`cell-${column.id}`]"
                :name="`cell-${column.id}`"
                :row="row.original"
                :value="cellValue(column, row.original)"
              />
              <RenderCell
                v-else-if="column.render"
                :content="
                  () =>
                    column.render!({ row: row.original, value: cellValue(column, row.original) })
                "
              />
              <span
                v-else
                :class="
                  column.wrap
                    ? 'whitespace-normal'
                    : 'block max-w-64 truncate focus:whitespace-normal focus:overflow-visible'
                "
                :title="String(cellValue(column, row.original) ?? '')"
                tabindex="0"
                >{{ cellValue(column, row.original) }}</span
              >
            </TableCell>
          </TableRow>
          <TableRow v-if="!isLoading && !safeRecords.length"
            ><TableCell :colspan="props.columns.length + (selectable ? 1 : 0)"
              >暂无结果</TableCell
            ></TableRow
          >
        </TableBody>
      </Table>
      <div class="flex flex-wrap items-center justify-between gap-3">
        <p role="status">
          共 {{ total }} 条 · 第 {{ request.page }} 页 · 已选 {{ selectedIds.length }} 条
        </p>
        <div class="flex items-center gap-2">
          <NativeSelect
            aria-label="每页条数"
            :model-value="String(request.pageSize)"
            @update:model-value="setPageSize"
            ><NativeSelectOption v-for="size in pageSizeOptions" :key="size" :value="String(size)"
              >{{ size }} 条／页</NativeSelectOption
            ></NativeSelect
          ><Button
            variant="outline"
            :disabled="request.page <= 1"
            @click="goToPage(request.page - 1)"
            >上一页</Button
          ><Button
            variant="outline"
            :disabled="request.page * request.pageSize >= total"
            @click="goToPage(request.page + 1)"
            >下一页</Button
          >
        </div>
      </div>
    </template>
  </section>
</template>
