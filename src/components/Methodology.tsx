import { ArrowRight, BookOpen, Check, Compass, Cpu, Database, Lightbulb, Lock, Network, Sparkles } from 'lucide-react'
import { GAP_ANALYSIS, OLLAMA_STEPS, PIPELINE, QUESTIONS } from '../data/taxonomy'
import { useApp } from '../state'

export function Methodology() {
  const { index } = useApp()
  const familyMap = index.entries.reduce<Record<string, Set<string>>>((acc, e) => {
    acc[e.family] = (acc[e.family] || new Set<string>()).add(e.groupName)
    return acc
  }, {})

  const questionRows = [
    ...QUESTIONS.map((q) => ({ no: q.no, title: q.title, dim: q.type === 'single' ? '单选' : '多选', required: q.required ? '建议' : '选答' })),
    { no: '10', title: '一句话说出想表达的方向', dim: '自由输入', required: '核心' },
  ]

  return (
    <div className="space-y-6 fade-in">
      <section className="surface-card rounded-2xl p-6 md:p-8">
        <div className="flex items-baseline gap-3">
          <span className="section-label">Method</span>
          <h2 className="font-display text-[24px]" style={{ color: 'var(--ink)' }}>方案说明</h2>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {['9 组引导 + 1 句方向', '关键词可编辑', '浏览器内学习', '本地语义规划', '8 句风格分化'].map((t) => (
            <span key={t} className="text-[11px] rounded-full px-3 py-1.5 flex items-center gap-1" style={{ background: 'var(--paper-3)', color: 'var(--ink-soft)' }}>
              <Check className="size-3" /> {t}
            </span>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <Compass className="size-4" />
          <h3 className="font-display text-[19px]">一、链路</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {PIPELINE.map((step) => (
            <div key={step.no} className="rounded-xl p-4" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2">
                <span className="font-latin text-xl">{step.no}</span>
                <ArrowRight className="size-3" style={{ color: 'var(--ink-faint)' }} />
                <h4 className="font-display text-[15px]">{step.title}</h4>
              </div>
              <p className="text-[11.5px] leading-relaxed mt-2" style={{ color: 'var(--ink-soft)' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="size-4" />
          <h3 className="font-display text-[19px]">二、问什么</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[12px] min-w-[520px]">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)', color: 'var(--ink-faint)' }}>
                <th className="py-2.5 pr-3 font-medium w-12">#</th>
                <th className="py-2.5 pr-3 font-medium">问题</th>
                <th className="py-2.5 pr-3 font-medium w-24">形式</th>
                <th className="py-2.5 font-medium w-16">必答</th>
              </tr>
            </thead>
            <tbody>
              {questionRows.map((row) => (
                <tr key={row.no} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td className="py-2.5 pr-3 font-latin">{row.no}</td>
                  <td className="py-2.5 pr-3">{row.title}</td>
                  <td className="py-2.5 pr-3" style={{ color: 'var(--ink-soft)' }}>{row.dim}</td>
                  <td className="py-2.5" style={{ color: 'var(--ink-faint)' }}>{row.required}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <Database className="size-4" />
          <h3 className="font-display text-[19px]">三、关键词与语料</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { icon: BookOpen, title: '词典映射', body: '把「内耗」→ 边界感 / 自我，「四十岁」→ 中年 / 通透，把口语翻成语料标签。' },
            { icon: Network, title: '完整词 + 风格', body: '只提取完整的名词 / 形容词，再由标签共现定位关键词风格；稀有标签权重更高。' },
            { icon: Cpu, title: '本地学习', body: '倒排索引、标签 ↔ 类目共现、句式抽取，全部在浏览器内完成。' },
          ].map((c) => (
            <div key={c.title} className="rounded-xl p-4" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
              <c.icon className="size-4" />
              <h4 className="font-display text-[15px] mt-2">{c.title}</h4>
              <p className="text-[11.5px] leading-relaxed mt-1.5" style={{ color: 'var(--ink-soft)' }}>{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <Cpu className="size-4" />
          <h3 className="font-display text-[19px]">四、规划与生成</h3>
        </div>
        <div className="grid gap-3 md:grid-cols-3 mb-5">
          {[
            { no: 'L1', title: '语料层', body: `${index.stats.entries.toLocaleString()} 条，统一字段：正文 / 出处 / 类目 / 画像 / 情绪 / 主题 / 语言 / 装饰 / 长度 / 年龄 / 热度。` },
            { no: 'L2', title: '索引层', body: '倒排索引、IDF、类目共现、句式抽取。离线可用，不依赖模型。' },
            { no: 'L3', title: '生成层', body: '公开版默认在浏览器内完成语义规划；每条结果占一个风格槽，侧重不同关键词，正文仍来自本地语料检索与句式重组。' },
          ].map((l) => (
            <div key={l.no} className="rounded-xl p-4" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
              <span className="font-latin text-xl">{l.no}</span>
              <h4 className="font-display text-[15px] mt-1">{l.title}</h4>
              <p className="text-[11.5px] leading-relaxed mt-1.5" style={{ color: 'var(--ink-soft)' }}>{l.body}</p>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          {OLLAMA_STEPS.map((s, i) => (
            <div key={s.label} className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <span className="text-[10px] w-16 shrink-0" style={{ color: 'var(--ink-faint)' }}>{String(i + 1).padStart(2, '0')} {s.label}</span>
              <code className="code-line flex-1">{s.code}</code>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="size-4" />
          <h3 className="font-display text-[19px]">五、语料归类</h3>
        </div>
        <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          一言开源语句库的全部句子按内容重新分进下方原有类目，不作为独立来源池。分类依据：上游类别、出处、题材关键词、情绪词典与句子形态；超长句保留在索引里但排序靠后。
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(familyMap).map(([family, names]) => (
            <div key={family} className="rounded-xl p-4" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between">
                <p className="text-[12px] font-medium">{family}</p>
                <span className="font-latin text-[15px]">{names.size}</span>
              </div>
              <p className="text-[10.5px] leading-relaxed mt-1.5" style={{ color: 'var(--ink-faint)' }}>{Array.from(names).join(' · ')}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-2xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="size-4" />
          <h3 className="font-display text-[19px]">六、还缺什么</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {GAP_ANALYSIS.map((gap) => (
            <span key={gap.name} className="chip !text-[11px]" title={gap.reason}>
              {gap.name}
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-2xl p-6 flex items-start gap-3" style={{ background: 'var(--paper-3)' }}>
        <Lock className="size-4 shrink-0 mt-0.5" />
        <p className="text-[11.5px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>
          输入与收藏只存在浏览器；语料包由本站静态提供。一言库采用 AGPL-3.0，打包 / 分发需遵循其授权规定，详见
          <a href="https://github.com/hitokoto-osc/sentences-bundle" target="_blank" rel="noreferrer" className="mx-1 underline cursor-pointer">上游仓库</a>
          与项目 README。
        </p>
      </section>
    </div>
  )
}
