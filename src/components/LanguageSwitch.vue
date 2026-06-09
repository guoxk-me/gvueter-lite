<script setup lang="ts">
import type { SupportedLocale } from '@/i18n'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isSupportedLocale, languageStorageKey } from '@/i18n'

interface SupportedLanguage {
  locale: SupportedLocale
  labelKey: string
}

const fallbackLanguage: SupportedLanguage = { locale: 'en-US', labelKey: 'language.english' }
const supportedLanguages: SupportedLanguage[] = [
  fallbackLanguage,
  { locale: 'zh-CN', labelKey: 'language.chinese' },
]

const { locale, t } = useI18n({ useScope: 'global' })

const selectedLanguage = computed(() => (isSupportedLocale(locale.value) ? locale.value : 'en-US'))
// AI modified: icon-only language control cycles to the other supported locale.
const nextLanguage = computed(() => {
  const selectedLanguageIndex = supportedLanguages.findIndex(
    language => language.locale === selectedLanguage.value,
  )

  return supportedLanguages[(selectedLanguageIndex + 1) % supportedLanguages.length] ?? fallbackLanguage
})

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
  <button
    class="inline-flex size-10 items-center justify-center rounded border border-secondary bg-background text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary"
    type="button"
    :aria-label="t('language.switchTo', { language: t(nextLanguage.labelKey) })"
    data-test="language-switch"
    :data-test-next-language="`language-switch-${nextLanguage.locale}`"
    @click="selectLanguage(nextLanguage.locale)"
  >
    <span class="icon-[lucide--languages] size-5" aria-hidden="true" />
  </button>
</template>
