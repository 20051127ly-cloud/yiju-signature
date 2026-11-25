import { ArrowRight, BookOpen, Cpu, Database, Moon, PenLine, Sun } from 'lucide-react'
import './App.css'
import { Atlas } from './components/Atlas'
import { DoodleBolt, DoodleMelon, DoodleNight } from './components/Doodles'
import { Generator } from './components/Generator'
import { LocalAI } from './components/LocalAI'
import { Methodology } from './components/Methodology'
import { AppProvider, useApp, type Tab } from './state'

const TABS: { id: Tab; label: string; icon: typeof PenLine }[] = [
  { id: 'generator', label: '生成', icon: PenLine },
  { id: 'atlas', label: '语料', icon: Database },
  { id: 'method', label: '说明', icon: BookOpen },
  { id: 'ai', label: '模型', icon: Cpu },
]

function Nav() {
  const { tab, setTab, theme, toggleTheme } = useApp()
  return (
    <div className="sticky top-3 z-40 px-3 sm:px-5">
      <nav className="mx-auto max-w-[1320px] surface-card rounded-full px-3 sm:px-4 py-2 flex items-center gap-3">
        <button type="button" className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => setTab('generator')}>
          <span className="seal-mark w-8 h-8 rounded-full grid place-items-center text-[14px] leading-none">句</span>
          <span className="hidden sm:block font-display text-[15px]">一句签名</span>
        </button>
        <div className="hidden md:block h-5 w-px" style={{ background: 'var(--line)' }} />
        <div className="flex items-center gap-0.5 overflow-x-auto flex-1 min-w-0">
          {TABS.map((t) => (
            <button key={t.id} type="button" className="nav-tab flex items-center gap-1.5" data-active={tab === t.id} onClick={() => setTab(t.id)}>
              <t.icon className="size-3.5" />
              {t.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          className="w-8 h-8 rounded-full grid place-items-center shrink-0 cursor-pointer transition-colors hover:bg-[var(--paper-3)]"
          aria-label={theme === 'light' ? '深色模式' : '浅色模式'}
        >
          {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </button>
      </nav>
    </div>
  )
}

type PhoneProps = {
  doodle: typeof DoodleMelon
  step: string
  line: string
  featured?: boolean
  action?: () => void
  actionLabel?: string
}

function PhoneCard({ doodle: Doodle, step, line, featured, action, actionLabel }: PhoneProps) {
  return (
    <div className={`ink-card flex flex-col items-center justify-between px-4 py-5 ${featured ? 'h-[318px]' : 'h-[286px]'}`}>
      <div className="w-full flex items-center justify-between font-latin text-[10px]" style={{ color: 'var(--ink-faint)' }}>
        <span>9:41</span><span>{step}</span>
      </div>
      <Doodle className="w-full max-w-[142px] flex-1 my-1" />
      <p className="result-quote text-center text-[13px] leading-relaxed" style={{ color: 'var(--ink)' }}>{line}</p>
      <button type="button" className="btn-pill mt-3 w-full !py-2 !text-[11px]" onClick={action} aria-label={actionLabel || step}>
        <ArrowRight className="size-3.5" />
      </button>
      <div className="w-9 h-1 rounded-full mt-3 opacity-50" style={{ background: 'var(--ink)' }} />
    </div>
  )
}

function Hero() {
  const { setTab } = useApp()
  const start = () => {
    document.querySelector('#step-01')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const toDirection = () => {
    document.querySelector('#step-02')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    window.setTimeout(() => document.querySelector<HTMLTextAreaElement>('#step-02 textarea')?.focus(), 420)
  }
  const toAtlas = () => {
    setTab('atlas')
    window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  }

  return (
    <section className="mx-auto max-w-[1320px] px-4 sm:px-6 pt-12 md:pt-16 pb-2">
      <div className="grid gap-10 lg:grid-cols-12 items-center">
        <div className="lg:col-span-5 fade-in">
          <p className="section-label">Signature lab</p>
          <h1 className="font-display mt-5 text-[42px] sm:text-[56px] lg:text-[64px] leading-[1.08]" style={{ color: 'var(--ink)' }}>
            写下此刻，<br />留下一句。
          </h1>
          <p className="mt-5 text-[14px]" style={{ color: 'var(--ink-soft)' }}>一句方向，一句签名。</p>
          <button type="button" className="btn-pill mt-8" onClick={start}>
            开始 <ArrowRight className="size-4" />
          </button>
          <div className="mt-10 flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-1.5 rounded-full" style={{ width: i === 0 ? 26 : 8, background: i === 0 ? 'var(--ink)' : 'var(--line)' }} />
            ))}
          </div>
        </div>

        <div className="lg:col-span-7 relative">
          <div className="hero-circle absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] aspect-square max-h-[420px]" />
          <div className="relative flex items-start gap-3 overflow-x-auto px-2 pb-2 snap-x sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-6 sm:pb-0">
            <div className="min-w-[210px] flex-1 snap-center sm:min-w-0"><PhoneCard doodle={DoodleBolt} step="01" line="先说说心情" action={toDirection} actionLabel="去写想说的话" /></div>
            <div className="min-w-[210px] flex-1 snap-center sm:min-w-0"><PhoneCard doodle={DoodleMelon} step="02" line="心有山海，静而不争。" featured action={toDirection} actionLabel="去写想说的话" /></div>
            <div className="min-w-[210px] flex-1 snap-center sm:min-w-0"><PhoneCard doodle={DoodleNight} step="03" line="挑一句带走" action={toAtlas} actionLabel="去语料图鉴" /></div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Shell() {
  const { tab, toast } = useApp()
  return (
    <div className="min-h-screen paper-surface">
      <Nav />
      {tab === 'generator' && <Hero />}
      <main className={`mx-auto max-w-[1320px] px-4 sm:px-6 ${tab === 'generator' ? 'pt-10' : 'pt-10'} pb-20`}>
        {tab === 'generator' && <Generator />}
        {tab === 'atlas' && <Atlas />}
        {tab === 'method' && <Methodology />}
        {tab === 'ai' && <LocalAI />}
      </main>
      <footer className="border-t" style={{ borderColor: 'var(--line)' }}>
        <div className="mx-auto max-w-[1320px] px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-2 text-[11px]" style={{ color: 'var(--ink-faint)' }}>
          <span className="font-display text-[13px]" style={{ color: 'var(--ink)' }}>一句签名</span>
          <a href="https://github.com/hitokoto-osc/sentences-bundle" target="_blank" rel="noreferrer" className="hover:underline cursor-pointer">
            语料来源 © Hitokoto · AGPL-3.0
          </a>
        </div>
      </footer>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 fade-in rounded-full px-5 py-2.5 text-[12px] border" style={{ background: 'var(--ink)', color: 'var(--paper)', borderColor: 'var(--ink)' }}>
          {toast}
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AppProvider>
      <Shell />
    </AppProvider>
  )
}
