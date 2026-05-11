import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'questions')
const CHUNK_DIR = path.join(OUT_DIR, 'chunks')

const CHUNK_SIZE = 5

function compareQuestionsDesc(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.id !== b.id) return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
  return 0
}

function chunkQuestions(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

const raw = fs.readFileSync(path.join(__dirname, 'java-bank.lines'), 'utf8')
const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)

if (lines.length !== 100) {
  console.error(`Expected 100 lines, got ${lines.length}`)
  process.exit(1)
}

const questions = lines.map((line, idx) => {
  const parts = line.split('|||')
  if (parts.length !== 4) {
    throw new Error(`Bad line ${idx + 1}`)
  }
  const [title, prompt, answer, tagStr] = parts.map((s) => s.trim())
  const tags = tagStr
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5)
  const i = idx + 1
  return {
    id: `java-${String(i).padStart(3, '0')}`,
    date: `2026-05-${String(Math.ceil(i / 5)).padStart(2, '0')}`,
    title,
    prompt,
    answer,
    tags,
  }
})

questions.sort(compareQuestionsDesc)

fs.mkdirSync(CHUNK_DIR, { recursive: true })

const chunks = chunkQuestions(questions, CHUNK_SIZE)
const descriptors = []
let cumulativeStart = 0

chunks.forEach((chunkQuestions, idx) => {
  const name = `${String(idx).padStart(3, '0')}.json`
  const posixRel = path.posix.join('chunks', name)
  fs.writeFileSync(
    path.join(CHUNK_DIR, name),
    `${JSON.stringify({ questions: chunkQuestions }, null, 2)}\n`,
    'utf8',
  )
  descriptors.push({
    path: posixRel,
    count: chunkQuestions.length,
    cumulativeStart,
  })
  cumulativeStart += chunkQuestions.length
})

const latestDate =
  questions.length > 0
    ? questions.reduce((max, q) => (q.date > max ? q.date : max), questions[0].date)
    : null

const meta = {
  version: 1,
  chunkSize: CHUNK_SIZE,
  totalQuestions: questions.length,
  chunkCount: chunks.length,
  latestDate,
  chunks: descriptors,
}

fs.writeFileSync(path.join(OUT_DIR, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')

const legacyPath = path.join(ROOT, 'public', 'questions.json')
if (fs.existsSync(legacyPath)) {
  fs.unlinkSync(legacyPath)
}

console.log(
  `Wrote catalog: ${questions.length} questions, ${chunks.length} chunks → ${path.relative(ROOT, OUT_DIR)}`,
)
