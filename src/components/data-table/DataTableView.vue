<script setup lang="ts" generic="TData extends object = Record<string, unknown>">
import type { DataTableViewComponentProps } from '@/types/data-table/component-contracts'

import { AlertCircle, Inbox } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FlexRender } from '@tanstack/vue-table'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// AI modified: table props use centralized pure types.

// AI modified: DataTableView renders TanStack Table v9 rows with flexible slots for loading, empty, and error states.

const props = withDefaults(defineProps<DataTableViewComponentProps<TData>>(), {
  isLoading: false,
  isError: false,
  errorMessage: undefined,
  emptyTitle: undefined,
  emptyDescription: undefined,
  loadingRowCount: 5,
})

const { t, te } = useI18n()

const columnCount = computed(() => {
  return props.table.getAllColumns().length || 1
})

const defaultEmptyTitle = computed(() => {
  if (props.emptyTitle) return props.emptyTitle
  return te('common.noData') ? t('common.noData') : '暂无数据'
})

const defaultErrorMessage = computed(() => {
  if (props.errorMessage) return props.errorMessage
  return te('common.loadFailed') ? t('common.loadFailed') : '数据加载失败，请重试'
})
</script>

<template>
  <div
    class="relative w-full overflow-auto rounded-md border border-[#E5E7EB] bg-white dark:border-[#30313A] dark:bg-[#1B1C22]"
  >
    <Table>
      <TableHeader>
        <TableRow
          v-for="headerGroup in table.getHeaderGroups()"
          :key="headerGroup.id"
          class="border-b border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#F9FAFB] dark:border-[#30313A] dark:bg-[#202128] dark:hover:bg-[#202128]"
        >
          <TableHead
            v-for="header in headerGroup.headers"
            :key="header.id"
            :col-span="header.colSpan"
            class="h-10 text-xs font-medium text-[#6B7280] dark:text-[#A1A1AA]"
          >
            <FlexRender
              v-if="!header.isPlaceholder"
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        <!-- Loading State -->
        <template v-if="isLoading">
          <slot name="loading">
            <TableRow
              v-for="rowIndex in loadingRowCount"
              :key="'skeleton-' + rowIndex"
              class="border-b border-[#F3F4F6] dark:border-[#272832]"
            >
              <TableCell
                v-for="colIndex in columnCount"
                :key="'skeleton-cell-' + colIndex"
                class="py-3"
              >
                <Skeleton class="h-5 w-full bg-[#E5E7EB]/60 dark:bg-[#30313A]/60" />
              </TableCell>
            </TableRow>
          </slot>
        </template>

        <!-- Error State -->
        <template v-else-if="isError">
          <TableRow>
            <TableCell :col-span="columnCount" class="h-48 text-center">
              <slot name="error">
                <div class="flex flex-col items-center justify-center gap-2 text-destructive">
                  <AlertCircle class="size-8" />
                  <p class="text-sm font-medium">{{ defaultErrorMessage }}</p>
                </div>
              </slot>
            </TableCell>
          </TableRow>
        </template>

        <!-- Empty State -->
        <template v-else-if="table.getRowModel().rows.length === 0">
          <TableRow>
            <TableCell :col-span="columnCount" class="h-48 text-center">
              <slot name="empty">
                <div
                  class="flex flex-col items-center justify-center gap-2 text-[#9CA3AF] dark:text-[#71717A]"
                >
                  <Inbox class="size-9 stroke-[1.5]" />
                  <p class="text-sm font-medium text-[#374151] dark:text-[#D1D5DB]">
                    {{ defaultEmptyTitle }}
                  </p>
                  <p v-if="emptyDescription" class="text-xs text-[#9CA3AF] dark:text-[#71717A]">
                    {{ emptyDescription }}
                  </p>
                </div>
              </slot>
            </TableCell>
          </TableRow>
        </template>

        <!-- Data Rows -->
        <template v-else>
          <TableRow
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            :data-state="row.getIsSelected() ? 'selected' : undefined"
            class="border-b border-[#F3F4F6] transition-colors hover:bg-[#F9FAFB] dark:border-[#272832] dark:hover:bg-[#25262C] data-[state=selected]:bg-[#F1E9FF]/50 dark:data-[state=selected]:bg-[#302044]/40"
          >
            <TableCell
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              class="py-3 text-sm text-[#1F2937] dark:text-[#E5E7EB]"
            >
              <slot :name="'cell-' + cell.column.id" :cell="cell" :row="row">
                <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
              </slot>
            </TableCell>
          </TableRow>
        </template>
      </TableBody>
    </Table>
  </div>
</template>
