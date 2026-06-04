/**
 * provider-client.mjs
 * ==================
 * 统一的模型调用封装：根据 provider 调用对应实现（openai / deepseek / qianwen）
 *
 * 使用说明：
 * - 该模块提供 `chatCompletion()` 和 `chatCompletionText()` 两个主接口，脚本应通过这些函数与模型交互，
 *   无需关心具体 provider 的实现细节。
 * - 支持的 provider：`openai`（默认）、`deepseek`、`qianwen`。
 *
 * 环境变量（示例，仅供调用脚本参考）：
 * - OpenAI: set `OPENAI_API_KEY`
 * - DeepSeek: set `DEEPSEEK_API_KEY`, 可选覆盖 `DEEPSEEK_API_BASE` / `DEEPSEEK_API_URL`
 * - Qianwen: set `QIANWEN_API_KEY`, 可选覆盖 `QIANWEN_API_BASE` / `QIANWEN_API_URL`
 *
 * 使用示例（在脚本中）：
 *   import { chatCompletionText } from './provider-client.mjs'
 *   const text = await chatCompletionText({
 *     provider: 'deepseek',
 *     apiKey: process.env.DEEPSEEK_API_KEY,
 *     apiUrl: process.env.DEEPSEEK_API_URL,
 *     apiBase: process.env.DEEPSEEK_API_BASE,
 *     model: 'deepseek-v4-pro',
 *     messages: [{role:'system', content:'...'}, {role:'user', content:'...'}],
 *   })
 *
 * 备注：`deepseek` 和 `qianwen` 使用 OpenAI SDK (`openai` package) 的兼容路径调用，
 * OpenAI provider 使用标准 HTTP POST 到 `https://api.openai.com/v1/chat/completions`。
 */

import OpenAI from 'openai'

export const DEFAULT_DEEPSEEK_API_BASE = 'https://api.deepseek.com'
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-pro'
export const DEFAULT_QIANWEN_API_BASE = 'https://dashscope.aliyuncs.com/compatible-mode/v1'
export const DEFAULT_QIANWEN_MODEL = 'qianwen'

export function normalizeDeepseekBaseUrl(value) {
  let url = String(value || '').trim()
  if (!url) return url
  if (url.endsWith('/chat/completions')) {
    url = url.slice(0, -'/chat/completions'.length)
  }
  return url.replace(/\/+$/, '')
}

export function normalizeBaseUrl(value) {
  return normalizeDeepseekBaseUrl(value)
}

export function getDeepseekApiBaseUrl({ apiUrl, apiBase } = {}) {
  return normalizeDeepseekBaseUrl(apiUrl || apiBase || DEFAULT_DEEPSEEK_API_BASE)
}

export function getQianwenApiBaseUrl({ apiUrl, apiBase } = {}) {
  return normalizeBaseUrl(apiUrl || apiBase || DEFAULT_QIANWEN_API_BASE)
}

export function validateDeepseekApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY is required for DeepSeek provider')
  }
  return apiKey
}

export function validateQianwenApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('QIANWEN_API_KEY is required for Qianwen provider')
  }
  return apiKey
}

function createOpenAIClient({ apiKey, apiUrl, apiBase, provider = 'deepseek' } = {}) {
  if (provider === 'qianwen') {
    validateQianwenApiKey(apiKey)
  } else {
    validateDeepseekApiKey(apiKey)
  }

  const baseURL = provider === 'qianwen'
    ? getQianwenApiBaseUrl({ apiUrl, apiBase })
    : getDeepseekApiBaseUrl({ apiUrl, apiBase })

  try { console.log(`[provider-client] createOpenAIClient provider=${provider} baseURL=${baseURL}`) } catch {}

  return new OpenAI({ apiKey, baseURL })
}

export async function deepseekChatCompletion({
  apiKey, apiUrl, apiBase, model, messages, temperature, max_tokens, stream = false, extra = {},
} = {}) {
  const client = createOpenAIClient({ apiKey, apiUrl, apiBase, provider: 'deepseek' })
  const params = { model, messages, stream, ...extra }
  if (temperature !== undefined) params.temperature = temperature
  if (max_tokens !== undefined) params.max_tokens = max_tokens
  try { const base = client && client.configuration && client.configuration.baseURL; console.log(`[provider-client] request ${base || getDeepseekApiBaseUrl({ apiUrl, apiBase })}/chat/completions`, { model: params.model, stream: params.stream }) } catch {}
  const response = await client.chat.completions.create(params)
  return response
}

export async function deepseekChatCompletionText(options) {
  const parsed = await deepseekChatCompletion(options)
  return parsed.choices?.[0]?.message?.content || parsed.choices?.[0]?.text || ''
}

export async function qianwenChatCompletion({
  apiKey, apiUrl, apiBase, model = DEFAULT_QIANWEN_MODEL, messages, temperature, max_tokens, stream = false, extra = {},
} = {}) {
  const client = createOpenAIClient({ apiKey, apiUrl, apiBase, provider: 'qianwen' })
  const params = { model, messages, stream, ...extra }
  if (temperature !== undefined) params.temperature = temperature
  if (max_tokens !== undefined) params.max_tokens = max_tokens
  try { const base = client && client.configuration && client.configuration.baseURL; console.log(`[provider-client] request ${base || getQianwenApiBaseUrl({ apiUrl, apiBase })}/chat/completions`, { model: params.model, stream: params.stream }) } catch {}
  const response = await client.chat.completions.create(params)
  return response
}

export async function qianwenChatCompletionText(options) {
  const parsed = await qianwenChatCompletion(options)
  return parsed.choices?.[0]?.message?.content || parsed.choices?.[0]?.text || ''
}

export async function chatCompletion({
  provider = 'openai', apiKey, apiUrl, apiBase, model, messages, temperature, max_tokens, stream = false, extra = {},
} = {}) {
  const p = String((provider || 'openai')).toLowerCase()
  if (p === 'deepseek') return deepseekChatCompletion({ apiKey, apiUrl, apiBase, model, messages, temperature, max_tokens, stream, extra })
  if (p === 'qianwen') return qianwenChatCompletion({ apiKey, apiUrl, apiBase, model, messages, temperature, max_tokens, stream, extra })
  const openaiKey = apiKey
  if (!openaiKey) throw new Error('OPENAI_API_KEY is required for OpenAI provider')
  const endpoint = apiUrl || 'https://api.openai.com/v1/chat/completions'
  const body = { model, messages, temperature, max_tokens, ...extra }
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` }, body: JSON.stringify(body) })
  if (!response.ok) { const text = await response.text(); throw new Error(`OpenAI request failed: ${response.status} ${response.statusText}\n${text}`) }
  const parsed = await response.json()
  return parsed
}

export async function chatCompletionText(options) { const parsed = await chatCompletion(options); return parsed.choices?.[0]?.message?.content || parsed.choices?.[0]?.text || '' }

export default { chatCompletion, chatCompletionText }
