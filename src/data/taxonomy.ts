// 标签维度、问卷、方法论内容：全部为纯前端配置，不依赖任何服务端

export type Dimension =
  | 'mood'
  | 'theme'
  | 'lang'
  | 'genre'
  | 'decor'
  | 'age'
  | 'vibe'
  | 'scene'
  | 'free'

export const DIMENSIONS: Record<Dimension, { label: string; hint: string; tone: string }> = {
  mood: { label: '情绪基调', hint: '这句话读起来是什么温度', tone: 'tone-rose' },
  theme: { label: '主题意象', hint: '句子在讲什么', tone: 'tone-sage' },
  lang: { label: '语言', hint: '中 / 英 / 文言 / 小语种', tone: 'tone-blue' },
  genre: { label: '题材来源', hint: 'UGC、诗词、台词、歌词…', tone: 'tone-amber' },
  decor: { label: '排版装饰', hint: '花体、边框、Emoji', tone: 'tone-violet' },
  age: { label: '人生阶段', hint: '适配的用户画像', tone: 'tone-sage' },
  vibe: { label: '语感', hint: '活人感 / 高级感 / 网感', tone: 'tone-rose' },
  scene: { label: '使用场景', hint: '为什么换签名', tone: 'tone-blue' },
  free: { label: '你的原话', hint: '从自由输入里保留下来的词', tone: 'tone-amber' },
}

export type QuestionOption = {
  id: string
  label: string
  desc?: string
  tags: string[]
}

export type Question = {
  id: string
  no: string
  title: string
  hint: string
  type: 'single' | 'multi'
  max?: number
  dimension: Dimension
  required?: boolean
  options: QuestionOption[]
}

export const QUESTIONS: Question[] = [
  {
    id: 'scene',
    no: '01',
    title: '这次换签名，是因为什么？',
    hint: '场景决定签名的「保质期」和分寸感',
    type: 'single',
    dimension: 'scene',
    required: true,
    options: [
      { id: 'forever', label: '长期不换', desc: '挑一句经得起看三年的', tags: ['长期不换', '释然', '通透'] },
      { id: 'job', label: '换了工作 / 新开始', desc: '想让人看到状态更新', tags: ['换工作', '上进', '自我'] },
      { id: 'restart', label: '想翻篇重启', desc: '不提旧事，只往前走', tags: ['重启', '释然', '边界感'] },
      { id: 'festival', label: '生日 / 新年 / 换季', desc: '带一点时令感', tags: ['生日新年', '时节', '希望'] },
      { id: 'exam', label: '备考 / 冲刺期', desc: '给自己一句暗示', tags: ['备考', '上进', '打卡'] },
      { id: 'retire', label: '退休 / 人生下半场', desc: '慢下来，安康就好', tags: ['退休', '银发', '知足'] },
      { id: 'casual', label: '没理由，想换就换', desc: '轻松一点就行', tags: ['随手换', '日常', '松弛'] },
    ],
  },
  {
    id: 'mood',
    no: '02',
    title: '你希望别人读出你什么气质？',
    hint: '最多选 3 个，选太多会互相打架',
    type: 'multi',
    max: 3,
    dimension: 'mood',
    required: true,
    options: [
      { id: 'clear', label: '清醒独立', tags: ['清醒', '独立', '自我', '边界感'] },
      { id: 'gentle', label: '温柔治愈', tags: ['温柔', '治愈', '浪漫'] },
      { id: 'cold', label: '清冷淡然', tags: ['清冷', '疏离', '独处'] },
      { id: 'bold', label: '酷飒自由', tags: ['飒爽', '自由', '热血'] },
      { id: 'funny', label: '幽默抽象', tags: ['幽默', '网感', '松弛'] },
      { id: 'plain', label: '淡人佛系', tags: ['淡然', '松弛', '接纳'] },
      { id: 'drive', label: '上进有劲', tags: ['上进', '成长', '希望'] },
      { id: 'wise', label: '通透释然', tags: ['释然', '通透', '岁月'] },
      { id: 'poetic', label: '文艺诗意', tags: ['诗意', '文艺', '自然'] },
      { id: 'premium', label: '高级距离感', tags: ['高级感', '疏离', '冷门'] },
    ],
  },
  {
    id: 'age',
    no: '03',
    title: '你现在处在哪个阶段？',
    hint: '同一句「随缘」，25 岁和 55 岁读起来完全不同',
    type: 'single',
    dimension: 'age',
    options: [
      { id: 'student', label: '学生党', tags: ['学生', '成长', '热血'] },
      { id: '20s', label: '20+', tags: ['20+', '自我'] },
      { id: '30s', label: '30+', tags: ['30+', '工作'] },
      { id: '40s', label: '40+', tags: ['40+', '中年', '通透'] },
      { id: '50s', label: '50+', tags: ['50+', '银发', '健康'] },
    ],
  },
  {
    id: 'lang',
    no: '04',
    title: '想用什么语言？',
    hint: '可多选；外语会附中文释义，避免「不懂意思」的尴尬',
    type: 'multi',
    dimension: 'lang',
    options: [
      { id: 'zh', label: '纯中文', tags: ['中文'] },
      { id: 'bilingual', label: '中英双语', tags: ['中英', '英文', '双语'] },
      { id: 'en', label: '英文极简', tags: ['英文', '高级感'] },
      { id: 'classical', label: '文言 / 古诗词', tags: ['文言', '附出处'] },
      { id: 'de', label: '德语', tags: ['德语'] },
      { id: 'la', label: '拉丁语', tags: ['拉丁语'] },
      { id: 'ja', label: '日语', tags: ['日语'] },
      { id: 'fr', label: '法语', tags: ['法语'] },
    ],
  },
  {
    id: 'genre',
    no: '05',
    title: '想让这句话从哪来？',
    hint: '题材决定「有没有出处可聊」',
    type: 'multi',
    dimension: 'genre',
    options: [
      { id: 'ugc', label: '真实 UGC', desc: '小红书 / 朋友圈语感', tags: ['UGC', '活人感'] },
      { id: 'poem', label: '古诗词', tags: ['古诗词', '文言', '附出处'] },
      { id: 'quote', label: '名人名言', tags: ['名人名言', '附出处'] },
      { id: 'movie', label: '影视台词', tags: ['影视台词', '附出处'] },
      { id: 'anime', label: '动漫台词', tags: ['动漫台词', '附出处'] },
      { id: 'book', label: '文学书摘', tags: ['书摘', '附出处'] },
      { id: 'lyric', label: '歌词语录', tags: ['歌词', '音乐'] },
      { id: 'zen', label: '禅语 / 哲理', tags: ['禅语', '哲学'] },
      { id: 'scenery', label: '山水景点', tags: ['景点', '山水', '旅行'] },
      { id: 'meme', label: '网络玩梗', tags: ['网络梗', '网感'] },
    ],
  },
  {
    id: 'decor',
    no: '06',
    title: '排版要多少「装饰」？',
    hint: '装饰越多越挑微信字体渲染，建议先预览再复制',
    type: 'single',
    dimension: 'decor',
    options: [
      { id: 'plain', label: '纯文字', desc: '最耐看，不挑设备', tags: ['纯文字'] },
      { id: 'emoji', label: '轻 Emoji', desc: '前后各一个点缀', tags: ['Emoji', '轻装饰'] },
      { id: 'fancy', label: '花体 / Unicode', desc: '𝓢𝓸𝓯𝓽、ⓠⓤⓘⓔⓣ', tags: ['花体字', '双语'] },
      { id: 'frame', label: '边框符号', desc: '꧁༺ … ༻꧂', tags: ['边框'] },
      { id: 'source', label: '附出处', desc: '——苏轼《定风波》', tags: ['附出处'] },
    ],
  },
  {
    id: 'length',
    no: '07',
    title: '能接受多长？',
    hint: '微信签名折叠线很短，短句更稳',
    type: 'single',
    dimension: 'decor',
    options: [
      { id: 'tiny', label: '极短 ≤ 8 字', tags: ['纯文字', '冷门'] },
      { id: 'short', label: '短句 ≤ 15 字', tags: ['纯文字'] },
      { id: 'medium', label: '中句 ≤ 30 字', tags: ['双语'] },
      { id: 'any', label: '不限长度', tags: [] },
    ],
  },
  {
    id: 'vibe',
    no: '08',
    title: '要「活人感」还是「高级感」？',
    hint: '这决定了是保留口语，还是往克制的方向收',
    type: 'single',
    dimension: 'vibe',
    options: [
      { id: 'real', label: '活人感', desc: '像随手打的一句话', tags: ['活人感', '日常'] },
      { id: 'premium', label: '高级感', desc: '克制、留白、不解释', tags: ['高级感', '疏离'] },
      { id: 'meme', label: '网感玩梗', desc: '朋友看了会笑', tags: ['网感', '幽默'] },
      { id: 'steady', label: '沉稳厚重', desc: '有阅历的语气', tags: ['沉稳', '通透'] },
    ],
  },
  {
    id: 'avoid',
    no: '09',
    title: '有没有明确不想出现的？',
    hint: '避雷比偏好更能提高命中率',
    type: 'multi',
    dimension: 'theme',
    options: [
      { id: 'cliche', label: '别用烂大街的', tags: ['冷门'] },
      { id: 'love', label: '不提爱情', tags: ['不提爱情'] },
      { id: 'soup', label: '不要鸡汤', tags: ['不要鸡汤'] },
      { id: 'emoji', label: '不要表情', tags: ['不要Emoji'] },
      { id: 'en', label: '不要英文', tags: ['不要英文'] },
      { id: 'sad', label: '不要丧', tags: ['不要丧'] },
    ],
  },
]

export const DIRECTION_EXAMPLES = [
  '刚离职，想安静一阵子，不想解释，也别太丧',
  '四十岁了，孩子住校，想把自己过慢一点、过轻一点',
  '备考第二年，需要一句能每天早上看到的',
  '想去冰岛看极光，喜欢那种很远的、冷一点的东西',
  '退休了，每天遛狗、喝茶、拍花，平安就好',
  '不想再讨好谁了，但要温柔，不想显得锋利',
]

/** 词典：把用户口语映射到语料标签。key 是用户可能写的词，value 是命中标签 */
export const LEXICON: Record<string, { tags: string[]; dimension: Dimension }> = {
  世界: { tags: ['自然', '山水', '岁月'], dimension: 'theme' },
  天地: { tags: ['自然', '山水', '释然'], dimension: 'theme' },
  食物: { tags: ['日常', '治愈', '知足'], dimension: 'theme' },
  内耗: { tags: ['边界感', '自我', '淡然'], dimension: 'mood' },
  讨好: { tags: ['独立', '清醒', '边界感'], dimension: 'mood' },
  边界感: { tags: ['边界感', '独处'], dimension: 'theme' },
  不解释: { tags: ['疏离', '清冷', '独立'], dimension: 'mood' },
  安静: { tags: ['清冷', '独处', '淡然'], dimension: 'mood' },
  静: { tags: ['清冷', '禅意'], dimension: 'mood' },
  独处: { tags: ['独处', '疏离'], dimension: 'theme' },
  治愈: { tags: ['温柔', '治愈'], dimension: 'mood' },
  温柔: { tags: ['温柔', '治愈'], dimension: 'mood' },
  松弛: { tags: ['松弛', '淡然'], dimension: 'mood' },
  躺平: { tags: ['松弛', '幽默'], dimension: 'mood' },
  佛系: { tags: ['淡然', '知足', '禅意'], dimension: 'mood' },
  清醒: { tags: ['清醒', '独立'], dimension: 'mood' },
  独立: { tags: ['独立', '自我'], dimension: 'mood' },
  自由: { tags: ['自由', '飒爽'], dimension: 'mood' },
  飒: { tags: ['飒爽', '独立'], dimension: 'mood' },
  酷: { tags: ['飒爽', '高级感'], dimension: 'mood' },
  高级感: { tags: ['高级感', '疏离'], dimension: 'vibe' },
  小众: { tags: ['冷门'], dimension: 'vibe' },
  冷门: { tags: ['冷门'], dimension: 'vibe' },
  文艺: { tags: ['诗意', '文艺'], dimension: 'mood' },
  诗意: { tags: ['诗意', '自然'], dimension: 'mood' },
  浪漫: { tags: ['浪漫', '温柔'], dimension: 'mood' },
  emo: { tags: ['怀旧', '疏离'], dimension: 'mood' },
  丧: { tags: ['幽默', '松弛'], dimension: 'mood' },
  搞钱: { tags: ['工作', '上进'], dimension: 'theme' },
  打工人: { tags: ['工作', '幽默'], dimension: 'theme' },
  上班: { tags: ['工作', '幽默'], dimension: 'theme' },
  班味: { tags: ['工作', '松弛'], dimension: 'theme' },
  离职: { tags: ['换工作', '重启'], dimension: 'scene' },
  辞职: { tags: ['换工作', '重启'], dimension: 'scene' },
  失业: { tags: ['重启', '希望'], dimension: 'scene' },
  失恋: { tags: ['重启', '释然'], dimension: 'scene' },
  分手: { tags: ['重启', '释然'], dimension: 'scene' },
  翻篇: { tags: ['释然', '重启'], dimension: 'scene' },
  重启: { tags: ['重启', '希望'], dimension: 'scene' },
  新开始: { tags: ['换工作', '希望'], dimension: 'scene' },
  备考: { tags: ['备考', '上进', '打卡'], dimension: 'theme' },
  考研: { tags: ['备考', '上进'], dimension: 'theme' },
  冲刺: { tags: ['上进', '希望'], dimension: 'mood' },
  坚持: { tags: ['上进', '成长'], dimension: 'mood' },
  成长: { tags: ['成长', '希望'], dimension: 'theme' },
  四十: { tags: ['40+', '中年', '通透'], dimension: 'age' },
  40: { tags: ['40+', '中年'], dimension: 'age' },
  中年: { tags: ['中年', '通透', '岁月'], dimension: 'age' },
  退休: { tags: ['50+', '银发', '健康'], dimension: 'age' },
  银发: { tags: ['50+', '银发'], dimension: 'age' },
  养生: { tags: ['健康', '知足'], dimension: 'theme' },
  健康: { tags: ['健康', '知足'], dimension: 'theme' },
  平安: { tags: ['知足', '健康'], dimension: 'mood' },
  喝茶: { tags: ['日常', '禅意'], dimension: 'theme' },
  孩子: { tags: ['家庭', '岁月'], dimension: 'theme' },
  遛狗: { tags: ['宠物', '日常'], dimension: 'theme' },
  猫: { tags: ['宠物', '治愈'], dimension: 'theme' },
  旅行: { tags: ['旅行', '山水'], dimension: 'theme' },
  极光: { tags: ['星空', '自然', '旅行'], dimension: 'theme' },
  冰岛: { tags: ['旅行', '山水'], dimension: 'theme' },
  海: { tags: ['山水', '自然'], dimension: 'theme' },
  山: { tags: ['山水', '自然'], dimension: 'theme' },
  风景: { tags: ['山水', '旅行'], dimension: 'theme' },
  山水: { tags: ['山水', '古诗词'], dimension: 'genre' },
  星: { tags: ['星空', '浪漫'], dimension: 'theme' },
  宇宙: { tags: ['星空', '哲学'], dimension: 'theme' },
  春天: { tags: ['时节', '希望'], dimension: 'theme' },
  秋: { tags: ['时节', '怀旧'], dimension: 'theme' },
  节气: { tags: ['节气', '时节'], dimension: 'genre' },
  古诗: { tags: ['古诗词', '文言'], dimension: 'genre' },
  诗词: { tags: ['古诗词', '文言'], dimension: 'genre' },
  苏轼: { tags: ['古诗词', '释然'], dimension: 'genre' },
  名言: { tags: ['名人名言'], dimension: 'genre' },
  名人名言: { tags: ['名人名言'], dimension: 'genre' },
  电影: { tags: ['影视台词'], dimension: 'genre' },
  台词: { tags: ['影视台词', '动漫台词'], dimension: 'genre' },
  动漫: { tags: ['动漫台词'], dimension: 'genre' },
  二次元: { tags: ['动漫台词', '网络梗'], dimension: 'genre' },
  歌词: { tags: ['歌词', '音乐'], dimension: 'genre' },
  书: { tags: ['书摘'], dimension: 'genre' },
  禅: { tags: ['禅语', '哲学'], dimension: 'genre' },
  哲学: { tags: ['哲学', '名人名言'], dimension: 'theme' },
  英文: { tags: ['英文'], dimension: 'lang' },
  英语: { tags: ['英文'], dimension: 'lang' },
  双语: { tags: ['中英', '双语'], dimension: 'lang' },
  德语: { tags: ['德语'], dimension: 'lang' },
  拉丁: { tags: ['拉丁语'], dimension: 'lang' },
  拉丁语: { tags: ['拉丁语'], dimension: 'lang' },
  日语: { tags: ['日语'], dimension: 'lang' },
  法语: { tags: ['法语'], dimension: 'lang' },
  花体: { tags: ['花体字'], dimension: 'decor' },
  边框: { tags: ['边框'], dimension: 'decor' },
  emoji: { tags: ['Emoji'], dimension: 'decor' },
  表情: { tags: ['Emoji'], dimension: 'decor' },
  短: { tags: ['纯文字'], dimension: 'decor' },
  长期不换: { tags: ['长期不换', '释然'], dimension: 'scene' },
  不换: { tags: ['长期不换'], dimension: 'scene' },
  玩梗: { tags: ['网络梗', '网感'], dimension: 'genre' },
  幽默: { tags: ['幽默', '网感'], dimension: 'mood' },
  好笑: { tags: ['幽默'], dimension: 'mood' },
  MBTI: { tags: ['玄学', '自我'], dimension: 'genre' },
  星座: { tags: ['玄学'], dimension: 'genre' },
  情侣: { tags: ['爱情', '双语'], dimension: 'theme' },
  配对: { tags: ['爱情'], dimension: 'theme' },
  通透: { tags: ['通透', '释然'], dimension: 'mood' },
  释然: { tags: ['释然', '接纳'], dimension: 'mood' },
  接纳: { tags: ['接纳', '治愈'], dimension: 'mood' },
  遗憾: { tags: ['遗憾', '岁月'], dimension: 'theme' },
  岁月: { tags: ['岁月', '怀旧'], dimension: 'theme' },
  慢慢: { tags: ['松弛', '淡然'], dimension: 'mood' },
  慢: { tags: ['松弛', '日常'], dimension: 'mood' },
}

export const STOPWORDS = [
  '我想', '想要', '希望', '一个', '一句', '一点', '一些', '这种', '那种', '比较', '可以', '不要',
  '不是', '没有什么', '自己', '现在', '最近', '有点', '还是', '但是', '因为', '所以', '然后',
  '帮我', '给我', '适合', '喜欢', '感觉', '有点儿', '挺', '真的', '特别', '非常', '一下',
  '的', '了', '吧', '呢', '啊', '和', '与', '也', '就', '都', '还', '在', '有', '是', '不',
  '我', '你', '他', '她', '想', '要', '把', '被', '让', '给', '这', '那', '个', '们',
]

/**
 * 语义词表：只收录完整的名词 / 形容词。
 * 自由输入只从这里抽词，不再用 n-gram 切出「一阵」「别太」这类碎片。
 * 例：「我在这个世界」→ 世界；「天地啊我最喜欢的是食物」→ 食物（句式优先）。
 */
export const SEMANTIC_WORDS = [
  '世界', '天地', '宇宙', '银河', '星球', '星空', '极光', '冰岛', '海洋', '大海', '山河', '山水',
  '青山', '大漠', '江南', '西湖', '月亮', '月光', '阳光', '微雨', '雨天', '晚风', '微风', '风', '雪',
  '霜', '露', '花开', '落叶', '森林', '草原', '岛屿', '远方', '旷野', '清晨', '黄昏', '夜晚', '深夜',
  '春天', '夏天', '秋天', '冬天', '季节', '节气', '时光', '岁月', '流年', '光影', '影子', '尘埃',
  '烟火', '灯火', '光', '花', '云', '海', '山', '星', '雨',
  '食物', '咖啡', '茶', '酒', '米饭', '面包', '糖', '书', '书本', '文字', '句子', '签名', '诗',
  '诗歌', '音乐', '歌', '电影', '相机', '照片', '窗', '门', '房间', '屋子', '家', '城市', '街道',
  '路', '列车', '车站', '车票', '行李', '伞', '信', '日记', '日历', '工位', '办公室', '被窝',
  '猫', '狗', '毛孩子', '宠物', '鸟', '鱼', '蝴蝶',
  '自我', '人生', '生活', '日子', '童年', '少年', '青春', '中年', '老年', '年纪', '年龄', '学生',
  '朋友', '家人', '父母', '孩子', '爱人', '恋人', '陌生人', '人群', '打工人', '上班族', '老板',
  '队友', '读者', '过客',
  '温柔', '治愈', '安静', '清冷', '孤独', '独处', '疏离', '清醒', '独立', '自由', '热烈', '飒爽',
  '幽默', '松弛', '淡然', '释然', '通透', '平静', '平和', '从容', '坦然', '勇敢', '勇气', '坚定',
  '柔软', '锋利', '克制', '沉默', '热闹', '鲜活', '活人感', '高级感', '网感', '文艺', '诗意',
  '浪漫', '怀旧', '遗憾', '悲伤', '难过', '疲惫', '焦虑', '内耗', '压力', '希望', '梦想', '愿望',
  '心愿', '热爱', '欢喜', '快乐', '幸福', '知足', '满足', '安心', '安全感', '边界感', '分寸感',
  '距离', '边界', '态度', '分寸', '尊严', '骄傲', '倔强', '性格', '气质', '心情', '情绪', '温度',
  '力量', '答案', '意义', '价值', '命运', '无常', '因果', '禅意', '哲学',
  '今天', '明天', '昨天', '未来', '过去', '此刻', '当下', '永远', '长久', '瞬间', '片刻', '半生',
  '余生', '一生', '阶段', '变化', '成长', '坚持', '目标', '方向', '旅途', '旅行', '归途',
  '日常', '平淡', '寻常', '普通', '希望', '热爱', '勇气',
]

/** 语料缺口分析：在「方案说明」里展示 */
export const GAP_ANALYSIS = [
  {
    name: '歌词 / 现代文学书摘 / 禅语',
    reason: '你给的语料里「名人名言」和「古诗词」很完整，但缺 20 世纪以来的现代文本：木心、汪曾祺、史铁生、泰戈尔，以及歌词、心经 / 道德经。这类句子最适合 30–50 岁、想有出处但不掉书袋的人。',
    status: '已补充',
  },
  {
    name: '节气时令 / 季节限定',
    reason: '原语料偏「长期不换」，缺可随季节轮换的短句。签名的高频更换动机恰恰是换季、生日、新年，需要单独一个时效维度。',
    status: '已补充',
  },
  {
    name: '打工人 / 班味 / 职场自嘲',
    reason: '「搞笑抽象」讲的是泛情绪，不是具体身份。20–35 岁最大的身份标签是上班，缺一组能和朋友圈日常对得上的班味语料。',
    status: '已补充',
  },
  {
    name: '情侣成对签名 / 闺蜜配对',
    reason: '原语料全是单人句，缺「上句 + 下句」的成对结构。这是一类刚性需求，需要结构化字段而不是一整句话。',
    status: '已补充',
  },
  {
    name: 'MBTI / 星座 / 玄学轻梗',
    reason: '近三年 UGC 里增长最快的一支，介于玩梗与自我标识之间，原 10 类完全没有覆盖。',
    status: '已补充',
  },
  {
    name: '萌宠 / 宇宙天文 / 游戏电竞 / 日语法语',
    reason: '四个高辨识度兴趣圈层；其中日语、法语补齐了「德语 + 拉丁语」之外的小语种矩阵，宠物和星空补上温柔 / 浪漫的具体意象来源。',
    status: '已补充',
  },
  {
    name: '方言烟火 / 育儿亲子 / 深夜 emo',
    reason: '粤语、川渝、东北话签名有强地域身份感；宝妈宝爸、深夜情绪是两类稳定人群。这三类语料采集成本高、易踩刻板印象，建议二期由真实 UGC 导入。',
    status: '待二期',
  },
  {
    name: '姓氏嵌入 / 藏头 / 名字定制',
    reason: '不是「选一句」，而是「把我的名字写进去」，属于生成式能力而非检索式能力，需要模板 + 本地模型一起做。',
    status: '待二期',
  },
  {
    name: '时效性与「烂大街指数」',
    reason: '你自己的使用建议里已经提到「允许一切发生被用烂了」，但语料没有这个字段。我已给每条语料加了 popularity 维度，把「别用烂大街的」变成可计算的排序条件。',
    status: '维度补齐',
  },
  {
    name: '排版维度 / 长度维度 / 出处维度',
    reason: '你给的前 100 条其实是一整套「花体 + Emoji + 边框」排版体系，但后面 300 多条都没有继承。我把装饰、长度、是否附出处抽成独立标签，可跨类目叠加。',
    status: '维度补齐',
  },
  {
    name: '人设匹配度校验',
    reason: '现有语料只写了「适合谁」，没有反向校验。建议在结果页给一条「反差提醒」：社恐别选「像风一样自由」，避免人设翻车。',
    status: '已做进结果页',
  },
]

export const PIPELINE = [
  {
    no: '01',
    title: '问对问题',
    desc: '9 组结构化问题 + 1 句自由方向。结构化问题负责定边界，自由输入负责抓那些选项里没有的、真正私人的东西。',
    detail: '场景 → 保质期；气质 → 情绪标签；年龄 → 语气厚度；语言 / 题材 → 硬过滤；排版 / 长度 → 渲染约束；避雷 → 负向权重。',
  },
  {
    no: '02',
    title: '提炼关键词',
    desc: '只从自由输入里提取完整的名词 / 形容词：语义词表最长匹配 + 「最喜欢的是 X」句式优先；问卷答案只作边界，按 IDF 加权。',
    detail: '关键词全部可删可加——用户改一个词，后面整条链路都会跟着变。这是「学习后提供关键词」真正落地的地方。',
  },
  {
    no: '03',
    title: '本地语料学习',
    desc: '启动时把全部语料建成倒排索引，统计标签 IDF、标签 ↔ 类目共现、句长分布、装饰分布。整个过程在浏览器内完成，不上传任何数据。',
    detail: '「学习」不是玄学：它学到的是「哪些词常常和哪一类句子一起出现」，于是「四十岁 + 喝茶 + 慢」能自动偏向中年通透 / 禅意，而不是误判成励志打卡。',
  },
  {
    no: '04',
    title: '检索 + 重组生成',
    desc: '九题答案先划定检索边界 → 关键词搜索句子正文 / 标签 → 再由关键词风格定位大类逐槽取句；原创模式从语料里学短句结构重新拼装。',
    detail: '每条结果都给出「命中标签 / 来源类目 / 参考语料」，让推荐可解释，而不是黑箱吐一句话。',
  },
  {
    no: '05',
    title: '可选：本地大模型',
    desc: '把关键词 + 检索到的例句当作 few-shot 喂给本机 Ollama，生成真正全新的句子；未连接时自动回落到本地检索 / 重组引擎。',
    detail: '离线可用是默认能力，本地模型只是增强项——这样网页发给任何人都能直接跑起来。',
  },
]

export const OLLAMA_STEPS = [
  { label: '安装', code: 'brew install ollama   # 或到 ollama.com 下载 macOS 客户端' },
  { label: '拉模型', code: 'ollama pull qwen2.5:7b   # 中文语感好；也可 llama3.1:8b / gemma2:9b' },
  { label: '允许跨域', code: 'OLLAMA_ORIGINS="*" ollama serve   # 网页要直连本机必须开 CORS' },
  { label: '在页面里', code: '打开「本地 AI」→ 填入 http://localhost:11434 → 测试连接 → 生成' },
]
