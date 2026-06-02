import { useState, useEffect } from 'react'
import { useStore } from './lib/store'
import { useDarkMode } from './hooks/useDarkMode'
import LayoutPage   from './pages/LayoutPage'
import SummaryPage  from './pages/SummaryPage'
import IdeaModal    from './components/IdeaModal'
import AddIdeaModal from './components/AddIdeaModal'
import TriageModal  from './components/TriageModal'

const TABS = [
  { id: 'layout',   label: 'Layout',   icon: '📋' },
  { id: 'summary',  label: 'Summary',  icon: '📊' },
]

export default function App() {
  const [tab, setTab]         = useState('layout')
  const [openId, setOpenId]   = useState(null)
  const [editId, setEditId]   = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [triageOpen, setTriageOpen] = useState(false)
  const [dark, toggleDark]    = useDarkMode()

  const { load, loading, error, ideas, getStatus } = useStore()

  useEffect(() => { load() }, [])

  const triageCount = ideas.filter(i => getStatus(i) === 'idea').length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg text-gray-400">
        <div className="text-center">
          <div className="text-3xl mb-3 animate-pulse">💡</div>
          <div className="text-sm font-medium">Loading ideas…</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-bg p-6">
        <div className="text-center max-w-sm">
          <div className="text-3xl mb-3">⚠️</div>
          <div className="text-base font-bold text-gray-800 mb-2">Connection error</div>
          <div className="text-sm text-gray-500 mb-4">{error}</div>
          <div className="text-xs text-gray-400">Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set correctly.</div>
          <button onClick={load} className="mt-4 px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-900 transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-bold text-gray-900">Ideas Pipeline</h1>
          <span className="text-xs text-gray-400">{ideas.length} ideas</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleDark}
            className="text-lg px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >{dark ? '☀️' : '🌙'}</button>
          <button
            onClick={() => setTriageOpen(true)}
            className="relative text-xs font-bold border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50"
          >
            Triage
            {triageCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-violet-600 text-white text-[9px] font-bold px-1.5 rounded-full">{triageCount}</span>
            )}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="text-xs font-bold bg-violet-600 text-white rounded-lg px-3 py-1.5"
          >+ Add</button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-hidden">
        {tab === 'layout'  && <LayoutPage  onOpenIdea={setOpenId} />}
        {tab === 'summary' && <SummaryPage onOpenIdea={setOpenId} />}
      </main>

      {/* Bottom tab nav (mobile-first) */}
      <nav className="bottom-nav flex bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-[11px] font-semibold transition-colors
              ${tab === t.id ? 'text-violet-600' : 'text-gray-400'}`}
          >
            <span className="text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Modals */}
      {openId && (
        <IdeaModal
          ideaId={openId}
          onClose={() => setOpenId(null)}
          onEdit={id => { setOpenId(null); setEditId(id) }}
        />
      )}
      {(addOpen || editId) && (
        <AddIdeaModal
          editId={editId || null}
          onClose={() => { setAddOpen(false); setEditId(null) }}
        />
      )}
      {triageOpen && <TriageModal onClose={() => setTriageOpen(false)} />}
    </div>
  )
}
