import type { IncomingMessage, ServerResponse } from 'node:http'

type ThinkPayload = {
  direction?: string
  answers?: { title?: string; picked?: string[] }[]
  families?: string[]
  tags?: string[]
  count?: number
}

type HunyuanConfig = {
  baseUrl: string
  model: string
  key: string
}

type HandlerOptions = {
  env?: Record<string, string | undefined>
  acceptHeaderKey?: boolean
  maxBodyBytes?: number
  rateLimit?: { max?: number; windowMs?: number }
}

const SYSTEM_PROMPT = `你是中文个性签名的「语义规划器」，只做理解与规划，不写签名正文。
只输出一个 JSON 对象，不要 Markdown 代码块，不要任何解释文字。
格式：{"keywords":["..."],"slots":[{"family":"...","focus":["...","..."]}],"summary":"..."}
规则：
1. keywords：只提取完整的名词或形容词（如「世界」「食物」「安静」），2–6 个，来自用户自由输入；不要动词、副词、动宾短语、语气词或切词碎片；优先使用候选标签中的词，每个不超过 8 字。
2. slots：数组长度必须等于要求条数；每个 family 必须来自「可选风格大类」且互不重复。
3. 每个 slot 的 focus 是该条侧重的 2–3 个关键词，不同 slot 的 focus 组合必须有明显差异。
4. 结构化问卷只用于划定检索边界，最终语义以用户自由输入为准；不要输出避雷、格式、语言、类目之类的元标签。
5. summary 用一句话概括规划，不超过 20 字。`

function userPrompt(p: ThinkPayload) {
  const count = Math.min(12, Math.max(4, p.count || 8))
  const answers = (p.answers || [])
    .map((a) => `${a.title || ''}：${(a.picked || []).join('、') || '未填'}`)
    .join('\n')
  return [
    `用户自由输入（决定语义）：${p.direction || '（未填写）'}`,
    `结构化问卷（只作思路引导，不决定语义）：\n${answers || '（未填写）'}`,
    `可选风格大类（slots.family 必须从中选且互不相同）：${(p.families || []).join('、')}`,
    `候选标签（keywords 与 slots.focus 优先从中选）：${(p.tags || []).slice(0, 120).join('、')}`,
    `需要规划 ${count} 条，slots 数组长度必须为 ${count}。`,
  ].join('\n\n')
}

export function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

export function readBody(req: IncomingMessage, maxBytes = 64 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    let size = 0
    let settled = false
    req.on('data', (chunk: Buffer | string) => {
      if (settled) return
      const text = chunk.toString()
      size += Buffer.byteLength(text)
      if (size > maxBytes) {
        settled = true
        reject(new Error('请求体过大'))
        return
      }
      data += text
    })
    req.on('end', () => {
      if (settled) return
      settled = true
      resolve(data)
    })
    req.on('error', (err) => {
      if (settled) return
      settled = true
      reject(err)
    })
  })
}

export function readConfig(env: Record<string, string | undefined> = process.env): HunyuanConfig {
  return {
    baseUrl: (env.HUNYUAN_BASE_URL || 'https://api.hunyuan.cloud.tencent.com/v1').replace(/\/+$/, ''),
    model: env.HUNYUAN_MODEL || 'hunyuan-turbo',
    key: (env.HUNYUAN_API_KEY || '').trim(),
  }
}

function headerKey(req: IncomingMessage) {
  const header = req.headers['x-hunyuan-key']
  const value = Array.isArray(header) ? header[0] : header
  return (value || '').trim()
}

function clientIp(req: IncomingMessage) {
  const forwarded = req.headers['x-forwarded-for'] || req.headers['x-real-ip']
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded
  return (value || '').split(',')[0].trim() || 'local'
}

const rateBuckets = new Map<string, { count: number; resetAt: number }>()

function allowRequest(ip: string, max: number, windowMs: number) {
  const now = Date.now()
  if (rateBuckets.size > 1000) {
    for (const [key, bucket] of rateBuckets) {
      if (bucket.resetAt <= now) rateBuckets.delete(key)
    }
  }
  const bucket = rateBuckets.get(ip) || { count: 0, resetAt: now + windowMs }
  if (bucket.resetAt <= now) {
    bucket.count = 0
    bucket.resetAt = now + windowMs
  }
  if (bucket.count >= max) return false
  bucket.count += 1
  rateBuckets.set(ip, bucket)
  return true
}

function routeOf(req: IncomingMessage) {
  const path = (req.url || '').split('?')[0]
  const clean = path.replace(/^\/api\/hunyuan/, '')
  return clean === '' ? '/' : clean
}

async function requestThought(config: HunyuanConfig, payload: ThinkPayload) {
  const upstream = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.key}` },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt(payload) },
      ],
      temperature: 0.7,
      max_tokens: 900,
      stream: false,
    }),
    signal: AbortSignal.timeout(30000),
  })
  const data = await upstream.json() as {
    choices?: { message?: { content?: string } }[]
    error?: { message?: string }
  }
  if (!upstream.ok) throw new Error(data.error?.message || `混元返回 HTTP ${upstream.status}`)
  const content = data.choices?.[0]?.message?.content || ''
  if (!content) throw new Error('混元返回为空')
  return { content, model: config.model }
}

export async function handleHunyuan(
  req: IncomingMessage,
  res: ServerResponse,
  options: HandlerOptions = {},
): Promise<void> {
  const config = readConfig(options.env)
  const route = routeOf(req)

  if (route === '/' || route === '/status') {
    sendJson(res, 200, { configured: Boolean(config.key), model: config.model, baseUrl: config.baseUrl })
    return
  }

  if (route !== '/think' || req.method !== 'POST') {
    sendJson(res, 404, { error: 'Not found' })
    return
  }

  if (options.rateLimit) {
    const max = options.rateLimit.max ?? 12
    const windowMs = options.rateLimit.windowMs ?? 60_000
    if (!allowRequest(clientIp(req), max, windowMs)) {
      res.setHeader('Retry-After', String(Math.ceil(windowMs / 1000)))
      sendJson(res, 429, { error: '请求过于频繁，请稍后再试' })
      return
    }
  }

  const key = options.acceptHeaderKey ? (headerKey(req) || config.key) : config.key
  if (!key) {
    sendJson(res, 503, { error: '未配置混元 API Key' })
    return
  }

  let payload: unknown
  try {
    payload = JSON.parse(await readBody(req, options.maxBodyBytes ?? 64 * 1024))
  } catch (err) {
    sendJson(res, 400, { error: err instanceof Error ? err.message : '请求格式不正确' })
    return
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    sendJson(res, 400, { error: '请求格式不正确' })
    return
  }

  try {
    const result = await requestThought({ ...config, key }, payload as ThinkPayload)
    sendJson(res, 200, result)
  } catch (err) {
    sendJson(res, 502, { error: err instanceof Error ? err.message : '混元调用失败' })
  }
}
