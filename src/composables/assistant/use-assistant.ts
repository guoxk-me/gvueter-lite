// AI modified: keep shared assistant workflows grouped with their configuration workflow.
import { requestAssistant, changeConversationModel } from '@/api/assistant/assistant-api'

import type {
  AssistantConversation,
  AssistantConversationSummary,
} from '@/types/assistant/conversation'
import type { AssistantModelChoice } from '@/types/assistant/model'
import type { AssistantRequestOptions, AssistantMutation } from '@/types/assistant/request'

// AI modified: shared pure types live in the centralized owner directory.

import { isCancel } from 'axios'
import { computed, reactive, readonly, ref, shallowRef } from 'vue'
import { isCancelledError, useMutation } from '@tanstack/vue-query'
import { queryClient } from '@/query-client'
import { RequestError } from '@/http/http-client'

import { i18n } from '@/i18n'
import { INTRODUCTORY_MODELS, useAssistantConfiguration } from './use-assistant-configuration'

const modelConfiguration = useAssistantConfiguration()

function assistantErrorMessage(cause: unknown): string {
  if (cause instanceof RequestError) {
    if (cause.message.includes('personal_key_required'))
      return i18n.global.t('assistant.keyRequired')
    if (cause.message.includes('model_unavailable'))
      return i18n.global.t('assistant.modelUnavailable')
    if (cause.message.includes('openai_consent_required'))
      return i18n.global.t('assistant.openAiConsent')
    if (cause.message.includes('cross_provider_confirmation_required'))
      return i18n.global.t('assistant.crossProviderConsent')
    if (cause.status === 503) return i18n.global.t('assistant.serviceUnavailable')
    if (cause.status === 409) return i18n.global.t('assistant.generationBusy')
    if (cause.status === 0) return i18n.global.t('assistant.networkUnavailable')
  }
  return cause instanceof Error ? cause.message : i18n.global.t('assistant.requestFailed')
}

// AI modified: conversation reads share Query's retry policy and keyed cache with other pages.
function readAssistant<T>(path: string): Promise<T> {
  return queryClient.fetchQuery({
    queryKey: ['assistant', path],
    meta: { silent: true },
    queryFn: () => requestAssistant<T>(path),
    staleTime: 0,
  })
}

// AI modified: page and drawer share one in-memory conversation, including per-conversation drafts.
const conversations = ref<AssistantConversationSummary[]>([])
const currentConversation = shallowRef<AssistantConversation | null>(null)
const selectedConversationId = shallowRef<string | null>(null)
const drafts = reactive<Record<string, string>>({})
const isPanelOpen = shallowRef(false)
const isPanelHistoryVisible = shallowRef(false)
const shouldFocusComposerOnPage = shallowRef(false)
const isLoading = shallowRef(false)
const isSending = shallowRef(false)
const error = shallowRef<string | null>(null)
const newConversationModel = shallowRef<AssistantModelChoice | null>(null)
const pendingConversationModels = reactive<Record<string, AssistantModelChoice>>({})
const selectedModel = computed<AssistantModelChoice | null>(() => {
  const conversation = currentConversation.value
  const pendingModel = selectedConversationId.value
    ? pendingConversationModels[selectedConversationId.value]
    : null
  if (pendingModel) return pendingModel
  return conversation?.provider && conversation.model
    ? { provider: conversation.provider, modelId: conversation.model }
    : (newConversationModel.value ??
        modelConfiguration.configuration.value?.defaultModel ??
        modelConfiguration.availableModels.value[0] ??
        INTRODUCTORY_MODELS[0] ??
        null)
})
let pollingTimer: ReturnType<typeof setInterval> | undefined
let isRefreshing = false
let lastConfigurationRefresh = 0

const currentDraft = computed({
  get: () => drafts[selectedConversationId.value ?? '__new__'] ?? '',
  set: (content: string) => {
    drafts[selectedConversationId.value ?? '__new__'] = content
  },
})
const activeConversation = computed(() => conversations.value.find((chat) => chat.activeAnswerId))
const hasActiveGeneration = computed(() => activeConversation.value !== undefined)

async function refreshConversations(): Promise<void> {
  if (isRefreshing) return
  isRefreshing = true
  try {
    const latest = await readAssistant<AssistantConversationSummary[]>('conversations')
    conversations.value = latest
    const selectedId = selectedConversationId.value
    if (selectedId) {
      const detail = await readAssistant<AssistantConversation>(
        `conversations/${encodeURIComponent(selectedId)}`,
      )
      if (selectedConversationId.value === selectedId) currentConversation.value = detail
    }
    error.value = null
  } catch (cause) {
    // AI modified: cancelled work from an old session must not publish an error in the new one.
    if (isCancel(cause) || isCancelledError(cause)) return
    if (cause instanceof RequestError && (cause.status === 401 || cause.status === 403)) {
      // AI modified: clear account-owned content when the session is no longer authorized.
      clearAssistant()
    } else if (cause instanceof RequestError && cause.status === 404) {
      selectedConversationId.value = null
      currentConversation.value = null
    } else {
      error.value = assistantErrorMessage(cause)
    }
  } finally {
    isRefreshing = false
  }
}

async function startAssistant(): Promise<void> {
  if (pollingTimer) return
  isLoading.value = true
  await refreshConversations()
  try {
    await modelConfiguration.refreshConfiguration()
    lastConfigurationRefresh = Date.now()
  } catch {
    /* Cached metadata stays visible but cannot authorize a send. */
  }
  isLoading.value = false
  pollingTimer = setInterval(() => {
    void refreshConversations()
    // AI modified: periodically reconcile account-scoped display cache with server changes from other devices.
    if (Date.now() - lastConfigurationRefresh >= 30_000) {
      lastConfigurationRefresh = Date.now()
      void modelConfiguration.refreshConfiguration().catch(() => undefined)
    }
  }, 1500)
}

function stopAssistant(): void {
  if (pollingTimer) clearInterval(pollingTimer)
  pollingTimer = undefined
}

function clearAssistant(): void {
  stopAssistant()
  queryClient.removeQueries({ queryKey: ['assistant'] })
  conversations.value = []
  currentConversation.value = null
  selectedConversationId.value = null
  for (const key of Object.keys(drafts)) delete drafts[key]
  for (const key of Object.keys(pendingConversationModels)) delete pendingConversationModels[key]
  isPanelOpen.value = false
  error.value = null
  newConversationModel.value = null
}

function newConversation(): void {
  selectedConversationId.value = null
  currentConversation.value = null
  isPanelHistoryVisible.value = false
  newConversationModel.value = null
}

async function selectConversationModel(
  model: AssistantModelChoice,
  crossProviderConfirmed = false,
): Promise<void> {
  const conversationId = selectedConversationId.value
  if (!conversationId) {
    newConversationModel.value = model
    return
  }
  // AI modified: an unconfigured choice stays local until a Key proves this model is usable.
  if (
    !modelConfiguration.isVerified.value ||
    !modelConfiguration.availableModels.value.some(
      (available) => available.provider === model.provider && available.modelId === model.modelId,
    )
  ) {
    pendingConversationModels[conversationId] = model
    return
  }
  const conversation = await changeConversationModel(conversationId, model, crossProviderConfirmed)
  delete pendingConversationModels[conversationId]
  if (selectedConversationId.value === conversationId) currentConversation.value = conversation
}

async function selectConversation(conversationId: string): Promise<void> {
  selectedConversationId.value = conversationId
  currentConversation.value = null
  isPanelHistoryVisible.value = false
  isLoading.value = true
  try {
    const conversation = await readAssistant<AssistantConversation>(
      `conversations/${encodeURIComponent(conversationId)}`,
    )
    if (selectedConversationId.value === conversationId) currentConversation.value = conversation
    error.value = null
  } catch (cause) {
    if (isCancel(cause) || isCancelledError(cause)) return
    error.value = assistantErrorMessage(cause)
  } finally {
    isLoading.value = false
  }
}

async function sendQuestion(
  mutate: AssistantMutation,
  crossProviderConfirmed = false,
): Promise<void> {
  const question = currentDraft.value.trim()
  if (!question || hasActiveGeneration.value || isSending.value) return
  const draftKey = selectedConversationId.value ?? '__new__'
  isSending.value = true
  try {
    if (!modelConfiguration.isVerified.value) await modelConfiguration.refreshConfiguration()
    const model = selectedModel.value
    if (!model) throw new Error(i18n.global.t('assistant.keyRequired'))
    const conversation = await mutate<AssistantConversation>('questions', {
      method: 'POST',
      data: {
        question,
        conversationId: selectedConversationId.value ?? undefined,
        model,
        crossProviderConfirmed,
      },
    })
    drafts[draftKey] = ''
    if (selectedConversationId.value) delete pendingConversationModels[selectedConversationId.value]
    selectedConversationId.value = conversation.id
    currentConversation.value = conversation
    await refreshConversations()
    error.value = null
  } catch (cause) {
    if (isCancel(cause) || isCancelledError(cause)) return
    error.value = assistantErrorMessage(cause)
  } finally {
    isSending.value = false
  }
}

async function regenerate(turnId: string, mutate: AssistantMutation): Promise<void> {
  if (hasActiveGeneration.value) return
  try {
    currentConversation.value = await mutate<AssistantConversation>(
      `turns/${encodeURIComponent(turnId)}/regenerate`,
      { method: 'POST' },
    )
    await refreshConversations()
    error.value = null
  } catch (cause) {
    if (isCancel(cause) || isCancelledError(cause)) return
    error.value = assistantErrorMessage(cause)
  }
}

async function stopGeneration(answerId: string, mutate: AssistantMutation): Promise<void> {
  try {
    currentConversation.value = await mutate<AssistantConversation>(
      `answers/${encodeURIComponent(answerId)}/stop`,
      { method: 'POST' },
    )
    await refreshConversations()
  } catch (cause) {
    if (isCancel(cause) || isCancelledError(cause)) return
    error.value = assistantErrorMessage(cause)
  }
}

async function selectAnswer(
  turnId: string,
  answerId: string,
  mutate: AssistantMutation,
): Promise<void> {
  try {
    currentConversation.value = await mutate<AssistantConversation>(
      `turns/${encodeURIComponent(turnId)}/selected-answer`,
      { method: 'PATCH', data: { answerId } },
    )
  } catch (cause) {
    if (isCancel(cause) || isCancelledError(cause)) return
    error.value = assistantErrorMessage(cause)
  }
}

async function renameConversation(
  conversationId: string,
  title: string,
  mutate: AssistantMutation,
): Promise<void> {
  try {
    await mutate(`conversations/${encodeURIComponent(conversationId)}`, {
      method: 'PATCH',
      data: { title },
    })
    await refreshConversations()
  } catch (cause) {
    if (isCancel(cause) || isCancelledError(cause)) return
    error.value = assistantErrorMessage(cause)
  }
}

async function deleteConversation(
  conversationId: string,
  mutate: AssistantMutation,
): Promise<void> {
  try {
    await mutate(`conversations/${encodeURIComponent(conversationId)}`, {
      method: 'DELETE',
    })
    if (selectedConversationId.value === conversationId) newConversation()
    delete pendingConversationModels[conversationId]
    await refreshConversations()
  } catch (cause) {
    if (isCancel(cause) || isCancelledError(cause)) return
    error.value = assistantErrorMessage(cause)
  }
}

export function useAssistant() {
  // AI modified: mutations never retry or retain the question payload after completion.
  const mutation = useMutation({
    mutationFn: ({ path, options }: { path: string; options: AssistantRequestOptions }) =>
      requestAssistant<unknown>(path, options),
    gcTime: 0,
  })
  const mutate: AssistantMutation = async <T>(path: string, options: AssistantRequestOptions) => {
    try {
      return (await mutation.mutateAsync({ path, options })) as T
    } finally {
      mutation.reset()
    }
  }
  return {
    conversations: readonly(conversations),
    currentConversation: readonly(currentConversation),
    selectedConversationId: readonly(selectedConversationId),
    currentDraft,
    selectedModel,
    modelConfiguration,
    activeConversation,
    hasActiveGeneration,
    isPanelOpen,
    isPanelHistoryVisible,
    shouldFocusComposerOnPage,
    isLoading: readonly(isLoading),
    isSending: readonly(isSending),
    error: readonly(error),
    startAssistant,
    stopAssistant,
    clearAssistant,
    refreshConversations,
    newConversation,
    selectConversation,
    selectConversationModel,
    sendQuestion: (crossProviderConfirmed = false) => sendQuestion(mutate, crossProviderConfirmed),
    regenerate: (turnId: string) => regenerate(turnId, mutate),
    stopGeneration: (answerId: string) => stopGeneration(answerId, mutate),
    selectAnswer: (turnId: string, answerId: string) => selectAnswer(turnId, answerId, mutate),
    renameConversation: (conversationId: string, title: string) =>
      renameConversation(conversationId, title, mutate),
    deleteConversation: (conversationId: string) => deleteConversation(conversationId, mutate),
  }
}
