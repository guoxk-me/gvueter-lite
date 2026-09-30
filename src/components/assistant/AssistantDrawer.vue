<script setup lang="ts">
import type { AssistantProvider } from '@/types/assistant/model'

import { nextTick, watch } from 'vue'
import { useMediaQuery } from '@vueuse/core'
import AssistantWorkspace from './AssistantWorkspace.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ expand: []; close: []; settings: [provider?: AssistantProvider] }>()
const isTablet = useMediaQuery('(max-width: 1023px)')

// AI modified: tablet drawers are modal; desktop drawers preserve access to the underlying page.
watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return
    await nextTick()
    if (isTablet.value) {
      document.querySelector<HTMLElement>('[data-assistant-drawer] button')?.focus()
    }
  },
)

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.open) {
    emit('close')
    return
  }
  if (event.key !== 'Tab' || !isTablet.value) return
  const drawer = document.querySelector<HTMLElement>('[data-assistant-drawer]')
  const controls = [
    ...(drawer?.querySelectorAll<HTMLElement>('button:not([disabled]), textarea, input') ?? []),
  ]
  if (controls.length === 0) return
  const first = controls[0]
  const last = controls.at(-1)
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last?.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first?.focus()
  }
}
</script>

<template>
  <div v-if="open" class="pointer-events-none fixed inset-0 z-40" @keydown="handleKeydown">
    <button
      type="button"
      aria-label="Close Smart Assistant"
      class="pointer-events-auto absolute inset-0 bg-black/25 lg:hidden"
      @click="emit('close')"
    />
    <div
      data-assistant-drawer
      role="dialog"
      :aria-modal="isTablet"
      class="pointer-events-auto absolute inset-y-0 right-0 w-[min(100vw,464px)] border-l border-border bg-background shadow-[-10px_0_35px_rgba(20,16,27,0.12)] motion-safe:animate-[assistant-slide-in_240ms_ease-out]"
    >
      <AssistantWorkspace
        mode="panel"
        @expand="emit('expand')"
        @close="emit('close')"
        @settings="(provider) => emit('settings', provider)"
      />
    </div>
  </div>
</template>

<style>
@keyframes assistant-slide-in {
  from {
    transform: translateX(24px);
    opacity: 0.65;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>
