<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import ColorModeSwitch from './components/ColorModeSwitch.vue'
import LanguageSwitch from './components/LanguageSwitch.vue'

const { t } = useI18n()
</script>

<template>
  <main class="min-h-screen bg-background p-6 text-foreground">
    <div class="mx-auto flex max-w-3xl flex-col gap-4">
      <div class="flex items-center justify-between gap-4">
        <h1 class="text-2xl font-semibold">
          {{ t('app.title') }}
        </h1>
        <div class="flex items-center gap-2">
          <LanguageSwitch />
          <ColorModeSwitch />
        </div>
      </div>
      <p class="text-muted-foreground">
        {{ t('app.docsVisit') }}
        <a class="text-primary underline" href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a>
        {{ t('app.docsSuffix') }}
      </p>
    </div>
  </main>
</template>

<style scoped></style>
