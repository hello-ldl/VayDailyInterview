#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'
import os from 'node:os'
import { writeFileSync, mkdtempSync, rmSync } from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const QUESTIONS_DIR = path.join(ROOT, 'public', 'questions')
const CHUNKS_DIR = path.join(QUESTIONS_DIR, 'chunks')
const META_PATH = path.join(QUESTIONS_DIR, 'meta.json')
const API_PROVIDER = (process.env.QUESTION_API_PROVIDER || 'openai').toLowerCase()
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/anthropic'
const DATE = process.env.QUESTION_DATE || new Date().toISOString().slice(0, 10)
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-pro'
const MODEL = process.env.QUESTION_MODEL || process.env.OPENAI_API_MODEL || (API_PROVIDER === 'deepseek' ? DEFAULT_DEEPSEEK_MODEL : DEFAULT_OPENAI_MODEL)

if (API_PROVIDER === 'openai' && !OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is required for OpenAI provider')
  process.exit(1)
}

if (API_PROVIDER === 'deepseek' && !DEEPSEEK_API_KEY) {
  console.error('ERROR: DEEPSEEK_API_KEY is required for Deepseek provider')
  process.exit(1)
}

function jsonStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

function levenshtein(a, b) {
  const A = String(a || '')
  const B = String(b || '')
  const m = A.length
  const n = B.length
  if (m === 0) return n
  if (n === 0) return m
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = A[i - 1] === B[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  return dp[m][n]
}

function localSimilarity(a, b) {
  const A = String(a || '')
  const B = String(b || '')
  const maxLen = Math.max(A.length, B.length, 1)
  const dist = levenshtein(A, B)
  return 1 - dist / maxLen
}

function computeSimilarity(textA, textB) {
  const cli = process.env.KAIYUAN_CLI || ''
  if (cli) {
    const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'ky-sim-'))
    try {
      const aPath = path.join(tmpDir, 'a.txt')
      const bPath = path.join(tmpDir, 'b.txt')
      writeFileSync(aPath, String(textA || ''), 'utf8')
      writeFileSync(bPath, String(textB || ''), 'utf8')
      let out = ''
      try {
        out = execSync(`${cli} ${aPath} ${bPath}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
      } catch (err) {
        out = (err && err.stdout) || ''
      }
      out = String(out || '').trim()
      if (!out) return 0
      try {
        const parsed = JSON.parse(out)
        if (typeof parsed === 'number') return parsed
        if (parsed && typeof parsed.similarity === 'number') return parsed.similarity
      } catch {}
      const f = parseFloat(out)
      if (!Number.isNaN(f)) return f
      return 0
    } finally {
      try { rmSync(tmpDir, { recursive: true, force: true }) } catch {}
    }
  }

  try {
    return localSimilarity(textA, textB)
  } catch {
    return 0
  }
}

function similarityPercent(a, b) {
  const sim = computeSimilarity(a, b)
  return Math.max(0, Math.min(1, Number(sim))) * 100
}

function parseJsonFromText(text) {
  const trimmed = String(text || '').trim()
  // remove ```json fences if present
  let candidate = trimmed.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')

  // Find the first top-level JSON array by tracking brackets while respecting strings
  const firstBracket = candidate.indexOf('[')
  if (firstBracket === -1) {
    // fallback to previous naive regex
    const match = candidate.match(/(\[.*\])/s)
    if (match) return JSON.parse(match[1])
    throw new Error(`Unable to find JSON array in model output:\n${candidate}`)
  }

  let i = firstBracket
  let depth = 0
  let inString = false
  let escape = false
  let endIndex = -1

  for (; i < candidate.length; i++) {
    const ch = candidate[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === '\\') {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === '[') depth++
    else if (ch === ']') {
      depth--
      if (depth === 0) {
        endIndex = i
        break
      }
    }
  }

  if (endIndex === -1) {
    // couldn't find matching bracket; fallback
    const match = candidate.match(/(\[.*\])/s)
    if (match) return JSON.parse(match[1])
    throw new Error(`Unable to extract balanced JSON array from model output`)
  }

  let arrayText = candidate.slice(firstBracket, endIndex + 1)

  // Try parsing; if fails, apply a few tolerant repairs commonly produced by LLMs
  try {
    return JSON.parse(arrayText)
  } catch (err) {
    // repair 1: insert missing commas between object closes and next object/property starting with a quote
    let repaired = arrayText.replace(/}\s*\n\s*"/g, '},\n"')
    // repair 2: remove trailing commas before closing bracket
    repaired = repaired.replace(/,\s*]/g, ']')
    // repair 3: remove repeated newlines that may break naive parsers
    repaired = repaired.replace(/\n{2,}/g, '\n')

    try {
      return JSON.parse(repaired)
    } catch (err2) {
      // final fallback: try to find any bracketed content via regex and parse
      const match = candidate.match(/(\[.*\])/s)
      if (match) {
        try {
          return JSON.parse(match[1])
        } catch (err3) {
          throw new Error(`Unable to parse JSON after repairs: ${err3.message}\nOriginal error: ${err.message}`)
        }
      }
      throw new Error(`Unable to parse JSON from model output: ${err.message}`)
    }
  }
}

async function fetchQuestionsFromModel(date) {
  const prompt = `请生成今天日期为 ${date} 的 5 道 Java 技术面试题目。返回一个 JSON 数组，数组中每个元素必须包含以下字段：\n- title（题目标题）\n- prompt（对题目的补充说明）\n- answer（不少于 120 字的详细标准答案）\n- tags（标签数组，最好包含 2 到 4 个相关标签）\n\n请只返回纯 JSON，不要附带 Markdown、注释或额外说明。\n\n答案部分请使用中文分段书写，段落分明、逻辑清晰，排版美观，每个段落保持句子紧凑且易读。
`
  const apiBase = API_PROVIDER === 'deepseek' ? DEEPSEEK_API_BASE : 'https://api.openai.com/v1'
  const apiKey = API_PROVIDER === 'deepseek' ? DEEPSEEK_API_KEY : OPENAI_API_KEY
  const url = `${apiBase.replace(/\/$/, '')}/chat/completions`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: 'You are a professional technical question generator.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 10000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`${API_PROVIDER} request failed: ${response.status} ${response.statusText}\n${errorText}`)
  }

  // Read the body once to avoid "Body has already been read" errors
  const rawText = await response.text()

  let body
  try {
    body = JSON.parse(rawText)
  } catch (err) {
    throw new Error(`${API_PROVIDER} response JSON parse error: ${err.message}\nRaw body: ${rawText}`)
  }

  try {
    console.log(`${API_PROVIDER} response received successfully. ${JSON.stringify({ id: body.id, model: body.model })}`)
  } catch {}

  const content = body.choices?.[0]?.message?.content || body.choices?.[0]?.text
  if (!content) {
    throw new Error(`${API_PROVIDER} response did not contain a message content\nParsed body: ${JSON.stringify(body)}`)
  }

  return parseJsonFromText(content)
}

function buildQuestionId(totalQuestions, offset) {
  const index = totalQuestions + offset + 1
  return `java-${String(index).padStart(3, '0')}`
}

async function run() {
  const metaRaw = await fs.readFile(META_PATH, 'utf8')
  const meta = JSON.parse(metaRaw)
  const chunkFileName = `${DATE}.json`
  const chunkPath = path.join(CHUNKS_DIR, chunkFileName)

  if (await fileExists(chunkPath)) {
    console.log(`Chunk file already exists for date ${DATE}: ${chunkFileName}`)
    return
  }

  console.log(`Generating 5 Java interview questions for ${DATE}...`)

  // load existing combined texts for similarity comparison
  const existingCombined = []
  for (const c of meta.chunks || []) {
    try {
      const p = path.join(QUESTIONS_DIR, c.path)
      if (await fileExists(p)) {
        const data = JSON.parse(await fs.readFile(p, 'utf8'))
        if (Array.isArray(data.questions)) {
          for (const q of data.questions) {
            existingCombined.push(((q.title || '') + '\n' + (q.prompt || '') + '\n' + (q.answer || '')).trim())
          }
        }
      }
    } catch (err) {
      // ignore
    }
  }

  const desiredCount = 5
  const uniqueItems = []
  const maxAttempts = 3
  let attempts = 0

  while (uniqueItems.length < desiredCount && attempts < maxAttempts) {
    attempts += 1
    const rawItems = await fetchQuestionsFromModel(DATE)
    if (!Array.isArray(rawItems) || rawItems.length === 0) continue

    for (const item of rawItems) {
      if (!item || !item.title || !item.prompt || !item.answer) continue
      const combined = ((item.title || '') + '\n' + (item.prompt || '') + '\n' + (item.answer || '')).trim()

      let isDup = false
      for (const ex of existingCombined) {
        const sim = similarityPercent(combined, ex)
        if (sim > 70) { isDup = true; break }
      }
      if (isDup) continue

      for (const u of uniqueItems) {
        const uCombined = ((u.title || '') + '\n' + (u.prompt || '') + '\n' + (u.answer || '')).trim()
        const sim = similarityPercent(combined, uCombined)
        if (sim > 70) { isDup = true; break }
      }
      if (isDup) continue

      uniqueItems.push(item)
      if (uniqueItems.length >= desiredCount) break
    }
  }

  if (uniqueItems.length < desiredCount) {
    throw new Error(`Unable to generate ${desiredCount} unique questions after ${maxAttempts} attempts; got ${uniqueItems.length}`)
  }

  const questions = uniqueItems.map((item, index) => {
    if (!item.title || !item.prompt || !item.answer) {
      throw new Error(`Generated question is missing required fields: ${JSON.stringify(item)}`)
    }
    return {
      id: buildQuestionId(meta.totalQuestions, index),
      date: DATE,
      title: item.title.trim(),
      prompt: item.prompt.trim(),
      answer: item.answer.trim(),
      tags: Array.isArray(item.tags)
        ? item.tags.map((tag) => String(tag).trim()).filter(Boolean)
        : [],
    }
  })

  await fs.mkdir(CHUNKS_DIR, { recursive: true })
  await fs.writeFile(chunkPath, jsonStringify({ questions }), 'utf8')

  meta.chunkCount += 1
  meta.totalQuestions += questions.length
  meta.latestDate = DATE
  meta.chunks = [
    {
      path: `chunks/${chunkFileName}`,
      count: questions.length,
      cumulativeStart: 0,
    },
    ...meta.chunks.map((item) => ({
      ...item,
      cumulativeStart: item.cumulativeStart + questions.length,
    })),
  ]

  await fs.writeFile(META_PATH, jsonStringify(meta), 'utf8')

  const commitMessage = `chore: add daily java interview questions for ${DATE}`
  execSync(`git add ${escapeShell(chunkPath)} ${escapeShell(META_PATH)}`, {
    cwd: ROOT,
    stdio: 'inherit',
  })
  execSync(
    `git commit --author "Daily Question Bot <bot@vaydaily.top>" -m "${commitMessage}"`,
    { cwd: ROOT, stdio: 'inherit' },
  )
  execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' })

  console.log('Generated question chunk and pushed to Git successfully.')
}

function escapeShell(filePath) {
  return JSON.stringify(filePath)
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

run().catch((error) => {
  console.error('ERROR:', error.message || error)
  process.exit(1)
})
