<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AssistantModelChoice } from '@/types/assistant/model'
import type { AssistantModelChange, AssistantModelOption } from '@/types/assistant/configuration'
import SidePanel from '@/components/overlay/SidePanel.vue'
import { Button } from '@/components/ui/button'

// AI modified: keep model switch drafts private and submit the replacement default with the switch.
const props = defineProps<{
  models: readonly Readonly<AssistantModelOption>[]
  defaultModel: Readonly<AssistantModelChoice> | null
  backupModels: readonly Readonly<AssistantModelChoice>[]
  isBusy: boolean
}>()
const emit = defineEmits<{ change: [changes: AssistantModelChange] }>()
const { t } = useI18n()
const selectedModel = shallowRef<Readonly<AssistantModelOption> | null>(null)
const replacementIdentity = shallowRef('')
const isPanelOpen = computed(() => selectedModel.value !== null)
const isEnabling = computed(() => selectedModel.value?.isEnabled === false)
const availableDefaults = computed(() =>
  props.models.filter((model) => {
    const isSelected =
      model.provider === selectedModel.value?.provider &&
      model.modelId === selectedModel.value?.modelId
    return isSelected ? isEnabling.value : model.isAvailable
  }),
)
const canSubmit = computed(
  () =>
    !props.isBusy &&
    (availableDefaults.value.length === 0 ||
      availableDefaults.value.some(
        (model) => `${model.provider}:${model.modelId}` === replacementIdentity.value,
      )),
)

function selectModel(model: Readonly<AssistantModelOption>): void {
  selectedModel.value = model
  const defaultModel = props.defaultModel
  const isDisablingDefault =
    model.isEnabled &&
    defaultModel?.provider === model.provider &&
    defaultModel.modelId === model.modelId
  replacementIdentity.value = isDisablingDefault
    ? ''
    : defaultModel
      ? `${defaultModel.provider}:${defaultModel.modelId}`
      : model.isEnabled
        ? ''
        : `${model.provider}:${model.modelId}`
}
function submitChange(): void {
  const selected = selectedModel.value
  if (!selected || !canSubmit.value) return
  const replacement = availableDefaults.value.find(
    (model) => `${model.provider}:${model.modelId}` === replacementIdentity.value,
  )
  emit('change', {
    provider: selected.provider,
    modelId: selected.modelId,
    isEnabled: !selected.isEnabled,
    defaultModel: replacement
      ? { provider: replacement.provider, modelId: replacement.modelId }
      : null,
    backupModels: props.backupModels
      .filter(
        (model) =>
          (isEnabling.value ||
            model.provider !== selected.provider ||
            model.modelId !== selected.modelId) &&
          (model.provider !== replacement?.provider || model.modelId !== replacement.modelId),
      )
      .map((model) => ({ provider: model.provider, modelId: model.modelId })),
  })
}
watch(
  () => props.models,
  (models) => {
    const selected = selectedModel.value
    if (
      selected &&
      models.find(
        (model) => model.provider === selected.provider && model.modelId === selected.modelId,
      )?.isEnabled !== selected.isEnabled
    )
      selectedModel.value = null
  },
)
</script>

<template>
  <section class="mt-6 rounded-2xl border border-border bg-background p-5">
    <h2 class="text-sm font-semibold">{{ t('assistant.settings.modelControls') }}</h2>
    <p class="mt-1 text-xs text-muted-foreground">
      {{ t('assistant.settings.modelControlsHint') }}
    </p>
    <p v-if="models.length === 0" class="mt-4 text-sm text-muted-foreground">
      {{ t('assistant.settings.noModel') }}
    </p>
    <div
      v-for="model in models"
      :key="`${model.provider}:${model.modelId}`"
      class="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 last:border-0"
    >
      <div class="min-w-0">
        <p class="break-all text-sm">
          {{ model.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI' }} · {{ model.modelId }}
        </p>
        <p class="mt-1 text-xs text-muted-foreground">
          {{
            model.isAvailable
              ? t('assistant.settings.enabled')
              : t(`assistant.modelReason.${model.reason ?? 'unavailable'}`)
          }}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        :disabled="isBusy"
        :aria-label="`${model.isEnabled ? t('assistant.settings.disableModel') : t('assistant.settings.enableModel')} ${model.modelId}`"
        @click="selectModel(model)"
      >
        {{
          model.isEnabled
            ? t('assistant.settings.disableModel')
            : t('assistant.settings.enableModel')
        }}
      </Button>
    </div>
    <SidePanel
      :open="isPanelOpen"
      :title="
        isEnabling ? t('assistant.settings.enableModel') : t('assistant.settings.disableModel')
      "
      :description="t('assistant.settings.modelSwitchDescription')"
      :is-submitting="isBusy"
      @update:open="
        (open) => {
          if (!open) selectedModel = null
        }
      "
    >
      <form class="space-y-4" @submit.prevent="submitChange">
        <p class="break-all text-sm font-medium">
          {{ selectedModel?.provider }} · {{ selectedModel?.modelId }}
        </p>
        <label v-if="availableDefaults.length" class="block text-sm">
          {{ t('assistant.settings.defaultModel') }}
          <select
            v-model="replacementIdentity"
            required
            class="mt-2 w-full rounded-md border border-border bg-background px-3 py-2"
            :disabled="isBusy"
          >
            <option value="" disabled>{{ t('assistant.settings.chooseReplacement') }}</option>
            <option
              v-for="model in availableDefaults"
              :key="`${model.provider}:${model.modelId}`"
              :value="`${model.provider}:${model.modelId}`"
            >
              {{ model.provider }} · {{ model.modelId }}
            </option>
          </select>
        </label>
        <p v-else class="text-sm text-muted-foreground">
          {{ t('assistant.settings.noModelAfterDisable') }}
        </p>
        <Button type="submit" :disabled="!canSubmit">{{ t('common.confirm') }}</Button>
      </form>
    </SidePanel>
  </section>
</template>
