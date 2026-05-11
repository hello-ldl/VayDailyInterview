import { useContext } from 'react'
import { QuestionsContext } from '../context/questionsContext'

export function useQuestions() {
  const ctx = useContext(QuestionsContext)
  if (!ctx) {
    throw new Error('useQuestions must be used within QuestionsProvider')
  }
  return ctx
}
