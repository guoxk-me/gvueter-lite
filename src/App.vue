<script setup lang="ts">
import { useTheme } from '@/composables/useTheme'

// AI modified: keep the app entry limited to shared theme and the active reference page.
useTheme()
</script>

<template>
  <div class="min-h-screen bg-background text-foreground antialiased">
    <router-view />
  </div>
</template>
