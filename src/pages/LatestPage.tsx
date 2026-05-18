import { useEffect, useRef, useState } from 'react'
import { QuestionCard } from '../components/QuestionCard'
import type { InterviewQuestion, QuestionCatalogMeta } from '../types/question'
import { useQuestions } from '../hooks/useQuestions'

type StreamProps = {
  meta: QuestionCatalogMeta
  loadChunk: (chunkIndex: number) => Promise<InterviewQuestion[]>
}

function parseChunkDate(path: string): string | null {
  const match = path.match(/(\d{4}-\d{2}-\d{2})\.json$/)
  return match ? match[1] : null
}

function LatestQuestionStream({ meta, loadChunk }: StreamProps) {
  const [dayQuestions, setDayQuestions] = useState<InterviewQuestion[] | null>(null)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const isLoadingRef = useRef(false)

  const selectedDate = parseChunkDate(meta.chunks[0]?.path) ?? meta.latestDate

  useEffect(() => {
    let cancelled = false
    isLoadingRef.current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStreamError(null)
     
    setDayQuestions(null)
     
    setLoading(true)

    void (async () => {
      try {
        const questions = await loadChunk(0)
        if (!cancelled && isLoadingRef.current) {
          setDayQuestions(questions)
          setLoading(false)
          isLoadingRef.current = false
        }
      } catch (e) {
        if (!cancelled && isLoadingRef.current) {
          setStreamError(e instanceof Error ? e.message : '加载失败')
          setLoading(false)
          isLoadingRef.current = false
        }
      }
    })()

    return () => {
      cancelled = true
      isLoadingRef.current = false
    }
  }, [loadChunk])

  if (streamError) {
    return (
      <div className="page-state page-state--error">
        <p>读取题目失败：{streamError}</p>
      </div>
    )
  }

  if (loading || !dayQuestions) {
    return <p className="page-state">加载题目中…</p>
  }

  return (
    <>
      <header className="page__intro">
        <p className="page__eyebrow">Latest</p>
        <h1 className="page-title">最新发布</h1>
        <p className="page-lead">
          当前显示日期：<strong>{selectedDate}</strong>，共 {dayQuestions.length} 题。
        </p>
      </header>

      <div className="stack">
        {dayQuestions.map((question) => (
          <QuestionCard key={question.id} question={question} />
        ))}
      </div>
    </>
  )
}

export function LatestPage() {
  const { status, error, meta, reload, loadChunk } = useQuestions()

  if (status === 'loading' || status === 'idle') {
    return <p className="page-state">加载题库索引中…</p>
  }

  if (status === 'error') {
    return (
      <div className="page-state page-state--error">
        <p>无法加载题库：{error}</p>
        <button type="button" className="btn-text" onClick={() => void reload()}>
          重试
        </button>
      </div>
    )
  }

  if (!meta || meta.totalQuestions === 0) {
    return (
      <div className="page-empty">
        <h1 className="page-title">最新题目</h1>
        <p className="page-lead">
          暂无题目。请运行{' '}
          <code className="inline-code">npm run gen:bank</code>（或{' '}
          <code className="inline-code">node scripts/emit-java-bank.mjs</code>）生成{' '}
          <code className="inline-code">public/questions/</code> 分块题库。
        </p>
      </div>
    )
  }

  if (!meta.latestDate) {
    return (
      <div className="page-empty">
        <h1 className="page-title">最新题目</h1>
        <p className="page-lead">题库索引缺少最新日期信息。</p>
      </div>
    )
  }

  return (
    <div className="page">
      <LatestQuestionStream meta={meta} loadChunk={loadChunk} />
    </div>
  )
}
