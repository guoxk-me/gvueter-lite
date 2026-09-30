<script setup lang="ts">
import type { AssistantProvider } from '@/types/assistant/model'
import type { ReadingPosition } from '@/types/assistant/reading-position'

import {
  ArrowLeft,
  ChevronLeft,
  Maximize2,
  MessageSquarePlus,
  PanelLeft,
  Settings2,
  X,
} from '@lucide/vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAssistant } from '@/composables/assistant/use-assistant'
import AssistantAnswer from './AssistantAnswer.vue'
import AssistantComposer from './AssistantComposer.vue'
import AssistantHistory from './AssistantHistory.vue'

// AI modified: shared pure types live in the centralized owner directory.

// AI modified: preserve the visible turn across the wide page and narrow drawer reflow.
const readingPositions = new Map<string, ReadingPosition>()

const props = defineProps<{ mode: 'page' | 'panel' }>()
const emit = defineEmits<{ expand: []; close: []; settings: [provider?: AssistantProvider] }>()
const { t } = useI18n()
const router = useRouter()
const assistant = useAssistant()
const {
  currentConversation,
  selectedConversationId,
  currentDraft,
  activeConversation,
  hasActiveGeneration,
  isPanelHistoryVisible,
  isLoading,
  error,
  newConversation,
  selectConversation,
  regenerate,
  selectAnswer,
} = assistant
const isPageHistoryVisible = ref(true)
const scrollArea = ref<HTMLElement | null>(null)
const pageTitle = ref<HTMLElement | null>(null)
const composer = ref<InstanceType<typeof AssistantComposer> | null>(null)
const isHistoryVisible = computed(() =>
  props.mode === 'panel' ? isPanelHistoryVisible.value : isPageHistoryVisible.value,
)
const currentTitle = computed(
  () => currentConversation.value?.title ?? t('assistant.newConversation'),
)
const needsInitialConnection = computed(
  () =>
    assistant.modelConfiguration.isVerified.value &&
    assistant.modelConfiguration.configuration.value?.keys.length === 0,
)

function openSettings(provider?: AssistantProvider): void {
  if (props.mode === 'panel') {
    emit('settings', provider)
    return
  }
  void router.push({
    name: 'assistant-settings',
    query: { returnTo: 'chat', ...(provider ? { provider } : {}) },
  })
}

function setHistoryVisible(isVisible: boolean): void {
  if (props.mode === 'panel') isPanelHistoryVisible.value = isVisible
  else isPageHistoryVisible.value = isVisible
}

function addPrompt(prompt: string): void {
  currentDraft.value = prompt
  composer.value?.focusInput()
}

function saveReadingPosition(conversationId = selectedConversationId.value ?? '__new__'): void {
  const viewport = scrollArea.value
  if (!viewport) return
  const viewportCenter = viewport.getBoundingClientRect().top + viewport.clientHeight / 2
  const turns = [...viewport.querySelectorAll<HTMLElement>('[data-assistant-turn-id]')]
  const visibleTurn = turns.find((turn) => {
    const bounds = turn.getBoundingClientRect()
    return bounds.top <= viewportCenter && bounds.bottom >= viewportCenter
  })
  const bounds = visibleTurn?.getBoundingClientRect()
  readingPositions.set(conversationId, {
    turnId: visibleTurn?.dataset.assistantTurnId ?? null,
    progress: bounds ? Math.max(0, Math.min(1, (viewportCenter - bounds.top) / bounds.height)) : 0,
    scrollTop: viewport.scrollTop,
  })
}

async function restoreReadingPosition(): Promise<void> {
  await nextTick()
  const viewport = scrollArea.value
  const position = readingPositions.get(selectedConversationId.value ?? '__new__')
  if (!viewport || !position) return
  const turn = [...viewport.querySelectorAll<HTMLElement>('[data-assistant-turn-id]')].find(
    (candidate) => candidate.dataset.assistantTurnId === position.turnId,
  )
  if (turn) {
    viewport.scrollTop +=
      turn.getBoundingClientRect().top -
      viewport.getBoundingClientRect().top +
      position.progress * turn.offsetHeight -
      viewport.clientHeight / 2
  } else {
    viewport.scrollTop = position.scrollTop
  }
}

watch(selectedConversationId, async (_currentId, previousId) => {
  if (previousId) saveReadingPosition(previousId)
  await restoreReadingPosition()
})

watch(
  () => currentConversation.value?.id,
  () => {
    void restoreReadingPosition()
  },
)

watch(
  () => currentConversation.value?.turns.at(-1)?.answers.at(-1)?.content,
  async () => {
    const viewport = scrollArea.value
    if (!viewport) return
    const isNearBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 110
    if (isNearBottom) {
      await nextTick()
      viewport.scrollTop = viewport.scrollHeight
    }
  },
)

onMounted(async () => {
  if (props.mode === 'page')
    isPageHistoryVisible.value = window.matchMedia('(min-width: 1024px)').matches
  await restoreReadingPosition()
  if (props.mode === 'page') {
    if (assistant.shouldFocusComposerOnPage.value) composer.value?.focusInput()
    else pageTitle.value?.focus()
    assistant.shouldFocusComposerOnPage.value = false
  }
})

defineExpose({ saveReadingPosition })
</script>

<template>
  <!-- AI modified: the page and drawer share the same conversation component to preserve visual and behavioral continuity. -->
  <div class="flex h-full min-h-0 w-full bg-white text-foreground dark:bg-[#202027]">
    <aside
      v-if="mode === 'page' && isHistoryVisible"
      class="hidden h-full w-[252px] shrink-0 border-r border-border md:block"
    >
      <AssistantHistory />
    </aside>
    <div v-if="mode === 'panel' && isHistoryVisible" class="flex min-h-0 min-w-0 flex-1 flex-col">
      <div class="flex h-14 items-center gap-2 border-b border-border px-4">
        <button
          type="button"
          :aria-label="t('assistant.backToConversation')"
          class="rounded-md p-1.5 hover:bg-muted"
          @click="setHistoryVisible(false)"
        >
          <ArrowLeft class="size-4" />
        </button>
        <strong class="text-sm font-medium">{{ t('assistant.history') }}</strong>
      </div>
      <div class="min-h-0 flex-1"><AssistantHistory /></div>
    </div>
    <div v-else class="flex min-h-0 min-w-0 flex-1 flex-col">
      <header class="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
        <button
          type="button"
          :aria-label="t('assistant.showHistory')"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          @click="setHistoryVisible(!isHistoryVisible)"
        >
          <PanelLeft class="size-4" />
        </button>
        <h1
          ref="pageTitle"
          tabindex="-1"
          class="min-w-0 flex-1 truncate text-sm font-semibold outline-none"
        >
          {{ mode === 'page' ? t('assistant.title') : currentTitle }}
        </h1>
        <button
          type="button"
          :aria-label="t('assistant.newConversation')"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          @click="newConversation"
        >
          <MessageSquarePlus class="size-4" />
        </button>
        <button
          type="button"
          :aria-label="t('assistant.configureModels')"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          @click="openSettings()"
        >
          <Settings2 class="size-4" />
        </button>
        <button
          v-if="mode === 'panel'"
          type="button"
          :aria-label="t('assistant.expand')"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          @click="emit('expand')"
        >
          <Maximize2 class="size-4" />
        </button>
        <button
          v-if="mode === 'panel'"
          type="button"
          :aria-label="t('assistant.close')"
          class="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          @click="emit('close')"
        >
          <X class="size-4" />
        </button>
      </header>
      <button
        v-if="activeConversation && activeConversation.id !== selectedConversationId"
        type="button"
        class="flex shrink-0 items-center justify-center gap-2 border-b border-border py-2 text-xs text-muted-foreground hover:text-foreground"
        @click="selectConversation(activeConversation.id)"
      >
        <span class="size-1.5 animate-pulse rounded-full bg-violet-500" />{{
          t('assistant.viewGenerating', { title: activeConversation.title })
        }}<ChevronLeft class="size-3 rotate-180" />
      </button>
      <div
        v-if="error"
        role="alert"
        class="mx-4 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
      >
        {{ error }}
      </div>
      <div
        ref="scrollArea"
        class="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        @scroll.passive="() => saveReadingPosition()"
      >
        <div
          v-if="isLoading && selectedConversationId && !currentConversation"
          class="flex h-full items-center justify-center text-sm text-muted-foreground"
        >
          {{ t('assistant.loading') }}
        </div>
        <div
          v-else-if="!currentConversation || currentConversation.turns.length === 0"
          class="mx-auto flex h-full max-w-[640px] flex-col justify-center px-6 pb-14"
        >
          <div
            class="mb-4 flex size-10 items-center justify-center rounded-xl bg-[#F1E9FF] text-xs font-bold text-[#5D0FC0] dark:bg-[#302044] dark:text-[#D1BEFF]"
          >
            G/V
          </div>
          <h2 class="text-[22px] font-semibold tracking-tight">{{ t('assistant.greeting') }}</h2>
          <p class="mt-2 text-sm leading-6 text-muted-foreground">{{ t('assistant.intro') }}</p>
          <!-- AI modified: first-use guidance lives in the conversation without changing the model picker. -->
          <div
            v-if="needsInitialConnection"
            class="mt-5 rounded-xl border border-violet-200 bg-violet-50/70 p-4 text-sm dark:border-violet-800 dark:bg-violet-950/40"
          >
            <p class="font-medium">{{ t('assistant.connectToStart') }}</p>
            <p class="mt-1 text-xs leading-5 text-muted-foreground">
              {{ t('assistant.connectHint') }}
            </p>
            <div class="mt-3 flex flex-wrap gap-2">
              <button
                v-for="provider in ['deepseek', 'openai'] as const"
                :key="provider"
                type="button"
                class="rounded-lg border border-violet-200 bg-background px-3 py-1.5 text-xs font-medium text-violet-800 hover:border-violet-400 dark:border-violet-700 dark:text-violet-200"
                @click="openSettings(provider)"
              >
                {{
                  t('assistant.configureProvider', {
                    provider: provider === 'deepseek' ? 'DeepSeek' : 'OpenAI',
                  })
                }}
              </button>
            </div>
          </div>
          <div class="mt-7 grid gap-2 sm:grid-cols-2">
            <button
              v-for="prompt in ['explain', 'draft', 'rewrite', 'summarize']"
              :key="prompt"
              type="button"
              class="rounded-xl border border-border px-4 py-3 text-left text-[13px] transition-colors hover:border-[#B79BDD] hover:bg-[#FAF8FD] dark:hover:bg-[#292431]"
              @click="addPrompt(t(`assistant.prompt.${prompt}`))"
            >
              {{ t(`assistant.prompt.${prompt}`) }}
            </button>
          </div>
        </div>
        <div v-else class="mx-auto max-w-[800px] px-4 pb-10 pt-5 sm:px-6">
          <div
            v-for="(turn, index) in currentConversation.turns"
            :key="turn.id"
            :data-assistant-turn-id="turn.id"
            class="mb-8"
          >
            <div class="mb-6 flex justify-end">
              <div
                class="max-w-[90%] whitespace-pre-wrap break-words rounded-2xl bg-[#F1EFF3] px-4 py-2.5 text-[14px] leading-6 dark:bg-[#33323A]"
              >
                {{ turn.question }}
              </div>
            </div>
            <AssistantAnswer
              :turn="turn"
              :is-latest="index === currentConversation.turns.length - 1"
              :has-active-generation="hasActiveGeneration"
              @regenerate="regenerate"
              @select="selectAnswer"
            />
          </div>
        </div>
      </div>
      <AssistantComposer ref="composer" @configure="openSettings" />
    </div>
  </div>
</template>
