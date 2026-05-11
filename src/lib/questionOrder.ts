import type { InterviewQuestion } from '../types/question'

/** Newest-first: date DESC, id DESC */
export function compareQuestionsDesc(a: InterviewQuestion, b: InterviewQuestion): number {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.id !== b.id) return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
  return 0
}

export function chunkQuestions<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) throw new Error('chunk size must be positive')
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}
