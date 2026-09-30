// AI modified: group pure types by stable concepts instead of implementation filenames.
import type { AssistantProvider } from '@/types/assistant/model'

export type AssistantAnswerStatus = 'queued' | 'generating' | 'completed' | 'stopped' | 'failed'

export interface AssistantConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  activeAnswerId: string | null
  provider: AssistantProvider | null
  model: string | null
}

export interface AssistantAnswer {
  id: string
  version: number
  content: string
  status: AssistantAnswerStatus
  model: string
  provider: AssistantProvider | null
  errorCode: string | null
  createdAt: string
}

export interface AssistantTurn {
  id: string
  question: string
  selectedAnswerId: string | null
  createdAt: string
  answers: readonly AssistantAnswer[]
}

export interface AssistantConversation extends AssistantConversationSummary {
  turns: readonly AssistantTurn[]
}
