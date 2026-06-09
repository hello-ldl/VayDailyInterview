import { useId, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
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

const markdownComponents = {
  code({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { node?: unknown }) {
    const isBlock = className?.startsWith('language-')
    if (isBlock) {
      return (
        <pre className="md-code-block">
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      )
    }
    return (
      <code className="md-inline-code" {...props}>
        {children}
      </code>
    )
  },
  pre({ children }: React.ComponentPropsWithoutRef<'pre'>) {
    return <>{children}</>
  },
  h3({ children, ...props }: React.ComponentPropsWithoutRef<'h3'>) {
    return <h3 className="md-h3" {...props}>{children}</h3>
  },
  h4({ children, ...props }: React.ComponentPropsWithoutRef<'h4'>) {
    return <h4 className="md-h4" {...props}>{children}</h4>
  },
  ul({ children, ...props }: React.ComponentPropsWithoutRef<'ul'>) {
    return <ul className="md-ul" {...props}>{children}</ul>
  },
  ol({ children, ...props }: React.ComponentPropsWithoutRef<'ol'>) {
    return <ol className="md-ol" {...props}>{children}</ol>
  },
  li({ children, ...props }: React.ComponentPropsWithoutRef<'li'>) {
    return <li className="md-li" {...props}>{children}</li>
  },
  p({ children, ...props }: React.ComponentPropsWithoutRef<'p'>) {
    return <p className="md-p" {...props}>{children}</p>
  },
  strong({ children, ...props }: React.ComponentPropsWithoutRef<'strong'>) {
    return <strong className="md-strong" {...props}>{children}</strong>
  },
  em({ children, ...props }: React.ComponentPropsWithoutRef<'em'>) {
    return <em className="md-em" {...props}>{children}</em>
  },
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
      {question.prompt && (
        <div className="qcard__prompt">
          {question.prompt.split('\n').map((line, i) => (
            <p key={i}>{line || '\u00a0'}</p>
          ))}
        </div>
      )}
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
          <ReactMarkdown components={markdownComponents}>
            {question.answer}
          </ReactMarkdown>
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
