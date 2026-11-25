export type OllamaConfig = {
  baseUrl: string
  model: string
  temperature: number
  enabled: boolean
}

export const defaultOllamaConfig: OllamaConfig = {
  baseUrl: 'http://localhost:11434',
  model: 'qwen2.5:7b',
  temperature: 0.85,
  enabled: false,
}

export type ConnectionState = {
  ok: boolean
  models: string[]
  message: string
}

function normalize(url: string) {
  return url.trim().replace(/\/+$/, '')
}

export async function testConnection(config: OllamaConfig): Promise<ConnectionState> {
  try {
    const res = await fetch(`${normalize(config.baseUrl)}/api/tags`, {
      method: 'GET',
      signal: AbortSignal.timeout(4000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { models?: { name: string }[] }
    const models = (data.models || []).map((m) => m.name)
    return {
      ok: true,
      models,
      message: models.length ? `已连接，检测到 ${models.length} 个本地模型` : '已连接，但本机还没有拉取模型',
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      ok: false,
      models: [],
      message: `无法连接：${msg}。请确认 ollama serve 已启动，且用 OLLAMA_ORIGINS="*" 允许了跨域。`,
    }
  }
}

export async function generateWithOllama(config: OllamaConfig, prompt: string): Promise<string> {
  const res = await fetch(`${normalize(config.baseUrl)}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: config.model,
      prompt,
      stream: false,
      options: { temperature: config.temperature, top_p: 0.9 },
    }),
    signal: AbortSignal.timeout(120000),
  })
  if (!res.ok) throw new Error(`本地模型返回 HTTP ${res.status}`)
  const data = (await res.json()) as { response?: string }
  if (!data.response) throw new Error('本地模型没有返回内容')
  return data.response
}

export function parseGenerated(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^\s*[-•·*\d]+[.、)\s]*/, '').replace(/^["「『]|["」』]$/g, '').trim())
    .filter((line) => line.length >= 3 && line.length <= 80)
    .slice(0, 12)
}
