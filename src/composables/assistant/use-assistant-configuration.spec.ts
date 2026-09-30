import type { AssistantConfiguration } from '@/types/assistant/configuration'

import { nextTick, ref } from 'vue'
import { describe, expect, it, vi } from 'vite-plus/test'

const currentUser = ref<{ id: string } | null>(null)
const get = vi.fn()
vi.mock('../use-auth', () => ({ useAuth: () => ({ currentUser }) }))
vi.mock('@/http/http-client', () => ({ http: { get } }))

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
      models: [{ provider: 'deepseek', modelId: 'deepseek-chat', isAvailable: true, reason: null }],
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
})
