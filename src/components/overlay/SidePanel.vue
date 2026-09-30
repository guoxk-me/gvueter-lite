<script setup lang="ts">
import type { SidePanelComponentProps } from '@/types/overlay/side-panel'

import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from './ConfirmDialog.vue'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
// AI modified: shared pure types live in the centralized owner directory.

// AI modified: SidePanel implements Sheet-based drawer with unsaved-changes protection and focus preservation.

const props = withDefaults(defineProps<SidePanelComponentProps>(), {
  description: undefined,
  isDirty: false,
  isSubmitting: false,
  widthClass: 'sm:max-w-lg md:max-w-xl',
  side: 'right',
})

const emits = defineEmits<{
  (e: 'update:open', open: boolean): void
  (e: 'close'): void
}>()

defineSlots<{
  default(props: { requestClose: () => void }): unknown
  header?(): unknown
  footer?(props: { close: () => void }): unknown
}>()

const { t, te } = useI18n()
const isConfirmingDiscard = ref(false)

function handleOpenUpdate(nextOpen: boolean): void {
  if (nextOpen) {
    emits('update:open', true)
    return
  }

  // Prevent closing when submitting
  if (props.isSubmitting) {
    return
  }

  // If dirty, prompt discard confirmation
  if (props.isDirty) {
    isConfirmingDiscard.value = true
    return
  }

  forceClose()
}

// AI modified: form cancel actions share the Sheet's dirty-state close guard.
function requestClose(): void {
  handleOpenUpdate(false)
}

function forceClose(): void {
  isConfirmingDiscard.value = false
  emits('update:open', false)
  emits('close')
}

function handleDiscardCancel(): void {
  isConfirmingDiscard.value = false
}
</script>

<template>
  <Sheet :open="open" @update:open="handleOpenUpdate">
    <SheetContent
      :side="side"
      :class="cn('flex flex-col justify-between overflow-y-auto p-6 sm:p-7', widthClass)"
      @pointer-down-outside="
        (e) => {
          if (isSubmitting || isDirty) {
            e.preventDefault()
            handleOpenUpdate(false)
          }
        }
      "
      @escape-key-down="
        (e) => {
          if (isSubmitting || isDirty) {
            e.preventDefault()
            handleOpenUpdate(false)
          }
        }
      "
    >
      <div class="flex min-h-0 flex-1 flex-col">
        <SheetHeader class="border-b border-[#E5E7EB] pb-4 dark:border-[#30313A]">
          <slot name="header">
            <SheetTitle class="text-lg font-semibold text-[#111827] dark:text-[#F3F4F6]">
              {{ title }}
            </SheetTitle>
            <SheetDescription v-if="description" class="text-xs text-[#6B7280] dark:text-[#A1A1AA]">
              {{ description }}
            </SheetDescription>
          </slot>
        </SheetHeader>

        <!-- AI modified: reserve space for control focus rings inside the scroll container without shifting content alignment. -->
        <div class="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-5">
          <slot :request-close="requestClose" />
        </div>
      </div>

      <SheetFooter
        v-if="$slots.footer"
        class="border-t border-[#E5E7EB] pt-4 dark:border-[#30313A]"
      >
        <slot name="footer" :close="requestClose" />
      </SheetFooter>
    </SheetContent>

    <!-- Discard confirmation dialog -->
    <ConfirmDialog
      :open="isConfirmingDiscard"
      :title="te('common.discardChanges') ? t('common.discardChanges') : '放弃未保存的修改？'"
      :description="
        te('common.discardDescription')
          ? t('common.discardDescription')
          : '当前表单有尚未保存的内容，关闭后这些内容将被丢弃。'
      "
      :confirm-text="te('common.discard') ? t('common.discard') : '放弃修改'"
      :cancel-text="te('common.continueEditing') ? t('common.continueEditing') : '继续编辑'"
      variant="destructive"
      @confirm="forceClose"
      @cancel="handleDiscardCancel"
      @update:open="
        (val) => {
          if (!val) handleDiscardCancel()
        }
      "
    />
  </Sheet>
</template>
