<script setup lang="ts">
import type { ConfirmDialogComponentProps } from '@/types/overlay/confirmation'

import { LoaderCircle } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
// AI modified: shared pure types live in the centralized owner directory.

// AI modified: ConfirmDialog wraps AlertDialog primitive for high-impact actions with loading and duplicate-submission protection.

const props = withDefaults(defineProps<ConfirmDialogComponentProps>(), {
  confirmText: undefined,
  cancelText: undefined,
  variant: 'default',
  isLoading: false,
})

const emits = defineEmits<{
  (e: 'update:open', open: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

const { t, te } = useI18n()

const defaultConfirmText = computed(() => {
  if (props.confirmText) return props.confirmText
  return te('common.confirm') ? t('common.confirm') : '确认'
})

const defaultCancelText = computed(() => {
  if (props.cancelText) return props.cancelText
  return te('common.cancel') ? t('common.cancel') : '取消'
})

function handleConfirm(): void {
  if (props.isLoading) return
  emits('confirm')
}

function handleCancel(): void {
  if (props.isLoading) return
  emits('update:open', false)
  emits('cancel')
}

function handleOpenChange(newOpen: boolean): void {
  if (props.isLoading && !newOpen) return
  emits('update:open', newOpen)
  if (!newOpen) {
    emits('cancel')
  }
}
</script>

<template>
  <AlertDialog :open="open" @update:open="handleOpenChange">
    <AlertDialogContent
      class="sm:max-w-md"
      @escape-key-down="
        (e) => {
          if (isLoading) e.preventDefault()
        }
      "
    >
      <AlertDialogHeader>
        <AlertDialogTitle class="text-base font-semibold text-[#111827] dark:text-[#F3F4F6]">
          {{ title }}
        </AlertDialogTitle>
        <AlertDialogDescription class="text-sm text-[#6B7280] dark:text-[#A1A1AA]">
          {{ description }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter class="mt-4 gap-2 sm:gap-2">
        <AlertDialogCancel
          :disabled="isLoading"
          class="cursor-pointer"
          @click.prevent="handleCancel"
        >
          {{ defaultCancelText }}
        </AlertDialogCancel>
        <AlertDialogAction
          :disabled="isLoading"
          :class="[buttonVariants({ variant }), 'cursor-pointer gap-1.5']"
          @click.prevent="handleConfirm"
        >
          <LoaderCircle v-if="isLoading" class="size-4 animate-spin" />
          <span>{{ defaultConfirmText }}</span>
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
