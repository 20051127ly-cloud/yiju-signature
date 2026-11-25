import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, Check, Copy, Heart, Loader2, Plus, RefreshCw, RotateCcw, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { DIRECTION_EXAMPLES, DIMENSIONS, QUESTIONS } from '../data/taxonomy'
import { buildPrompt, deriveGuideKeywords, deriveKeywords, visibleLength } from '../lib/engine'
import { thinkWithHunyuan, type ThinkInput } from '../lib/hunyuan'
import { generateWithOllama, parseGenerated } from '../lib/ollama'
import { useApp } from '../state'
import { DoodleSearch } from './Doodles'

export function Generator() {
  const {
    index, profile, setProfile, keywords, setKeywords, extraKeywords, setExtraKeywords,
    result, regenerate, setThought, hunyuanKey, hunyuanStatus, hunyuanBusy, setHunyuanBusy,
    ollama, connection, setTab, favorites, toggleFavorite,
    aiItems, setAiItems, aiBusy, setAiBusy, notify,
  } = useApp()
  const [newKeyword, setNewKeyword] = useState('')

  const answered = QUESTIONS.filter((q) => (profile.answers[q.id] || []).length > 0).length
  const missing = QUESTIONS.length - answered
  const complete = missing === 0
  const answeredRef = useRef(answered)
  const mountedRef = useRef(false)

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      if (missing > 0) notify(`还差 ${missing} 题`)
    } else if (answeredRef.current < QUESTIONS.length && complete) {
      notify('9 题已填完')
    }
    answeredRef.current = answered
  })

  // 问卷答案自动补充进关键词，但始终排在用户输入之后
  useEffect(() => {
    const guide = deriveGuideKeywords(profile)
    setKeywords((prev) => {
      const manual = prev.filter((k) => k.source !== 'profile')
      const labels = new Set(manual.map((k) => k.label))
      const nextGuide = guide.filter((g) => !labels.has(g.label))
      const currentGuide = prev.filter((k) => k.source === 'profile')
      if (nextGuide.length === currentGuide.length && nextGuide.every((g, i) => g.label === currentGuide[i]?.label)) return prev
      return [...manual, ...nextGuide]
    })
  }, [profile, setKeywords])

  const choose = (questionId: string, optionId: string) => {
    setProfile((prev) => {
      const q = QUESTIONS.find((item) => item.id === questionId)!
      const current = prev.answers[questionId] || []
      let next: string[]
      if (q.type === 'single') {
        next = current[0] === optionId ? [] : [optionId]
      } else if (current.includes(optionId)) {
        next = current.filter((id) => id !== optionId)
      } else {
        next = q.max ? [...current.slice(-(q.max - 1)), optionId] : [...current, optionId]
      }
      return { ...prev, answers: { ...prev.answers, [questionId]: next } }
    })
  }

  const resetGuide = () => setProfile((prev) => ({ ...prev, answers: {} }))

  const thinkInput = (): ThinkInput => ({
    direction: profile.direction,
    answers: QUESTIONS.map((q) => ({
      title: q.title,
      picked: (profile.answers[q.id] || []).map((id) => q.options.find((o) => o.id === id)?.label || id),
    })),
    families: Array.from(new Set(index.entries.map((e) => e.family))),
    tags: Array.from(index.byTag.keys()),
    count: profile.count,
  })

  const refine = async () => {
    const local = deriveKeywords(index, profile, extraKeywords)
    setKeywords(local)
    notify(`${local.length} 个关键词`)
    if (!hunyuanStatus.configured) return
    setHunyuanBusy(true)
    try {
      const next = await thinkWithHunyuan(thinkInput(), hunyuanKey)
      setKeywords(deriveKeywords(index, profile, extraKeywords, next.keywords))
      setThought(next)
      notify('混元已完成思考')
    } catch (err) {
      setThought(null)
      notify(err instanceof Error ? err.message : '混元未接入，使用本地规划')
    } finally {
      setHunyuanBusy(false)
    }
  }

  const addKeyword = () => {
    const value = newKeyword.trim()
    if (!value) return
    setExtraKeywords((prev) => [...prev, value])
    setKeywords((prev) =>
      prev.some((k) => k.label === value)
        ? prev
        : [...prev, { label: value, dimension: 'free', weight: 1.9, source: 'free' }],
    )
    setNewKeyword('')
  }

  const removeKeyword = (label: string) => {
    setKeywords((prev) => prev.filter((k) => k.label !== label))
    setExtraKeywords((prev) => prev.filter((k) => k !== label))
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify('已复制')
    } catch {
      notify('复制失败')
    }
  }

  const handleGenerate = () => {
    if (!complete) notify(`还差 ${missing} 题，可直接生成`)
    regenerate()
    setAiItems([])
  }

  const handleReroll = () => regenerate(Date.now() + Math.floor(Math.random() * 100000))

  const handleAI = async () => {
    if (!connection?.ok) {
      setTab('ai')
      return
    }
    setAiBusy(true)
    try {
      const prompt = buildPrompt(keywords, profile, result?.items || [], profile.count)
      const raw = await generateWithOllama(ollama, prompt)
      const lines = parseGenerated(raw)
      if (!lines.length) throw new Error('返回为空')
      setAiItems(
        lines.map((text, i) => ({
          id: `ai-${Date.now()}-${i}`,
          text,
          groupName: ollama.model,
          family: '本地 AI',
          persona: '',
          match: 100,
          hitTags: keywords.slice(0, 3).map((k) => k.label),
          kind: 'original' as const,
          reason: '',
        })),
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : '调用失败')
    } finally {
      setAiBusy(false)
    }
  }

  // 最终结果兜底：5 字以下的句子最多保留 1 条（含本地 AI 追加的句子）
  const allItems = useMemo(() => {
    let shorts = 0
    return [...(result?.items || []), ...aiItems].filter((item) => {
      if (visibleLength(item.text) >= 5) return true
      shorts++
      return shorts <= 1
    })
  }, [result, aiItems])

  return (
    <div className="space-y-6">
      <section id="step-01" className="surface-card rounded-2xl p-6 md:p-8 fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="section-label">01</span>
            <h2 className="font-display text-[22px]" style={{ color: 'var(--ink)' }}>关于你</h2>
            <span className="text-[10px] rounded-full px-2.5 py-1" style={{ background: 'var(--paper-3)', color: 'var(--ink-soft)' }}>思路引导</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`chip !text-[11px] !py-1.5`} data-active={complete}>
              {complete ? <Check className="size-3.5" /> : null}
              {complete ? `${answered}/${QUESTIONS.length} 已完成` : `还差 ${missing} 题`}
            </span>
            <button type="button" className="chip !text-[11px] !py-1.5" onClick={resetGuide} aria-label="重填问卷">
              <RotateCcw className="size-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-3 h-1 rounded-full overflow-hidden" style={{ background: 'var(--paper-3)' }}>
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(answered / QUESTIONS.length) * 100}%`, background: 'var(--ink)' }} />
        </div>

        <div className="mt-5 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {QUESTIONS.map((q) => {
            const picked = profile.answers[q.id] || []
            return (
              <div key={q.id} className="py-3 border-b" style={{ borderColor: 'var(--line)' }}>
                <div className="flex items-start gap-2.5">
                  <span className="font-latin text-[15px] leading-none mt-0.5" style={{ color: 'var(--ink-faint)' }}>{q.no}</span>
                  <p className="text-[12.5px] font-medium leading-snug" style={{ color: 'var(--ink)' }}>{q.title}</p>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-1.5 pl-6">
                  {q.options.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className="chip !text-[11px] !py-1.5 !px-2.5"
                      data-active={picked.includes(opt.id)}
                      onClick={() => choose(q.id, opt.id)}
                      title={opt.desc}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section id="step-02" className="surface-card rounded-2xl p-6 md:p-8 fade-in">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span className="section-label">02</span>
            <h2 className="font-display text-[22px]" style={{ color: 'var(--ink)' }}>想说什么？</h2>
            <span className="text-[10px] rounded-full px-2.5 py-1" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>决定语意</span>
          </div>
          <span className="font-latin text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            {index.stats.entries.toLocaleString()} 条语料
          </span>
        </div>

        <Textarea
          aria-label="你想表达的签名方向"
          value={profile.direction}
          onChange={(e) => {
            setProfile((prev) => ({ ...prev, direction: e.target.value }))
            setThought(null)
          }}
          placeholder="刚离职，想安静一阵子，不想解释，也别太丧……"
          className="mt-5 min-h-[96px] resize-y rounded-xl border text-[14px] leading-7 px-4 py-3"
          style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {DIRECTION_EXAMPLES.slice(0, 4).map((example) => (
            <button
              key={example}
              type="button"
              className="chip !text-[11px] !py-1.5 !px-3"
              onClick={() => {
                setProfile((prev) => ({ ...prev, direction: example }))
                setThought(null)
              }}
            >
              {example.length > 16 ? `${example.slice(0, 16)}…` : example}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>
            {hunyuanStatus.configured ? `混元 · ${hunyuanStatus.model}` : '本地规划 · 语料生成'}
          </span>
          <button type="button" className="btn-pill" onClick={() => void refine()} disabled={hunyuanBusy}>
            {hunyuanBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            提炼 <ArrowRight className="size-4" />
          </button>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="surface-card rounded-2xl p-5 lg:col-span-4 fade-in self-start">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex items-baseline gap-3">
              <span className="section-label">03</span>
              <h3 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>关键词</h3>
            </div>
            <span className="font-latin text-[11px]" style={{ color: 'var(--ink-faint)' }}>{keywords.length}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 min-h-[44px]">
            {keywords.map((kw) => (
              <span key={kw.label} className={`chip-kw ${DIMENSIONS[kw.dimension].tone}`} title={kw.source === 'profile' ? '问卷补充' : DIMENSIONS[kw.dimension].label}>
                {kw.label}
                <button type="button" className="opacity-50 hover:opacity-100 cursor-pointer" onClick={() => removeKeyword(kw.label)} aria-label={`删除 ${kw.label}`}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
            {keywords.length === 0 && (
              <span className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>写一句方向，或先答上面的题</span>
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              aria-label="补充关键词"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addKeyword() }}
              placeholder="补一个词"
              className="h-9 text-[13px] rounded-lg"
              style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
            />
            <Button variant="outline" size="icon" className="shrink-0 rounded-lg" onClick={addKeyword} aria-label="添加关键词">
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5">
              {[4, 6, 8, 12].map((n) => (
                <button key={n} type="button" className="chip !text-[11px] !py-1 !px-3" data-active={profile.count === n} onClick={() => setProfile((p) => ({ ...p, count: n }))}>
                  {n}
                </button>
              ))}
            </div>
            <button type="button" className="btn-pill" onClick={handleGenerate}>生成 <ArrowRight className="size-4" /></button>
          </div>
        </aside>

        <section className="lg:col-span-8 fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-baseline gap-3">
              <span className="section-label">04</span>
              <h3 className="font-display text-[19px]" style={{ color: 'var(--ink)' }}>{result ? `${allItems.length} 句` : '结果'}</h3>
              {result && (
                <span className="text-[10px] rounded-full px-2.5 py-1" style={{ background: 'var(--paper-3)', color: 'var(--ink-soft)' }}>
                  {result.plan.source === 'hunyuan' ? '混元规划' : '本地规划'}
                </span>
              )}
            </div>
            {result && (
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-pill is-ghost !py-1.5 !px-3.5 !text-[11px]" onClick={handleReroll}><RefreshCw className="size-3.5" /> 换一批</button>
                <button type="button" className="btn-pill is-ghost !py-1.5 !px-3.5 !text-[11px]" onClick={() => copy(allItems.map((i) => i.text).join('\n'))}><Copy className="size-3.5" /> 复制全部</button>
                <button type="button" className="btn-pill is-ghost !py-1.5 !px-3.5 !text-[11px]" onClick={handleAI} disabled={aiBusy}>
                  {aiBusy ? <Loader2 className="size-3.5 animate-spin" /> : null} 本地 AI
                </button>
              </div>
            )}
          </div>

          {!result && (
            <div className="surface-card rounded-2xl p-10 text-center">
              <DoodleSearch className="w-28 h-28 mx-auto" />
              <p className="font-display text-[17px] mt-3" style={{ color: 'var(--ink)' }}>还没有结果</p>
              <button type="button" className="btn-pill mt-5" onClick={handleGenerate}>生成 <ArrowRight className="size-4" /></button>
            </div>
          )}

          {result && (
            <div className="grid gap-4 sm:grid-cols-2">
              {allItems.map((item, i) => {
                const isFav = favorites.includes(item.text)
                return (
                  <article key={item.id} className="surface-card rounded-xl p-5 flex flex-col gap-3 transition-colors duration-200 hover:border-[var(--ink)]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-latin text-lg leading-none" style={{ color: 'var(--ink-faint)' }}>{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: 'var(--paper-3)', color: 'var(--ink-soft)' }} title={item.groupName}>{item.family}</span>
                    </div>

                    <p className="result-quote text-[16px] flex-1" style={{ color: 'var(--ink)' }}>{item.text}</p>

                    {item.note && !item.text.includes(item.note) && (
                      <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{item.note}</p>
                    )}

                    <div className="quote-rule" />

                    <div className="flex flex-wrap items-center gap-1.5">
                      {item.hitTags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] rounded-full px-2 py-0.5" style={{ background: 'var(--paper-3)', color: 'var(--ink-soft)' }}>{tag}</span>
                      ))}
                      <span className="font-latin text-[10px] ml-auto" style={{ color: 'var(--ink-faint)' }}>{item.match}%</span>
                      <div className="flex items-center gap-0.5 ml-1">
                        <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => toggleFavorite(item.text)} aria-label="收藏">
                          <Heart className={`size-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="rounded-full" onClick={() => copy(item.text)} aria-label="复制">
                          <Copy className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
