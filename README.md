# 一句签名 · 微信个性签名灵感实验室

先答 9 组问题找思路（只作引导）→ 写下一句自己的方向（决定语意）→ 提炼关键词 → 逐条分配不同风格与关键词侧重，从结构化语料中检索 / 重组生成签名。全过程在浏览器内完成，可选由混元做语义思考、由本机 Ollama 写新句。界面以莫奈日落画作为页面背景（奶油色遮罩保证正文与卡片可读），中文优先使用霞鹜臻楷 GB、拉丁字母与数字使用 Outfit，整体保持黑白奶油的手绘线稿卡片风格。

## 运行

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物在 dist/
```

## 目录

- `src/data/corpus.ts`：41 个原本类目、444 条结构化语料（正文 / 释义 / 出处 / 画像 / 标签）
- `src/data/taxonomy.ts`：9 组问卷、情绪词典、标签维度、缺口分析、方法论文案
- `src/lib/engine.ts`：倒排索引 + IDF + 共现学习、关键词提炼、检索打分、句式重组、提示词构造
- `src/lib/ollama.ts`：本机 `http://localhost:11434` 的连接、生成与解析
- `src/lib/hunyuan.ts`：混元思考层，输出语义关键词与逐条风格规划；失败自动降级为本地规划
- `vite.config.ts`：`/api/hunyuan/*` 本地代理，API Key 只留在服务端
- `src/lib/hitokoto.ts`：加载静态语料包，按本站类目 id 把句子并入 `GROUPS`
- `scripts/sync-hitokoto.mjs`：全量同步上游句子、按内容重新归类并生成 `public/data/hitokoto.json`
- `src/components/Doodles.tsx`：黑白手绘线稿 SVG
- `src/assets/bg-painting.jpg`：页面背景画作（公有领域），替换该文件即可换图
- `src/index.css`：霞鹜臻楷 GB + Outfit 字体栈、画作背景与遮罩、奶油 / 黑白单色设计变量
- `src/components/`：生成器 / 语料 / 说明 / 本地 AI 四个页面

## 一言开源语句库（全量学习，归入原本类目）

数据来源：[hitokoto-osc/sentences-bundle](https://github.com/hitokoto-osc/sentences-bundle)。
`categories.json` 只是分类清单，真正的句子在 `sentences/{a..l}.json`，字段为 `hitokoto / from / from_who / type`。

```bash
node scripts/sync-hitokoto.mjs   # 重新拉取并生成 public/data/hitokoto.json
```

上游 11,287 条 → 学习 10,303 条，按内容归入本站 **34 个原本类目**（原本共 41 个类目）。

- **过滤**：格式异常 5 条、明显不适合做签名 144 条、与站内重复 835 条；仅排除格式 / 内容异常和涉及政治人物、机构、公共事件的出处，**不按字数截断**，超长句 2,400 条保留，但在生成时降权排序。
- **归类**：诗词（`i`）按主题与句式分到 `poem-*`；动画 / 游戏 / 文学 / 影视按出处分到 `anime-*` / `game` / `books` / `movie-*`；UGC 用主题词典 + 情绪词典打分，无命中时按句长与稳定 hash 分流，避免堆积到单一类目。
- **合并**：产物结构为 `[本站类目 id, 句子, 出处]`，运行时由 `mergeIntoGroups()` 追加到对应 `CorpusGroup.lines`，条目继承该组原有的标签、大类、画像与语言。
- 因此页面里**没有独立的「一言库」来源、开关或筛选**，语料图鉴与生成器看到的始终是原本的类目体系。
- 语料包约 1.1 MB，作为 `public/` 静态资源懒加载（`fetch` + `cache: 'no-cache'`），不进主 JS bundle；加载失败时自动回退到站内 444 条语料。

> **许可说明**：上游采用 **AGPL-3.0**。其 README 指出，除官方提供的超链接/API 调用方式外，打包、分发、修改、扩充等使用方式需遵循 AGPL 相关规定（通常需要开源你的修改作品）；
> 上游句子著作权并非完全由一言网持有，原作者可要求移除。本项目已在页面与此处署名并保留来源链接，若用于对外分发或商业场景，请先自行确认合规方案，或改用官方 API 实时调用。

## 生成逻辑

- **第一栏「关于你」**：9 组结构化问题只用于引导思路，不落盘、不预填，每次进入页面都重新填写；未填完会显示「还差 N 题」，填完会提示，答题结果自动补充进关键词，并作为筛选词参与最终句子打分。
- **第二栏「想说什么？」**：用户自由输入决定最终语义。语义理解**只提取完整的名词 / 形容词**（语义词表最长匹配 + 「最喜欢的是 X」句式优先），例如「我在这个世界」→ 世界、「天地啊我最喜欢的是食物」→ 食物；不再做 `n-gram` 切词，因此不会出现「一阵」「别太」这类碎片。形式 / 避雷 / 开发期标签（如「补充类目」）不会出现在关键词里。
- **九题象限与边界**：`buildCorpus()` 在启动时按 9 组问题的每个选项，把全部语料切成 `问题:选项 → 句子下标` 的象限倒排索引（`CorpusIndex.quadrants`），**只在检索内部使用，不呈现在前端**。同一题多选在题内取并集；题与题之间按「命中多数已答题象限」划定边界（默认 `⌈已答题 × 0.6⌉`），命中题数越多越优先；边界过窄或覆盖风格不足 6 种时自动降低命中阈值，只有边界内风格用尽才取边界外句子补齐 8 种风格。
- **两阶段检索**：先用关键词搜索句子正文 / 标签（正文命中权重更高），再由 `styleOfKeyword()` 把关键词映射成风格大类——标签 ↔ 类目共现 → 含该词的句子分布 → 词典映射标签——按这个风格从对应大类中逐槽取句。
- **混元思考**：只做语义理解与风格规划，**不写签名正文**；提示词同样限定关键词只能是完整名词 / 形容词。未配置密钥时自动使用本地规划，功能不受影响。
- **风格槽**：每条结果占一个槽位，强制来自不同类目 / 大类，各自侧重 2–3 个不同关键词，并对相似句降权；总数恒等于所选条数（默认 8 句）。
- **短句限制**：5 字以下的句子在选句时降权，一批结果里最多保留 1 条；原创重组与本地 AI 追加的句子同样受最终兜底过滤，小众度 / 原创度不再提供可调滑块。

## 界面与素材

- **背景**：`src/assets/bg-painting.jpg` 由 Vite 打包，`body` 使用 `background-size: cover` 铺满并适当拓宽，叠加 `linear-gradient(var(--bg-veil), …)` 半透明遮罩（浅色 84%、深色 88%）；`.paper-surface` 容器透明，`.surface-card` 等模块保持不透明底色，因此文字与卡片不会被背景干扰。移动端改用 `scroll` 避免 iOS Safari 的 `fixed` 背景问题。替换素材只需覆盖该图片文件。
- **中文**：[霞鹜臻楷 / LXGW ZhenKai](https://github.com/lxgw/LxgwZhenKai)（SIL OFL 1.1），通过 ZSFT FontsAPI `https://fontsapi.zeoseven.com/2/main/result.css` 按汉字分片加载，字体族名 `LXGW ZhenKai GB`；`Noto Sans SC` 仅作为缺字兜底，`Outfit` 负责拉丁字母与数字。离线使用可自行下载 TTF 放到 `public/fonts/` 并改写 `@font-face`。

## 可选：接入混元思考

混元使用 OpenAI 兼容的 `/v1/chat/completions` 接口。密钥不会进入前端资源，只在 Vite 本地代理里读取：

```bash
# app/.env.local
HUNYUAN_API_KEY=你的密钥
HUNYUAN_MODEL=hunyuan-turbo           # 可选
HUNYUAN_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1  # 可选
```

也可以在「模型」页填入密钥（只存 `sessionStorage`，关闭标签页即失效）。`npm run dev` 与 `npm run preview` 都提供 `/api/hunyuan/status`、`/api/hunyuan/think`；纯静态部署没有该代理时，前端会自动降级为本地风格规划。

## 可选：接入本地模型

```bash
brew install ollama
ollama pull qwen2.5:7b
OLLAMA_ORIGINS="*" ollama serve
```

然后在页面「本地 AI」中填入 `http://localhost:11434` 并测试连接。不连接也能完整使用默认能力。

---

## 模板说明（React + TypeScript + Vite）

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
