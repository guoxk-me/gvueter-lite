// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { components } from '../generated/gnester-lite'

// AI modified: configuration controls and responses share the verified OpenAPI contract.
export type AssistantModelOption = components['schemas']['AssistantModelResponse']
export type AssistantModelChange = components['schemas']['UpdateModelBody']
export type AssistantKey = components['schemas']['AssistantKeyResponse']
export type AssistantConfiguration = components['schemas']['AssistantConfigurationResponse']

export interface AssistantBalance {
  status: 'available' | 'unsupported' | 'unavailable'
  balances: { currency: string; amount: string }[]
  checkedAt: string
}
