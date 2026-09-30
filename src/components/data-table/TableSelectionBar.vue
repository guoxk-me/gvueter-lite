<script setup lang="ts">
import type { TableSelectionBarComponentProps } from '@/types/data-table/component-contracts'

import { CheckCircle2, X } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
// AI modified: shared pure types live in the centralized owner directory.

const props = defineProps<TableSelectionBarComponentProps>()

const emits = defineEmits<{
  (e: 'clear'): void
}>()

const { t, te } = useI18n()

const selectedText = computed(() => {
  if (te('table.selectedCount')) {
    return t('table.selectedCount', { count: props.selectedCount })
  }
  return `已选择 ${props.selectedCount} 项`
})

const clearText = computed(() => {
  if (te('table.clearSelection')) {
    return t('table.clearSelection')
  }
  return '清空选择'
})
</script>

<template>
  <div
    v-if="selectedCount > 0"
    role="status"
    class="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#DDD6FF] bg-[#F5F3FF] px-3.5 py-2 text-sm text-[#5D0FC0] transition-all dark:border-[#493566] dark:bg-[#241B31] dark:text-[#D1BEFF]"
  >
    <div class="flex items-center gap-2">
      <CheckCircle2 class="size-4 shrink-0" />
      <span class="font-medium">{{ selectedText }}</span>
      <Button
        variant="ghost"
        size="xs"
        class="h-6 cursor-pointer px-2 text-xs text-[#5D0FC0] hover:bg-[#E9DEFF] dark:text-[#D1BEFF] dark:hover:bg-[#382650]"
        @click="emits('clear')"
      >
        <X class="size-3.5" />
        {{ clearText }}
      </Button>
    </div>

    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </div>
</template>
