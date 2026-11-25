import { useMemo, useState } from 'react'
import { ArrowRight, Check, CircleAlert, Copy, KeyRound, Loader2, PlugZap, Sparkles, Terminal, Wand2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { OLLAMA_STEPS, QUESTIONS } from '../data/taxonomy'
import { buildPrompt } from '../lib/engine'
import { thinkWithHunyuan, type HunyuanThought, type ThinkInput } from '../lib/hunyuan'
import { generateWithOllama, parseGenerated, testConnection } from '../lib/ollama'
import { useApp } from '../state'

export function LocalAI() {
  const {
    index, ollama, setOllama, connection, setConnection, keywords, profile, result,
    setTab, notify, aiBusy, setAiBusy,
    thought, setThought, hunyuanKey, setHunyuanKey, hunyuanStatus, refreshHunyuanStatus,
    hunyuanBusy, setHunyuanBusy,
  } = useApp()
  const production = import.meta.env.PROD
  const [preview, setPreview] = useState<string[]>([])
  const [keyDraft, setKeyDraft] = useState(production ? '' : hunyuanKey)
  const [planPreview, setPlanPreview] = useState<HunyuanThought | null>(thought)
  const prompt = useMemo(
    () => buildPrompt(keywords, profile, result?.items || [], profile.count),
    [keywords, profile, result],
  )

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

  const runThink = async () => {
    setHunyuanBusy(true)
    try {
      const next = await thinkWithHunyuan(thinkInput(), production ? '' : hunyuanKey)
      setThought(next)
      setPlanPreview(next)
      notify('混元已完成思考')
    } catch (err) {
      notify(err instanceof Error ? err.message : '混元调用失败')
    } finally {
      setHunyuanBusy(false)
      refreshHunyuanStatus()
    }
  }

  const test = async () => {
    setAiBusy(true)
    const state = await testConnection(ollama)
    setConnection(state)
    if (state.ok && state.models.length && !state.models.includes(ollama.model)) {
      setOllama((prev) => ({ ...prev, model: state.models[0], enabled: true }))
    }
    notify(state.ok ? state.message : '连接失败')
    setAiBusy(false)
  }

  const runPreview = async () => {
    if (!connection?.ok) { notify('先连接'); return }
    setAiBusy(true)
    try {
      const raw = await generateWithOllama(ollama, prompt)
      const lines = parseGenerated(raw)
      setPreview(lines.length ? lines : [raw.slice(0, 200)])
    } catch (err) {
      notify(err instanceof Error ? err.message : '调用失败')
    } finally {
      setAiBusy(false)
    }
  }

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); notify('已复制') } catch { notify('复制失败') }
  }

  return (
    <div className="space-y-6 fade-in">
      <section className="surface-card rounded-2xl p-6 md:p-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <span className="section-label">Model</span>
          <h2 className="font-display text-[24px]">模型</h2>
        </div>
        <button type="button" className="btn-pill is-ghost !py-1.5 !px-4 !text-[11px]" onClick={() => setTab('generator')}>
          返回 <ArrowRight className="size-3.5" />
        </button>
      </section>

      <section className="surface-card rounded-2xl p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4" />
            <h3 className="font-display text-[18px]">语义规划</h3>
          </div>
          <span className="chip !text-[11px] !py-1.5" data-active={hunyuanStatus.configured}>
            {hunyuanStatus.configured ? <Check className="size-3.5" /> : <Sparkles className="size-3.5" />}
            {hunyuanStatus.configured ? hunyuanStatus.model : '本地规划'}
          </span>
        </div>

        {production ? (
          <div className="mt-5 rounded-xl p-4" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <p className="text-[12px]" style={{ color: 'var(--ink)' }}>公开版默认使用本地语义规划</p>
            <p className="text-[11px] leading-relaxed mt-2" style={{ color: 'var(--ink-soft)' }}>
              关键词、九题边界、风格槽与句子筛选都在浏览器里完成；生成、语料图鉴和收藏不依赖任何 API Key。
            </p>
          </div>
        ) : (
          <>
            <div className="mt-5 flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <KeyRound className="size-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
                <Input
                  type="password"
                  aria-label="混元 API Key"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { setHunyuanKey(keyDraft); notify('密钥已保存') } }}
                  placeholder="HUNYUAN_API_KEY"
                  className="pl-9 h-10 rounded-xl text-[13px]"
                  style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
                />
              </div>
              <button type="button" className="btn-pill is-ghost !py-2 !px-4 !text-[11px]" onClick={() => { setHunyuanKey(keyDraft); notify('密钥已保存') }}>
                保存
              </button>
              <button type="button" className="btn-pill" onClick={() => void runThink()} disabled={hunyuanBusy}>
                {hunyuanBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} 思考
              </button>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed" style={{ color: 'var(--ink-faint)' }}>
              可选：本地开发可在 .env.local 配置，或在上方临时填入密钥（仅存 sessionStorage）；公开静态版不需要。
            </p>
          </>
        )}

        {!production && planPreview && (
          <div className="mt-5 rounded-xl p-4" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <p className="text-[12px]" style={{ color: 'var(--ink-soft)' }}>{planPreview.summary || '风格规划'}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {planPreview.slots.map((slot, i) => (
                <span key={`${slot.family}-${i}`} className="chip !text-[10px] !py-1" title={slot.focus.join(' / ')}>
                  {String(i + 1).padStart(2, '0')} {slot.family}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="surface-card rounded-2xl p-6 lg:col-span-5">
          <h3 className="font-display text-[18px] mb-5">连接</h3>

          <label className="block text-[12px] mb-1.5" htmlFor="ollama-url">服务地址</label>
          <Input
            id="ollama-url"
            value={ollama.baseUrl}
            onChange={(e) => setOllama((p) => ({ ...p, baseUrl: e.target.value }))}
            placeholder="http://localhost:11434"
            className="h-10 rounded-xl text-[13px]"
            style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          />

          <label className="block text-[12px] mt-5 mb-1.5" htmlFor="ollama-model">模型</label>
          <Input
            id="ollama-model"
            value={ollama.model}
            onChange={(e) => setOllama((p) => ({ ...p, model: e.target.value }))}
            placeholder="qwen2.5:7b"
            className="h-10 rounded-xl text-[13px]"
            style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
          />
          {connection?.models.length ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {connection.models.slice(0, 6).map((m) => (
                <button key={m} type="button" className="chip !text-[10px] !py-1" data-active={ollama.model === m} onClick={() => setOllama((p) => ({ ...p, model: m }))}>
                  {m}
                </button>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            <div className="flex items-center justify-between text-[12px] mb-2">
              <span style={{ color: 'var(--ink-soft)' }}>发散度</span>
              <span className="font-latin text-[15px]">{ollama.temperature.toFixed(2)}</span>
            </div>
            <Slider
              value={[Math.round(ollama.temperature * 100)]}
              max={150}
              step={5}
              onValueChange={([v]) => setOllama((p) => ({ ...p, temperature: v / 100 }))}
            />
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl p-3" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
            <p className="text-[12px]">启用</p>
            <Switch checked={ollama.enabled} onCheckedChange={(v) => setOllama((p) => ({ ...p, enabled: v }))} />
          </div>

          <button type="button" className="btn-pill mt-5 w-full" onClick={test} disabled={aiBusy}>
            {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />} 测试连接
          </button>

          {connection && (
            <div className="mt-4 rounded-xl p-3 flex items-start gap-2 text-[11.5px] leading-relaxed" style={{ background: 'var(--paper-3)', color: 'var(--ink-soft)' }}>
              {connection.ok ? <Check className="size-4 shrink-0 mt-0.5" /> : <CircleAlert className="size-4 shrink-0 mt-0.5" />}
              <span>{connection.message}</span>
            </div>
          )}
        </section>

        <section className="surface-card rounded-2xl p-6 lg:col-span-7">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="size-4" />
            <h3 className="font-display text-[18px]">启动命令</h3>
          </div>
          <div className="space-y-2">
            {OLLAMA_STEPS.map((s, i) => (
              <div key={s.label} className="flex items-start gap-2">
                <span className="text-[10px] w-14 shrink-0 pt-2.5" style={{ color: 'var(--ink-faint)' }}>{String(i + 1).padStart(2, '0')} {s.label}</span>
                <code className="code-line flex-1">{s.code}</code>
                <Button variant="ghost" size="icon-sm" className="rounded-lg shrink-0" onClick={() => copy(s.code)} aria-label="复制命令"><Copy className="size-3.5" /></Button>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <h4 className="font-display text-[15px]">提示词</h4>
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => copy(prompt)}><Copy className="size-3.5" /> 复制</Button>
          </div>
          <pre className="code-line mt-3 max-h-[220px] overflow-y-auto whitespace-pre-wrap" style={{ fontSize: '0.7rem', lineHeight: 1.7 }}>{prompt}</pre>

          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-pill is-ghost !py-1.5 !px-4 !text-[11px]" onClick={runPreview} disabled={aiBusy}>
              {aiBusy ? <Loader2 className="size-3.5 animate-spin" /> : <Wand2 className="size-3.5" />} 试生成
            </button>
          </div>

          {preview.length > 0 && (
            <div className="mt-4 rounded-xl p-4" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
              <div className="space-y-2">
                {preview.map((line, i) => (
                  <div key={`${line}-${i}`} className="flex items-start gap-2">
                    <span className="font-latin text-[15px]" style={{ color: 'var(--ink-faint)' }}>{String(i + 1).padStart(2, '0')}</span>
                    <p className="result-quote text-[14px] flex-1">{line}</p>
                    <Button variant="ghost" size="icon-sm" className="rounded-full shrink-0" onClick={() => copy(line)} aria-label="复制"><Copy className="size-3.5" /></Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
