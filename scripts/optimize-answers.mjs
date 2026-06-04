/**
 * optimize-answers.mjs
 * ====================
 * 通过指定 provider（默认 deepseek）批量优化题库中现有题目的答案。
 * 兼容 deepseek / qianwen / openai（三方）
 *
 * 使用说明：
 * - 脚本根据 `QUESTION_API_PROVIDER` 环境变量选择 provider（默认 `deepseek`）。
 * - 对应的 API Key 环境变量：
 *     - DeepSeek: `DEEPSEEK_API_KEY`（可选 `DEEPSEEK_API_BASE` / `DEEPSEEK_API_URL`）
 *     - Qianwen: `QIANWEN_API_KEY`（可选 `QIANWEN_API_BASE` / `QIANWEN_API_URL`）
 *     - OpenAI: `OPENAI_API_KEY`
 * - 运行示例：
 *     # 使用默认 DeepSeek
 *     DEEPSEEK_API_KEY=sk-xxx node scripts/optimize-answers.mjs
 *
 *     # 使用 Qianwen
 *     QUESTION_API_PROVIDER=qianwen QIANWEN_API_KEY=sk-xxx node scripts/optimize-answers.mjs
 *
 * - 可选环境变量：
 *     - `QUESTION_DATE`：只优化指定日期分片
 *     - `QUESTION_CHUNK_FILE`：只优化指定分片文件
 *     - `INTERVIEWER_PROMPT`：覆盖默认面试官提示词
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chatCompletionText } from './provider-client.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const QUESTIONS_DIR = path.join(ROOT, 'public', 'questions')
const CHUNKS_DIR = path.join(QUESTIONS_DIR, 'chunks')
const META_PATH = path.join(QUESTIONS_DIR, 'meta.json')

const PROVIDER = (process.env.QUESTION_API_PROVIDER || 'deepseek').toLowerCase()
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com'
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || DEEPSEEK_API_BASE
const QIANWEN_API_KEY = process.env.QIANWEN_API_KEY
const QIANWEN_API_BASE = process.env.QIANWEN_API_BASE || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
const QIANWEN_API_URL = process.env.QIANWEN_API_URL || QIANWEN_API_BASE
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash'
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini'
const QIANWEN_MODEL = process.env.QIANWEN_MODEL || 'deepseek-v4-flash'
const INTERVIEWER_PROMPT = process.env.INTERVIEWER_PROMPT || '我是一名技术面试官，你是一个优秀的程序员，请就以下问题给出详细回答。'
const TARGET_DATE = process.env.QUESTION_DATE
const RANGE_START = process.env.QUESTION_DATE_FROM || process.env.QUESTION_DATE_START
const RANGE_END = process.env.QUESTION_DATE_TO || process.env.QUESTION_DATE_END
const TARGET_CHUNK_FILE = process.env.QUESTION_CHUNK_FILE

function jsonStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function fileExists(filePath) {
  try { await fs.access(filePath); return true } catch { return false }
}

function normalizeAnswerText(text) {
  if (!text) return ''
  return String(text).trim().replace(/^```(?:json|text)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

function buildTitlePrompt(question) {
  return [
    `题目标题：${question.title}`,
    '',
    '请仅根据题目标题给出最优答案。',
    '答案要求：',
    '- 使用中文回答；',
    '- 段落清晰，逻辑严谨；',
    '- 直面问题本身，解释核心原理；',
    '- 举一反三，补充关联知识点；',
    '- 只返回答案文本，不要返回 JSON、标题或其他说明。',
    '',
    '当前已有答案（仅供参考）：',
    `${question.answer || '无'}`,
    '',
    '请直接输出优化后的完整答案。',
  ].join('\n')
}

function buildPromptFollowupPrompt(question) {
  return [
    `题目标题：${question.title}`,
    `补充说明：${question.prompt || '无'}`,
    '',
    '请根据补充说明内容补充答案，重点回答补充说明中的考点与要求。',
    '答案要求：',
    '- 使用中文回答；',
    '- 段落清晰，逻辑严谨；',
    '- 直面补充说明本身，解释核心原理；',
    '- 举一反三，补充关联知识点；',
    '- 只返回答案文本，不要返回 JSON、标题或其他说明。',
    '',
    '当前已有答案（仅供参考）：',
    `${question.answer || '无'}`,
    '',
    '请直接输出补充答案。',
  ].join('\n')
}

async function fetchAnswerForStage(question, stage) {
  const promptContent = stage === 'title' ? buildTitlePrompt(question) : buildPromptFollowupPrompt(question)

  const keyMap = { openai: OPENAI_API_KEY, deepseek: DEEPSEEK_API_KEY, qianwen: QIANWEN_API_KEY }
  const urlMap = { openai: undefined, deepseek: DEEPSEEK_API_URL, qianwen: QIANWEN_API_URL }
  const baseMap = { deepseek: DEEPSEEK_API_BASE, qianwen: QIANWEN_API_BASE }
  const modelMap = { openai: OPENAI_MODEL, deepseek: DEEPSEEK_MODEL, qianwen: QIANWEN_MODEL }

  const apiKey = keyMap[PROVIDER]
  const apiUrl = urlMap[PROVIDER]
  const apiBase = baseMap[PROVIDER]
  const model = modelMap[PROVIDER]

  const content = await chatCompletionText({
    provider: PROVIDER,
    apiKey,
    apiUrl,
    apiBase,
    model,
    messages: [
      { role: 'system', content: INTERVIEWER_PROMPT },
      { role: 'user', content: promptContent },
    ],
    temperature: 0.2,
    max_tokens: 1500,
  })

  if (!content) throw new Error(`${PROVIDER} response did not contain a message content`)
  return normalizeAnswerText(content)
}

async function fetchOptimizedAnswer(question) {
  console.log('  Fetching title-only answer...')
  const titleAnswer = await fetchAnswerForStage(question, 'title')

  console.log('  Fetching prompt-specific answer...')
  const promptAnswer = await fetchAnswerForStage(question, 'prompt')

  const titleText = normalizeAnswerText(titleAnswer)
  const promptText = normalizeAnswerText(promptAnswer)

  if (!titleText && !promptText) throw new Error(`${PROVIDER} returned empty answers for both title and prompt requests`)
  if (!titleText) return promptText
  if (!promptText) return titleText
  return `${titleText}\n\n${promptText}`
}

async function optimizeChunkFile(chunkPath) {
  const raw = await fs.readFile(chunkPath, 'utf8')
  const data = JSON.parse(raw)
  if (!Array.isArray(data.questions)) throw new Error(`Chunk file ${chunkPath} does not contain questions array`)
  let updated = false
  for (const question of data.questions) {
    console.log(`Optimizing question ${question.id || 'unknown'} in ${path.basename(chunkPath)}: ${question.title}`)
    try {
      const optimized = await fetchOptimizedAnswer(question)
      if (!optimized) { console.warn(`  Skipped ${question.id}: empty response from ${PROVIDER}`); continue }
      if (optimized !== String(question.answer || '').trim()) { question.answer = optimized; updated = true; console.log(`  Updated ${question.id}`) } else { console.log(`  Answer unchanged for ${question.id}`) }
    } catch (err) {
      console.error(`  Failed to optimize ${question.id}: ${err.message}`)
      console.error('  Skipping to next question...')
    }
  }
  if (updated) { await fs.writeFile(chunkPath, jsonStringify(data), 'utf8'); console.log(`Saved optimized answers to ${path.basename(chunkPath)}`) } else { console.log(`No changes written for ${path.basename(chunkPath)}`) }
}

async function main() {
  // 简单的运行前检查：确保对应 provider 的 key 已设置
  const keyMap = { openai: OPENAI_API_KEY, deepseek: DEEPSEEK_API_KEY, qianwen: QIANWEN_API_KEY }
  if (!keyMap[PROVIDER]) {
    console.error(`ERROR: ${PROVIDER.toUpperCase()} API key is required (set appropriate env var)`)
    process.exit(1)
  }

  if (!(await fileExists(META_PATH))) throw new Error(`Missing meta file: ${META_PATH}`)
  const metaRaw = await fs.readFile(META_PATH, 'utf8')
  const meta = JSON.parse(metaRaw)

  let chunkFiles = Array.isArray(meta.chunks) ? meta.chunks.map((item) => path.join(QUESTIONS_DIR, item.path)) : []

  // 支持批量按日期范围处理（QUESTION_DATE_FROM / QUESTION_DATE_TO）
  if (TARGET_CHUNK_FILE) {
    const forcedPath = TARGET_CHUNK_FILE.startsWith('chunks/') ? path.join(QUESTIONS_DIR, TARGET_CHUNK_FILE) : path.join(CHUNKS_DIR, TARGET_CHUNK_FILE)
    chunkFiles = chunkFiles.filter((file) => path.resolve(file) === path.resolve(forcedPath))
  } else if (RANGE_START && RANGE_END) {
    // 生成范围内每天的分片路径
    function listDatesBetween(start, end) {
      const dates = []
      let cur = new Date(start + 'T00:00:00Z')
      const last = new Date(end + 'T00:00:00Z')
      if (Number.isNaN(cur.getTime()) || Number.isNaN(last.getTime()) || cur > last) return dates
      while (cur <= last) {
        dates.push(cur.toISOString().slice(0, 10))
        cur.setUTCDate(cur.getUTCDate() + 1)
      }
      return dates
    }

    const dates = listDatesBetween(RANGE_START, RANGE_END)
    const expectedPaths = dates.map((d) => path.join(CHUNKS_DIR, `${d}.json`))
    const expectedSet = new Set(expectedPaths.map((p) => path.resolve(p)))
    chunkFiles = chunkFiles.filter((file) => expectedSet.has(path.resolve(file)))
    // 如果上面过滤未匹配到，尝试直接使用 expectedPaths 对比实际存在文件
    if (chunkFiles.length === 0) {
      const existing = []
      for (const p of expectedPaths) {
        if (await fileExists(p)) existing.push(p)
      }
      chunkFiles = existing
    }
  } else if (TARGET_DATE) {
    const expected = path.join(CHUNKS_DIR, `${TARGET_DATE}.json`)
    chunkFiles = chunkFiles.filter((file) => path.resolve(file) === path.resolve(expected))
  }

  if (chunkFiles.length === 0) throw new Error('No target chunk files found to optimize. Check meta.json / QUESTION_DATE / QUESTION_CHUNK_FILE')

  for (const filePath of chunkFiles) {
    if (!(await fileExists(filePath))) { console.warn(`Skipping missing chunk: ${filePath}`); continue }
    await optimizeChunkFile(filePath)
  }

  console.log(`${PROVIDER} answer optimization completed.`)
}

main().catch((error) => { console.error('ERROR:', error.message || error); process.exit(1) })
