<script setup lang="ts">
import type { SupportedLocale } from '@/types/i18n/locale'
import type { ThemeMode } from '@/types/theme/theme'

import { Monitor, Moon, Sun } from '@lucide/vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  themeMode: ThemeMode
  locale: SupportedLocale
}>()

const emits = defineEmits<{
  (e: 'cycle-theme'): void
  (e: 'toggle-language'): void
}>()

// AI modified: both preferences change in one click and their icons show the current state.
const { t } = useI18n()
</script>

<template>
  <div class="flex items-center gap-1">
    <!-- AI modified: hover changes icon color only; keyboard focus still has a visible outline. -->
    <button
      type="button"
      :aria-label="t('preferences.themeCycle', { mode: t(`preferences.${props.themeMode}`) })"
      class="flex size-11 cursor-pointer items-center justify-center rounded-md text-[#574662] transition-colors hover:text-[#8023FF] focus-visible:outline-2 focus-visible:outline-[#8023FF] dark:text-[#D9CEE3] dark:hover:text-[#C5B3FF] dark:focus-visible:outline-[#A684FF]"
      @click="emits('cycle-theme')"
    >
      <Sun v-if="props.themeMode === 'light'" class="size-5" aria-hidden="true" />
      <Moon v-else-if="props.themeMode === 'dark'" class="size-5" aria-hidden="true" />
      <Monitor v-else class="size-5" aria-hidden="true" />
    </button>

    <button
      type="button"
      :aria-label="
        t('preferences.languageTarget', { language: props.locale === 'zh-CN' ? 'English' : '中文' })
      "
      class="flex size-11 cursor-pointer items-center justify-center rounded-md text-[#574662] transition-colors hover:text-[#8023FF] focus-visible:outline-2 focus-visible:outline-[#8023FF] dark:text-[#D9CEE3] dark:hover:text-[#C5B3FF] dark:focus-visible:outline-[#A684FF]"
      @click="emits('toggle-language')"
    >
      <span
        aria-hidden="true"
        class="flex size-5 items-center justify-center font-semibold leading-none"
        :class="props.locale === 'zh-CN' ? 'text-[15px]' : 'text-[11px] tracking-[-0.03em]'"
        >{{ props.locale === 'zh-CN' ? '中' : 'EN' }}</span
      >
    </button>
  </div>
</template>
