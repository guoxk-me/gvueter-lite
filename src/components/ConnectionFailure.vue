<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'

// AI modified: a failed initial session check offers recovery without rendering protected content.
defineProps<{ isRetrying: boolean }>()
const emit = defineEmits<{ retry: [] }>()
const { t } = useI18n()
</script>

<template>
  <main class="flex min-h-svh items-center justify-center bg-background px-6 text-foreground">
    <section class="max-w-md space-y-4 text-center" role="alert">
      <h1 class="text-xl font-semibold">{{ t('request.connectionTitle') }}</h1>
      <p class="text-sm text-muted-foreground">{{ t('request.connectionDescription') }}</p>
      <Button :disabled="isRetrying" @click="emit('retry')">
        {{ t(isRetrying ? 'request.retrying' : 'request.retry') }}
      </Button>
    </section>
  </main>
</template>
