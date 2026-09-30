// AI modified: group pure types by stable concepts instead of implementation filenames.

export type AssistantProvider = 'deepseek' | 'openai'

export interface AssistantModelChoice {
  provider: AssistantProvider
  modelId: string
}
