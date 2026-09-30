import type {
  TableColumnDef,
  UseDataTableOptions,
  DataTableReturn,
} from '@/types/data-table/table-state'
// AI modified: shared pure types live in the centralized owner directory.

// AI modified: useDataTable encapsulates TanStack Table v9 server/controlled state, row selection, and pagination.
import { computed, ref, shallowRef, toValue, watch } from 'vue'
import {
  stockFeatures,
  useTable,
  type OnChangeFn,
  type PaginationState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type TableFeatures,
} from '@tanstack/vue-table'

export function useDataTable<TRecord extends RowData>(
  options: UseDataTableOptions<TRecord>,
): DataTableReturn<TRecord> {
  const rowSelection = ref<RowSelectionState>({})

  const paginationState = computed<PaginationState>(() => {
    const pageConfig = toValue(options.page)
    return {
      pageIndex: pageConfig?.index ?? 0,
      pageSize: pageConfig?.size ?? 10,
    }
  })

  const rowCount = computed<number>(() => {
    const pageConfig = toValue(options.page)
    return pageConfig?.total ?? toValue(options.rows).length
  })

  const sortingState = computed<SortingState>(() => {
    return toValue(options.sorting) ?? []
  })

  const handleRowSelectionChange: OnChangeFn<RowSelectionState> = (updater) => {
    const nextSelection = typeof updater === 'function' ? updater(rowSelection.value) : updater
    rowSelection.value = nextSelection
    const ids = Object.keys(nextSelection).filter((id) => nextSelection[id])
    options.onSelectionChange?.(ids)
  }

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    const nextSorting = typeof updater === 'function' ? updater(sortingState.value) : updater
    options.onSortingChange?.(nextSorting)
  }

  const handlePaginationChange: OnChangeFn<PaginationState> = (updater) => {
    const nextPagination = typeof updater === 'function' ? updater(paginationState.value) : updater
    options.onPageChange?.({
      index: nextPagination.pageIndex,
      size: nextPagination.pageSize,
    })
  }

  const tableData = computed<readonly TRecord[]>(() => toValue(options.rows))
  const tableColumns = shallowRef<TableColumnDef<TRecord>[]>(toValue(options.columns))
  watch(
    () => toValue(options.columns),
    (columns) => {
      tableColumns.value = columns
    },
  )

  const tableState = computed(() => ({
    pagination: paginationState.value,
    sorting: sortingState.value,
    rowSelection: rowSelection.value,
  }))

  // AI modified: useTable from TanStack Table v9 integrates with Vue reactivity via stockFeatures.
  const table = useTable<TableFeatures, TRecord>({
    features: {
      ...stockFeatures,
      ...options.features,
    },
    data: tableData,
    // AI modified: table headers and cell labels can update when the locale changes.
    columns: tableColumns,
    getRowId: options.getRowId,
    rowCount,
    manualPagination: true,
    manualSorting: true,
    state: tableState,
    onRowSelectionChange: handleRowSelectionChange,
    onSortingChange: handleSortingChange,
    onPaginationChange: handlePaginationChange,
  })

  // AI modified: clear page selection when page index, page size, or rows reference changes.
  watch(
    [
      () => toValue(options.page)?.index,
      () => toValue(options.page)?.size,
      () => toValue(options.rows),
    ],
    () => {
      if (Object.keys(rowSelection.value).length > 0) {
        rowSelection.value = {}
        options.onSelectionChange?.([])
      }
    },
  )

  const selectedRowIds = computed<string[]>(() =>
    Object.keys(rowSelection.value).filter((id) => rowSelection.value[id]),
  )

  const selectedRows = computed<TRecord[]>(() => {
    const currentRows = toValue(options.rows)
    const selectedSet = new Set(selectedRowIds.value)
    return currentRows.filter((item) => selectedSet.has(options.getRowId(item)))
  })

  const isAllPageRowsSelected = computed<boolean>(() => {
    const currentRows = toValue(options.rows)
    if (currentRows.length === 0) return false
    return currentRows.every((item) => {
      const id = options.getRowId(item)
      return Boolean(rowSelection.value[id])
    })
  })

  const isSomePageRowsSelected = computed<boolean>(() => {
    const currentRows = toValue(options.rows)
    if (currentRows.length === 0) return false
    const selectedCount = currentRows.filter((item) => {
      const id = options.getRowId(item)
      return Boolean(rowSelection.value[id])
    }).length
    return selectedCount > 0 && selectedCount < currentRows.length
  })

  function toggleAllPageRowsSelected(value?: boolean): void {
    const currentRows = toValue(options.rows)
    const nextValue = value !== undefined ? value : !isAllPageRowsSelected.value

    const nextSelection: RowSelectionState = { ...rowSelection.value }
    for (const row of currentRows) {
      const id = options.getRowId(row)
      if (nextValue) {
        nextSelection[id] = true
      } else {
        delete nextSelection[id]
      }
    }

    rowSelection.value = nextSelection
    const ids = Object.keys(nextSelection).filter((id) => nextSelection[id])
    options.onSelectionChange?.(ids)
  }

  function clearSelection(): void {
    rowSelection.value = {}
    options.onSelectionChange?.([])
  }

  return {
    table,
    selectedRowIds,
    selectedRows,
    isAllPageRowsSelected,
    isSomePageRowsSelected,
    toggleAllPageRowsSelected,
    clearSelection,
  }
}
