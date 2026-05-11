import { useCallback, useEffect, useMemo, useState } from 'react'
import { IncrementalQuestionList } from '../components/IncrementalQuestionList'
import { chunkQuestions } from '../lib/questionOrder'
import type { InterviewQuestion, QuestionCatalogMeta } from '../types/question'
import { useQuestions } from '../hooks/useQuestions'

type StreamProps = {
  meta: QuestionCatalogMeta
  loadChunk: (chunkIndex: number) => Promise<InterviewQuestion[]>
}

function LatestQuestionStream({ meta, loadChunk }: StreamProps) {
  const [latestList, setLatestList] = useState<InterviewQuestion[] | undefined>(
    undefined,
  )
  const [streamError, setStreamError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const target = meta.latestDate
        if (!target) {
          return
        }
        const out: InterviewQuestion[] = []
        for (let ci = 0; ci < meta.chunkCount; ci++) {
          const qs = await loadChunk(ci)
          if (cancelled) return
          for (const q of qs) {
            if (q.date === target) out.push(q)
            else if (q.date < target) {
              if (!cancelled) setLatestList(out)
              return
            }
          }
        }
        if (!cancelled) setLatestList(out)
      } catch (e) {
        if (!cancelled) {
          setStreamError(e instanceof Error ? e.message : '加载失败')
          setLatestList([])
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [meta, loadChunk])

  const batches = useMemo(() => {
    if (!latestList) return []
    return chunkQuestions(latestList, meta.chunkSize)
  }, [latestList, meta.chunkSize])

  const loadBatch = useCallback(
    async (batchIndex: number) => batches[batchIndex] ?? [],
    [batches],
  )

  if (streamError) {
    return (
      <div className="page-state page-state--error">
        <p>读取最新题目失败：{streamError}</p>
      </div>
    )
  }

  if (latestList === undefined) {
    return <p className="page-state">加载最新题目中…</p>
  }

  if (!latestList.length) {
    return (
      <div className="page-empty">
        <h1 className="page-title">最新题目</h1>
        <p className="page-lead">当前没有在索引日期下找到题目。</p>
      </div>
    )
  }

  return (
    <>
      <header className="page__intro">
        <p className="page__eyebrow">Latest</p>
        <h1 className="page-title">最新发布</h1>
        <p className="page-lead">
          当前批次日期：<strong>{meta.latestDate}</strong>，共 {latestList.length}{' '}
          题。默认每次展开 {meta.chunkSize} 题；下一批会在后台预加载并在 DOM 中待命。
        </p>
      </header>

      <IncrementalQuestionList
        key={`${meta.latestDate}:${latestList.length}:${batches.length}`}
        totalBatches={batches.length}
        loadBatch={loadBatch}
      />
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
      <LatestQuestionStream
        key={`${meta.latestDate}:${meta.chunkCount}:${meta.totalQuestions}`}
        meta={meta}
        loadChunk={loadChunk}
      />
    </div>
  )
}
