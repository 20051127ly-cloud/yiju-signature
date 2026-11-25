import { GROUPS, type CorpusGroup } from '../data/corpus'

export type HitokotoMeta = {
  source: string
  license: string
  generatedAt: string
  upstreamTotal: number
  included: number
  filtered: { badFormat: number; unsuitable: number; duplicate: number }
  longSentence: number
  byGroup: Record<string, number>
  upstreamCategories: { key: string; name: string; count: number }[]
}

export type HitokotoBundle = {
  meta: HitokotoMeta
  /** [本站类目 id, 句子正文, 出处/作者] */
  items: [string, string, string][]
}

export type HitokotoPayload = { bundle: HitokotoBundle; groups: CorpusGroup[] }

/** 按类目 id 把上游句子并入原本的 CorpusGroup，页面上看不到独立的一言库类目 */
export function mergeIntoGroups(base: CorpusGroup[], items: HitokotoBundle['items']): CorpusGroup[] {
  const byId = new Map<string, string[]>()
  for (const [groupId, text, note] of items) {
    const list = byId.get(groupId) || []
    list.push(note ? `${text}@@${note}` : text)
    byId.set(groupId, list)
  }
  return base.map((group) => {
    const extra = byId.get(group.id)
    return extra?.length ? { ...group, lines: [...group.lines, ...extra] } : group
  })
}

/** 静态资源懒加载，由本站自己提供，不跨域、不依赖运行时外网 */
export async function loadHitokoto(): Promise<HitokotoPayload> {
  const url = `${import.meta.env.BASE_URL}data/hitokoto.json`
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`语料包加载失败：HTTP ${res.status}`)
  const bundle = (await res.json()) as HitokotoBundle
  if (!bundle?.meta || !Array.isArray(bundle.items)) throw new Error('语料包格式不正确')
  return { bundle, groups: mergeIntoGroups(GROUPS, bundle.items) }
}
