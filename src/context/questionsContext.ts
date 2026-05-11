import { createContext } from 'react'
import type { InterviewQuestion, QuestionCatalogMeta } from '../types/question'

export type QuestionsStatus = 'idle' | 'loading' | 'ready' | 'error'

export type QuestionsContextValue = {
  status: QuestionsStatus
  error: string | null
  meta: QuestionCatalogMeta | null
  reload: () => void
  loadChunk: (chunkIndex: number) => Promise<InterviewQuestion[]>
  loadQuestionByGlobalIndex: (globalIndex: number) => Promise<InterviewQuestion | null>
}

export const QuestionsContext = createContext<QuestionsContextValue | null>(
  null,
)
