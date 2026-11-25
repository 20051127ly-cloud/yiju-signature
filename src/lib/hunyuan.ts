import type { StyleSlot, ThoughtPlan } from './engine'

export type HunyuanThought = ThoughtPlan

export type HunyuanStatus = {
  configured: boolean
  model: string
  baseUrl: string
}

export type ThinkInput = {
  direction: string
  answers: { title: string; picked: string[] }[]
  families: string[]
  tags: string[]
  count: number
}

const API = '/api/hunyuan'
const KEY_STORAGE = 'sig-hunyuan-key'

/** 本地开发密钥只放当前会话；生产构建不会把该值发往服务端 */
export function readHunyuanKey(): string {
  try { return sessionStorage.getItem(KEY_STORAGE) || '' } catch { return '' }
}

export function saveHunyuanKey(key: string) {
  try { sessionStorage.setItem(KEY_STORAGE, key.trim()) } catch { /* 隐私模式下忽略 */ }
}

function authHeaders(key: string): Record<string, string> {
  if (import.meta.env.PROD) return {}
  return key ? { 'x-hunyuan-key': key } : {}
}

export async function getHunyuanStatus(key = ''): Promise<HunyuanStatus> {
  try {
    const res = await fetch(`${API}/status`, {
      headers: authHeaders(key),
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error('status unavailable')
    return await res.json() as HunyuanStatus
  } catch {
    return { configured: false, model: 'hunyuan-turbo', baseUrl: '' }
  }
}

export function parseThought(raw: string, families: string[], count: number): HunyuanThought {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('混元返回格式不正确')
  const parsed = JSON.parse(match[0]) as { keywords?: unknown; slots?: unknown; summary?: unknown }
  const short = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0 && v.trim().length <= 8

  const keywords = Array.from(new Set(
    (Array.isArray(parsed.keywords) ? parsed.keywords : []).filter(short).map((w) => w.trim()),
  )).slice(0, 8)

  const rawSlots = Array.isArray(parsed.slots) ? parsed.slots : []
  const slots: StyleSlot[] = Array.from({ length: count }, (_, n) => {
    const item = rawSlots[n] as { family?: unknown; focus?: unknown } | undefined
    const candidate = item?.family
    const family = typeof candidate === 'string' && families.includes(candidate)
      ? candidate
      : (families[n % Math.max(1, families.length)] || '')
    const focus = Array.from(new Set(
      (Array.isArray(item?.focus) ? item.focus : []).filter(short).map((w) => w.trim()),
    )).slice(0, 3)
    return { family, focus }
  })

  const summary = typeof parsed.summary === 'string' ? parsed.summary.slice(0, 40) : ''
  if (!keywords.length && slots.every((s) => s.focus.length === 0)) throw new Error('混元没有给出可用的规划')
  return { keywords, slots, summary }
}

/** 混元只做「语义理解 + 风格规划」，句子正文仍由本地语料检索生成 */
export async function thinkWithHunyuan(input: ThinkInput, key = ''): Promise<HunyuanThought> {
  const res = await fetch(`${API}/think`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(key) },
    body: JSON.stringify(input),
    signal: AbortSignal.timeout(35000),
  })
  const data = await res.json().catch(() => ({})) as { content?: string; error?: string }
  if (!res.ok) throw new Error(data.error || `混元服务 HTTP ${res.status}`)
  if (!data.content) throw new Error('混元返回为空')
  return parseThought(data.content, input.families, input.count)
}
