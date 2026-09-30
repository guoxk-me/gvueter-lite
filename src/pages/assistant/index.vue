<script setup lang="ts">
// AI modified: the route entry composes the assistant's shared page and drawer workspace.
import AssistantWorkspace from '@/components/assistant/AssistantWorkspace.vue'
// AI modified: preserve the page's component identity after standardizing its entry filename.
defineOptions({ name: 'AssistantPage' })
</script>

<template>
  <AssistantWorkspace mode="page" />
</template>
