<script setup lang="ts">
import { useHead } from '@unhead/vue'
import { useRouter } from 'vue-router'

useHead({ title: '404 Not Found - Gvueter Lite' })

const router = useRouter()
</script>

<template>
  <div class="text-center">
    <h1 class="mb-2 text-6xl font-bold text-primary">
      404
    </h1>
    <p class="mb-6 text-lg text-muted-foreground">
      Page not found
    </p>
    <button class="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90" @click="router.push('/')">
      Go Home
    </button>
  </div>
</template>
