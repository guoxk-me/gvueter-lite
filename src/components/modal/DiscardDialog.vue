<script setup lang="ts">
import { onBeforeUnmount, shallowRef } from 'vue';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
const isOpen = shallowRef(false);
let resolveDecision: ((accepted: boolean) => void) | undefined;
// AI modified: all discard entry points await the same confirmation, including unmount cancellation.
function ask(): Promise<boolean> {
  if (resolveDecision) return Promise.resolve(false);
  isOpen.value = true;
  return new Promise((resolve) => {
    resolveDecision = resolve;
  });
}
// AI modified: the action uses capture so Reka close events cannot settle acceptance as cancellation.
function settle(accepted: boolean) {
  isOpen.value = false;
  resolveDecision?.(accepted);
  resolveDecision = undefined;
}
onBeforeUnmount(() => settle(false));
defineExpose({ ask });
</script>
<template>
  <AlertDialog
    :open="isOpen"
    @update:open="
      (open) => {
        if (!open) settle(false);
      }
    "
  >
    <AlertDialogContent>
      <AlertDialogHeader
        ><AlertDialogTitle>放弃未保存的修改？</AlertDialogTitle
        ><AlertDialogDescription
          >当前修改尚未保存，放弃后无法恢复。</AlertDialogDescription
        ></AlertDialogHeader
      >
      <AlertDialogFooter
        ><AlertDialogCancel @click="settle(false)">继续编辑</AlertDialogCancel
        ><AlertDialogAction @click.capture="settle(true)"
          >放弃修改</AlertDialogAction
        ></AlertDialogFooter
      >
    </AlertDialogContent>
  </AlertDialog>
</template>
