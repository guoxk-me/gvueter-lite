<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-12">
    <div class="flex flex-col gap-4">
      <h1 class="text-3xl font-bold">
        {{ t('app.title') }}
      </h1>
      <p class="text-muted-foreground">
        {{ t('app.docsVisit') }}
        <a class="text-primary underline" href="https://vuejs.org/" target="_blank" rel="noopener">vuejs.org</a>
        {{ t('app.docsSuffix') }}
      </p>
    </div>
  </div>
</template>
