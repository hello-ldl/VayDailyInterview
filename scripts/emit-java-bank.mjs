/**
 * emit-java-bank.mjs
 * ==================
 * 将 java-bank.lines 题库文件解析为结构化的面试题目 JSON 分片文件。
 *
 * 功能：
 *   1. 读取 scripts/java-bank.lines（每行格式：title|||prompt|||answer|||tags）
 *   2. 按日期倒序排列题目（每天 5 道）
 *   3. 将题目按 CHUNK_SIZE（5 道）分片写入 public/questions/chunks/ 目录
 *   4. 生成 public/questions/meta.json 目录索引
 *   5. 删除旧的 public/questions.json 遗留文件（如果存在）
 *
 * 使用方式：
 *   node scripts/emit-java-bank.mjs
 *
 * 前置条件：
 *   - scripts/java-bank.lines 必须包含恰好 100 行题目数据
 *   - 每行格式：标题|||补充说明|||答案|||tag1,tag2,tag3
 *
 * 输出目录结构：
 *   public/questions/
 *   ├── meta.json           # 索引文件（版本、分片数、总分片列表）
 *   └── chunks/
 *       ├── 000.json         # 第 1 个分片（含 CHUNK_SIZE 道题）
 *       ├── 001.json         # 第 2 个分片
 *       └── ...
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 确定项目根目录和输出目录
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const OUT_DIR = path.join(ROOT, 'public', 'questions')
const CHUNK_DIR = path.join(OUT_DIR, 'chunks')

/** 每个分片包含的题目数量（对应每天 5 道题） */
const CHUNK_SIZE = 5

/**
 * 题目比较函数：先按日期降序，再按 ID 降序
 * 保证最新的题目排在前面
 */
function compareQuestionsDesc(a, b) {
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.id !== b.id) return a.id < b.id ? 1 : a.id > b.id ? -1 : 0
  return 0
}

/**
 * 将题目列表按固定大小分片
 * @param {Array} items - 题目数组
 * @param {number} size - 每个分片的大小
 * @returns {Array<Array>} 分片后的二维数组
 */
function chunkQuestions(items, size) {
  const out = []
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size))
  }
  return out
}

// 读取题库原始文件
const raw = fs.readFileSync(path.join(__dirname, 'java-bank.lines'), 'utf8')
const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean)

// 验证行数（题库固定 100 行）
if (lines.length !== 100) {
  console.error(`Expected 100 lines, got ${lines.length}`)
  process.exit(1)
}

// 解析每行题目数据
const questions = lines.map((line, idx) => {
  const parts = line.split('|||')
  if (parts.length !== 4) {
    throw new Error(`Bad line ${idx + 1}`)
  }
  const [title, prompt, answer, tagStr] = parts.map((s) => s.trim())
  // 标签最多取 5 个
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

// 按日期、ID 降序排列
questions.sort(compareQuestionsDesc)

// 确保分片目录存在
fs.mkdirSync(CHUNK_DIR, { recursive: true })

// 分片并写入文件
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
  // 记录每个分片的元信息
  descriptors.push({
    path: posixRel,
    count: chunkQuestions.length,
    cumulativeStart,
  })
  cumulativeStart += chunkQuestions.length
})

// 计算最新日期
const latestDate =
  questions.length > 0
    ? questions.reduce((max, q) => (q.date > max ? q.date : max), questions[0].date)
    : null

// 生成元信息文件
const meta = {
  version: 1,
  chunkSize: CHUNK_SIZE,
  totalQuestions: questions.length,
  chunkCount: chunks.length,
  latestDate,
  chunks: descriptors,
}

fs.writeFileSync(path.join(OUT_DIR, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8')

// 删除旧的 questions.json 文件（已迁移到分片存储）
const legacyPath = path.join(ROOT, 'public', 'questions.json')
if (fs.existsSync(legacyPath)) {
  fs.unlinkSync(legacyPath)
}

console.log(
  `Wrote catalog: ${questions.length} questions, ${chunks.length} chunks → ${path.relative(ROOT, OUT_DIR)}`,
)
