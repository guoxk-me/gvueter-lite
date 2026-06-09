<script setup lang="ts">
import type { BasicColorSchema } from '@vueuse/core'
import { useColorMode } from '@vueuse/core'
import { computed, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'

interface ColorModeOption {
  mode: BasicColorSchema
  labelKey: string
  iconClass: string
}

const lightColorModeOption: ColorModeOption = {
  mode: 'light',
  labelKey: 'colorMode.light',
  iconClass: 'icon-[lucide--sun-medium]',
}

const darkColorModeOption: ColorModeOption = {
  mode: 'dark',
  labelKey: 'colorMode.dark',
  iconClass: 'icon-[lucide--moon]',
}

const systemColorModeOption: ColorModeOption = {
  mode: 'auto',
  labelKey: 'colorMode.system',
  iconClass: 'icon-[lucide--monitor]',
}

const colorModes: ColorModeOption[] = [
  systemColorModeOption,
  darkColorModeOption,
  lightColorModeOption,
]

const { t } = useI18n()

// AI modified: VueUse owns persistence and keeps the html dark class in sync.
const colorMode = useColorMode({
  storageKey: 'gvueter-lite-color-mode',
})

const selectedColorMode = computed(() => colorMode.store.value)
const selectedModeOption = computed<ColorModeOption>(
  () => colorModes.find(modeOption => modeOption.mode === selectedColorMode.value) ?? systemColorModeOption,
)
const nextModeOption = computed<ColorModeOption>(() => {
  const selectedModeIndex = colorModes.findIndex(modeOption => modeOption.mode === selectedColorMode.value)
  const nextModeIndex = selectedModeIndex === -1 ? 0 : (selectedModeIndex + 1) % colorModes.length

  return colorModes[nextModeIndex] ?? systemColorModeOption
})

async function switchToNextColorMode() {
  if (selectedColorMode.value === nextModeOption.value.mode) {
    return
  }

  const toggle = async () => {
    // AI modified: keep a single icon button while preserving all color-mode states.
    colorMode.value = nextModeOption.value.mode
    await nextTick()
  }

  if (!document.startViewTransition) {
    toggle()
    return
  }

  document.startViewTransition(toggle)
}
</script>

<template>
  <button
    class="group inline-flex size-10 items-center justify-center rounded border border-secondary bg-gradient-to-br from-background via-accent to-primary/20 text-foreground shadow-sm transition-all duration-300 ease-out hover:border-primary hover:from-accent hover:via-background hover:to-primary/35 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary"
    type="button"
    :aria-label="t('colorMode.switchTo', { mode: t(nextModeOption.labelKey) })"
    data-test="color-mode-switch"
    :data-color-mode="selectedModeOption.mode"
    @click="switchToNextColorMode"
  >
    <Transition name="color-mode-icon" mode="out-in">
      <span
        :key="selectedModeOption.mode"
        class="size-4 transition-transform duration-300 ease-out group-hover:scale-110"
        :class="selectedModeOption.iconClass"
        aria-hidden="true"
      />
    </Transition>
  </button>
</template>

<style scoped>
.color-mode-icon-enter-active,
.color-mode-icon-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.color-mode-icon-enter-from {
  opacity: 0;
  transform: rotate(-45deg) scale(0.75);
}

.color-mode-icon-leave-to {
  opacity: 0;
  transform: rotate(45deg) scale(0.75);
}
</style>
