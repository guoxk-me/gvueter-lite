import type { AssistantConfiguration } from '@/types/assistant/configuration'

import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vite-plus/test'

const currentUser = ref<{ id: string } | null>(null)
const get = vi.fn()
const patch = vi.fn()
const post = vi.fn()
vi.mock('../use-auth', () => ({ useAuth: () => ({ currentUser }) }))
vi.mock('@/http/http-client', () => ({ http: { get, patch, post } }))

describe('personal assistant configuration cache', () => {
  it('caches model labels but clears account metadata on sign-out', async () => {
    localStorage.clear()
    currentUser.value = { id: 'user-a' }
    const serverConfiguration: AssistantConfiguration = {
      keys: [
        {
          id: 'key-a',
          provider: 'deepseek',
          name: 'Private account name',
          isEnabled: true,
          position: 0,
          lastErrorCode: null,
          updatedAt: new Date().toISOString(),
          lastSyncedAt: null,
        },
      ],
      models: [
        {
          provider: 'deepseek',
          modelId: 'deepseek-chat',
          isEnabled: true,
          isAvailable: true,
          reason: null,
        },
      ],
      defaultModel: { provider: 'deepseek', modelId: 'deepseek-chat' },
      backupModels: [],
      hasOpenAiConsent: true,
      modelNotice: null,
      updatedAt: new Date().toISOString(),
    }
    get.mockResolvedValueOnce(serverConfiguration)
    const { useAssistantConfiguration } = await import('./use-assistant-configuration')
    const assistant = useAssistantConfiguration()
    await assistant.refreshConfiguration()
    const cache = localStorage.getItem('assistant-models:user-a') ?? ''
    expect(cache).toContain('deepseek-chat')
    expect(cache).not.toContain('Private account name')
    expect(cache).not.toContain('key-a')
    expect(cache).not.toContain('hasOpenAiConsent":true')
    currentUser.value = null
    await nextTick()
    expect(localStorage.getItem('assistant-models:user-a')).toBeNull()
    expect(assistant.configuration.value).toBeNull()
  })

  // AI modified: personal control saves must not leak the previous account's response after switching users.
  it.each(['model', 'revoke'] as const)(
    'ignores a late %s response after an account switch',
    async (operation) => {
      localStorage.clear()
      currentUser.value = { id: 'owner-a' }
      await nextTick()
      const ownerConfiguration: AssistantConfiguration = {
        keys: [],
        models: [],
        defaultModel: null,
        backupModels: [],
        hasOpenAiConsent: false,
        modelNotice: null,
        updatedAt: 'owner-a',
      }
      const otherConfiguration: AssistantConfiguration = {
        ...ownerConfiguration,
        updatedAt: 'owner-b',
      }
      get.mockResolvedValueOnce(ownerConfiguration)
      const { useAssistantConfiguration } = await import('./use-assistant-configuration')
      const assistant = useAssistantConfiguration()
      await assistant.refreshConfiguration()
      let completeSave!: (configuration: AssistantConfiguration) => void
      const pendingResponse = new Promise<AssistantConfiguration>((resolve) => {
        completeSave = resolve
      })
      if (operation === 'model') patch.mockReturnValueOnce(pendingResponse)
      else post.mockReturnValueOnce(pendingResponse)
      const saving =
        operation === 'model'
          ? assistant.updateModel({
              provider: 'deepseek',
              modelId: 'deepseek-chat',
              isEnabled: false,
              defaultModel: null,
              backupModels: [],
            })
          : assistant.revokeKey('owner-key')
      currentUser.value = { id: 'owner-b' }
      await nextTick()
      get.mockResolvedValueOnce(otherConfiguration)
      await assistant.refreshConfiguration()
      completeSave(ownerConfiguration)
      await saving
      expect(assistant.configuration.value?.updatedAt).toBe('owner-b')
      expect(localStorage.getItem('assistant-models:owner-b')).not.toContain('owner-a')
      currentUser.value = null
      await nextTick()
    },
  )
})
