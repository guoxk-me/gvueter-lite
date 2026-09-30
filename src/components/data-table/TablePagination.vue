<script setup lang="ts">
import type { TablePaginationComponentProps } from '@/types/data-table/component-contracts'

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
// AI modified: shared pure types live in the centralized owner directory.

const props = withDefaults(defineProps<TablePaginationComponentProps>(), {
  pageSizeOptions: () => [10, 20, 50],
  disabled: false,
})

const emits = defineEmits<{
  (e: 'update:pageIndex', index: number): void
  (e: 'update:pageSize', size: number): void
  (e: 'pageChange', payload: { index: number; size: number }): void
}>()

const { t, te } = useI18n()

const totalPages = computed(() => {
  return Math.max(1, Math.ceil(props.total / props.pageSize))
})

const startRecord = computed(() => {
  if (props.total === 0) return 0
  return props.pageIndex * props.pageSize + 1
})

const endRecord = computed(() => {
  return Math.min((props.pageIndex + 1) * props.pageSize, props.total)
})

const canGoPrevious = computed(() => props.pageIndex > 0 && !props.disabled)
const canGoNext = computed(() => props.pageIndex < totalPages.value - 1 && !props.disabled)

function setPageIndex(newIndex: number): void {
  const boundedIndex = Math.max(0, Math.min(newIndex, totalPages.value - 1))
  if (boundedIndex === props.pageIndex) return
  emits('update:pageIndex', boundedIndex)
  emits('pageChange', { index: boundedIndex, size: props.pageSize })
}

function handlePageSizeChange(newSize: unknown): void {
  const sizeNum = Number(newSize)
  if (isNaN(sizeNum) || sizeNum <= 0 || sizeNum === props.pageSize) return
  emits('update:pageSize', sizeNum)
  emits('update:pageIndex', 0)
  emits('pageChange', { index: 0, size: sizeNum })
}

const summaryText = computed(() => {
  if (te('table.paginationSummary')) {
    return t('table.paginationSummary', {
      start: startRecord.value,
      end: endRecord.value,
      total: props.total,
    })
  }
  return `第 ${startRecord.value}-${endRecord.value} 条 · 共 ${props.total} 条`
})

const pageCountText = computed(() => {
  if (te('table.pageOf')) {
    return t('table.pageOf', {
      // AI modified: match the locale message's page and totalPages placeholders.
      page: props.pageIndex + 1,
      totalPages: totalPages.value,
    })
  }
  return `${props.pageIndex + 1} / ${totalPages.value}`
})
</script>

<template>
  <div
    class="flex flex-col items-center justify-between gap-3 px-2 py-3 text-xs text-[#6B7280] sm:flex-row dark:text-[#A1A1AA]"
  >
    <div class="flex items-center gap-4">
      <span>{{ summaryText }}</span>
      <div class="flex items-center gap-1.5">
        <Select
          :model-value="String(pageSize)"
          :disabled="disabled"
          @update:model-value="handlePageSizeChange"
        >
          <SelectTrigger class="h-8 w-24 text-xs">
            <SelectValue :placeholder="String(pageSize)" />
          </SelectTrigger>
          <SelectContent side="top">
            <SelectItem
              v-for="size in pageSizeOptions"
              :key="size"
              :value="String(size)"
              class="text-xs"
            >
              {{ size }} 条/页
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>

    <div class="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon-sm"
        :disabled="!canGoPrevious"
        :aria-label="t('table.firstPage', '首页')"
        @click="setPageIndex(0)"
      >
        <ChevronsLeft class="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        :disabled="!canGoPrevious"
        :aria-label="t('table.prevPage', '上一页')"
        @click="setPageIndex(pageIndex - 1)"
      >
        <ChevronLeft class="size-4" />
      </Button>

      <span class="px-2 text-xs font-medium text-[#374151] dark:text-[#E5E7EB]">
        {{ pageCountText }}
      </span>

      <Button
        variant="outline"
        size="icon-sm"
        :disabled="!canGoNext"
        :aria-label="t('table.nextPage', '下一页')"
        @click="setPageIndex(pageIndex + 1)"
      >
        <ChevronRight class="size-4" />
      </Button>
      <Button
        variant="outline"
        size="icon-sm"
        :disabled="!canGoNext"
        :aria-label="t('table.lastPage', '末页')"
        @click="setPageIndex(totalPages - 1)"
      >
        <ChevronsRight class="size-4" />
      </Button>
    </div>
  </div>
</template>
