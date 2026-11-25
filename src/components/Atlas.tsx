import { useMemo, useState } from 'react'
import { Copy, Heart, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { QUESTIONS } from '../data/taxonomy'
import type { Signature } from '../lib/engine'
import { useApp } from '../state'
import { DoodleSearch } from './Doodles'

const LANG_QUESTION = QUESTIONS.find((q) => q.id === 'lang')
/** 语言类别直接复用问卷里原有的 8 个选项，不新增分类口径 */
const LANG_CARDS = (LANG_QUESTION?.options || []).map((o) => ({ id: o.id, label: o.label, tags: o.tags }))
const LANG_HINT = LANG_QUESTION?.hint || '按原有语言类别查看语料'
const FOREIGN_LANGS = new Set(['英文', '中英', '双语', '德语', '拉丁语', '日语', '法语'])
const CJK_RE = /[\u3400-\u9fff]/u
const FOREIGN_SCRIPT_RE = /[A-Za-z\u00c0-\u024f\u3040-\u30ff\u24b6-\u24e9\u{1d400}-\u{1d7ff}]/u

/** 只读判定：正文是纯外文时用「原文」，中英混排时用「原句」，全程不改写语料 */
const isForeignText = (text: string) => !CJK_RE.test(text) && FOREIGN_SCRIPT_RE.test(text)
const hasForeignScript = (text: string) => FOREIGN_SCRIPT_RE.test(text)

const matchesLang = (entry: Signature, tags: string[]) =>
  tags.some((t) => entry.lang.includes(t) || entry.tags.includes(t))

export function Atlas() {
  const { index, favorites, notify } = useApp()
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('全部')
  const [langId, setLangId] = useState('全部')
  const [onlyFavorites, setOnlyFavorites] = useState(false)
  const [limit, setLimit] = useState(36)

  const families = useMemo(() => Array.from(new Set(index.entries.map((e) => e.family))), [index])
  const langCards = useMemo(() => [
    { id: '全部', label: '全部语言', tags: [] as string[], count: index.entries.length },
    ...LANG_CARDS.map((c) => ({ ...c, count: index.entries.filter((e) => matchesLang(e, c.tags)).length })),
  ], [index])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const activeLang = LANG_CARDS.find((c) => c.id === langId)
    return index.entries.filter((e) => {
      if (family !== '全部' && e.family !== family) return false
      if (activeLang && !matchesLang(e, activeLang.tags)) return false
      if (onlyFavorites && !favorites.includes(e.text)) return false
      if (!q) return true
      return [e.text, e.note || '', e.groupName, ...e.lang, ...e.tags].join(' ').toLowerCase().includes(q)
    })
  }, [index, query, family, langId, onlyFavorites, favorites])

  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); notify('已复制') } catch { notify('复制失败') }
  }

  const stats = [
    { label: '语料', value: index.stats.entries },
    { label: '类目', value: index.stats.groups },
    { label: '标签', value: index.stats.tags },
    { label: '语言', value: index.stats.languages },
    { label: '大类', value: index.stats.families },
  ]

  return (
    <div className="space-y-6 fade-in">
      <section className="surface-card rounded-2xl p-6 md:p-8">
        <div className="flex items-baseline gap-3">
          <span className="section-label">Atlas</span>
          <h2 className="font-display text-[24px]" style={{ color: 'var(--ink)' }}>语料图鉴</h2>
        </div>
        <div className="mt-6 grid grid-cols-3 sm:grid-cols-5 gap-3">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--paper)', border: '1px solid var(--line)' }}>
              <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{s.label}</p>
              <p className="font-latin text-[26px] mt-1" style={{ color: 'var(--ink)' }}>{s.value.toLocaleString()}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-card rounded-2xl p-5 md:p-6 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--ink-faint)' }} />
            <Input
              aria-label="搜索语料"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setLimit(36) }}
              placeholder="搜索句子、出处、标签"
              className="pl-9 h-10 rounded-xl text-[13px]"
              style={{ background: 'var(--paper)', borderColor: 'var(--line)', color: 'var(--ink)' }}
            />
          </div>
          <button type="button" className="btn-pill is-ghost !py-2 !px-4 !text-[11px]" onClick={() => setOnlyFavorites((v) => !v)} data-active={onlyFavorites}>
            <Heart className={`size-3.5 ${onlyFavorites ? 'fill-current' : ''}`} /> {favorites.length}
          </button>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2 pt-1">
          <p className="text-[12px] font-medium" style={{ color: 'var(--ink)' }}>语言类别 · 原有 {LANG_CARDS.length} 类</p>
          <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{LANG_HINT}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {langCards.map((c) => {
            const active = langId === c.id
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => { setLangId(c.id); setLimit(36) }}
                data-active={active}
                aria-pressed={active}
                aria-label={`${c.label}，${c.count} 条`}
                className="rounded-xl p-3 text-left border transition-colors cursor-pointer hover:border-[var(--ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                style={{
                  background: active ? 'var(--ink)' : 'var(--paper)',
                  borderColor: active ? 'var(--ink)' : 'var(--line)',
                  color: active ? 'var(--paper)' : 'var(--ink)',
                }}
              >
                <span className="text-[12px] font-medium leading-tight">{c.label}</span>
                <span className="font-latin text-[11px] block mt-1.5 opacity-70">{c.count.toLocaleString()} 条</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {['全部', ...families].map((f) => (
            <button key={f} type="button" className="chip !text-[11px] !py-1.5" data-active={family === f} onClick={() => { setFamily(f); setLimit(36) }}>
              {f}
            </button>
          ))}
        </div>

        <p className="font-latin text-[11px]" style={{ color: 'var(--ink-faint)' }}>
          {filtered.length.toLocaleString()} 条
        </p>
      </section>

      {filtered.length === 0 ? (
        <div className="surface-card rounded-2xl p-12 text-center">
          <DoodleSearch className="w-24 h-24 mx-auto" />
          <p className="font-display text-[17px] mt-3">没有找到</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {filtered.slice(0, limit).map((entry, i) => {
            // 只读展示：语言、原文、释义都来自语料元数据；这里只分类和排版，不改写任何正文
            const hasForeignLang = entry.lang.some((l) => FOREIGN_LANGS.has(l))
            const foreign = hasForeignLang
            const originalLabel = isForeignText(entry.text) ? '原文' : hasForeignScript(entry.text) ? '双语原句' : '原句'
            const translation = entry.noteLabel === '中文释义' ? entry.note : undefined
            const noteLabel = entry.noteLabel === '中文释义' ? '中文释义 / 出处' : (entry.noteLabel || '附注')
            const otherNote = translation ? undefined : entry.note
            const inlineChinese = hasForeignLang && !translation && hasForeignScript(entry.text) && CJK_RE.test(entry.text)
            return (
              <article key={entry.id} className="surface-card rounded-xl p-4 flex flex-col gap-2 transition-colors duration-200 hover:border-[var(--ink)]">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-latin text-base leading-none" style={{ color: 'var(--ink-faint)' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: 'var(--paper-3)', color: 'var(--ink-soft)' }}>{entry.groupName}</span>
                </div>
                {foreign && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
                      {entry.lang.join(' / ')} · {originalLabel}
                    </span>
                    {inlineChinese && (
                      <span className="text-[10px] rounded-full px-2 py-0.5" style={{ background: 'var(--paper-3)', color: 'var(--ink-soft)' }}>
                        原句含中文释义
                      </span>
                    )}
                  </div>
                )}
                <p className="result-quote text-[15px] flex-1" style={{ color: 'var(--ink)' }}>{entry.text}</p>
                {translation && (
                  <p className="text-[12px] leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{noteLabel} · {translation}</p>
                )}
                {otherNote && <p className="text-[11px]" style={{ color: 'var(--ink-faint)' }}>{noteLabel} · {otherNote}</p>}
                <div className="flex flex-wrap items-center gap-1 mt-auto pt-1">
                  {entry.tags.slice(0, 4).map((t) => (
                    <span key={t} className="text-[10px] rounded-full px-1.5 py-0.5" style={{ background: 'var(--paper-3)', color: 'var(--ink-soft)' }}>{t}</span>
                  ))}
                  <Button variant="ghost" size="icon-sm" className="ml-auto rounded-full" onClick={() => copy(entry.text)} aria-label="复制">
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {limit < filtered.length && (
        <div className="text-center">
          <button type="button" className="btn-pill is-ghost" onClick={() => setLimit((l) => l + 36)}>更多</button>
        </div>
      )}
    </div>
  )
}
