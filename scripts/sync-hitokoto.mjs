/**
 * 同步 hitokoto-osc/sentences-bundle 全部句子，并按内容重新归入本站原本的类目。
 * 运行：node scripts/sync-hitokoto.mjs
 * 产物：public/data/hitokoto.json（静态资源，运行时懒加载）
 *
 * 上游仓库采用 AGPL-3.0，授权与署名说明见项目 README。
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = 'https://raw.githubusercontent.com/hitokoto-osc/sentences-bundle/master'
const OUT_DIR = path.join(ROOT, 'public', 'data')
const OUT_FILE = path.join(OUT_DIR, 'hitokoto.json')

/** 本站 src/data/corpus.ts 中的全部类目 id，作为归类目标 */
const GROUP_IDS = new Set([
  'independent', 'gentle', 'cool', 'bold', 'funny', 'poetic', 'plain', 'motivate', 'daily',
  'decor-fancy', 'english-min', 'german', 'latin', 'scenery', 'age40', 'senior',
  'books', 'zen', 'lyrics', 'solar-term', 'worker', 'couple', 'mbti', 'pet', 'astro',
  'japanese', 'french', 'game', 'quotes',
  'poem-free', 'poem-40', 'poem-senior', 'poem-solo', 'poem-gentle', 'poem-drive', 'poem-self', 'poem-short',
  'movie-foreign', 'movie-cn', 'anime-foreign', 'anime-cn',
])

const UNSUITABLE = [
  '色情', '约炮', '裸照', '自慰', '春药', '嫖', '毒品', '冰毒', '赌博', '代开发票',
]
// 上游 UGC 中少量出处涉及政治人物、政府机构与公共事件，不适合作为签名素材
const EXCLUDED_MARKERS = [
  '毛主席', '毛泽东', '周恩来', '邓小平', '孙中山', '蒋介石', '马克思', '恩格斯', '列宁', '斯大林',
  '共产党', '国民党', '共青团', '国务院', '政治局', '人大', '政协', '主席', '总统', '首相', '国会',
  '选举', '政权', '革命', '战争', '抗战', '文革',
]
const BAD_FORMAT = /(https?:\/\/|www\.|<[a-z/]|[\r\n\t\u0000-\u001f])/i
const norm = (s) => s.replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase()

const CN_ANIME = ['喜羊羊', '熊出没', '哪吒', '斗破', '一人之下', '狐妖', '罗小黑', '大圣', '白蛇', '全职高手', '秦时', '斗罗', '少年歌行', '时光代理人', '魔道', '天官']
const CN_MOVIE = ['大话西游', '喜剧之王', '霸王别姬', '让子弹飞', '无间道', '花样年华', '活着', '少林足球', '后会无期', '东邪西毒', '阿飞正传', '夏洛特', '一代宗师', '我不是药神', '芳华', '卧虎藏龙']

function classifyPoem(t) {
  const has = (...w) => w.some((x) => t.includes(x))
  if (t.length <= 10) return 'poem-short'
  if (has('四十', '半生', '江湖夜雨', '雪泥', '功名', '少年自负', '天凉好个秋')) return 'poem-40'
  if (has('白发', '桑榆', '老身', '休将', '岁暮', '年年岁岁')) return 'poem-senior'
  if (has('长风', '破浪', '凌云', '大鹏', '求索', '坚劲', '青云', '勉励', '莫等闲', '会当凌绝顶')) return 'poem-drive'
  if (has('本心', '宁作我', '用舍由时', '不称意', '我本楚狂', '自歌自舞', '何须浅碧', '青山爱我', '枝头抱香')) return 'poem-self'
  if (has('明月', '空山', '独钓', '孤舟', '沙洲', '野渡', '幽人', '松子', '桂花', '寂寞', '沙鸥', '疏桐')) return 'poem-solo'
  if (has('春水', '梨花', '蔷薇', '枯荷', '清欢', '新火', '桃花', '画船', '东风', '微醺', '晚来天欲雪')) return 'poem-gentle'
  return 'poem-free'
}

const TOPIC_RULES = [
  ['worker', ['上班', '加班', '工位', '老板', '工资', '会议', '通勤', '下班', '摸鱼', '打工', '辞职', '离职', '绩效', '周报', '班味']],
  ['game', ['存档', '血量', '队友', 'buff', '攻略', '开荒', '满级', '主线', '支线', '副本', '闪避', '加载条']],
  ['mbti', ['INFP', 'ENFP', 'INTJ', 'INFJ', 'MBTI', 'i 人', 'e 人', '星座', '上升星座', '水象', '土象', '风象']],
  ['pet', ['猫', '狗', '喵', '汪', '毛孩子', '宠物', '铲屎']],
  ['astro', ['宇宙', '银河', '星球', '光年', '星尘', '猎户', '引力', '星际', '天体', '地球']],
  ['solar-term', ['立春', '春分', '立夏', '夏至', '立秋', '秋分', '立冬', '冬至', '清明', '白露', '霜降', '大寒', '节气', '芒种']],
  ['zen', ['禅', '佛', '放下', '无常', '自在', '一念', '菩提', '因果', '修行', '无我']],
  ['age40', ['四十', '中年', '半生', '人到中年', '岁月不饶']],
  ['senior', ['退休', '安康', '养生', '平安是福', '老去', '白发', '健康']],
  ['scenery', ['旅行', '山河', '大漠', '西湖', '黄山', '桂林', '江南', '青山', '落霞', '远阔']],
  ['couple', ['在一起', '陪你', '等你', '牵手', '我们俩', '余生', '相守']],
]

const MOOD_RULES = [
  ['funny', ['哈哈', '233', '离谱', '一坨', '咸鱼', '肥宅', '吐槽', '秃', '穷', '单身', '挂科', '作业', '减肥', '社恐', '窝囊', '薯片', '猴子', '好笑', '脱了', '泡汤', '吃苦', '摆烂', '发疯', '笑死', '懒', '胖', '睡不', '考试']],
  ['independent', ['不讨好', '不将就', '不解释', '不被定义', '边界', '讨好', '自证', '依附', '清醒', '自己便是', '我的日子', '不困于', '做自己', '无所谓', '不必', '不属于']],
  ['bold', ['去野', '热烈', '疯', '置顶', '航道', '带刺', '刷新自己', '逆风', '征服', '傲', '不驯', '飒', '狂', '自由', '打破', '不服']],
  ['motivate', ['努力', '坚持', '梦想', '奋斗', '前进', '不放弃', '加油', '曙光', '向上', '热爱', '别回头', '前方', '未来', '希望', '勇气', '成长']],
  ['gentle', ['温柔', '治愈', '暖', '阳光', '晚安', '幸福', '可爱', '拥抱', '喜欢', '甜', '晴', '彩虹', '糖', '花开', '笑', '心愿', '陪伴']],
  ['cool', ['安静', '沉默', '孤独', '独处', '疏离', '空', '静', '不争', '无关', '冷', '雪', '无人', '远', '风', '月']],
  ['poetic', ['诗', '海', '云', '雨', '月光', '岁月', '人间', '飞', '梦', '玫瑰', '萤火', '拾星', '花', '叶', '秋', '光']],
  ['plain', ['慢慢', '没什么', '日子', '今天', '吃饭', '天气', '散步', '普通', '简单', '明天见', '也很好', '淡淡']],
  ['daily', ['早上', '中午', '晚上', '回家', '一杯', '路上', '刚好', '就这样']],
]

function classifyUgc(t) {
  for (const [group, words] of TOPIC_RULES) {
    if (words.some((w) => t.includes(w))) return group
  }
  let best = null
  let bestScore = 0
  for (const [group, words] of MOOD_RULES) {
    let score = 0
    for (const w of words) if (t.includes(w)) score += w.length >= 3 ? 2 : 1
    if (score > bestScore) { bestScore = score; best = group }
  }
  if (best) return best
  // 无关键词命中时，按句子形态与稳定哈希分流，避免全部堆进同一个类目
  if (t.length <= 10) return 'plain'
  let hash = 0
  for (const ch of t) hash = (hash * 31 + ch.codePointAt(0)) >>> 0
  if (/[，,]/.test(t) && t.length >= 16) {
    const longBuckets = ['poetic', 'cool', 'gentle', 'independent', 'plain', 'motivate', 'daily', 'bold']
    return longBuckets[hash % longBuckets.length]
  }
  const buckets = ['gentle', 'cool', 'independent', 'bold', 'poetic', 'daily', 'motivate', 'plain']
  return buckets[hash % buckets.length]
}

function classify(catKey, text, from, who) {
  const source = `${from} ${who}`
  const srcHas = (...w) => w.some((x) => source.includes(x))
  if (!/[\u4e00-\u9fa5]/.test(text) && /[A-Za-z]/.test(text)) return 'english-min'

  switch (catKey) {
    case 'a':
    case 'b':
      return srcHas(...CN_ANIME) ? 'anime-cn' : 'anime-foreign'
    case 'c':
      return 'game'
    case 'd':
      return 'books'
    case 'h':
      return srcHas(...CN_MOVIE) ? 'movie-cn' : (/[A-Za-z]/.test(source) ? 'movie-foreign' : 'movie-cn')
    case 'i':
      return classifyPoem(text)
    case 'j':
      return 'lyrics'
    case 'k':
      return /禅|佛|放下|无常|菩提|因果/.test(text) ? 'zen' : 'quotes'
    case 'l':
      return 'funny'
    default:
      return classifyUgc(text)
  }
}

async function getJSON(file) {
  const res = await fetch(`${BASE}/${file}`, { signal: AbortSignal.timeout(60000) })
  if (!res.ok) throw new Error(`${file} -> HTTP ${res.status}`)
  return res.json()
}

const categories = await getJSON('categories.json')

// 与站内已有语料去重；src/data/corpus.ts 全程只读，分类只写 public/data/hitokoto.json
const CORPUS_FILE = path.join(ROOT, 'src', 'data', 'corpus.ts')
const corpusSource = await readFile(CORPUS_FILE, 'utf8')
const existing = new Set()
for (const match of corpusSource.matchAll(/^\s*'([^']{2,})',?\s*$/gm)) {
  existing.add(norm(match[1].split('@@')[0]))
}

const items = []
const byGroup = {}
const seen = new Set(existing)
const stats = { upstreamTotal: 0, badFormat: 0, unsuitable: 0, duplicate: 0, longSentence: 0 }
const upstreamCounts = []

for (const cat of categories) {
  const list = await getJSON(cat.path.replace(/^\.\//, ''))
  let count = 0
  for (const item of list) {
    stats.upstreamTotal += 1
    const text = String(item.hitokoto || '').trim()
    if (!text || BAD_FORMAT.test(text)) { stats.badFormat += 1; continue }
    if (UNSUITABLE.some((w) => text.includes(w))) { stats.unsuitable += 1; continue }

    const from = String(item.from || '').trim()
    const who = String(item.from_who || '').trim()
    if (EXCLUDED_MARKERS.some((w) => `${text}${from}${who}`.includes(w))) { stats.unsuitable += 1; continue }

    const key = norm(text)
    if (seen.has(key)) { stats.duplicate += 1; continue }
    seen.add(key)

    const note = [from, who && who !== from ? who : ''].filter(Boolean).join(' · ').slice(0, 40)
    let groupId = classify(cat.key, text, from, who)
    if (!GROUP_IDS.has(groupId)) groupId = 'daily'
    if (text.length > 30) stats.longSentence += 1

    // 底线：groupId 是唯一分类结果；text / note 去除首尾空白后原样写入，不替换、不翻译、不拼接正文。
    items.push([groupId, text, note])
    byGroup[groupId] = (byGroup[groupId] || 0) + 1
    count += 1
  }
  upstreamCounts.push({ key: cat.key, name: cat.name, count })
}

// 写产物前再次校验：分类流程没有改写语料库源文件
const corpusAfter = await readFile(CORPUS_FILE, 'utf8')
if (corpusAfter !== corpusSource) {
  throw new Error('分类流程不得改写 src/data/corpus.ts')
}

await mkdir(OUT_DIR, { recursive: true })
const bundle = {
  meta: {
    source: 'https://github.com/hitokoto-osc/sentences-bundle',
    license: 'AGPL-3.0',
    generatedAt: new Date().toISOString().slice(0, 10),
    upstreamTotal: stats.upstreamTotal,
    included: items.length,
    filtered: {
      badFormat: stats.badFormat,
      unsuitable: stats.unsuitable,
      duplicate: stats.duplicate,
    },
    longSentence: stats.longSentence,
    byGroup,
    upstreamCategories: upstreamCounts,
  },
  // [本站类目 id, 句子正文, 出处/作者]：加载时直接并入原本的 CorpusGroup
  items,
}
await writeFile(OUT_FILE, JSON.stringify(bundle))
console.log(`上游 ${stats.upstreamTotal} 条 -> 全部学习 ${items.length} 条，已归入 ${Object.keys(byGroup).length} 个原有类目`)
console.log('过滤', JSON.stringify({ badFormat: stats.badFormat, unsuitable: stats.unsuitable, duplicate: stats.duplicate }), '超长句保留', stats.longSentence)
console.log('归类分布', JSON.stringify(Object.entries(byGroup).sort((a, b) => b[1] - a[1])))
