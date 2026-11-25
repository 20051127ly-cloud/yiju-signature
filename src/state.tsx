import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { GROUPS } from './data/corpus'
import {
  buildCorpus,
  deriveKeywords,
  emptyProfile,
  generate,
  type CorpusIndex,
  type GenerateResult,
  type GeneratedItem,
  type Keyword,
  type Profile,
} from './lib/engine'
import { loadHitokoto } from './lib/hitokoto'
import {
  getHunyuanStatus,
  readHunyuanKey,
  saveHunyuanKey,
  type HunyuanStatus,
  type HunyuanThought,
} from './lib/hunyuan'
import { defaultOllamaConfig, type ConnectionState, type OllamaConfig } from './lib/ollama'

export type Tab = 'generator' | 'atlas' | 'method' | 'ai'

type AppState = {
  index: CorpusIndex
  theme: 'light' | 'dark'
  toggleTheme: () => void
  tab: Tab
  setTab: (t: Tab) => void
  profile: Profile
  setProfile: React.Dispatch<React.SetStateAction<Profile>>
  keywords: Keyword[]
  setKeywords: React.Dispatch<React.SetStateAction<Keyword[]>>
  extraKeywords: string[]
  setExtraKeywords: React.Dispatch<React.SetStateAction<string[]>>
  result: GenerateResult | null
  regenerate: (seed?: number) => GenerateResult
  thought: HunyuanThought | null
  setThought: React.Dispatch<React.SetStateAction<HunyuanThought | null>>
  hunyuanKey: string
  setHunyuanKey: (key: string) => void
  hunyuanStatus: HunyuanStatus
  refreshHunyuanStatus: () => void
  hunyuanBusy: boolean
  setHunyuanBusy: React.Dispatch<React.SetStateAction<boolean>>
  ollama: OllamaConfig
  setOllama: React.Dispatch<React.SetStateAction<OllamaConfig>>
  connection: ConnectionState | null
  setConnection: React.Dispatch<React.SetStateAction<ConnectionState | null>>
  favorites: string[]
  toggleFavorite: (text: string) => void
  aiItems: GeneratedItem[]
  setAiItems: React.Dispatch<React.SetStateAction<GeneratedItem[]>>
  aiBusy: boolean
  setAiBusy: React.Dispatch<React.SetStateAction<boolean>>
  toast: string | null
  notify: (message: string) => void
}

const Ctx = createContext<AppState | null>(null)

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [groups, setGroups] = useState(GROUPS)
  const index = useMemo(() => buildCorpus(groups), [groups])
  const [theme, setTheme] = useState<'light' | 'dark'>(() => readStorage('sig-theme', 'light' as const))
  const [tab, setTab] = useState<Tab>('generator')
  // 问卷不持久化：每次进入页面都从空答案开始
  const [profile, setProfile] = useState<Profile>(() => emptyProfile())
  const [extraKeywords, setExtraKeywords] = useState<string[]>([])
  const [keywords, setKeywords] = useState<Keyword[]>(() => deriveKeywords(buildCorpus(GROUPS), emptyProfile()))
  const [result, setResult] = useState<GenerateResult | null>(null)
  const [thought, setThought] = useState<HunyuanThought | null>(null)
  const [hunyuanKey, setKey] = useState(() => readHunyuanKey())
  const [hunyuanStatus, setHunyuanStatus] = useState<HunyuanStatus>({ configured: false, model: 'hunyuan-turbo', baseUrl: '' })
  const [hunyuanBusy, setHunyuanBusy] = useState(false)
  const [ollama, setOllama] = useState<OllamaConfig>(() => ({ ...defaultOllamaConfig, ...readStorage('sig-ollama', {}) }))
  const [connection, setConnection] = useState<ConnectionState | null>(null)
  const [favorites, setFavorites] = useState<string[]>(() => readStorage('sig-favorites', [] as string[]))
  const [aiItems, setAiItems] = useState<GeneratedItem[]>([])
  const [aiBusy, setAiBusy] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    localStorage.setItem('sig-theme', JSON.stringify(theme))
  }, [theme])

  useEffect(() => { localStorage.setItem('sig-ollama', JSON.stringify(ollama)) }, [ollama])
  useEffect(() => { localStorage.setItem('sig-favorites', JSON.stringify(favorites)) }, [favorites])

  useEffect(() => {
    let alive = true
    loadHitokoto()
      .then((payload) => { if (alive) setGroups(payload.groups) })
      .catch(() => { /* 静态资源缺失时保留站内语料 */ })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    void getHunyuanStatus(readHunyuanKey()).then((s) => { if (alive) setHunyuanStatus(s) })
    return () => { alive = false }
  }, [])

  const timer = useRef(0)
  const notify = (message: string) => {
    setToast(message)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setToast(null), 2200)
  }

  const regenerate = (seed = Date.now()) => {
    const next = generate(index, keywords, profile, seed, thought)
    setResult(next)
    return next
  }

  const setHunyuanKey = (key: string) => {
    const clean = key.trim()
    saveHunyuanKey(clean)
    setKey(clean)
    void getHunyuanStatus(clean).then(setHunyuanStatus)
  }

  const refreshHunyuanStatus = () => {
    void getHunyuanStatus(readHunyuanKey()).then(setHunyuanStatus)
  }

  const toggleFavorite = (text: string) => {
    setFavorites((prev) => (prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]))
  }

  const value: AppState = {
    index, theme, toggleTheme: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')),
    tab, setTab, profile, setProfile, keywords, setKeywords, extraKeywords, setExtraKeywords,
    result, regenerate, thought, setThought, hunyuanKey, setHunyuanKey, hunyuanStatus,
    refreshHunyuanStatus, hunyuanBusy, setHunyuanBusy,
    ollama, setOllama, connection, setConnection,
    favorites, toggleFavorite, aiItems, setAiItems, aiBusy, setAiBusy, toast, notify,
  }

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
