<script setup lang="ts">
import type { AssistantModelChoice } from '@/types/assistant/model'
import type { AssistantProvider } from '@/types/assistant/model'

import { ArrowUp, Square } from '@lucide/vue'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import ConfirmDialog from '@/components/overlay/ConfirmDialog.vue'
import { useAssistant } from '@/composables/assistant/use-assistant'
import { INTRODUCTORY_MODELS } from '@/composables/assistant/use-assistant-configuration'

const { t } = useI18n()
const emit = defineEmits<{ configure: [provider: AssistantProvider] }>()
const {
  currentConversation,
  currentDraft,
  hasActiveGeneration,
  isSending,
  sendQuestion,
  stopGeneration,
  selectedModel,
  modelConfiguration,
  selectConversationModel,
} = useAssistant()
const input = ref<HTMLTextAreaElement | null>(null)
const modelSelect = ref<HTMLSelectElement | null>(null)
const pendingModel = ref<AssistantModelChoice | null>(null)
const confirmation = ref<'openai' | 'provider' | null>(null)
const isConfirming = ref(false)
const pendingSend = ref(false)
const isCheckingConfiguration = ref(false)
const showConfigurationPrompt = ref(false)
const activeAnswerId = computed(() => currentConversation.value?.activeAnswerId)
const modelIdentity = computed(() =>
  selectedModel.value ? `${selectedModel.value.provider}:${selectedModel.value.modelId}` : '',
)
const chatModels = computed(() => {
  const configured = (modelConfiguration.configuration.value?.models ?? [])
    .filter(
      (model) =>
        model.reason !== 'pending_compatibility' ||
        `${model.provider}:${model.modelId}` === modelIdentity.value,
    )
    .map((model) => ({ ...model, isIntroductory: false }))
  const connectedProviders = new Set(
    modelConfiguration.configuration.value?.keys.map((key) => key.provider) ?? [],
  )
  // AI modified: show ordinary provider and model choices before an account has a Key.
  const introductory = INTRODUCTORY_MODELS.filter(
    (model) =>
      !connectedProviders.has(model.provider) &&
      !configured.some(
        (entry) => entry.provider === model.provider && entry.modelId === model.modelId,
      ),
  ).map((model) => ({ ...model, isAvailable: false, reason: null, isIntroductory: true }))
  return [...configured, ...introductory]
})
const isSelectedModelAvailable = computed(
  () =>
    modelConfiguration.configuration.value?.models.some(
      (model) => model.isAvailable && `${model.provider}:${model.modelId}` === modelIdentity.value,
    ) ?? false,
)
const selectedModelReason = computed(
  () =>
    modelConfiguration.configuration.value?.models.find(
      (model) => `${model.provider}:${model.modelId}` === modelIdentity.value,
    )?.reason ?? 'unavailable',
)
const hasUsableProviderKey = computed(
  () =>
    modelConfiguration.configuration.value?.keys.some(
      (key) =>
        key.provider === selectedModel.value?.provider && key.isEnabled && !key.lastErrorCode,
    ) ?? false,
)
const canAttemptSend = computed(
  () =>
    currentDraft.value.trim().length > 0 &&
    !hasActiveGeneration.value &&
    !isSending.value &&
    !isCheckingConfiguration.value,
)

async function chooseModel(event: Event): Promise<void> {
  const identity = (event.target as HTMLSelectElement).value
  const model = chatModels.value.find(
    (entry) =>
      `${entry.provider}:${entry.modelId}` === identity &&
      (entry.isAvailable || entry.isIntroductory),
  )
  if (!model) return
  showConfigurationPrompt.value = false
  pendingModel.value = { provider: model.provider, modelId: model.modelId }
  if (model.isIntroductory) {
    await applyModel()
    return
  }
  if (model.provider === 'openai' && !modelConfiguration.configuration.value?.hasOpenAiConsent) {
    confirmation.value = 'openai'
    return
  }
  if (
    currentConversation.value?.provider &&
    currentConversation.value.provider !== model.provider
  ) {
    confirmation.value = 'provider'
    return
  }
  await applyModel()
}

async function applyModel(confirmed = false): Promise<void> {
  const model = pendingModel.value
  if (!model) return
  await selectConversationModel(model, confirmed)
  pendingModel.value = null
}

async function confirmChoice(): Promise<void> {
  isConfirming.value = true
  try {
    if (confirmation.value === 'openai') {
      await modelConfiguration.consentToOpenAi()
      if (pendingSend.value) {
        if (
          currentConversation.value?.provider &&
          currentConversation.value.provider !== 'openai'
        ) {
          confirmation.value = 'provider'
          return
        }
        pendingSend.value = false
        confirmation.value = null
        await sendQuestion()
        return
      }
      if (currentConversation.value?.provider && currentConversation.value.provider !== 'openai') {
        confirmation.value = 'provider'
        return
      }
      await applyModel()
    } else if (confirmation.value === 'provider') {
      if (pendingSend.value) {
        pendingSend.value = false
        await sendQuestion(true)
      } else {
        await applyModel(true)
      }
    }
    confirmation.value = null
  } finally {
    isConfirming.value = false
  }
}

async function submit(): Promise<void> {
  if (!canAttemptSend.value) return
  showConfigurationPrompt.value = false
  if (!modelConfiguration.isVerified.value) {
    isCheckingConfiguration.value = true
    try {
      await modelConfiguration.refreshConfiguration()
    } catch {
      return
    } finally {
      isCheckingConfiguration.value = false
    }
  }
  if (!selectedModel.value || !isSelectedModelAvailable.value) {
    if (!hasUsableProviderKey.value) showConfigurationPrompt.value = true
    else modelSelect.value?.focus()
    return
  }
  if (
    selectedModel.value?.provider === 'openai' &&
    !modelConfiguration.configuration.value?.hasOpenAiConsent
  ) {
    pendingSend.value = true
    confirmation.value = 'openai'
    return
  }
  if (
    currentConversation.value?.provider &&
    currentConversation.value.provider !== selectedModel.value.provider
  ) {
    pendingSend.value = true
    confirmation.value = 'provider'
    return
  }
  await sendQuestion()
}

function submitOnEnter(event: KeyboardEvent): void {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  void submit()
}

function focusInput(): void {
  input.value?.focus()
}

defineExpose({ focusInput })
</script>

<template>
  <!-- AI modified: drafts remain editable during generation, while account-wide sending stays serialized. -->
  <div class="mx-auto w-full max-w-[800px] px-4 pb-4 pt-2 sm:px-6">
    <div
      class="rounded-2xl border border-[#E7E4EC] bg-white shadow-[0_2px_14px_rgba(25,18,43,0.045)] focus-within:border-[#B79BDD] dark:border-[#3B3843] dark:bg-[#25242B]"
    >
      <textarea
        ref="input"
        v-model="currentDraft"
        :aria-label="t('assistant.message')"
        :placeholder="t('assistant.placeholder')"
        rows="2"
        maxlength="12000"
        class="block max-h-44 min-h-20 w-full resize-none bg-transparent px-4 pt-3 text-sm leading-6 text-foreground outline-none placeholder:text-muted-foreground"
        @keydown="submitOnEnter"
      />
      <div class="flex items-center justify-between gap-2 px-3 pb-3">
        <div class="flex min-w-0 items-center gap-2">
          <select
            ref="modelSelect"
            :value="modelIdentity"
            :aria-label="t('assistant.chooseModel')"
            class="max-w-[210px] min-w-0 truncate rounded-md bg-muted/60 px-2 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-violet-400"
            @change="chooseModel"
          >
            <option v-if="!selectedModel" value="">{{ t('assistant.chooseModel') }}</option>
            <option
              v-else-if="
                !chatModels.some((model) => `${model.provider}:${model.modelId}` === modelIdentity)
              "
              :value="modelIdentity"
              disabled
            >
              {{ modelIdentity.replace(':', ' · ') }} · {{ t('assistant.modelUnavailable') }}
            </option>
            <option
              v-for="model in chatModels"
              :key="`${model.provider}:${model.modelId}`"
              :value="`${model.provider}:${model.modelId}`"
              :disabled="!model.isAvailable && !model.isIntroductory"
            >
              {{ model.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI' }} · {{ model.modelId
              }}{{
                model.isAvailable || model.isIntroductory
                  ? ''
                  : ` (${t(`assistant.modelReason.${model.reason ?? 'unavailable'}`)})`
              }}
            </option>
          </select>
          <span class="hidden text-[11px] text-muted-foreground sm:inline">{{
            t('assistant.enterHint')
          }}</span>
        </div>
        <button
          v-if="activeAnswerId"
          type="button"
          :aria-label="t('assistant.stop')"
          class="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-foreground text-background transition-opacity hover:opacity-80"
          @click="stopGeneration(activeAnswerId)"
        >
          <Square class="size-3.5 fill-current" />
        </button>
        <button
          v-else
          type="button"
          :aria-label="t('assistant.send')"
          :disabled="!canAttemptSend"
          class="flex size-8 cursor-pointer items-center justify-center rounded-lg bg-[#6F35B5] text-white transition-opacity hover:opacity-85 disabled:cursor-not-allowed disabled:bg-[#D5D0DD] dark:disabled:bg-[#55505B]"
          @click="submit"
        >
          <ArrowUp class="size-4" />
        </button>
      </div>
    </div>
    <div
      v-if="showConfigurationPrompt && !hasUsableProviderKey"
      role="status"
      class="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100"
    >
      <span>{{
        t('assistant.configureBeforeSend', {
          provider: selectedModel?.provider === 'openai' ? 'OpenAI' : 'DeepSeek',
        })
      }}</span>
      <button
        type="button"
        class="font-semibold underline underline-offset-2"
        @click="emit('configure', selectedModel?.provider ?? 'deepseek')"
      >
        {{ t('assistant.openModelSettings') }}
      </button>
    </div>
    <p
      v-else-if="
        modelConfiguration.isVerified.value && !isSelectedModelAvailable && hasUsableProviderKey
      "
      class="pt-2 text-center text-xs text-muted-foreground"
    >
      {{ t(`assistant.modelReason.${selectedModelReason}`) }} ·
      {{ t('assistant.modelUnavailable') }}
    </p>
    <p
      v-else-if="modelConfiguration.configuration.value?.modelNotice"
      class="pt-2 text-center text-xs text-violet-700 dark:text-violet-300"
    >
      {{
        t('assistant.settings.modelChanged', {
          previous: `${modelConfiguration.configuration.value.modelNotice.previous.provider} · ${modelConfiguration.configuration.value.modelNotice.previous.modelId}`,
          replacement: modelConfiguration.configuration.value.modelNotice.replacement
            ? `${modelConfiguration.configuration.value.modelNotice.replacement.provider} · ${modelConfiguration.configuration.value.modelNotice.replacement.modelId}`
            : t('assistant.settings.noModel'),
        })
      }}
    </p>
    <p
      v-else-if="!modelConfiguration.isVerified.value"
      class="pt-2 text-center text-xs text-muted-foreground"
    >
      {{ t('assistant.settings.unverified') }}
    </p>
    <p
      v-else-if="hasActiveGeneration && !activeAnswerId"
      class="pt-2 text-center text-xs text-muted-foreground"
    >
      {{ t('assistant.otherGeneration') }}
    </p>
    <p v-else class="pt-2 text-center text-[11px] text-muted-foreground">
      {{ t('assistant.boundary') }}
    </p>
  </div>
  <ConfirmDialog
    :open="confirmation !== null"
    :title="confirmation === 'openai' ? 'OpenAI' : t('assistant.chooseModel')"
    :description="
      confirmation === 'openai' ? t('assistant.openAiConsent') : t('assistant.crossProviderConsent')
    "
    :is-loading="isConfirming"
    @update:open="
      (open) => {
        if (!open) {
          confirmation = null
          pendingModel = null
          pendingSend = false
        }
      }
    "
    @confirm="confirmChoice"
  />
</template>
