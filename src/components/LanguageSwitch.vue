<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isSupportedLocale, languageStorageKey } from '@/i18n'
import type { SupportedLocale } from '@/i18n'

interface SupportedLanguage {
  locale: SupportedLocale
  labelKey: string
}

const supportedLanguages: SupportedLanguage[] = [
  { locale: 'en-US', labelKey: 'language.english' },
  { locale: 'zh-CN', labelKey: 'language.chinese' },
]

const { locale, t } = useI18n({ useScope: 'global' })

const selectedLanguage = computed(() => (isSupportedLocale(locale.value) ? locale.value : 'en-US'))

function selectLanguage(nextLocale: SupportedLocale) {
  if (selectedLanguage.value === nextLocale) {
    return
  }

  // AI modified: persist app language changes alongside the global i18n locale.
  locale.value = nextLocale
  localStorage.setItem(languageStorageKey, nextLocale)
}
</script>

<template>
  <div
    class="inline-flex rounded border border-secondary bg-background p-1"
    :aria-label="t('language.label')"
    role="group"
    data-test="language-switch"
  >
    <button
      v-for="language in supportedLanguages"
      :key="language.locale"
      class="min-w-14 rounded px-3 py-1.5 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
      :class="
        selectedLanguage === language.locale
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      "
      type="button"
      :aria-pressed="selectedLanguage === language.locale"
      :aria-label="t('language.switchTo', { language: t(language.labelKey) })"
      :data-test="`language-switch-${language.locale}`"
      @click="selectLanguage(language.locale)"
    >
      {{ t(language.labelKey) }}
    </button>
  </div>
</template>
