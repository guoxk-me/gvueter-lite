<script setup lang="ts">
import type { AssistantBalance, AssistantKey } from '@/types/assistant/configuration'
import type { AssistantModelChoice } from '@/types/assistant/model'
import type { AssistantProvider } from '@/types/assistant/model'

import { isCancel } from 'axios'
import { ArrowLeft, ArrowDown, ArrowUp, Plus, RefreshCw, Settings2, X } from '@lucide/vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import ConfirmDialog from '@/components/overlay/ConfirmDialog.vue'
import SidePanel from '@/components/overlay/SidePanel.vue'
import { useAssistantConfiguration } from '@/composables/assistant/use-assistant-configuration'

const { t, locale } = useI18n()
const router = useRouter()
const route = useRoute()
const assistant = useAssistantConfiguration()
const provider = ref<AssistantProvider>(route.query.provider === 'openai' ? 'openai' : 'deepseek')
const hasSavedConfiguration = ref(false)
const isReturningToAssistant = computed(
  () => route.query.returnTo === 'chat' || route.query.returnTo === 'panel',
)
const keys = computed(
  () =>
    assistant.configuration.value?.keys
      .filter((key) => key.provider === provider.value)
      .sort((a, b) => a.position - b.position) ?? [],
)
const primaryKeyId = computed(
  () => keys.value.find((key) => key.isEnabled && !key.lastErrorCode)?.id ?? null,
)
const models = computed(() => assistant.availableModels.value)
const isBusy = ref(false)
const error = ref('')
const balances = reactive<Record<string, AssistantBalance>>({})
const form = reactive({ keyId: '', name: '', apiKey: '' })
const isFormOpen = ref(false)
const originalKeyName = ref('')
const deletingKey = ref<AssistantKey | null>(null)
const renamingKeyId = ref<string | null>(null)
const renamedKey = ref('')
const defaultIdentity = ref('')
const backupIdentities = ref<string[]>([])
const isPreferencesDirty = ref(false)
const modelIdentity = (model: AssistantModelChoice): string => `${model.provider}:${model.modelId}`
const displayTime = (iso: string): string =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(iso),
  )
const choice = (identity: string): AssistantModelChoice | null => {
  const model = models.value.find((entry) => modelIdentity(entry) === identity)
  return model ? { provider: model.provider, modelId: model.modelId } : null
}

watch(
  () => assistant.configuration.value,
  (configuration) => {
    if (!configuration || isPreferencesDirty.value) return
    defaultIdentity.value = configuration.defaultModel
      ? modelIdentity(configuration.defaultModel)
      : ''
    backupIdentities.value = configuration.backupModels.map(modelIdentity)
  },
  { immediate: true },
)
watch(
  () => route.query.provider,
  (requestedProvider) => {
    if (requestedProvider === 'deepseek' || requestedProvider === 'openai')
      provider.value = requestedProvider
  },
)

function returnToAssistant(): void {
  // AI modified: returning through history restores the original drawer when settings opened from it.
  if (isReturningToAssistant.value && window.history.state?.back) router.back()
  else void router.push({ name: 'assistant' })
}

async function run(action: () => Promise<void>): Promise<void> {
  isBusy.value = true
  error.value = ''
  try {
    await action()
  } catch (cause) {
    // AI modified: a session switch cancels old saves without surfacing a stale error.
    if (isCancel(cause)) return
    const message = cause instanceof Error ? cause.message : ''
    error.value = message.includes('validation failed')
      ? t('assistant.settings.validationFailed')
      : message.includes('cannot read the official model catalog')
        ? t('assistant.settings.catalogDenied')
        : message.includes('Model catalog is unavailable')
          ? t('assistant.settings.catalogUnavailable')
          : message.includes('No compatible text model')
            ? t('assistant.settings.noCompatibleModel')
            : message.includes('model is unavailable')
              ? t('assistant.modelUnavailable')
              : t('assistant.requestFailed')
  } finally {
    isBusy.value = false
  }
}
async function load(): Promise<void> {
  await run(async () => {
    await assistant.refreshConfiguration()
    await Promise.all(
      assistant.configuration.value?.keys.map(async (key) => {
        balances[key.id] = await assistant.readBalance(key.id).catch(() => ({
          status: 'unavailable' as const,
          balances: [],
          checkedAt: new Date().toISOString(),
        }))
      }) ?? [],
    )
  })
}
onMounted(() => {
  void load()
})
function openForm(key?: AssistantKey): void {
  error.value = ''
  form.keyId = key?.id ?? ''
  form.name = key?.name ?? ''
  originalKeyName.value = form.name
  form.apiKey = ''
  isFormOpen.value = true
}
async function saveKey(): Promise<void> {
  if (!form.name.trim() || !form.apiKey.trim()) return
  await run(async () => {
    if (form.keyId) await assistant.replaceKey(form.keyId, provider.value, form.name, form.apiKey)
    else await assistant.addKey(provider.value, form.name, form.apiKey)
    hasSavedConfiguration.value = true
    form.apiKey = ''
    isFormOpen.value = false
  })
  if (!isFormOpen.value) await load()
}
async function changeKey(
  keyId: string,
  changes: { name?: string; isEnabled?: boolean; position?: number },
): Promise<void> {
  await run(() => assistant.updateKey(keyId, changes))
}
function beginRename(key: AssistantKey): void {
  renamingKeyId.value = key.id
  renamedKey.value = key.name
}
async function saveName(keyId: string): Promise<void> {
  if (!renamedKey.value.trim()) return
  await changeKey(keyId, { name: renamedKey.value.trim() })
  if (!error.value) renamingKeyId.value = null
}
async function removeKey(): Promise<void> {
  const key = deletingKey.value
  if (!key) return
  await run(async () => {
    await assistant.deleteKey(key.id)
    deletingKey.value = null
  })
}
async function savePreferences(): Promise<void> {
  await run(async () => {
    const selectedDefault = choice(defaultIdentity.value)
    const backups = backupIdentities.value
      .map(choice)
      .filter(
        (model): model is AssistantModelChoice =>
          model !== null && modelIdentity(model) !== defaultIdentity.value,
      )
    await assistant.savePreferences(selectedDefault, backups)
    isPreferencesDirty.value = false
    hasSavedConfiguration.value = true
  })
}
function addBackup(event: Event): void {
  const identity = (event.target as HTMLSelectElement).value
  if (
    identity &&
    identity !== defaultIdentity.value &&
    !backupIdentities.value.includes(identity)
  ) {
    backupIdentities.value = [...backupIdentities.value, identity]
    isPreferencesDirty.value = true
  }
  ;(event.target as HTMLSelectElement).value = ''
}
function shiftBackup(index: number, direction: -1 | 1): void {
  const next = [...backupIdentities.value]
  const target = index + direction
  if (target < 0 || target >= next.length) return
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  backupIdentities.value = next
  isPreferencesDirty.value = true
}
function removeBackup(index: number): void {
  backupIdentities.value.splice(index, 1)
  isPreferencesDirty.value = true
}
// AI modified: preserve the page's component identity after standardizing its entry filename.
defineOptions({ name: 'AssistantSettingsPage' })
</script>

<template>
  <!-- AI modified: each signed-in user manages only their own provider connections and model choices. -->
  <div class="mx-auto max-w-[1320px] pb-12 text-foreground">
    <div class="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <button
          type="button"
          class="mb-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          @click="router.back()"
        >
          <ArrowLeft class="size-3.5" />{{ t('assistant.settings.back') }}
        </button>
        <h1 class="text-2xl font-semibold tracking-tight">{{ t('assistant.settings.title') }}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{{ t('assistant.settings.intro') }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs hover:bg-muted"
        :disabled="isBusy"
        @click="load"
      >
        <RefreshCw class="size-3.5" :class="isBusy ? 'animate-spin' : ''" />{{
          t('assistant.settings.refresh')
        }}
      </button>
    </div>
    <div
      v-if="error"
      role="alert"
      class="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      {{ error }}
    </div>
    <div
      v-if="hasSavedConfiguration"
      role="status"
      class="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100"
    >
      <span>{{ t('assistant.settings.saved') }}</span>
      <button
        type="button"
        class="font-semibold underline underline-offset-2"
        @click="returnToAssistant"
      >
        {{
          isReturningToAssistant
            ? t('assistant.settings.returnToConversation')
            : t('assistant.settings.openAssistant')
        }}
      </button>
    </div>
    <div
      v-if="assistant.configuration.value?.modelNotice"
      role="status"
      class="mb-4 rounded-lg border border-violet-300 bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-100"
    >
      {{
        t('assistant.settings.modelChanged', {
          previous: `${assistant.configuration.value.modelNotice.previous.provider} · ${assistant.configuration.value.modelNotice.previous.modelId}`,
          replacement: assistant.configuration.value.modelNotice.replacement
            ? `${assistant.configuration.value.modelNotice.replacement.provider} · ${assistant.configuration.value.modelNotice.replacement.modelId}`
            : t('assistant.settings.noModel'),
        })
      }}
    </div>
    <div
      v-if="!assistant.isVerified.value"
      class="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
    >
      {{ t('assistant.settings.unverified') }}
    </div>
    <div class="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section class="min-w-0 rounded-2xl border border-border bg-background shadow-sm">
        <div class="flex gap-1 border-b border-border p-4">
          <button
            v-for="providerName in ['deepseek', 'openai'] as const"
            :key="providerName"
            type="button"
            class="rounded-lg px-4 py-2 text-sm font-medium"
            :class="
              provider === providerName
                ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200'
                : 'text-muted-foreground hover:bg-muted'
            "
            @click="provider = providerName"
          >
            {{ providerName === 'deepseek' ? 'DeepSeek' : 'OpenAI' }}
          </button>
        </div>
        <div class="space-y-5 p-5">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold">
                {{ provider === 'deepseek' ? 'DeepSeek' : 'OpenAI' }}
              </h2>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ t('assistant.settings.keyHint') }}
              </p>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-lg bg-violet-700 px-3 py-2 text-xs font-medium text-white hover:bg-violet-800"
              @click="openForm()"
            >
              <Plus class="size-3.5" />{{ t('assistant.settings.addKey') }}
            </button>
          </div>
          <p
            v-if="keys.length === 0"
            class="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground"
          >
            {{ t('assistant.settings.noKeys') }}
          </p>
          <article
            v-for="(key, index) in keys"
            :key="key.id"
            class="rounded-xl border border-border bg-muted/20 p-4"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div class="flex items-center gap-2">
                  <input
                    v-if="renamingKeyId === key.id"
                    v-model="renamedKey"
                    maxlength="80"
                    :aria-label="t('assistant.settings.keyName')"
                    class="w-40 rounded border border-border bg-background px-2 py-1 text-sm"
                    @keydown.enter="saveName(key.id)"
                    @keydown.esc="renamingKeyId = null"
                  /><strong v-else class="text-sm">{{ key.name }}</strong
                  ><span class="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">{{
                    key.id === primaryKeyId
                      ? t('assistant.settings.primary')
                      : t('assistant.settings.backup')
                  }}</span>
                </div>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{
                    key.isEnabled
                      ? t('assistant.settings.enabled')
                      : t('assistant.settings.disabled')
                  }}<span v-if="key.lastErrorCode">
                    · {{ t(`assistant.modelReason.${key.lastErrorCode}`) }}</span
                  >
                </p>
              </div>
              <label class="flex cursor-pointer items-center gap-2 text-xs"
                ><input
                  type="checkbox"
                  :checked="key.isEnabled"
                  :disabled="isBusy"
                  @change="changeKey(key.id, { isEnabled: !key.isEnabled })"
                />{{ t('assistant.settings.enabled') }}</label
              >
            </div>
            <p class="mt-3 text-xs text-muted-foreground">
              <template v-if="provider === 'deepseek'"
                ><template v-if="balances[key.id]?.status === 'available'"
                  >{{ t('assistant.settings.accountBalance') }}:
                  {{
                    balances[key.id]?.balances
                      .map((balance) => `${balance.amount} ${balance.currency}`)
                      .join(' · ')
                  }}
                  · {{ displayTime(balances[key.id]!.checkedAt) }}</template
                ><template v-else>{{
                  t('assistant.settings.balanceUnavailable')
                }}</template></template
              ><template v-else
                >{{ t('assistant.settings.openAiBalance') }} ·
                <a
                  class="underline"
                  href="https://platform.openai.com/usage"
                  target="_blank"
                  rel="noopener noreferrer"
                  >{{ t('assistant.settings.billing') }}</a
                ></template
              >
            </p>
            <p v-if="key.lastSyncedAt" class="mt-1 text-[11px] text-muted-foreground">
              {{ t('assistant.settings.lastSynced') }}: {{ displayTime(key.lastSyncedAt) }}
            </p>
            <div
              class="mt-4 flex flex-wrap items-center gap-3 text-xs text-violet-700 dark:text-violet-300"
            >
              <button type="button" :disabled="isBusy" @click="openForm(key)">
                {{ t('assistant.settings.replace') }}
              </button>
              <button
                type="button"
                :disabled="isBusy"
                @click="renamingKeyId === key.id ? saveName(key.id) : beginRename(key)"
              >
                {{ renamingKeyId === key.id ? t('assistant.save') : t('assistant.rename') }}
              </button>
              <button
                type="button"
                :disabled="isBusy || index === 0"
                @click="changeKey(key.id, { position: index - 1 })"
              >
                {{ t('assistant.settings.moveUp') }}
              </button>
              <button
                type="button"
                :disabled="isBusy || index === keys.length - 1"
                @click="changeKey(key.id, { position: index + 1 })"
              >
                {{ t('assistant.settings.moveDown') }}
              </button>
              <button
                type="button"
                :disabled="isBusy"
                @click="run(() => assistant.refreshModels(key.id))"
              >
                {{ t('assistant.settings.syncModels') }}
              </button>
              <button
                type="button"
                class="text-destructive"
                :disabled="isBusy"
                @click="deletingKey = key"
              >
                {{ t('assistant.delete') }}
              </button>
            </div>
          </article>
        </div>
      </section>
      <section class="self-start rounded-2xl border border-border bg-background p-5 shadow-sm">
        <div class="flex items-center gap-2">
          <Settings2 class="size-4 text-violet-600" />
          <h2 class="text-base font-semibold">{{ t('assistant.settings.defaults') }}</h2>
        </div>
        <p class="mt-1 text-xs text-muted-foreground">{{ t('assistant.settings.defaultsHint') }}</p>
        <label class="mt-5 block text-xs font-medium"
          >{{ t('assistant.settings.defaultModel') }}
          <select
            v-model="defaultIdentity"
            class="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
            @change="isPreferencesDirty = true"
          >
            <option value="">{{ t('assistant.settings.noModel') }}</option>
            <option
              v-for="model in models"
              :key="modelIdentity(model)"
              :value="modelIdentity(model)"
            >
              {{ model.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI' }} · {{ model.modelId }}
            </option>
          </select>
        </label>
        <div class="mt-5">
          <p class="text-xs font-medium">{{ t('assistant.settings.backupModels') }}</p>
          <p class="mt-1 text-xs text-muted-foreground">{{ t('assistant.settings.backupHint') }}</p>
          <div
            v-for="(identity, index) in backupIdentities"
            :key="identity"
            class="mt-2 flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"
          >
            <span class="min-w-0 flex-1 truncate"
              >{{ index + 1 }}. {{ identity.replace(':', ' · ') }}</span
            ><button
              type="button"
              :disabled="index === 0"
              :aria-label="t('assistant.settings.moveUp')"
              @click="shiftBackup(index, -1)"
            >
              <ArrowUp class="size-3.5" /></button
            ><button
              type="button"
              :disabled="index === backupIdentities.length - 1"
              :aria-label="t('assistant.settings.moveDown')"
              @click="shiftBackup(index, 1)"
            >
              <ArrowDown class="size-3.5" /></button
            ><button type="button" :aria-label="t('assistant.delete')" @click="removeBackup(index)">
              <X class="size-3.5" />
            </button>
          </div>
          <select
            class="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            @change="addBackup"
          >
            <option value="">{{ t('assistant.settings.addBackup') }}</option>
            <option
              v-for="model in models.filter(
                (entry) =>
                  modelIdentity(entry) !== defaultIdentity &&
                  !backupIdentities.includes(modelIdentity(entry)),
              )"
              :key="modelIdentity(model)"
              :value="modelIdentity(model)"
            >
              {{ model.provider === 'deepseek' ? 'DeepSeek' : 'OpenAI' }} · {{ model.modelId }}
            </option>
          </select>
        </div>
        <button
          type="button"
          class="mt-6 w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          :disabled="!isPreferencesDirty || isBusy || !assistant.isVerified.value"
          @click="savePreferences"
        >
          {{ t('assistant.settings.saveDefaults') }}
        </button>
      </section>
    </div>
    <SidePanel
      :open="isFormOpen"
      :title="form.keyId ? t('assistant.settings.replace') : t('assistant.settings.addKey')"
      :description="t('assistant.settings.secretHint')"
      :is-dirty="Boolean(form.apiKey || form.name !== originalKeyName)"
      :is-submitting="isBusy"
      width-class="sm:max-w-[464px]"
      @update:open="
        (open) => {
          isFormOpen = open
          if (!open) form.apiKey = ''
        }
      "
    >
      <form class="space-y-5" @submit.prevent="saveKey">
        <p
          v-if="error"
          role="alert"
          class="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          {{ error }}
        </p>
        <label class="block text-sm"
          >{{ t('assistant.settings.keyName') }}
          <input
            v-model="form.name"
            required
            maxlength="80"
            class="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <label class="block text-sm"
          >API Key
          <input
            v-model="form.apiKey"
            required
            type="password"
            autocomplete="off"
            class="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2"
          />
        </label>
        <button
          type="submit"
          :disabled="isBusy"
          class="w-full rounded-lg bg-violet-700 px-4 py-2.5 text-sm text-white disabled:opacity-40"
        >
          {{ isBusy ? t('assistant.settings.verifying') : t('assistant.save') }}
        </button>
      </form>
    </SidePanel>
    <ConfirmDialog
      :open="deletingKey !== null"
      :title="t('assistant.settings.deleteKeyTitle')"
      :description="t('assistant.settings.deleteKeyDescription')"
      :confirm-text="t('assistant.delete')"
      :is-loading="isBusy"
      variant="destructive"
      @update:open="
        (open) => {
          if (!open) deletingKey = null
        }
      "
      @confirm="removeKey"
    />
  </div>
</template>
