<script setup lang="ts">
import ConnectionFailure from '@/components/ConnectionFailure.vue'
import { Toaster } from '@/components/ui/sonner'
import { navigationFailure, isNavigationRetrying, retryNavigation } from '@/router'
import { RouterView } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useTheme } from '@/composables/use-theme'

// AI modified: keep shared theme state mounted while routes switch after authentication.
useTheme()

// AI modified: configure default head metadata with unhead.
useHead({
  title: 'Gvueter Lite',
})
</script>

<template>
  <!-- AI modified: retain mounted routes on outages and show recovery only before the first route. -->
  <ConnectionFailure
    v-if="navigationFailure"
    :is-retrying="isNavigationRetrying"
    @retry="retryNavigation"
  />
  <RouterView v-else />
  <Toaster />
</template>
