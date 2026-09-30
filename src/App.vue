<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useHead } from '@unhead/vue'
import { useTheme } from '@/composables/useTheme'

// AI modified: keep shared theme state mounted while routes switch after authentication.
useTheme()

// AI modified: configure default head metadata with unhead.
useHead({
  title: 'Gvueter Lite',
})
</script>

<template>
  <RouterView />
</template>
