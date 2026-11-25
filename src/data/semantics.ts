import { SENTIMENT_MAX_LENGTH, SENTIMENT_SCORES } from './sentiment-lexicon'

/** 内部语义情感向量：只在检索引擎里使用，不在前端呈现。 */
export const VECTOR_DIMS = [
  'valence',
  'arousal',
  'joy',
  'warmth',
  'calm',
  'premium',
  'literary',
  'insight',
  'playful',
  'energy',
  'melancholy',
  'minimal',
] as const

export type VectorDim = (typeof VECTOR_DIMS)[number]
export type SemanticVector = Record<VectorDim, number>

export type VectorInput = {
  text: string
  note?: string
  groupId: string
  groupName: string
  family: string
  tags: string[]
  decor: string[]
  persona: string | string[]
  lang: string[]
  vector?: SemanticVector
}

export type ConceptKey =
  | 'music'
  | 'growth'
  | 'premium'
  | 'healing'
  | 'freedom'
  | 'work'
  | 'love'
  | 'philosophy'
  | 'humor'

export type ConceptProfile = {
  title: string
  terms: string[]
  vector: SemanticVector
  preferGroups: string[]
  preferFamilies: string[]
  preferTags: string[]
  avoidGroups: string[]
  avoidTags: string[]
  literalWeak?: boolean
}

const clamp = (n: number, min = -1, max = 1) => Math.max(min, Math.min(max, n))

export function zeroVector(): SemanticVector {
  return Object.fromEntries(VECTOR_DIMS.map((k) => [k, 0])) as SemanticVector
}

export function vec(partial: Partial<SemanticVector>): SemanticVector {
  const out = zeroVector()
  for (const k of VECTOR_DIMS) out[k] = clamp(partial[k] || 0)
  return out
}

export function addScaled(target: SemanticVector, source: Partial<SemanticVector>, weight = 1) {
  for (const k of VECTOR_DIMS) target[k] += (source[k] || 0) * weight
}

export function clampVector(vector: SemanticVector): SemanticVector {
  for (const k of VECTOR_DIMS) vector[k] = clamp(vector[k])
  return vector
}

export function blendVectors(parts: { vector: SemanticVector; weight: number }[]): SemanticVector {
  const out = zeroVector()
  for (const part of parts) addScaled(out, part.vector, part.weight)
  return clampVector(out)
}

export function cosine(a: SemanticVector, b: SemanticVector): number {
  let dot = 0
  let na = 0
  let nb = 0
  for (const k of VECTOR_DIMS) {
    dot += a[k] * b[k]
    na += a[k] * a[k]
    nb += b[k] * b[k]
  }
  if (!na || !nb) return 0
  return clamp(dot / Math.sqrt(na * nb))
}

export function styleDistance(a: SemanticVector, b: SemanticVector): number {
  return clamp(1 - cosine(a, b), 0, 2)
}

/** 微信读书式图书分类的内涵，只作为隐藏语义画像，不作为前端类目展示。 */
export const BOOK_CATEGORY_VECTORS: Record<string, Partial<SemanticVector>> = {
  现代文学: { literary: 0.9, insight: 0.5, melancholy: 0.35, calm: 0.35 },
  诗歌散文: { literary: 1, premium: 0.5, calm: 0.6, minimal: 0.35 },
  心理成长: { insight: 0.9, calm: 0.55, warmth: 0.4, valence: 0.2 },
  治愈生活: { warmth: 1, calm: 0.8, joy: 0.5, minimal: 0.3 },
  艺术音乐: { literary: 0.85, warmth: 0.6, melancholy: 0.35, premium: 0.35 },
  影视娱乐: { literary: 0.6, warmth: 0.5, playful: 0.3 },
  人文哲思: { insight: 1, literary: 0.8, calm: 0.7, premium: 0.45 },
  商业职场: { insight: 0.5, energy: 0.4, playful: 0.2 },
  科幻幻想: { literary: 0.5, energy: 0.5, insight: 0.5 },
  青春校园: { joy: 0.6, warmth: 0.5, playful: 0.5, energy: 0.45 },
  旅行自然: { calm: 0.7, literary: 0.6, warmth: 0.5, minimal: 0.3 },
  古典诗词: { literary: 1, premium: 0.7, calm: 0.8, melancholy: 0.3 },
  亲密关系: { warmth: 0.9, melancholy: 0.4, valence: 0.2 },
  幽默轻阅读: { playful: 1, energy: 0.75, calm: -0.2, premium: -0.6 },
}

type BookRule = { category: keyof typeof BOOK_CATEGORY_VECTORS; groups?: string[]; tags?: string[]; families?: string[] }
const BOOK_CATEGORY_RULES: BookRule[] = [
  { category: '艺术音乐', groups: ['lyrics'], tags: ['音乐', '歌词', '影视台词', '动漫台词'] },
  { category: '现代文学', groups: ['books'], tags: ['书摘', '文艺', '诗意'] },
  { category: '人文哲思', groups: ['quotes', 'zen', 'latin'], tags: ['哲学', '通透', '禅意', '名人名言'] },
  { category: '古典诗词', groups: ['poem-free', 'poem-40', 'poem-senior', 'poem-solo', 'poem-gentle', 'poem-drive', 'poem-self', 'poem-short'], tags: ['古诗词', '文言'] },
  { category: '心理成长', groups: ['motivate', 'poem-drive', 'independent'], tags: ['成长', '上进', '希望', '独立', '自我'] },
  { category: '治愈生活', groups: ['gentle', 'daily', 'plain', 'pet', 'solar-term'], tags: ['治愈', '温柔', '日常', '松弛', '宠物'] },
  { category: '旅行自然', groups: ['scenery', 'astro'], tags: ['旅行', '山水', '自然', '星空', '时节'] },
  { category: '亲密关系', groups: ['couple', 'movie-cn'], tags: ['爱情', '浪漫', '深情', '友情'] },
  { category: '幽默轻阅读', groups: ['funny', 'worker', 'mbti', 'game'], tags: ['幽默', '网感', '网络梗', '工作'] },
  { category: '影视娱乐', groups: ['movie-foreign', 'anime-foreign', 'anime-cn'], tags: ['影视台词', '动漫台词'] },
]

const TAG_VECTORS: Record<string, Partial<SemanticVector>> = {
  高级感: { premium: 1, calm: 0.65, minimal: 0.55, energy: -0.55, playful: -0.65 },
  清冷: { premium: 0.7, calm: 0.8, warmth: -0.25, energy: -0.35 },
  疏离: { premium: 0.65, calm: 0.65, warmth: -0.35 },
  文艺: { literary: 0.85, premium: 0.3, calm: 0.35 },
  诗意: { literary: 0.9, calm: 0.5, premium: 0.3, minimal: 0.2 },
  书摘: { literary: 0.8, insight: 0.5, calm: 0.35 },
  古诗词: { literary: 1, premium: 0.55, calm: 0.7, melancholy: 0.25 },
  哲学: { insight: 1, literary: 0.65, calm: 0.55, premium: 0.35 },
  通透: { insight: 0.85, calm: 0.7, premium: 0.25 },
  释然: { insight: 0.7, calm: 0.85, melancholy: 0.15 },
  禅意: { insight: 0.8, calm: 0.9, minimal: 0.45, premium: 0.3 },
  成长: { insight: 0.75, valence: 0.25, literary: 0.4, energy: 0.2 },
  上进: { energy: 0.65, valence: 0.4, arousal: 0.35 },
  希望: { valence: 0.55, joy: 0.45, warmth: 0.35 },
  热血: { energy: 1, arousal: 0.9, valence: 0.35, premium: -0.4 },
  打卡: { energy: 0.45, playful: 0.25, premium: -0.45 },
  幽默: { playful: 1, energy: 0.6, premium: -0.55 },
  网感: { playful: 0.85, energy: 0.5, premium: -0.45 },
  网络梗: { playful: 1, energy: 0.65, premium: -0.6 },
  温柔: { warmth: 1, calm: 0.7, joy: 0.35 },
  治愈: { warmth: 0.9, calm: 0.75, joy: 0.45, valence: 0.35 },
  松弛: { calm: 0.8, minimal: 0.45, energy: -0.3 },
  淡然: { calm: 0.9, minimal: 0.6, premium: 0.25 },
  接纳: { calm: 0.75, warmth: 0.45, insight: 0.35 },
  浪漫: { warmth: 0.75, literary: 0.5, melancholy: 0.25, joy: 0.35 },
  怀旧: { melancholy: 0.75, warmth: 0.45, literary: 0.5 },
  深情: { warmth: 0.85, melancholy: 0.55, literary: 0.45 },
  自由: { energy: 0.6, literary: 0.45, warmth: 0.3, insight: 0.3 },
  旅行: { calm: 0.55, literary: 0.5, warmth: 0.35, energy: 0.3 },
  山水: { calm: 0.7, literary: 0.65, premium: 0.25 },
  自然: { calm: 0.65, literary: 0.5, warmth: 0.35 },
  工作: { insight: 0.35, playful: 0.35, energy: 0.2, premium: -0.2 },
  独立: { insight: 0.55, premium: 0.35, calm: 0.35, energy: 0.2 },
  自我: { insight: 0.55, calm: 0.3, premium: 0.2 },
  清醒: { insight: 0.7, calm: 0.5, premium: 0.35 },
  冷门: { premium: 0.45, minimal: 0.25, melancholy: 0.15 },
  纯文字: { minimal: 0.8, premium: 0.35, calm: 0.4 },
  Emoji: { playful: 0.75, premium: -0.45, minimal: -0.2 },
  花体字: { playful: 0.45, premium: -0.25, minimal: -0.15 },
}

const EMOTION_BIT_VECTORS: Partial<SemanticVector>[] = [
  { joy: 0.9, warmth: 0.55, calm: 0.2, valence: 0.35 },
  { warmth: 0.8, insight: 0.3, valence: 0.45, premium: 0.15 },
  { arousal: 0.9, energy: 0.85, valence: -0.5, premium: -0.3 },
  { melancholy: 0.9, literary: 0.55, calm: 0.3, valence: -0.45 },
  { arousal: 0.7, valence: -0.45, calm: -0.15 },
  { valence: -0.65, energy: 0.15, calm: -0.2 },
  { arousal: 0.75, energy: 0.45, playful: 0.55 },
]

/** 用情感词汇本体的倾向、强度、情绪类别扫描任意文字，生成稠密向量。 */
export function sentimentVectorOf(text: string): SemanticVector {
  const out = zeroVector()
  const chars = Array.from(text)
  let hits = 0
  let valenceSum = 0
  let arousalSum = 0
  let emotionMask = 0
  for (let i = 0; i < chars.length; i++) {
    const max = Math.min(SENTIMENT_MAX_LENGTH, chars.length - i)
    for (let len = max; len >= 1; len--) {
      const word = chars.slice(i, i + len).join('')
      const score = SENTIMENT_SCORES[word]
      if (!score) continue
      const [valence, arousal, mask] = score
      const weight = len === 1 ? 0.35 : 1
      valenceSum += valence * weight
      arousalSum += arousal * weight
      emotionMask |= mask
      hits += weight
      i += len - 1
      break
    }
  }
  if (hits) {
    out.valence = clamp(valenceSum / Math.sqrt(hits))
    out.arousal = clamp(arousalSum / hits)
    for (let bit = 0; bit < EMOTION_BIT_VECTORS.length; bit++) {
      if (emotionMask & (1 << bit)) addScaled(out, EMOTION_BIT_VECTORS[bit], 0.55)
    }
  }
  return clampVector(out)
}

function applyTagVectors(target: SemanticVector, tokens: string[], weight = 0.75) {
  for (const token of tokens) {
    const vector = TAG_VECTORS[token]
    if (vector) addScaled(target, vector, weight)
  }
}

function applyBookCategoryVectors(target: SemanticVector, input: VectorInput) {
  for (const rule of BOOK_CATEGORY_RULES) {
    const hit =
      (rule.groups?.includes(input.groupId) || false) ||
      (rule.families?.some((f) => input.family.includes(f)) || false) ||
      (rule.tags?.some((t) => input.tags.includes(t)) || false)
    if (hit) addScaled(target, BOOK_CATEGORY_VECTORS[rule.category], 0.65)
  }
}

export function buildEntryVector(input: VectorInput): SemanticVector {
  const blob = [
    input.text,
    input.note || '',
    input.groupName,
    input.family,
    Array.isArray(input.persona) ? input.persona.join('、') : input.persona,
    input.tags.join('、'),
    input.decor.join('、'),
    input.lang.join('、'),
  ].join(' ')
  const out = sentimentVectorOf(blob)
  applyTagVectors(out, [...input.tags, ...input.decor], 0.85)
  applyBookCategoryVectors(out, input)
  const length = plainLength(input.text)
  if (length <= 6) addScaled(out, { minimal: 0.55, calm: 0.2, premium: 0.15 }, 0.7)
  if (length >= 22) addScaled(out, { literary: 0.45, insight: 0.25 }, 0.55)
  if (input.decor.includes('Emoji') || input.decor.includes('颜文字')) {
    addScaled(out, { playful: 0.75, premium: -0.45 }, 0.7)
  }
  return clampVector(out)
}

export function vectorFromTags(tags: string[]): SemanticVector {
  const out = zeroVector()
  applyTagVectors(out, tags, 1)
  for (const tag of tags) {
    const concept = conceptProfileFor(tag)
    if (concept) addScaled(out, concept.profile.vector, 0.8)
  }
  for (const rule of BOOK_CATEGORY_RULES) {
    if (rule.tags?.some((t) => tags.includes(t))) addScaled(out, BOOK_CATEGORY_VECTORS[rule.category], 0.45)
  }
  return clampVector(out)
}

export const CONCEPT_PROFILES: Record<ConceptKey, ConceptProfile> = {
  music: {
    title: '音乐歌词',
    terms: ['音乐', '歌曲', '听歌', '旋律', '歌词', '音符', '耳机', '节奏', '专辑', '演唱会', '钢琴', '吉他', '乐队', '主唱', '唱片', '哼唱'],
    vector: vec({ literary: 0.85, warmth: 0.6, melancholy: 0.45, calm: 0.35, premium: 0.25, valence: 0.1 }),
    preferGroups: ['lyrics'],
    preferFamilies: ['补充类目 · 文本'],
    preferTags: ['歌词', '音乐', '怀旧', '浪漫', '文艺', '影视台词', '动漫台词'],
    avoidGroups: ['funny', 'game', 'worker', 'mbti'],
    avoidTags: ['网络梗', '网感', '打卡'],
    literalWeak: true,
  },
  growth: {
    title: '成长感悟',
    terms: ['成长', '长大', '成熟', '蜕变', '改变', '成为', '醒悟', '自洽', '复盘', '向前', '进步', '毕业', '离职', '新阶段', '慢慢变好', '走过', '经历', '变得', '更好', '人生阶段'],
    vector: vec({ insight: 0.95, calm: 0.6, literary: 0.7, warmth: 0.4, valence: 0.25, energy: 0.15, premium: 0.3 }),
    preferGroups: ['books', 'quotes', 'poem-free', 'poem-drive', 'zen', 'independent', 'motivate', 'poem-self', 'plain', 'daily', 'anime-foreign', 'movie-foreign'],
    preferFamilies: ['真实 UGC · 人设', '古诗词 · 心境', '经典文本', '补充类目 · 文本', '影视动漫'],
    preferTags: ['成长', '上进', '希望', '通透', '释然', '哲学', '书摘', '感悟', '独立', '自我', '清醒', '岁月', '名人名言', '文艺'],
    avoidGroups: ['funny', 'game', 'mbti', 'worker'],
    avoidTags: ['网络梗', '热血', '打卡', '幽默'],
    literalWeak: true,
  },
  premium: {
    title: '克制高级',
    terms: ['高级感', '克制', '留白', '清冷', '疏离', '极简', '体面', '低饱和', '质感', '安静', '冷门', '不喧哗'],
    vector: vec({ premium: 1, calm: 0.85, minimal: 0.75, literary: 0.6, energy: -0.6, playful: -0.7, arousal: -0.4, warmth: -0.1 }),
    preferGroups: ['cool', 'poem-solo', 'poem-short', 'english-min', 'german', 'latin', 'japanese', 'french', 'decor-fancy'],
    preferFamilies: ['真实 UGC · 人设', '古诗词 · 心境', '外文与装饰', '补充类目 · 小语种'],
    preferTags: ['高级感', '清冷', '疏离', '纯文字', '冷门', '文艺', '哲学', '释然', '极简', '诗意'],
    avoidGroups: ['funny', 'game', 'bold', 'motivate', 'anime-cn', 'worker', 'mbti'],
    avoidTags: ['幽默', '网感', '网络梗', '热血', '打卡', '萌宠'],
    literalWeak: true,
  },
  healing: {
    title: '温柔治愈',
    terms: ['治愈', '温柔', '被接住', '松弛', '安心', '暖', '陪伴', '慢慢来', '柔软', '晚安'],
    vector: vec({ warmth: 1, calm: 0.8, joy: 0.55, valence: 0.5, literary: 0.4, minimal: 0.3, energy: -0.3 }),
    preferGroups: ['gentle', 'poem-gentle', 'daily', 'plain', 'pet', 'solar-term', 'japanese', 'french', 'anime-foreign'],
    preferFamilies: ['真实 UGC · 人设', '古诗词 · 心境', '补充类目 · 时效', '补充类目 · 兴趣'],
    preferTags: ['温柔', '治愈', '日常', '松弛', '接纳', '诗意', '时节', '宠物', '浪漫'],
    avoidGroups: ['funny', 'game', 'bold'],
    avoidTags: ['热血', '网络梗', '打卡'],
    literalWeak: true,
  },
  freedom: {
    title: '自由旷野',
    terms: ['自由', '旷野', '远方', '旅行', '出发', '山海', '风', '走路', '流浪', '辽阔'],
    vector: vec({ energy: 0.6, literary: 0.6, calm: 0.4, warmth: 0.4, premium: 0.25, insight: 0.35, valence: 0.35 }),
    preferGroups: ['bold', 'scenery', 'poem-free', 'movie-foreign', 'astro', 'solar-term'],
    preferFamilies: ['真实 UGC · 人设', '古诗词 · 心境', '影视动漫', '人群与场景', '补充类目 · 兴趣'],
    preferTags: ['自由', '旅行', '山水', '自然', '诗意', '希望', '释然', '星空', '时节'],
    avoidGroups: ['worker', 'mbti', 'funny'],
    avoidTags: ['打卡', '网感', '班味'],
    literalWeak: true,
  },
  work: {
    title: '职场日常',
    terms: ['工作', '上班', '下班', '打工', '班味', '加班', '开会', '老板', '同事', '通勤', '项目', '周一', '离职', '摸鱼'],
    vector: vec({ playful: 0.5, calm: 0.35, insight: 0.45, warmth: 0.25, valence: -0.05, energy: 0.2, premium: -0.2 }),
    preferGroups: ['worker', 'daily', 'plain', 'quotes', 'independent'],
    preferFamilies: ['真实 UGC · 人设', '经典文本', '补充类目 · 身份'],
    preferTags: ['工作', '松弛', '幽默', '日常', '清醒', '自我', '通透'],
    avoidGroups: ['poem-senior', 'senior', 'game'],
    avoidTags: ['高级感', '古诗词', '银发'],
    literalWeak: true,
  },
  love: {
    title: '深情关系',
    terms: ['爱情', '喜欢', '想念', '恋人', '伴侣', '拥抱', '陪你', '偏爱', '失恋', '心动', '暗恋', '相思'],
    vector: vec({ warmth: 0.9, melancholy: 0.5, literary: 0.6, valence: 0.25, calm: 0.3, joy: 0.4 }),
    preferGroups: ['couple', 'movie-cn', 'movie-foreign', 'poem-gentle', 'poetic', 'lyrics', 'french'],
    preferFamilies: ['真实 UGC · 人设', '古诗词 · 心境', '影视动漫', '补充类目 · 文本', '补充类目 · 结构'],
    preferTags: ['爱情', '浪漫', '深情', '怀旧', '岁月', '温柔', '友情', '双语'],
    avoidGroups: ['funny', 'game', 'mbti', 'worker'],
    avoidTags: ['网络梗', '打卡'],
    literalWeak: true,
  },
  philosophy: {
    title: '哲思留白',
    terms: ['哲学', '人生', '意义', '存在', '时间', '死亡', '命运', '禅', '悟', '无常', '宇宙', '世界', '天地', '边界', '自我'],
    vector: vec({ insight: 1, literary: 0.85, calm: 0.7, premium: 0.45, melancholy: 0.25, minimal: 0.4 }),
    preferGroups: ['quotes', 'zen', 'books', 'poem-free', 'poem-40', 'poem-senior', 'latin', 'astro'],
    preferFamilies: ['经典文本', '补充类目 · 文本', '古诗词 · 心境', '外文与装饰', '补充类目 · 兴趣'],
    preferTags: ['哲学', '通透', '释然', '名人名言', '书摘', '禅意', '岁月', '文艺', '星空'],
    avoidGroups: ['funny', 'game', 'worker', 'mbti', 'pet'],
    avoidTags: ['网络梗', '网感', '打卡', '萌宠'],
    literalWeak: true,
  },
  humor: {
    title: '幽默网感',
    terms: ['幽默', '搞笑', '梗', '抽象', '好笑', '沙雕', '摸鱼', '打工人', '乐子', '吐槽'],
    vector: vec({ playful: 1, energy: 0.7, warmth: 0.35, calm: -0.2, premium: -0.6, literary: -0.1 }),
    preferGroups: ['funny', 'worker', 'mbti', 'game', 'daily'],
    preferFamilies: ['真实 UGC · 人设', '补充类目 · 身份', '补充类目 · 兴趣'],
    preferTags: ['幽默', '网感', '网络梗', '松弛', '工作', '自我', '玄学', 'UGC'],
    avoidGroups: ['poem-senior', 'senior', 'quotes', 'latin', 'german'],
    avoidTags: ['高级感', '沉稳', '附出处', '哲学'],
    literalWeak: true,
  },
}

export function conceptProfileFor(label: string): { key: ConceptKey; profile: ConceptProfile } | null {
  const clean = label.trim()
  if (!clean) return null
  for (const key of Object.keys(CONCEPT_PROFILES) as ConceptKey[]) {
    const profile = CONCEPT_PROFILES[key]
    if (profile.terms.some((term) => clean.includes(term) || term.includes(clean))) return { key, profile }
  }
  return null
}

export function conceptVectorFor(label: string): SemanticVector | null {
  return conceptProfileFor(label)?.profile.vector || null
}

/** 概念命中优先看类目语义与向量，不因为正文恰好出现同名词就判定匹配。 */
export function conceptScore(entry: VectorInput, label: string): number {
  const found = conceptProfileFor(label)
  if (!found) return 0
  const { profile } = found
  let score = 0
  if (profile.preferGroups.includes(entry.groupId)) score += 3.4
  if (profile.preferFamilies.some((f) => entry.family.includes(f))) score += 1.15
  score += profile.preferTags.filter((t) => entry.tags.includes(t)).length * 0.72
  score += cosine(entry.vector || buildEntryVector(entry), profile.vector) * 2.8
  score -= profile.avoidTags.filter((t) => entry.tags.includes(t)).length * 1.25
  if (profile.avoidGroups.includes(entry.groupId)) score -= 2.4
  if (profile.literalWeak && entry.text.includes(label)) score += 0.08
  return score
}

export function queryVectorFrom(text: string, labels: string[], tags: string[]): SemanticVector {
  const parts: { vector: SemanticVector; weight: number }[] = [
    { vector: sentimentVectorOf(text), weight: 1.1 },
    { vector: vectorFromTags(tags), weight: 1.15 },
  ]
  for (const label of labels) {
    const conceptVector = conceptVectorFor(label)
    if (conceptVector) parts.push({ vector: conceptVector, weight: 1.35 })
    else parts.push({ vector: sentimentVectorOf(label), weight: 0.3 })
  }
  return blendVectors(parts)
}

export function plainLength(text: string) {
  const plain = text
    .replace(/[\p{Extended_Pictographic}\u2600-\u27bf\u{1d400}-\u{1d7ff}\u24b6-\u24e9]/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
  return Array.from(plain).length
}

const EXCITED_RE = /[!！]|[?？]{2,}|冲啊|加油|必胜|燃|热血|打鸡血|干就完了|我命由我|不服|绝不|一定要|狠狠|啊啊|哈哈哈|冲冲|爆|杀|赢麻了/u

/** 高级感下的隐性硬过滤：过短、短促激昂、强网感的句子不进入候选。 */
export function hasPremiumConflict(entry: VectorInput): boolean {
  const length = plainLength(entry.text)
  if (length < 5) return true
  if (length <= 12 && EXCITED_RE.test(entry.text)) return true
  const noisy = ['幽默', '网感', '网络梗', '热血', '打卡'].some((t) => entry.tags.includes(t))
  if (noisy && length <= 14) return true
  if (entry.decor.includes('Emoji') && length <= 9) return true
  return false
}

export function premiumPenalty(entry: VectorInput): number {
  if (!EXCITED_RE.test(entry.text)) return 0
  return plainLength(entry.text) <= 16 ? -4.5 : -1.8
}
