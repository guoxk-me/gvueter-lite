<script setup lang="ts">
import { useColorMode } from '@vueuse/core'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// AI modified: VueUse owns persistence and keeps the html dark class in sync.
const colorMode = useColorMode({
  storageKey: 'gvueter-lite-color-mode',
})

const isDarkMode = computed(() => colorMode.state.value === 'dark')
const colorModeLabel = computed(() =>
  isDarkMode.value ? t('colorMode.dark') : t('colorMode.light'),
)
const nextColorModeLabel = computed(() =>
  isDarkMode.value ? t('colorMode.light') : t('colorMode.dark'),
)

function toggleColorMode() {
  colorMode.value = isDarkMode.value ? 'light' : 'dark'
}
</script>

<template>
  <button
    class="inline-flex items-center gap-2 rounded border border-secondary bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent focus:outline-none focus:ring-2 focus:ring-primary"
    type="button"
    :aria-label="t('colorMode.switchTo', { mode: nextColorModeLabel })"
    data-test="color-mode-toggle"
    @click="toggleColorMode"
  >
    <span class="size-2 rounded-full bg-primary" aria-hidden="true" />
    <span>{{ colorModeLabel }}</span>
  </button>
</template>
