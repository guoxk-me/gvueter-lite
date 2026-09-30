// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { AssistantModelChoice, AssistantProvider } from '@/types/assistant/model'

export interface AssistantModelOption extends AssistantModelChoice {
  isAvailable: boolean
  reason:
    | 'unavailable'
    | 'pending_compatibility'
    | 'retired'
    | 'quota_exhausted'
    | 'key_invalid'
    | 'disabled'
    | null
}

export interface AssistantKey {
  id: string
  provider: AssistantProvider
  name: string
  isEnabled: boolean
  position: number
  lastErrorCode: string | null
  updatedAt: string
  lastSyncedAt: string | null
}

export interface AssistantConfiguration {
  keys: AssistantKey[]
  models: AssistantModelOption[]
  defaultModel: AssistantModelChoice | null
  backupModels: AssistantModelChoice[]
  hasOpenAiConsent: boolean
  updatedAt: string | null
  modelNotice: { previous: AssistantModelChoice; replacement: AssistantModelChoice | null } | null
}

export interface AssistantBalance {
  status: 'available' | 'unsupported' | 'unavailable'
  balances: { currency: string; amount: string }[]
  checkedAt: string
}
