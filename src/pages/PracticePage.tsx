import { useCallback, useEffect, useMemo, useState } from 'react'
import { QuestionCard } from '../components/QuestionCard'
import { useQuestions } from '../hooks/useQuestions'
import { shuffle } from '../lib/shuffle'

type SessionProps = {
  totalQuestions: number
  order: number[]
  onRestartSession: () => void
}

function PracticeSession({ totalQuestions, order, onRestartSession }: SessionProps) {
  const { loadQuestionByGlobalIndex } = useQuestions()
  const [cursor, setCursor] = useState(0)
  const [finished, setFinished] = useState(false)
  const [current, setCurrent] = useState<Awaited<
    ReturnType<typeof loadQuestionByGlobalIndex>
  > | null>(null)
  const [loadingQ, setLoadingQ] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      setLoadingQ(true)
      const idx = order[cursor]
      const q =
        idx === undefined ? null : await loadQuestionByGlobalIndex(idx)
      if (!cancelled) {
        setCurrent(q)
        setLoadingQ(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [cursor, order, loadQuestionByGlobalIndex])

  const total = order.length

  function advance() {
    if (cursor < total - 1) setCursor((c) => c + 1)
    else setFinished(true)
  }

  return (
    <>
      {!finished && (
        <div className="practice-panel">
          <div className="practice-panel__bar">
            <span className="practice-panel__progress">
              进度 {Math.min(cursor + 1, total)} / {total}
            </span>
            <button type="button" className="btn-outline btn-sm" onClick={onRestartSession}>
              重新开始本轮
            </button>
          </div>

          {loadingQ && <p className="page-state">载入题目中…</p>}
          {!loadingQ && current && <QuestionCard key={current.id} question={current} />}
          {!loadingQ && !current && (
            <p className="page-state page-state--error">题目加载失败</p>
          )}

          <div className="practice-panel__footer">
            <button
              type="button"
              className="btn-solid"
              onClick={advance}
              disabled={loadingQ || !current}
            >
              {cursor < total - 1 ? '下一题' : '完成本轮'}
            </button>
          </div>
        </div>
      )}

      {finished && (
        <div className="practice-done">
          <p className="practice-done__title">本轮已完成</p>
          <p className="practice-done__desc">
            你已过完本轮 {totalQuestions} 道题，且无重复。
          </p>
          <button type="button" className="btn-solid" onClick={onRestartSession}>
            再来一轮
          </button>
        </div>
      )}
    </>
  )
}

export function PracticePage() {
  const { status, error, meta, reload } = useQuestions()
  const [sessionKey, setSessionKey] = useState(0)

  const order = useMemo(() => {
    const n = meta?.totalQuestions ?? 0
    if (!n) return []
    const seq = Array.from({ length: n }, (_, i) => i)
    return shuffle(seq)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionKey triggers reshuffle
  }, [meta?.totalQuestions, sessionKey])

  const bumpSession = useCallback(() => setSessionKey((k) => k + 1), [])

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

  if (!meta || meta.totalQuestions === 0 || !order.length) {
    return (
      <div className="page-empty">
        <h1 className="page-title">刷题模式</h1>
        <p className="page-lead">题库为空，请先生成分块题库。</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__intro">
        <p className="page__eyebrow">Practice</p>
        <h1 className="page-title">刷题</h1>
        <p className="page-lead">
          按全局题号随机打乱；每次只加载当前题目所在分块，避免一次性拉取整个题库。
        </p>
      </header>

      <PracticeSession
        key={sessionKey}
        totalQuestions={meta.totalQuestions}
        order={order}
        onRestartSession={bumpSession}
      />
    </div>
  )
}
