<script setup lang="ts">
import type { AssistantAnswer, AssistantTurn } from '@/types/assistant/conversation'
import type { TextSegment, CodeSegment } from '@/types/assistant/answer-content'

import DOMPurify from 'dompurify'
import { createMarkdownExit } from 'markdown-exit'
import { Check, Copy, RotateCcw } from '@lucide/vue'
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { highlightCode } from '@/lib/code-highlighting'

// AI modified: shared pure types live in the centralized owner directory.

const props = defineProps<{
  turn: AssistantTurn
  isLatest: boolean
  hasActiveGeneration: boolean
}>()
const emit = defineEmits<{
  regenerate: [turnId: string]
  select: [turnId: string, answerId: string]
}>()
const { t } = useI18n()
const viewedAnswerId = shallowRef<string | null>(null)
const isCopied = shallowRef(false)
const copiedCodeIndex = shallowRef<number | null>(null)
// AI modified: use the parser shared with the Markdown build plugin for runtime AI answers.
const markdown = createMarkdownExit({ html: true, linkify: true })

const visibleAnswer = computed<AssistantAnswer | undefined>(() => {
  if (viewedAnswerId.value) {
    const viewed = props.turn.answers.find((answer) => answer.id === viewedAnswerId.value)
    if (viewed) return viewed
  }
  const latest = props.turn.answers.at(-1)
  return (
    props.turn.answers.find(
      (answer) => answer.status === 'queued' || answer.status === 'generating',
    ) ??
    (latest?.status === 'stopped' || latest?.status === 'failed' ? latest : undefined) ??
    props.turn.answers.find((answer) => answer.id === props.turn.selectedAnswerId) ??
    latest
  )
})
watch(
  () => props.turn.answers.length,
  () => {
    viewedAnswerId.value = null
  },
)
const visibleIndex = computed(() =>
  Math.max(
    0,
    props.turn.answers.findIndex((answer) => answer.id === visibleAnswer.value?.id),
  ),
)

// AI modified: Markdown is sanitized before rendering; fenced code stays in Vue for exact-code copying.
const segments = computed<(TextSegment | CodeSegment)[]>(() => {
  const content = visibleAnswer.value?.content ?? ''
  const sections: (TextSegment | CodeSegment)[] = []
  const fences = /```([\w+-]*)\n([\s\S]*?)```/g
  let previousEnd = 0
  for (const match of content.matchAll(fences)) {
    const start = match.index ?? 0
    if (start > previousEnd) {
      sections.push({
        kind: 'text',
        html: DOMPurify.sanitize(markdown.render(content.slice(previousEnd, start))),
      })
    }
    const language = match[1] ?? ''
    const code = match[2] ?? ''
    // AI modified: highlight known languages while keeping the original code for copying.
    sections.push({
      kind: 'code',
      language,
      code,
      html: DOMPurify.sanitize(highlightCode(code, language)),
    })
    previousEnd = start + match[0].length
  }
  if (previousEnd < content.length) {
    sections.push({
      kind: 'text',
      html: DOMPurify.sanitize(markdown.render(content.slice(previousEnd))),
    })
  }
  return sections
})

function viewVersion(direction: -1 | 1): void {
  const answer = props.turn.answers[visibleIndex.value + direction]
  if (!answer) return
  viewedAnswerId.value = answer.id
  if (props.isLatest && answer.status === 'completed') {
    emit('select', props.turn.id, answer.id)
  }
}

async function copyAnswer(): Promise<void> {
  const content = visibleAnswer.value?.content ?? ''
  const plainText = content
    .replace(/^```[^\n]*\n/gm, '')
    .replace(/^```\s*$/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
  await navigator.clipboard.writeText(plainText)
  isCopied.value = true
  setTimeout(() => (isCopied.value = false), 1800)
}

async function copyCode(code: string, index: number): Promise<void> {
  await navigator.clipboard.writeText(code)
  copiedCodeIndex.value = index
  setTimeout(() => (copiedCodeIndex.value = null), 1800)
}
</script>

<template>
  <section class="assistant-answer" :aria-label="t('assistant.answer')">
    <div
      class="mb-3 flex items-center gap-2 text-xs font-semibold text-[#5D0FC0] dark:text-[#C5B3FF]"
    >
      <span
        class="flex size-6 items-center justify-center rounded-md bg-[#F1E9FF] text-[10px] dark:bg-[#302044]"
        >G/V</span
      >
      {{ t('assistant.title') }}
      <span
        v-if="visibleAnswer?.model"
        class="truncate text-[11px] font-normal text-muted-foreground"
        >{{ visibleAnswer.provider === 'openai' ? 'OpenAI' : 'DeepSeek' }} ·
        {{ visibleAnswer.model }}</span
      >
      <span
        v-if="visibleAnswer?.status === 'queued' || visibleAnswer?.status === 'generating'"
        class="ml-1 flex items-center gap-1.5 font-normal text-muted-foreground"
        ><span class="size-1.5 animate-pulse rounded-full bg-violet-500" />{{
          t('assistant.responding')
        }}</span
      >
    </div>
    <div v-if="visibleAnswer?.content" class="assistant-markdown text-[14px] leading-7">
      <template v-for="(segment, index) in segments" :key="index">
        <div v-if="segment.kind === 'text'" v-html="segment.html" />
        <div
          v-else
          class="my-4 overflow-hidden rounded-lg border border-border bg-[#F7F7F9] dark:bg-[#1C1D24]"
        >
          <div
            class="flex items-center justify-between border-b border-border px-3 py-1.5 text-[11px] text-muted-foreground"
          >
            <span>{{ segment.language || t('assistant.code') }}</span>
            <button
              type="button"
              class="flex items-center gap-1 hover:text-foreground"
              @click="copyCode(segment.code, index)"
            >
              <Check v-if="copiedCodeIndex === index" class="size-3" /><Copy
                v-else
                class="size-3"
              />
              {{ copiedCodeIndex === index ? t('assistant.copied') : t('assistant.copyCode') }}
            </button>
          </div>
          <pre
            class="overflow-x-auto p-3 text-[12px] leading-5"
          ><code v-html="segment.html" /></pre>
        </div>
      </template>
    </div>
    <div
      v-else-if="visibleAnswer?.status === 'queued' || visibleAnswer?.status === 'generating'"
      class="text-sm text-muted-foreground"
    >
      {{ t('assistant.waiting') }}
    </div>
    <p v-if="visibleAnswer?.status === 'stopped'" class="mt-2 text-xs text-muted-foreground">
      {{ t('assistant.stopped') }}
    </p>
    <p v-if="visibleAnswer?.status === 'failed'" class="mt-2 text-xs text-destructive">
      {{ t('assistant.failed') }}
    </p>
    <div v-if="visibleAnswer" class="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
      <button
        v-if="visibleAnswer.content"
        type="button"
        class="flex items-center gap-1 hover:text-foreground"
        @click="copyAnswer"
      >
        <Check v-if="isCopied" class="size-3.5" /><Copy v-else class="size-3.5" />
        {{ isCopied ? t('assistant.copied') : t('assistant.copyAnswer') }}
      </button>
      <button
        v-if="isLatest && !hasActiveGeneration"
        type="button"
        class="flex items-center gap-1 hover:text-foreground"
        @click="emit('regenerate', turn.id)"
      >
        <RotateCcw class="size-3.5" />{{
          visibleAnswer.status === 'failed' ? t('assistant.retry') : t('assistant.regenerate')
        }}
      </button>
      <div v-if="turn.answers.length > 1" class="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          :disabled="visibleIndex === 0"
          class="px-1 disabled:opacity-30"
          :aria-label="t('assistant.previousVersion')"
          @click="viewVersion(-1)"
        >
          ‹
        </button>
        <span>{{ visibleIndex + 1 }} / {{ turn.answers.length }}</span>
        <button
          type="button"
          :disabled="visibleIndex === turn.answers.length - 1"
          class="px-1 disabled:opacity-30"
          :aria-label="t('assistant.nextVersion')"
          @click="viewVersion(1)"
        >
          ›
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.assistant-markdown :deep(h1),
.assistant-markdown :deep(h2),
.assistant-markdown :deep(h3) {
  margin: 1.1em 0 0.4em;
  font-weight: 650;
  line-height: 1.4;
}
.assistant-markdown :deep(h1) {
  font-size: 1.35em;
}
.assistant-markdown :deep(h2) {
  font-size: 1.2em;
}
.assistant-markdown :deep(p) {
  margin: 0.4em 0 0.8em;
}
.assistant-markdown :deep(ul),
.assistant-markdown :deep(ol) {
  margin: 0.5em 0 0.8em;
  padding-left: 1.5em;
}
.assistant-markdown :deep(ul) {
  list-style: disc;
}
.assistant-markdown :deep(ol) {
  list-style: decimal;
}
.assistant-markdown :deep(table) {
  display: block;
  max-width: 100%;
  overflow-x: auto;
  border-collapse: collapse;
  margin: 1em 0;
}
.assistant-markdown :deep(th),
.assistant-markdown :deep(td) {
  border: 1px solid var(--border);
  padding: 0.35em 0.65em;
  text-align: left;
}
.assistant-markdown :deep(blockquote) {
  border-left: 2px solid var(--border);
  padding-left: 1em;
  color: var(--muted-foreground);
}
</style>
