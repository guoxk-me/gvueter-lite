import { http } from '@/http/http-client'
import type { AssistantRequestOptions } from '@/types/assistant/request'
import type { AssistantConversation } from '@/types/assistant/conversation'
import type { AssistantModelChoice } from '@/types/assistant/model'

// AI modified: API dispatch owns endpoints; reactive reads and local feedback belong to the composable.
export function requestAssistant<T>(
  path: string,
  options: AssistantRequestOptions = {},
): Promise<T> {
  // AI modified: assistant state owns local feedback, so HTTP requests suppress global Toasts.
  const url = `assistant/${path}`
  if (options.method === 'POST') return http.post<T>(url, options.data, { silent: true })
  if (options.method === 'PATCH') return http.patch<T>(url, options.data, { silent: true })
  if (options.method === 'DELETE') return http.delete<T>(url, { silent: true })
  return http.get<T>(url, { silent: true })
}

export function changeConversationModel(
  conversationId: string,
  model: AssistantModelChoice,
  crossProviderConfirmed: boolean,
): Promise<AssistantConversation> {
  return http.patch(
    `assistant/conversations/${encodeURIComponent(conversationId)}/model`,
    { ...model, crossProviderConfirmed },
    { silent: true },
  )
}
