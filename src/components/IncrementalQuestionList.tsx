import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { InterviewQuestion } from '../types/question'
import { QuestionCard } from './QuestionCard'

type Props = {
  /** Number of batches (each batch is one «continue» step). */
  totalBatches: number
  /** Load questions for batch index (0-based). */
  loadBatch: (batchIndex: number) => Promise<InterviewQuestion[]>
}

function QuestionStreamItems({ items }: { items: InterviewQuestion[] }) {
  return (
    <>
      {items.map((q, index) => {
        const showDate = index === 0 || items[index - 1]?.date !== q.date
        return (
          <div key={q.id} className="qstream__item">
            {showDate && (
              <p className="qstream__date" aria-label={`日期 ${q.date}`}>
                <time dateTime={q.date}>{q.date}</time>
              </p>
            )}
            <QuestionCard question={q} />
          </div>
        )
      })}
    </>
  )
}

export function IncrementalQuestionList({ totalBatches, loadBatch }: Props) {
  const [cache, setCache] = useState<Record<number, InterviewQuestion[]>>({})
  const [shownBatchCount, setShownBatchCount] = useState(1)
  const [bootError, setBootError] = useState<string | null>(null)
  const requestedRef = useRef(new Set<number>())
  const loadBatchRef = useRef(loadBatch)

  useEffect(() => {
    loadBatchRef.current = loadBatch
  }, [loadBatch])

  const requestBatch = useCallback((index: number) => {
    if (index < 0 || index >= totalBatches) return
    if (requestedRef.current.has(index)) return
    requestedRef.current.add(index)

    void (async () => {
      try {
        const qs = await loadBatchRef.current(index)
        setCache((c) => ({ ...c, [index]: qs }))
      } catch (e) {
        setBootError(e instanceof Error ? e.message : '加载失败')
      }
    })()
  }, [totalBatches])

  useEffect(() => {
    if (totalBatches <= 0) return
    requestBatch(0)
    requestBatch(1)
    requestBatch(2)
  }, [totalBatches, requestBatch])

  useEffect(() => {
    if (totalBatches <= 0) return
    requestBatch(shownBatchCount)
    requestBatch(shownBatchCount + 1)
  }, [shownBatchCount, totalBatches, requestBatch])

  const visibleItems = useMemo(() => {
    const out: InterviewQuestion[] = []
    for (let i = 0; i < shownBatchCount; i++) {
      const chunk = cache[i]
      if (chunk?.length) out.push(...chunk)
    }
    return out
  }, [cache, shownBatchCount])

  const hiddenBatchIndex = shownBatchCount < totalBatches ? shownBatchCount : null
  const hiddenItems = hiddenBatchIndex !== null ? cache[hiddenBatchIndex] : null

  const canContinue = shownBatchCount < totalBatches
  const hiddenReady = Boolean(hiddenItems?.length)

  const onContinue = useCallback(() => {
    if (!canContinue) return
    setShownBatchCount((n) => Math.min(n + 1, totalBatches))
  }, [canContinue, totalBatches])

  if (totalBatches <= 0) {
    return null
  }

  if (bootError) {
    return <p className="page-state page-state--error">{bootError}</p>
  }

  if (!cache[0]) {
    return <p className="page-state">加载题目中…</p>
  }

  return (
    <div className="incremental">
      <div className="incremental__visible stack">
        <QuestionStreamItems items={visibleItems} />
      </div>

      {hiddenBatchIndex !== null && hiddenReady && (
        <div className="incremental__hidden" aria-hidden="true">
          <div className="stack">
            <QuestionStreamItems items={hiddenItems ?? []} />
          </div>
        </div>
      )}

      {canContinue && (
        <div className="incremental__more">
          <button
            type="button"
            className="incremental__more-trigger"
            onClick={onContinue}
            disabled={!hiddenReady}
            aria-label={hiddenReady ? '加载更多题目' : '下一批载入中'}
          >
            {/* CSS 三角形箭头：避免部分环境下 SVG stroke 不绘制 */}
            <span className="incremental__chevron" aria-hidden="true" />
          </button>
          <span className="incremental__more-caption">
            {hiddenReady ? '加载更多' : '准备中…'}
          </span>
          {!hiddenReady && (
            <span className="incremental__hint">下一批就绪后即可展开</span>
          )}
        </div>
      )}
    </div>
  )
}
