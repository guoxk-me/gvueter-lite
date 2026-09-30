import { describe, expect, it, vi } from 'vite-plus/test'
import { nextTick, ref } from 'vue'
import { useDataTable } from './use-data-table'

interface MockUser {
  id: string
  name: string
  role: string
}

describe('useDataTable', () => {
  const users: MockUser[] = [
    { id: 'u-1', name: 'Alice', role: 'admin' },
    { id: 'u-2', name: 'Bob', role: 'member' },
  ]

  const columns = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'role', header: 'Role' },
  ]

  it('initializes table and returns row models', () => {
    const dataTable = useDataTable({
      rows: users,
      columns,
      getRowId: (user) => user.id,
      page: { index: 0, size: 10, total: 2 },
    })

    expect(dataTable.table).toBeDefined()
    expect(dataTable.table.getRowModel().rows).toHaveLength(2)
    expect(dataTable.selectedRowIds.value).toEqual([])
    expect(dataTable.isAllPageRowsSelected.value).toBe(false)
  })

  it('manages row selection and emits onSelectionChange', () => {
    const onSelectionChange = vi.fn()
    const dataTable = useDataTable({
      rows: users,
      columns,
      getRowId: (user) => user.id,
      onSelectionChange,
    })

    dataTable.toggleAllPageRowsSelected(true)
    expect(dataTable.selectedRowIds.value).toEqual(['u-1', 'u-2'])
    expect(dataTable.isAllPageRowsSelected.value).toBe(true)
    expect(dataTable.isSomePageRowsSelected.value).toBe(false)
    expect(onSelectionChange).toHaveBeenCalledWith(['u-1', 'u-2'])

    dataTable.clearSelection()
    expect(dataTable.selectedRowIds.value).toEqual([])
    expect(dataTable.isAllPageRowsSelected.value).toBe(false)
    expect(onSelectionChange).toHaveBeenCalledWith([])
  })

  it('clears selection when page changes', async () => {
    const page = ref({ index: 0, size: 10, total: 20 })
    const onSelectionChange = vi.fn()

    const dataTable = useDataTable({
      rows: users,
      columns,
      getRowId: (user) => user.id,
      page,
      onSelectionChange,
    })

    dataTable.toggleAllPageRowsSelected(true)
    expect(dataTable.selectedRowIds.value).toHaveLength(2)

    page.value = { index: 1, size: 10, total: 20 }
    await nextTick()

    expect(dataTable.selectedRowIds.value).toEqual([])
    expect(onSelectionChange).toHaveBeenLastCalledWith([])
  })
})
