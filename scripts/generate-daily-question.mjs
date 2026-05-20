#!/usr/bin/env node
/**
 * generate-daily-question.mjs
 * ===========================
 * 通过 AI API（OpenAI / DeepSeek）自动生成每日 Java 面试题目。
 *
 * 功能：
 *   1. 调用 AI API 生成 5 道 Java 面试题（含标题、补充说明、答案、标签）
 *   2. 与已有题目做相似度比对（Levenshtein 距离），避免生成重复题
 *   3. 将题目写入 public/questions/chunks/{DATE}.json
 *   4. 更新 public/questions/meta.json 元信息
 *   5. 自动 git add + commit + push 到远程仓库
 *
 * 使用方式：
 *   # 方式一：通过 shell 脚本调用（推荐）
 *   ./scripts/run-daily-question.sh --provider deepseek --date 2026-05-20
 *
 *   # 方式二：直接运行（需设置环境变量）
 *   QUESTION_API_PROVIDER=deepseek \
 *   DEEPSEEK_API_KEY=sk-xxx \
 *   QUESTION_DATE=2026-05-20 \
 *   node scripts/generate-daily-question.mjs
 *
 * 环境变量：
 *   QUESTION_API_PROVIDER    - API 提供商：'openai' 或 'deepseek'（默认 openai）
 *   OPENAI_API_KEY           - OpenAI API 密钥
 *   DEEPSEEK_API_KEY         - DeepSeek API 密钥
 *   DEEPSEEK_API_BASE        - DeepSeek API 基础地址（默认 https://api.deepseek.com/anthropic）
 *   QUESTION_DATE            - 生成题目的日期，格式 YYYY-MM-DD（默认今天）
 *   QUESTION_MODEL           - 使用的模型名称（默认 gpt-4o-mini / deepseek-v4-pro）
 *   KAIYUAN_CLI              - （可选）外部相似度计算 CLI 路径
 */

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

// ---- 环境变量与配置 ----
const API_PROVIDER = (process.env.QUESTION_API_PROVIDER || 'openai').toLowerCase()
const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
const DEEPSEEK_API_BASE = process.env.DEEPSEEK_API_BASE || 'https://api.deepseek.com/anthropic'
const DATE = process.env.QUESTION_DATE || new Date().toISOString().slice(0, 10)
const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-pro'
const MODEL = process.env.QUESTION_MODEL || process.env.OPENAI_API_MODEL || (API_PROVIDER === 'deepseek' ? DEFAULT_DEEPSEEK_MODEL : DEFAULT_OPENAI_MODEL)

// 验证 API 密钥
if (API_PROVIDER === 'openai' && !OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is required for OpenAI provider')
  process.exit(1)
}

if (API_PROVIDER === 'deepseek' && !DEEPSEEK_API_KEY) {
  console.error('ERROR: DEEPSEEK_API_KEY is required for Deepseek provider')
  process.exit(1)
}

/** 带格式化的 JSON 序列化 */
function jsonStringify(value) {
  return `${JSON.stringify(value, null, 2)}\n`
}

/**
 * 计算两个字符串之间的 Levenshtein（编辑距离）
 * 用于题目去重时的相似度判断
 */
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

/** 基于编辑距离的本地相似度（0-1 之间的值） */
function localSimilarity(a, b) {
  const A = String(a || '')
  const B = String(b || '')
  const maxLen = Math.max(A.length, B.length, 1)
  const dist = levenshtein(A, B)
  return 1 - dist / maxLen
}

/**
 * 文本相似度计算（支持外部 CLI 或本地算法）
 * 如果设置了 KAIYUAN_CLI 环境变量，优先使用外部工具
 */
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

/** 以百分比形式返回相似度 (0-100) */
function similarityPercent(a, b) {
  const sim = computeSimilarity(a, b)
  return Math.max(0, Math.min(1, Number(sim))) * 100
}

/**
 * 从 AI 返回的文本中提取 JSON 数组
 * 兼容常见的格式问题（Markdown 代码块、多余逗号、不完整括号等）
 */
function parseJsonFromText(text) {
  const trimmed = String(text || '').trim()
  // 去除 ```json 包裹
  let candidate = trimmed.replace(/^```json\s*/i, '').replace(/\s*```$/i, '')

  // 找到第一个顶级 JSON 数组（跟踪括号深度，处理字符串转义）
  const firstBracket = candidate.indexOf('[')
  if (firstBracket === -1) {
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
    const match = candidate.match(/(\[.*\])/s)
    if (match) return JSON.parse(match[1])
    throw new Error(`Unable to extract balanced JSON array from model output`)
  }

  let arrayText = candidate.slice(firstBracket, endIndex + 1)

  // 解析 + 容错修复
  try {
    return JSON.parse(arrayText)
  } catch (err) {
    // 修复 1：补全对象之间缺失的逗号
    let repaired = arrayText.replace(/}\s*\n\s*"/g, '},\n"')
    // 修复 2：移除末尾多余逗号
    repaired = repaired.replace(/,\s*]/g, ']')
    // 修复 3：压缩多余换行
    repaired = repaired.replace(/\n{2,}/g, '\n')

    try {
      return JSON.parse(repaired)
    } catch (err2) {
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

/**
 * 调用 AI API 生成题目
 * @param {string} date - 日期字符串 YYYY-MM-DD
 * @returns {Promise<Array>} 生成的题目数组
 */
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

  // 读取响应体（仅一次）
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

  // 提取 AI 返回的文本内容
  const content = body.choices?.[0]?.message?.content || body.choices?.[0]?.text
  if (!content) {
    throw new Error(`${API_PROVIDER} response did not contain a message content\nParsed body: ${JSON.stringify(body)}`)
  }

  return parseJsonFromText(content)
}

/**
 * 根据已有题目总数和偏移量生成新的题目 ID
 * 格式：java-001, java-002, ...
 */
function buildQuestionId(totalQuestions, offset) {
  const index = totalQuestions + offset + 1
  return `java-${String(index).padStart(3, '0')}`
}

/**
 * 主运行函数：
 *   1. 读取 meta.json 获取现有题目信息
 *   2. 检查当天是否已生成（幂等性保护）
 *   3. 加载所有已有题目用于去重比对
 *   4. 调用 AI 生成题目，相似度 > 70% 视为重复
 *   5. 写入新分片文件并更新 meta.json
 *   6. 自动 git 提交并推送
 */
async function run() {
  const metaRaw = await fs.readFile(META_PATH, 'utf8')
  const meta = JSON.parse(metaRaw)
  const chunkFileName = `${DATE}.json`
  const chunkPath = path.join(CHUNKS_DIR, chunkFileName)

  // 幂等性保护：如果当天分片已存在则跳过
  if (await fileExists(chunkPath)) {
    console.log(`Chunk file already exists for date ${DATE}: ${chunkFileName}`)
    return
  }

  console.log(`Generating 5 Java interview questions for ${DATE}...`)

  // 加载已有题目的完整文本用于相似度比对
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
      // 忽略读取失败的文件
    }
  }

  const desiredCount = 5
  const uniqueItems = []
  const maxAttempts = 3  // 最多尝试 3 次 API 调用
  let attempts = 0

  // 循环调用 API 直到凑够 5 道不重复的题目
  while (uniqueItems.length < desiredCount && attempts < maxAttempts) {
    attempts += 1
    const rawItems = await fetchQuestionsFromModel(DATE)
    if (!Array.isArray(rawItems) || rawItems.length === 0) continue

    for (const item of rawItems) {
      if (!item || !item.title || !item.prompt || !item.answer) continue
      const combined = ((item.title || '') + '\n' + (item.prompt || '') + '\n' + (item.answer || '')).trim()

      // 与已有题目比对
      let isDup = false
      for (const ex of existingCombined) {
        const sim = similarityPercent(combined, ex)
        if (sim > 70) { isDup = true; break }
      }
      if (isDup) continue

      // 与本次已收集的题目比对
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

  // 组装最终题目对象
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

  // 写入新分片文件
  await fs.mkdir(CHUNKS_DIR, { recursive: true })
  await fs.writeFile(chunkPath, jsonStringify({ questions }), 'utf8')

  // 更新 meta.json：新分片插入到列表头部
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

  // 自动 git 提交并推送
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

/** Shell 参数转义（用于 git 命令） */
function escapeShell(filePath) {
  return JSON.stringify(filePath)
}

/** 检查文件是否存在 */
async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// 入口：执行主函数，统一捕获异常
run().catch((error) => {
  console.error('ERROR:', error.message || error)
  process.exit(1)
})
