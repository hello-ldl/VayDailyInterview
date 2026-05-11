import { useId, useMemo, useState } from 'react'
import type { InterviewQuestion } from '../types/question'

type Props = {
  question: InterviewQuestion
}

function clampTags(tags: string[] | undefined, max = 5): string[] {
  if (!tags?.length) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of tags) {
    const s = t.trim()
    if (!s || seen.has(s)) continue
    seen.add(s)
    out.push(s)
    if (out.length >= max) break
  }
  return out
}

export function QuestionCard({ question }: Props) {
  const [open, setOpen] = useState(false)
  const bodyId = useId()
  const tags = useMemo(() => clampTags(question.tags, 5), [question.tags])

  return (
    <article className="qcard" aria-labelledby={`${bodyId}-title`}>
      <div className="qcard__meta">
        <time className="qcard__date" dateTime={question.date}>
          {question.date}
        </time>
      </div>
      <h2 id={`${bodyId}-title`} className="qcard__title">
        {question.title}
      </h2>
      <div className="qcard__prompt">
        {question.prompt.split('\n').map((line, i) => (
          <p key={i}>{line || '\u00a0'}</p>
        ))}
      </div>
      <div className="qcard__actions">
        <button
          type="button"
          className="qcard__toggle"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={`${bodyId}-answer`}
        >
          {open ? '隐藏答案' : '查看答案'}
        </button>
      </div>
      {open && (
        <div
          id={`${bodyId}-answer`}
          className="qcard__answer"
          role="region"
          aria-label="参考答案"
        >
          {question.answer.split('\n').map((line, i) => (
            <p key={i}>{line || '\u00a0'}</p>
          ))}
        </div>
      )}
      {tags.length > 0 && (
        <div className="qcard__tags-cap" aria-label="知识点标签">
          <ul className="qcard__tags">
            {tags.map((t) => (
              <li key={t} className="qcard__tag">
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}
