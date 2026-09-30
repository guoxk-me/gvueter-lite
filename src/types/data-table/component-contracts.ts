// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { VueTable, TableFeatures } from '@tanstack/vue-table'

export interface DataTableViewComponentProps<TData extends object = Record<string, unknown>> {
  table: VueTable<TableFeatures, TData>
  isLoading?: boolean
  isError?: boolean
  errorMessage?: string
  emptyTitle?: string
  emptyDescription?: string
  loadingRowCount?: number
}

export interface TablePaginationComponentProps {
  pageIndex: number // 0-based
  pageSize: number
  total: number
  pageSizeOptions?: number[]
  disabled?: boolean
}

export interface TableSelectionBarComponentProps {
  selectedCount: number
  totalCurrentPageCount?: number
}
