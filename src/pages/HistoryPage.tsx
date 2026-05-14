import { useCallback } from 'react'
import { IncrementalQuestionList } from '../components/IncrementalQuestionList'
import { useQuestions } from '../hooks/useQuestions'

export function HistoryPage() {
  const { status, error, meta, reload, loadChunk } = useQuestions()

  const loadBatch = useCallback(
    (batchIndex: number) => loadChunk(batchIndex),
    [loadChunk],
  )

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

  if (!meta || meta.totalQuestions === 0 || meta.chunkCount === 0) {
    return (
      <div className="page-empty">
        <h1 className="page-title">历史题目</h1>
        <p className="page-lead">暂无历史记录。</p>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__intro">
        <p className="page__eyebrow">Archive</p>
        <h1 className="page-title">历史题目</h1>
      </header>

      <IncrementalQuestionList
        key={meta.totalQuestions}
        totalBatches={meta.chunkCount}
        loadBatch={loadBatch}
      />
    </div>
  )
}
