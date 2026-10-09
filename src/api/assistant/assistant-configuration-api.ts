import { http } from '@/http/http-client'
import type { AssistantProvider } from '@/types/assistant/model'
import type {
  AssistantConfiguration,
  AssistantBalance,
  AssistantModelChange,
} from '@/types/assistant/configuration'
import type { AssistantModelChoice } from '@/types/assistant/model'

// AI modified: configuration endpoints return server values without owning client state.
export const assistantConfigurationApi = {
  readConfiguration(): Promise<AssistantConfiguration> {
    return http.get('assistant/configuration', { silent: true })
  },
  addKey(
    provider: AssistantProvider,
    name: string,
    apiKey: string,
  ): Promise<AssistantConfiguration> {
    return http.post('assistant/keys', { provider, name, apiKey }, { silent: true })
  },
  replaceKey(
    keyId: string,
    provider: AssistantProvider,
    name: string,
    apiKey: string,
  ): Promise<AssistantConfiguration> {
    return http.put(`assistant/keys/${keyId}`, { provider, name, apiKey }, { silent: true })
  },
  updateKey(
    keyId: string,
    changes: { name?: string; isEnabled?: boolean; position?: number },
  ): Promise<AssistantConfiguration> {
    return http.patch(`assistant/keys/${keyId}`, changes, { silent: true })
  },
  deleteKey(keyId: string): Promise<AssistantConfiguration> {
    return http.delete(`assistant/keys/${keyId}`, { silent: true })
  },
  // AI modified: model switches submit defaults atomically; emergency revocation cancels work rather than waiting for deletion.
  updateModel(changes: AssistantModelChange): Promise<AssistantConfiguration> {
    return http.patch('assistant/models', changes, { silent: true })
  },
  revokeKey(keyId: string): Promise<AssistantConfiguration> {
    return http.post(`assistant/keys/${encodeURIComponent(keyId)}/revoke`, undefined, {
      silent: true,
    })
  },
  refreshModels(keyId: string): Promise<AssistantConfiguration> {
    return http.post(`assistant/keys/${keyId}/refresh-models`, undefined, { silent: true })
  },
  readBalance(keyId: string): Promise<AssistantBalance> {
    return http.get(`assistant/keys/${keyId}/balance`, { silent: true })
  },
  savePreferences(
    defaultModel: AssistantModelChoice | null,
    backupModels: AssistantModelChoice[],
  ): Promise<AssistantConfiguration> {
    return http.put('assistant/preferences', { defaultModel, backupModels }, { silent: true })
  },
  consentToOpenAi(): Promise<unknown> {
    return http.post('assistant/openai-consent', undefined, { silent: true })
  },
}
