import { CLICHE_PATTERNS, GROUPS, type CorpusGroup, type GroupOrigin } from '../data/corpus'
import { DIMENSIONS, LEXICON, QUESTIONS, SEMANTIC_WORDS, type Dimension } from '../data/taxonomy'

export type SignatureLength = 'tiny' | 'short' | 'medium' | 'long'

export type Signature = {
  id: string
  text: string
  note?: string
  noteLabel?: string
  groupId: string
  groupName: string
  family: string
  persona: string
  groupOrigin: GroupOrigin
  tags: string[]
  lang: string[]
  decor: string[]
  length: SignatureLength
  popularity: 1 | 2 | 3
  hasSource: boolean
}

export type CorpusIndex = {
  entries: Signature[]
  byTag: Map<string, number[]>
  idf: Map<string, number>
  groups: Map<string, Signature[]>
  tagGroupAffinity: Map<string, { group: string; count: number }[]>
  /** 按九组问题切出的语料象限：`问题:选项` → 句子下标。仅用于检索，不呈现在前端 */
  quadrants: Map<string, Set<number>>
  clauses: string[]
  textBlob: string
  stats: {
    entries: number
    groups: number
    tags: number
    families: number
    languages: number
    addedGroups: number
    addedEntries: number
  }
}

export type Keyword = {
  label: string
  dimension: Dimension
  weight: number
  source: 'profile' | 'lexicon' | 'free' | 'model'
}

/** 早期开发留下的「补充类目」大类统一改成语义名，不出现在筛选词与关键词里 */
const FAMILY_NAMES: Record<string, string> = {
  '补充类目 · 文本': '文本与书摘',
  '补充类目 · 时效': '时节与身份',
  '补充类目 · 身份': '兴趣与身份',
  '补充类目 · 结构': '兴趣与身份',
  '补充类目 · 兴趣': '兴趣与身份',
  '补充类目 · 小语种': '外文与装饰',
}

function familyName(name: string) {
  return FAMILY_NAMES[name] ?? name
}

/** 形式 / 避雷 / 开发期标签只用于筛选，不进关键词栏 */
const META_TAGS = new Set([
  '纯文字', '轻装饰', '花体字', '边框', 'Emoji', '双语', '附出处',
  '中文', '英文', '中英', '文言', '德语', '拉丁语', '日语', '法语',
  '不要Emoji', '不要英文', '不要丧', '不要鸡汤', '不提爱情', '不要表情',
  '冷门', 'UGC', '补充类目', '已补充', '大类',
  // 语义理解只保留名词 / 形容词，动宾短语不进关键词
  '换工作', '随手换', '打卡',
])

function isMetaTag(label: string) {
  return META_TAGS.has(label)
    || label.includes('补充类目')
    || label.startsWith('不要')
    || label.startsWith('不提')
    || label.startsWith('建议')
}

const SOURCE_PRIORITY: Record<Keyword['source'], number> = { model: 0, free: 1, lexicon: 2, profile: 3 }

/** 自由输入切词时用来排除「一阵 / 别太 / 也别太」这类无语义碎片 */
const GRAM_NOISE = /[太别也很就都还把被让给这那些们了吧呢啊在与不我想要点种比较可以因为所以然后帮我适合喜欢感觉真的特别非常子儿着过]/u

export type Profile = {
  answers: Record<string, string[]>
  direction: string
  niche: number
  originality: number
  count: number
}

export type GeneratedItem = {
  id: string
  text: string
  note?: string
  noteLabel?: string
  groupName: string
  family: string
  persona: string
  match: number
  hitTags: string[]
  reference?: string
  kind: 'retrieved' | 'original'
  reason: string
}

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/gu
const FRAME_RE = /[꧁꧂༺༻⟦⟧꒰꒱]/gu
const LIGHT_DECOR_RE = /[✦✧⋆⟡✩✶✷˚⋆｡°˗ˏˋˎˊ]/gu
const FANCY_RE = /[\u{1D400}-\u{1D7FF}\u{24B6}-\u{24E9}]/gu
const CJK_RE = /[\u4e00-\u9fa5]/g
const LATIN_RE = /[A-Za-zÀ-ÿ]/g

export function visibleLength(text: string) {
  return text.replace(EMOJI_RE, '').replace(FRAME_RE, '').replace(LIGHT_DECOR_RE, '').trim().length
}

function detectLength(text: string): SignatureLength {
  const n = visibleLength(text)
  if (n <= 8) return 'tiny'
  if (n <= 15) return 'short'
  if (n <= 30) return 'medium'
  return 'long'
}

function detectDecor(text: string): string[] {
  const out: string[] = []
  if (EMOJI_RE.test(text)) out.push('Emoji')
  EMOJI_RE.lastIndex = 0
  if (FRAME_RE.test(text)) out.push('边框')
  FRAME_RE.lastIndex = 0
  if (FANCY_RE.test(text)) out.push('花体字')
  FANCY_RE.lastIndex = 0
  if (LIGHT_DECOR_RE.test(text)) out.push('轻装饰')
  LIGHT_DECOR_RE.lastIndex = 0
  if (text.includes('｜') || text.includes('@@')) out.push('双语')
  if (out.length === 0) out.push('纯文字')
  return out
}

export function buildCorpus(sourceGroups: CorpusGroup[] = GROUPS): CorpusIndex {
  const entries: Signature[] = []
  let counter = 0

  for (const group of sourceGroups) {
    for (const raw of group.lines) {
      const [text, note] = raw.split('@@')
      const clean = text.trim()
      const hasCJK = (clean.match(CJK_RE) || []).length > 0
      const hasLatin = (clean.match(LATIN_RE) || []).length > 0
      const lang = group.lang
      const tags = new Set<string>(group.tags)
      lang.forEach((l) => tags.add(l))
      if (hasCJK && hasLatin && !tags.has('中英')) tags.add('中英')
      const decor = detectDecor(clean)
      decor.forEach((d) => tags.add(d))
      const hasSource = ['出处', '作者', '配对', '时令'].includes(group.noteLabel || '') && !!note
      if (hasSource) tags.add('附出处')
      const length = detectLength(clean)
      if (length === 'tiny') tags.add('纯文字')
      const isCliche = CLICHE_PATTERNS.some((p) => clean.includes(p))
      let popularity: 1 | 2 | 3 = isCliche ? 3 : 2
      if (!isCliche && (group.tags.includes('冷门') || (length === 'tiny' && clean.length <= 8))) popularity = 1

      entries.push({
        id: `s${++counter}`,
        text: clean,
        note: note?.trim(),
        noteLabel: group.noteLabel,
        groupId: group.id,
        groupName: group.name,
        family: familyName(group.family),
        persona: group.persona,
        groupOrigin: group.origin,
        tags: Array.from(tags),
        lang,
        decor,
        length,
        popularity,
        hasSource,
      })
    }
  }

  // 学习 1：标签倒排索引 + IDF
  const byTag = new Map<string, number[]>()
  entries.forEach((entry, i) => {
    entry.tags.forEach((tag) => {
      const list = byTag.get(tag) || []
      list.push(i)
      byTag.set(tag, list)
    })
  })
  const idf = new Map<string, number>()
  const N = entries.length
  byTag.forEach((ids, tag) => {
    idf.set(tag, Math.log(1 + N / (1 + ids.length)) / Math.log(N + 1))
  })

  // 学习 2：标签 ↔ 类目共现（用于「为什么推荐这类」的解释）
  const tagGroupAffinity = new Map<string, { group: string; count: number }[]>()
  byTag.forEach((ids, tag) => {
    const counts = new Map<string, number>()
    ids.forEach((i) => counts.set(entries[i].groupName, (counts.get(entries[i].groupName) || 0) + 1))
    tagGroupAffinity.set(
      tag,
      Array.from(counts.entries())
        .map(([group, count]) => ({ group, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3),
    )
  })

  // 学习 3：按九组问题把语料切成象限，供答案划定检索边界（不呈现在前端）
  const quadrants = new Map<string, Set<number>>()
  const lengthRank: Record<SignatureLength, number> = { tiny: 0, short: 1, medium: 2, long: 3 }
  const lengthLimit: Record<string, number> = { tiny: 0, short: 1, medium: 2, any: 3 }
  for (const q of QUESTIONS) {
    if (q.id === 'avoid') continue
    for (const opt of q.options) {
      const ids = new Set<number>()
      if (q.id === 'length') {
        const limit = lengthLimit[opt.id] ?? 3
        entries.forEach((e, i) => { if (lengthRank[e.length] <= limit) ids.add(i) })
      } else {
        for (const tag of opt.tags) for (const i of byTag.get(tag) || []) ids.add(i)
        if (q.id === 'decor' && opt.id === 'plain') {
          entries.forEach((e, i) => { if (e.decor.length === 0) ids.add(i) })
        }
        if (q.id === 'lang' && opt.id === 'zh') {
          entries.forEach((e, i) => { if (e.lang.includes('中文') || e.lang.includes('文言')) ids.add(i) })
        }
        if (q.id === 'genre' && opt.id === 'ugc') {
          entries.forEach((e, i) => {
            if (e.family === '真实 UGC · 人设' || e.tags.includes('UGC') || e.tags.includes('活人感')) ids.add(i)
          })
        }
      }
      quadrants.set(`${q.id}:${opt.id}`, ids)
    }
  }

  // 学习 4：从语料里抽出可复用的「后半句」句式，用于原创重组
  const clauses = new Set<string>()
  entries.forEach((entry) => {
    if (!entry.lang.includes('中文') && !entry.lang.includes('文言')) return
    const parts = entry.text.split(/[，,。！？｜]/).map((p) => p.trim())
    if (parts.length < 2) return
    const tail = parts[parts.length - 1]
    EMOJI_RE.lastIndex = 0
    const hasEmoji = EMOJI_RE.test(tail)
    EMOJI_RE.lastIndex = 0
    if (tail.length >= 3 && tail.length <= 14 && !hasEmoji) clauses.add(tail)
  })

  const groups = new Map<string, Signature[]>()
  entries.forEach((e) => groups.set(e.groupName, [...(groups.get(e.groupName) || []), e]))

  const languages = new Set(entries.flatMap((e) => e.lang))
  const families = new Set(sourceGroups.map((g) => g.family))
  const textBlob = entries.map((e) => e.text.toLowerCase()).join('\n')

  return {
    entries,
    byTag,
    idf,
    groups,
    tagGroupAffinity,
    quadrants,
    clauses: Array.from(clauses),
    textBlob,
    stats: {
      entries: entries.length,
      groups: sourceGroups.length,
      tags: byTag.size,
      families: families.size,
      languages: languages.size,
      addedGroups: sourceGroups.filter((g) => g.origin === 'added').length,
      addedEntries: entries.filter((e) => e.groupOrigin === 'added').length,
    },
  }
}

/** 问卷不落盘、不预填：每次进入都从零开始，只作为思路引导 */
export function emptyProfile(): Profile {
  return {
    answers: {},
    direction: '',
    niche: 55,
    originality: 30,
    count: 8,
  }
}

export type ProfileFlags = {
  tags: string[]
  langTags: string[]
  avoidIds: string[]
  avoidTags: string[]
  lengthId: string
  decorId: string
}

export function readProfile(profile: Profile): ProfileFlags {
  const tags: string[] = []
  const langTags: string[] = []
  const avoidIds: string[] = []
  const avoidTags: string[] = []
  let lengthId = 'any'
  let decorId = 'plain'

  for (const q of QUESTIONS) {
    const picked = profile.answers[q.id] || []
    for (const optionId of picked) {
      const opt = q.options.find((o) => o.id === optionId)
      if (!opt) continue
      if (q.id === 'avoid') {
        avoidIds.push(optionId)
        avoidTags.push(...opt.tags)
      } else {
        tags.push(...opt.tags)
        if (q.id === 'lang') langTags.push(...opt.tags)
        if (q.id === 'length') lengthId = optionId
        if (q.id === 'decor') decorId = optionId
      }
    }
  }
  return { tags, langTags, avoidIds, avoidTags, lengthId, decorId }
}

/**
 * 语义理解只提取「完整的名词 / 形容词」：白名单最长匹配 + 「最喜欢的是 X」句式优先。
 * 不再做 2–4 字 n-gram，因此不会出现「一阵」「别太」「也别太」这类碎片。
 */
export function extractSemanticWords(index: CorpusIndex, text: string): string[] {
  const source = text.trim()
  if (!source) return []
  const dictionary = new Set<string>([
    ...SEMANTIC_WORDS,
    ...Array.from(index.byTag.keys()).filter((t) => !isMetaTag(t) && t.length <= 4 && !GRAM_NOISE.test(t)),
  ])
  const found = new Map<string, number>()

  const patterns = [
    /(?:最喜欢|最想要|偏爱|喜欢|爱|想要|想成为|离不开|在意|珍惜|拥有)\s*(?:的)?\s*(?:是)?\s*([\u4e00-\u9fa5]{2,4})/gu,
    /(?:就是|只是|不过是|是)\s*([\u4e00-\u9fa5]{2,4})(?=[，。！？、\s]|$)/gu,
  ]
  for (const re of patterns) {
    for (const m of source.matchAll(re)) {
      if (dictionary.has(m[1])) found.set(m[1], 1.8)
    }
  }
  for (const word of dictionary) {
    if (word.length < 2 || found.has(word)) continue
    if (source.includes(word)) found.set(word, SEMANTIC_WORDS.includes(word) ? 1.2 : 1.1)
  }

  return Array.from(found.entries())
    .filter(([word]) => SEMANTIC_WORDS.includes(word) || index.byTag.has(word) || index.textBlob.includes(word.toLowerCase()))
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 6)
    .map(([word]) => word)
}

/** 问卷答案只补充少量引导词，供关键词栏在答题时自动同步 */
export function deriveGuideKeywords(profile: Profile): Keyword[] {
  const flags = readProfile(profile)
  const out: Keyword[] = []
  const seen = new Set<string>()
  for (const tag of flags.tags) {
    if (seen.has(tag) || tag.length > 8 || isMetaTag(tag)) continue
    seen.add(tag)
    const guessed = guessDimension(tag)
    out.push({ label: tag, dimension: guessed === 'free' ? 'mood' : guessed, weight: 0.9, source: 'profile' })
  }
  return out
}

/**
 * 关键词的语义由「用户自由输入」决定（lexicon / free / model 高权重），
 * 问卷答案只补充少量引导词（profile 低权重），形式与避雷标签一律不出现。
 */
export function deriveKeywords(
  index: CorpusIndex,
  profile: Profile,
  extra: string[] = [],
  modelWords: string[] = [],
): Keyword[] {
  const map = new Map<string, Keyword>()
  const add = (raw: string, dimension: Dimension, weight: number, source: Keyword['source']) => {
    const label = raw.trim()
    if (!label || label.length > 8 || isMetaTag(label)) return
    const prev = map.get(label)
    if (prev) {
      prev.weight = Math.min(3, prev.weight + weight * 0.3)
      if (SOURCE_PRIORITY[source] < SOURCE_PRIORITY[prev.source]) {
        prev.source = source
        prev.dimension = dimension
      }
      return
    }
    map.set(label, { label, dimension, weight, source })
  }

  for (const kw of deriveGuideKeywords(profile)) add(kw.label, kw.dimension, kw.weight, 'profile')

  const direction = profile.direction.trim()
  if (direction) {
    for (const [word, rule] of Object.entries(LEXICON)) {
      if (direction.toLowerCase().includes(word.toLowerCase())) {
        rule.tags.forEach((t) => add(t, rule.dimension, 1.65, 'lexicon'))
      }
    }
    for (const word of extractSemanticWords(index, direction)) add(word, 'free', 1.45, 'free')
  }

  extra.forEach((e) => add(e, 'free', 1.9, 'free'))
  modelWords.forEach((w) => {
    const guessed = guessDimension(w)
    add(w, guessed === 'free' ? 'free' : guessed, 2.2, 'model')
  })

  return Array.from(map.values())
    .sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source] || b.weight - a.weight || a.label.length - b.label.length)
    .slice(0, 18)
}

function guessDimension(tag: string): Dimension {
  const groups: Record<Dimension, string[]> = {
    mood: ['清醒', '独立', '温柔', '治愈', '清冷', '疏离', '飒爽', '自由', '幽默', '淡然', '上进', '释然', '禅意', '诗意', '浪漫', '怀旧', '深情', '热血', '通透', '知足', '高级感', '松弛', '希望', '接纳'],
    theme: ['自我', '成长', '独处', '边界感', '日常', '旅行', '山水', '自然', '时节', '生活', '健康', '家庭', '工作', '备考', '友情', '爱情', '岁月', '中年', '银发', '宠物', '音乐', '星空', '哲学', '命运', '时间', '遗憾', '打卡'],
    lang: ['中文', '英文', '中英', '文言', '德语', '拉丁语', '日语', '法语'],
    genre: ['UGC', '古诗词', '名人名言', '影视台词', '动漫台词', '歌词', '书摘', '禅语', '景点', '花体', '网络梗', '节气', '玄学'],
    decor: ['纯文字', '轻装饰', '花体字', '边框', 'Emoji', '双语', '附出处'],
    age: ['学生', '20+', '30+', '40+', '50+'],
    vibe: ['活人感', '高级感', '文艺', '网感', '沉稳', '冷门'],
    scene: ['长期不换', '换工作', '重启', '生日新年', '备考', '退休', '随手换'],
    free: [],
  }
  for (const [dim, list] of Object.entries(groups) as [Dimension, string[]][]) {
    if (list.includes(tag)) return dim
  }
  return 'free'
}

export function dimensionOf(tag: string): Dimension {
  return guessDimension(tag)
}

function seededRandom(seed: number) {
  let s = seed || 1
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

function overlapScore(text: string, grams: string[]) {
  if (grams.length === 0) return 0
  const lower = text.toLowerCase()
  let score = 0
  for (const g of grams) if (lower.includes(g)) score += 1
  return Math.min(3, score * 0.6)
}

const FANCY_ALPHABETS: Record<string, { upper: number; lower: number }> = {
  bold: { upper: 0x1d400, lower: 0x1d41a },
  sansbold: { upper: 0x1d5d4, lower: 0x1d5ee },
  mono: { upper: 0x1d670, lower: 0x1d68a },
  circled: { upper: 0x24b6, lower: 0x24d0 },
}

function toFancy(text: string, style: string) {
  const spec = FANCY_ALPHABETS[style] || FANCY_ALPHABETS.bold
  return text.replace(/[A-Za-z]/g, (ch) => {
    const base = ch >= 'A' && ch <= 'Z' ? spec.upper + (ch.charCodeAt(0) - 65) : spec.lower + (ch.charCodeAt(0) - 97)
    return String.fromCodePoint(base)
  })
}

const EMOJI_BY_MOOD: { tags: string[]; marks: string[] }[] = [
  { tags: ['清冷', '疏离', '独处'], marks: ['☁️', '🌙', '🪶', '🕯️'] },
  { tags: ['温柔', '治愈', '浪漫'], marks: ['🍃', '🪷', '🌸', '✨'] },
  { tags: ['飒爽', '自由', '热血'], marks: ['🔥', '⚡', '🌊', '🦋'] },
  { tags: ['幽默', '松弛', '网感'], marks: ['🎈', '🍀', '📖', '⟡'] },
  { tags: ['释然', '通透', '禅意'], marks: ['🍂', '🕊️', '🌬️', '✧'] },
]

function pickEmoji(tags: string[], rnd: () => number) {
  const hit = EMOJI_BY_MOOD.find((m) => m.tags.some((t) => tags.includes(t)))
  const marks = hit?.marks || ['✦', '🍃', '🌙', '✨']
  return marks[Math.floor(rnd() * marks.length)]
}

export function stripDecor(text: string) {
  return text
    .replace(EMOJI_RE, '')
    .replace(FRAME_RE, '')
    .replace(LIGHT_DECOR_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function applyDecor(text: string, decorId: string, tags: string[], rnd: () => number) {
  switch (decorId) {
    case 'plain':
      return stripDecor(text)
    case 'emoji': {
      const base = stripDecor(text)
      const mark = pickEmoji(tags, rnd)
      return `${mark} ${base} ${mark}`
    }
    case 'fancy': {
      const styles = Object.keys(FANCY_ALPHABETS)
      const style = styles[Math.floor(rnd() * styles.length)]
      const base = stripDecor(text)
      return toFancy(base, style)
    }
    case 'frame':
      return `꧁༺ ${stripDecor(text)} ༻꧂`
    default:
      return text
  }
}

function isBlocked(entry: Signature, flags: ProfileFlags) {
  const avoid = flags.avoidIds
  if (avoid.includes('emoji') && entry.decor.includes('Emoji')) return true
  if (avoid.includes('en') && entry.lang.some((l) => ['英文', '中英'].includes(l))) return true
  if (avoid.includes('love') && entry.tags.includes('爱情')) return true
  if (avoid.includes('soup') && (entry.tags.includes('打卡') || entry.tags.includes('上进'))) return true
  if (avoid.includes('sad') && (entry.tags.includes('怀旧') || entry.tags.includes('遗憾'))) return true
  return false
}

function lengthPenalty(entry: Signature, lengthId: string) {
  const rank: Record<SignatureLength, number> = { tiny: 0, short: 1, medium: 2, long: 3 }
  const limit: Record<string, number> = { tiny: 0, short: 1, medium: 2, any: 3 }
  const max = limit[lengthId] ?? 3
  if (rank[entry.length] > max) return -4
  // 全量语料里的超长句仍然可检索，但默认排在短签名之后
  return entry.length === 'long' && lengthId === 'any' ? -2.6 : 0
}

function langScore(entry: Signature, langTags: string[]) {
  if (langTags.length === 0) return 0
  const wanted = langTags.filter((t) => ['中文', '文言', '英文', '中英', '双语', '德语', '拉丁语', '日语', '法语'].includes(t))
  if (wanted.length === 0) return 0
  const hit = wanted.some((w) => entry.lang.includes(w) || entry.tags.includes(w))
  return hit ? 1.6 : -3.2
}

/** 每条结果占一个「风格槽」：不同大类，侧重不同关键词 */
export type StyleSlot = { focus: string[]; family: string }

export type StylePlan = {
  slots: StyleSlot[]
  source: 'hunyuan' | 'local'
  summary: string
}

/** 混元思考层的输出，可直接注入风格规划 */
export type ThoughtPlan = {
  keywords: string[]
  slots: StyleSlot[]
  summary: string
}

export type GenerateResult = {
  items: GeneratedItem[]
  totalCandidates: number
  learnedTags: string[]
  plan: StylePlan
  boundary: { answered: number; minHits: number; relaxed: number; size: number; inside: number; strict: boolean; pickedInside: number }
}

export type SearchBoundary = {
  /** 落在至少 minHits 个已答题象限里的句子 */
  allowed: Set<number>
  /** 全部已答题的象限，用于命中题数加分 */
  sets: Set<number>[]
  answered: number
  minHits: number
  relaxed: number
}

/**
 * 同一题多选取并集；题与题之间按「命中多数象限」划定边界，
 * 而不是死板地取交集——交集常与用户自由输入的语义方向完全不相交。
 */
export function boundaryOf(index: CorpusIndex, profile: Profile, minSize = 24): SearchBoundary {
  const sets: Set<number>[] = []
  for (const q of QUESTIONS) {
    if (q.id === 'avoid') continue
    const picked = profile.answers[q.id] || []
    if (!picked.length) continue
    const union = new Set<number>()
    for (const id of picked) {
      for (const i of index.quadrants.get(`${q.id}:${id}`) || []) union.add(i)
    }
    if (union.size) sets.push(union)
  }
  const answered = sets.length
  if (!answered) return { allowed: new Set<number>(), sets, answered, minHits: 0, relaxed: 0 }

  const hits = new Map<number, number>()
  for (const set of sets) for (const i of set) hits.set(i, (hits.get(i) || 0) + 1)
  let minHits = Math.max(1, Math.ceil(answered * 0.6))
  let allowed = new Set<number>()
  let relaxed = 0
  for (;;) {
    allowed = new Set<number>()
    const familiesInside = new Set<string>()
    for (const [i, n] of hits) {
      if (n < minHits) continue
      allowed.add(i)
      familiesInside.add(index.entries[i].family)
    }
    // 边界既要够大，也要覆盖足够多的风格，否则会与「8 句不同风格」冲突
    if ((allowed.size >= minSize && familiesInside.size >= 6) || minHits <= 1) break
    minHits--
    relaxed++
  }
  return { allowed, sets, answered, minHits, relaxed }
}

/** 关键词的风格：标签↔类目共现 → 含该词的句子分布 → 词典映射标签 */
export function styleOfKeyword(index: CorpusIndex, label: string): string | null {
  const votes = new Map<string, number>()
  const bump = (family: string, weight: number) => votes.set(family, (votes.get(family) || 0) + weight)
  const fromTag = (tag: string, weight = 1) => {
    for (const a of index.tagGroupAffinity.get(tag) || []) {
      const family = index.groups.get(a.group)?.[0]?.family
      if (family) bump(family, a.count * weight)
    }
  }

  fromTag(label)
  if (votes.size === 0) {
    for (const e of index.entries) if (e.text.includes(label)) bump(e.family, 1)
  }
  if (votes.size === 0) {
    for (const tag of LEXICON[label]?.tags || []) fromTag(tag)
  }
  return Array.from(votes.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || null
}

/** 为每个结果位分配不同大类 + 不同关键词侧重；大类由关键词风格决定 */
export function planStyles(
  index: CorpusIndex,
  keywords: Keyword[],
  count: number,
  seed: number,
  thought?: ThoughtPlan | null,
): StylePlan {
  const rnd = seededRandom(seed)
  const familyCount = new Map<string, number>()
  for (const e of index.entries) familyCount.set(e.family, (familyCount.get(e.family) || 0) + 1)
  const families = Array.from(familyCount.keys())
  const shuffled = families
    .map((f) => ({ f, k: Math.log(1 + (familyCount.get(f) || 0)) * (0.7 + rnd()) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.f)
  const ordered = [...keywords].sort((a, b) => SOURCE_PRIORITY[a.source] - SOURCE_PRIORITY[b.source] || b.weight - a.weight)
  const labels = ordered.map((k) => k.label)

  const cache = new Map<string, string | null>()
  const familyOf = (label: string) => {
    if (!cache.has(label)) cache.set(label, styleOfKeyword(index, label))
    return cache.get(label) || null
  }
  const usedFamilies = new Set<string>()
  const slots: StyleSlot[] = []
  const offset = labels.length ? Math.floor(rnd() * labels.length) : 0
  for (let n = 0; n < count; n++) {
    const given = thought?.slots?.[n]
    const focus: string[] = []
    for (const f of given?.focus || []) {
      if (focus.length >= 3) break
      if (f && f.length <= 8 && !focus.includes(f)) focus.push(f)
    }
    if (labels.length) {
      const start = (offset + n * 2) % labels.length
      for (let i = 0; i < labels.length && focus.length < 3; i++) {
        const label = labels[(start + i) % labels.length]
        if (!focus.includes(label)) focus.push(label)
      }
    }

    let family = given?.family && families.includes(given.family) && !usedFamilies.has(given.family)
      ? given.family
      : ''
    if (!family) {
      // 用关键词的风格从语料库里定位该取哪个大类
      const votes = new Map<string, number>()
      for (const f of focus) {
        const candidate = familyOf(f)
        if (candidate && !usedFamilies.has(candidate)) votes.set(candidate, (votes.get(candidate) || 0) + 1)
      }
      family = Array.from(votes.entries()).sort((a, b) => b[1] - a[1])[0]?.[0]
        || shuffled.find((f) => !usedFamilies.has(f))
        || shuffled[n % Math.max(1, shuffled.length)]
        || ''
    }
    usedFamilies.add(family)
    slots.push({ focus, family })
  }
  return { slots, source: thought ? 'hunyuan' : 'local', summary: thought?.summary || (thought ? '混元规划' : '本地规划') }
}

function plainText(text: string) {
  return text.replace(/[^\u4e00-\u9fa5A-Za-z]/g, '').toLowerCase()
}

function tooSimilar(a: string, b: string) {
  if (a === b) return true
  if (a.length < 6 || b.length < 6) return false
  if (a.startsWith(b.slice(0, 6)) || b.startsWith(a.slice(0, 6))) return true
  if (a.length >= 8 && b.length >= 8) return a.includes(b.slice(0, 8)) || b.includes(a.slice(0, 8))
  return false
}

export function generate(
  index: CorpusIndex,
  keywords: Keyword[],
  profile: Profile,
  seed = Date.now(),
  thought?: ThoughtPlan | null,
): GenerateResult {
  const rnd = seededRandom(seed)
  const flags = readProfile(profile)
  const kwTags = keywords.map((k) => k.label)
  const niche = profile.niche / 100
  const semanticWords = extractSemanticWords(index, profile.direction)
  const boundary = boundaryOf(index, profile, Math.max(24, profile.count * 3))
  const dimensionWeight: Partial<Record<Dimension, number>> = {
    mood: 1.25, theme: 1.15, lang: 1.4, genre: 1.35, age: 1.1, vibe: 1.1, scene: 0.9, decor: 0.8, free: 1.5,
  }

  // 阶段一：九题象限划定边界，关键词在句子正文 / 标签里搜索
  const scored: { i: number; score: number; hits: string[] }[] = []
  index.entries.forEach((entry, i) => {
    if (isBlocked(entry, flags)) return
    let quadrantHits = 0
    for (const set of boundary.sets) if (set.has(i)) quadrantHits++
    let score = 0
    const hits: string[] = []
    for (const kw of keywords) {
      const inText = entry.text.includes(kw.label)
      const inTag = entry.tags.includes(kw.label)
      if (!inText && !inTag) continue
      const idf = index.idf.get(kw.label) ?? 0.45
      score += (0.5 + idf) * kw.weight * (dimensionWeight[kw.dimension] || 1) * (inText ? 1.25 : 0.9)
      hits.push(kw.label)
    }
    if (score === 0 && kwTags.length > 0) return
    score += quadrantHits * 1.6
    if (boundary.answered > 0 && !boundary.allowed.has(i)) score -= 4
    score += overlapScore(entry.text, semanticWords)
    score += langScore(entry, flags.langTags)
    score += lengthPenalty(entry, flags.lengthId)
    if (flags.avoidIds.includes('cliche')) {
      score += entry.popularity === 3 ? -3.5 : entry.popularity === 1 ? 1.2 : 0
    } else {
      score += (3 - entry.popularity) * niche * 0.8
    }
    score += rnd() * 0.6
    scored.push({ i, score: Math.max(0.01, score), hits })
  })
  scored.sort((a, b) => b.score - a.score)

  const originalCount = Math.round((profile.originality / 100) * Math.min(6, profile.count))
  const retrievedCount = profile.count - originalCount
  // 边界内候选足够时，候选池只取边界内的句子；不足才纳入边界外的句子兜底
  const inside = boundary.answered > 0 ? scored.filter((c) => boundary.allowed.has(c.i)) : scored
  const outside = boundary.answered > 0 ? scored.filter((c) => !boundary.allowed.has(c.i)) : []
  const strictPool = boundary.answered > 0 && inside.length >= Math.max(16, retrievedCount * 2)
  const pool = [...inside, ...outside].slice(0, 4000)
  const clean = new Map<number, string>()
  for (const c of pool) clean.set(c.i, plainText(index.entries[c.i].text))
  const weightOf = new Map(keywords.map((k) => [k.label, k.weight]))
  const plan = planStyles(index, keywords, profile.count, seed ^ 0x5f3759df, thought)

  const usedGroups = new Set<string>()
  const usedFamilies = new Set<string>()
  const chosenTexts: string[] = []
  const picks: { i: number; score: number; hits: string[]; focusHits: string[] }[] = []
  // 5 字以下的超短句尽量不选；一批结果里最多保留 1 条
  let shortCount = 0

  for (let n = 0; n < retrievedCount; n++) {
    const slot = plan.slots[n]
    // 边界内还有没用过的风格时只在边界内取句；风格用尽才允许向外扩，保证 8 句风格各异
    const boundaryCanDiversify = strictPool && inside.some((c) => !usedFamilies.has(index.entries[c.i].family))
    const candidates = boundaryCanDiversify ? inside : pool
    const hasUnusedFamily = candidates.some((c) => !usedFamilies.has(index.entries[c.i].family))
    let best: { i: number; score: number; hits: string[]; focusHits: string[] } | null = null
    for (const cand of candidates) {
      const entry = index.entries[cand.i]
      if (hasUnusedFamily && usedFamilies.has(entry.family)) continue
      const focusHits = slot.focus.filter((f) => entry.tags.includes(f) || entry.text.includes(f))
      let score = cand.score * 0.42
      for (const f of focusHits) score += (weightOf.get(f) ?? 1) * 1.6
      if (entry.family === slot.family) score += 3.4
      if (usedGroups.has(entry.groupName)) score -= 9
      if (usedFamilies.has(entry.family)) score -= 7
      score += rnd() * 1.2
      const text = clean.get(cand.i) || ''
      if (chosenTexts.some((t) => tooSimilar(t, text))) score -= 14
      if (visibleLength(entry.text) < 5) score -= shortCount >= 1 ? 1000 : 2.4
      if (!best || score > best.score) best = { i: cand.i, score, hits: cand.hits, focusHits }
    }
    if (!best) break
    picks.push(best)
    const entry = index.entries[best.i]
    if (visibleLength(entry.text) < 5) shortCount++
    usedGroups.add(entry.groupName)
    usedFamilies.add(entry.family)
    chosenTexts.push(clean.get(best.i) || entry.text)
  }

  const max = Math.max(...picks.map((p) => p.score), 1)
  const items: GeneratedItem[] = picks.map((p, n) => {
    const entry = index.entries[p.i]
    let text = applyDecor(entry.text, flags.decorId, entry.tags, rnd)
    if (flags.decorId === 'source' && entry.note) text = `${text}  ——${entry.note}`
    const tags = p.focusHits.length
      ? [...p.focusHits, ...p.hits.filter((h) => !p.focusHits.includes(h))]
      : p.hits
    return {
      id: `g${seed}-${n}`,
      text,
      note: entry.note,
      noteLabel: entry.noteLabel,
      groupName: entry.groupName,
      family: entry.family,
      persona: entry.persona,
      match: Math.max(38, Math.round((p.score / max) * 100)),
      hitTags: Array.from(new Set(tags)).slice(0, 3),
      reference: entry.hasSource ? entry.note : undefined,
      kind: 'retrieved',
      reason: `侧重「${p.focusHits.join(' / ') || p.hits.slice(0, 2).join(' / ') || '整体气质'}」，风格「${entry.family}」`,
    }
  })

  // 原创重组占剩下的槽位：每条换模板、换侧重词，总数始终等于所选条数
  const templates = [
    { name: '留白重组', make: (a: string) => `${a}之外，别无大事` },
    { name: '归还重组', make: (a: string) => `把${a}，还给今天` },
    { name: '慢句重组', make: (a: string) => `${a}，慢慢来` },
    { name: '否定重组', make: (a: string) => `不急着${a}` },
    { name: '次序重组', make: (a: string) => `先${a}，再谈世界` },
    { name: '主张重组', make: (a: string) => `${a}这件事，我自己说了算` },
  ]
  const freeWords = keywords.filter((k) => k.source !== 'profile').map((k) => k.label)
  const spareFamilies = Array.from(new Set(plan.slots.map((s) => s.family))).filter((f) => f && !usedFamilies.has(f))
  for (let n = 0; n < originalCount; n++) {
    const slot = plan.slots[retrievedCount + n] || { focus: [], family: '' }
    const family = spareFamilies.shift() || slot.family
    usedFamilies.add(family)
    const anchor = slot.focus.find((f) => freeWords.includes(f))
      || freeWords[n % Math.max(1, freeWords.length)]
      || slot.focus[0]
      || '今天'
    const tpl = templates[(n + Math.abs(seed)) % templates.length]
    let text = tpl.make(anchor)
    if (n % 2 === 1 && index.clauses.length) {
      text = `${anchor}，${index.clauses[Math.floor(rnd() * index.clauses.length)]}`
    }
    text = applyDecor(text, flags.decorId === 'source' ? 'plain' : flags.decorId, slot.focus, rnd)
    if (items.some((i) => i.text === text) && index.clauses.length) {
      text = `${anchor}，${index.clauses[Math.floor(rnd() * index.clauses.length)]}`
    }
    if (visibleLength(text) < 5 && shortCount >= 1) {
      text = `${anchor}，慢慢来吧`
    }
    if (visibleLength(text) < 5) shortCount++
    items.push({
      id: `o${seed}-${n}`,
      text,
      groupName: tpl.name,
      family,
      persona: '基于已学习句式与你的关键词重新拼装',
      match: 88 - n * 3,
      hitTags: Array.from(new Set([anchor, ...slot.focus])).slice(0, 3),
      kind: 'original',
      reason: `侧重「${slot.focus.slice(0, 2).join(' / ') || anchor}」`,
    })
  }

  return {
    items,
    totalCandidates: scored.length,
    learnedTags: Array.from(index.byTag.keys()),
    plan,
    boundary: {
      answered: boundary.answered,
      minHits: boundary.minHits,
      relaxed: boundary.relaxed,
      size: boundary.allowed.size,
      inside: inside.length,
      strict: strictPool,
      pickedInside: picks.filter((p) => boundary.allowed.has(p.i)).length,
    },
  }
}

/** 交给本地大模型的提示词：关键词 + 检索到的 few-shot 例句 */
export function buildPrompt(keywords: Keyword[], profile: Profile, examples: GeneratedItem[], count: number) {
  const kw = keywords.map((k) => `${k.label}(${DIMENSIONS[k.dimension].label})`).join('、')
  const sample = examples
    .filter((e) => e.kind === 'retrieved')
    .slice(0, 6)
    .map((e) => `· ${e.text}`)
    .join('\n')
  const flags = readProfile(profile)
  const avoid = flags.avoidIds.length
    ? `避雷：${flags.avoidIds.map((id) => QUESTIONS.find((q) => q.id === 'avoid')?.options.find((o) => o.id === id)?.label).filter(Boolean).join('、')}。`
    : ''
  return `你是一位中文个性签名写作者。请为一位微信用户生成 ${count} 条个性签名。

用户想表达的方向：${profile.direction || '（未填写，按下方关键词判断）'}
提炼出的关键词：${kw}
语言偏好：${flags.langTags.join('、') || '不限'}；排版：${flags.decorId}；长度：${flags.lengthId}
小众度要求：${profile.niche}/100（越高越要避开烂大街的句子）
${avoid}

请学习以下语料的语感，但不要照抄：
${sample}

要求：
1. 每条独立一行，不要编号、不要引号、不要解释。
2. 保留「活人感」，不要 AI 味的排比和空话，不要滥用「愿你」「岁月」「温柔」。
3. ${profile.niche > 60 ? '优先冷门表达，避开"允许一切发生""心有山海"这类高频句。' : '可以适度使用经典表达。'}
4. 外语必须附中文释义，古诗词或名言必须能确认出处。
5. 只输出 ${count} 行签名正文。`
}
