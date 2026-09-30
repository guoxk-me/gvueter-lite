// AI modified: group pure types by stable concepts instead of implementation filenames.

export interface AssistantRequestOptions {
  method?: 'POST' | 'PATCH' | 'DELETE'
  data?: unknown
}

export type AssistantMutation = <T>(path: string, options: AssistantRequestOptions) => Promise<T>
