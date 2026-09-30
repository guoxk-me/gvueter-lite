// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { RowData, ColumnDef, TableFeatures, SortingState, VueTable } from '@tanstack/vue-table'
import type { MaybeRefOrGetter, ComputedRef } from 'vue'

export type TableColumnDef<TRecord extends RowData = Record<string, unknown>> = ColumnDef<
  TableFeatures,
  TRecord,
  unknown
>

export interface DataTablePaginationConfig {
  index: number // 0-based
  size: number
  total: number
}

export interface UseDataTableOptions<TRecord extends RowData> {
  rows: MaybeRefOrGetter<TRecord[]>
  columns: MaybeRefOrGetter<TableColumnDef<TRecord>[]>
  getRowId: (record: TRecord) => string
  page?: MaybeRefOrGetter<DataTablePaginationConfig | undefined>
  sorting?: MaybeRefOrGetter<SortingState | undefined>
  onPageChange?: (page: { index: number; size: number }) => void
  onSortingChange?: (sorting: SortingState) => void
  onSelectionChange?: (selectedRowIds: string[]) => void
  features?: Partial<TableFeatures>
}

export interface DataTableReturn<TRecord extends RowData> {
  table: VueTable<TableFeatures, TRecord>
  selectedRowIds: ComputedRef<string[]>
  selectedRows: ComputedRef<TRecord[]>
  isAllPageRowsSelected: ComputedRef<boolean>
  isSomePageRowsSelected: ComputedRef<boolean>
  toggleAllPageRowsSelected: (value?: boolean) => void
  clearSelection: () => void
}
