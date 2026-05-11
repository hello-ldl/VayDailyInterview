export interface InterviewQuestion {
  id: string
  /** ISO date YYYY-MM-DD */
  date: string
  title: string
  prompt: string
  answer: string
  tags?: string[]
}

/** Legacy single-file shape (build scripts only). */
export interface QuestionsFile {
  questions: InterviewQuestion[]
}

export interface ChunkDescriptor {
  /** Relative to `/questions/`, e.g. `chunks/000.json` */
  path: string
  count: number
  cumulativeStart: number
}

export interface QuestionCatalogMeta {
  version: 1
  chunkSize: number
  totalQuestions: number
  chunkCount: number
  /** Highest `date` across the bank; empty bank → null */
  latestDate: string | null
  chunks: ChunkDescriptor[]
}

export interface QuestionsChunkFile {
  questions: InterviewQuestion[]
}
