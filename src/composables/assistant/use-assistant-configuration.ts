import type { AssistantProvider } from '@/types/assistant/model'
import type { AssistantModelChoice } from '@/types/assistant/model'
import type { AssistantConfiguration, AssistantBalance } from '@/types/assistant/configuration'
// AI modified: shared pure types live in the centralized owner directory.

import { computed, readonly, shallowRef, watch } from 'vue'
import { assistantConfigurationApi } from '@/api/assistant/assistant-configuration-api'
import { useAuth } from '../use-auth'

// AI modified: initial choices keep the selector useful before a Key can read an official catalog.
export const INTRODUCTORY_MODELS: readonly AssistantModelChoice[] = [
  { provider: 'deepseek', modelId: 'deepseek-flash' },
  { provider: 'deepseek', modelId: 'deepseek-chat' },
  { provider: 'openai', modelId: 'gpt-5-mini' },
  { provider: 'openai', modelId: 'gpt-4o-mini' },
]

const { currentUser } = useAuth()
const configuration = shallowRef<AssistantConfiguration | null>(null)
const isVerified = shallowRef(false)
const isLoading = shallowRef(false)
let loadedUserId: string | null = null
let requestSequence = 0

// AI modified: cache only account-scoped display metadata; secrets, balances and consent remain server-only.
function cacheKey(userId: string): string {
  return `assistant-models:${userId}`
}
function readCache(userId: string): AssistantConfiguration | null {
  try {
    const raw = localStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const cached: unknown = JSON.parse(raw)
    if (
      typeof cached !== 'object' ||
      cached === null ||
      !('models' in cached) ||
      !Array.isArray(cached.models)
    )
      return null
    const { models, defaultModel, backupModels, updatedAt } = cached as AssistantConfiguration
    const displayCache: AssistantConfiguration = {
      keys: [],
      models,
      defaultModel,
      backupModels,
      updatedAt,
      modelNotice: null,
      hasOpenAiConsent: false,
    }
    localStorage.setItem(cacheKey(userId), JSON.stringify(displayCache))
    return displayCache
  } catch {
    return null
  }
}
function applyConfiguration(next: AssistantConfiguration): void {
  requestSequence += 1
  configuration.value = next
  const userId = currentUser.value?.id
  if (userId) {
    const { models, defaultModel, backupModels, updatedAt } = next
    try {
      localStorage.setItem(
        cacheKey(userId),
        JSON.stringify({
          keys: [],
          models,
          defaultModel,
          backupModels,
          updatedAt,
          modelNotice: null,
          hasOpenAiConsent: false,
        }),
      )
    } catch {
      /* The server response still owns the live setting when browser storage is unavailable. */
    }
  }
  isVerified.value = true
  isLoading.value = false
}
watch(currentUser, (user) => {
  if (loadedUserId && loadedUserId !== user?.id) {
    try {
      localStorage.removeItem(cacheKey(loadedUserId))
    } catch {
      /* Continue clearing in-memory state. */
    }
  }
  if (loadedUserId !== user?.id) {
    requestSequence += 1
    loadedUserId = user?.id ?? null
    configuration.value = user ? readCache(user.id) : null
    isVerified.value = false
    isLoading.value = false
  }
})

// AI modified: configuration screens own local failures, suppressing duplicate global feedback.
async function refreshConfiguration(): Promise<void> {
  const userId = currentUser.value?.id
  if (!userId) return
  if (loadedUserId !== userId) {
    loadedUserId = userId
    configuration.value = readCache(userId)
    isVerified.value = false
  }
  isLoading.value = true
  const sequence = ++requestSequence
  try {
    const latest = await assistantConfigurationApi.readConfiguration()
    if (currentUser.value?.id === userId && sequence === requestSequence) applyConfiguration(latest)
  } catch (error) {
    if (sequence === requestSequence) {
      isVerified.value = false
      isLoading.value = false
    }
    throw error
  }
}

async function acceptOwnedConfiguration(response: Promise<AssistantConfiguration>): Promise<void> {
  const ownerId = currentUser.value?.id
  const next = await response
  // AI modified: an in-flight save from a signed-out account cannot populate another account's cache.
  if (ownerId && currentUser.value?.id === ownerId) applyConfiguration(next)
}

// AI modified: configuration state accepts API results only for the active account.
async function addKey(provider: AssistantProvider, name: string, apiKey: string): Promise<void> {
  await acceptOwnedConfiguration(assistantConfigurationApi.addKey(provider, name, apiKey))
}
async function replaceKey(
  keyId: string,
  provider: AssistantProvider,
  name: string,
  apiKey: string,
): Promise<void> {
  await acceptOwnedConfiguration(
    assistantConfigurationApi.replaceKey(keyId, provider, name, apiKey),
  )
}
async function updateKey(
  keyId: string,
  changes: { name?: string; isEnabled?: boolean; position?: number },
): Promise<void> {
  await acceptOwnedConfiguration(assistantConfigurationApi.updateKey(keyId, changes))
}
async function deleteKey(keyId: string): Promise<void> {
  await acceptOwnedConfiguration(assistantConfigurationApi.deleteKey(keyId))
}
async function refreshModels(keyId: string): Promise<void> {
  await acceptOwnedConfiguration(assistantConfigurationApi.refreshModels(keyId))
}
async function readBalance(keyId: string): Promise<AssistantBalance> {
  return assistantConfigurationApi.readBalance(keyId)
}
async function savePreferences(
  defaultModel: AssistantModelChoice | null,
  backupModels: AssistantModelChoice[],
): Promise<void> {
  await acceptOwnedConfiguration(
    assistantConfigurationApi.savePreferences(defaultModel, backupModels),
  )
}
async function consentToOpenAi(): Promise<void> {
  await assistantConfigurationApi.consentToOpenAi()
  await refreshConfiguration()
}

export function useAssistantConfiguration() {
  return {
    configuration: readonly(configuration),
    isVerified: readonly(isVerified),
    isLoading: readonly(isLoading),
    availableModels: computed(
      () => configuration.value?.models.filter((model) => model.isAvailable) ?? [],
    ),
    refreshConfiguration,
    addKey,
    replaceKey,
    updateKey,
    deleteKey,
    refreshModels,
    readBalance,
    savePreferences,
    consentToOpenAi,
  }
}
