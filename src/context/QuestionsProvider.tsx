import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { findChunkIndexForGlobalIndex } from '../lib/findChunkForGlobalIndex'
import type {
  InterviewQuestion,
  QuestionCatalogMeta,
  QuestionsChunkFile,
} from '../types/question'
import {
  QuestionsContext,
  type QuestionsContextValue,
  type QuestionsStatus,
} from './questionsContext'

function normalizeQuestions(raw: unknown): InterviewQuestion[] {
  const data = raw as QuestionsChunkFile
  const list = Array.isArray(data?.questions) ? data.questions : []
  return list.filter(
    (q) =>
      q &&
      typeof q.id === 'string' &&
      typeof q.date === 'string' &&
      typeof q.title === 'string' &&
      typeof q.prompt === 'string' &&
      typeof q.answer === 'string',
  )
}

async function fetchMeta(): Promise<QuestionCatalogMeta> {
  const res = await fetch('/questions/meta.json', { cache: 'no-store' })
  if (!res.ok) throw new Error(`加载题库索引失败 (${res.status})`)
  const meta = (await res.json()) as QuestionCatalogMeta
  if (
    meta.version !== 1 ||
    typeof meta.chunkSize !== 'number' ||
    typeof meta.chunkCount !== 'number' ||
    typeof meta.totalQuestions !== 'number' ||
    !Array.isArray(meta.chunks)
  ) {
    throw new Error('题库索引格式不正确')
  }
  return meta
}

export function QuestionsProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<QuestionsStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<QuestionCatalogMeta | null>(null)
  const chunkCacheRef = useRef(new Map<number, InterviewQuestion[]>())

  const clearCache = useCallback(() => {
    chunkCacheRef.current = new Map()
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const m = await fetchMeta()
        if (!cancelled) {
          setMeta(m)
          setError(null)
          setStatus('ready')
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '未知错误')
          setMeta(null)
          setStatus('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const loadChunk = useCallback(
    async (chunkIndex: number): Promise<InterviewQuestion[]> => {
      const m = meta
      if (!m) throw new Error('题库尚未就绪')
      if (chunkIndex < 0 || chunkIndex >= m.chunkCount) return []

      const cached = chunkCacheRef.current.get(chunkIndex)
      if (cached) return cached

      const desc = m.chunks[chunkIndex]
      if (!desc) throw new Error(`缺少分块描述：${chunkIndex}`)

      const res = await fetch(`/questions/${desc.path}`, { cache: 'no-store' })
      if (!res.ok) throw new Error(`加载题目分块失败 (${res.status})`)

      const qs = normalizeQuestions(await res.json())
      chunkCacheRef.current.set(chunkIndex, qs)
      return qs
    },
    [meta],
  )

  const loadQuestionByGlobalIndex = useCallback(
    async (globalIndex: number): Promise<InterviewQuestion | null> => {
      const m = meta
      if (!m || m.totalQuestions <= 0) return null
      if (globalIndex < 0 || globalIndex >= m.totalQuestions) return null

      const ci = findChunkIndexForGlobalIndex(m.chunks, globalIndex)
      if (ci < 0) return null

      const chunk = await loadChunk(ci)
      const desc = m.chunks[ci]
      const offset = globalIndex - desc.cumulativeStart
      return chunk[offset] ?? null
    },
    [meta, loadChunk],
  )

  const reload = useCallback(() => {
    void (async () => {
      clearCache()
      setStatus('loading')
      setError(null)
      try {
        const m = await fetchMeta()
        setMeta(m)
        setStatus('ready')
      } catch (e) {
        setError(e instanceof Error ? e.message : '未知错误')
        setMeta(null)
        setStatus('error')
      }
    })()
  }, [clearCache])

  const value = useMemo<QuestionsContextValue>(
    () => ({
      status,
      error,
      meta,
      reload,
      loadChunk,
      loadQuestionByGlobalIndex,
    }),
    [status, error, meta, reload, loadChunk, loadQuestionByGlobalIndex],
  )

  return (
    <QuestionsContext.Provider value={value}>{children}</QuestionsContext.Provider>
  )
}
