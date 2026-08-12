import { useState, useEffect } from 'react'
import { useStore } from './lib/store'
import { useDarkMode } from './hooks/useDarkMode'
import { useUiTheme } from './hooks/useUiTheme'
import { useSettings } from './hooks/useSettings'
import { GROUPS } from './data/groups'
import SettingsDrawer  from './components/SettingsDrawer'
import LayoutPage      from './pages/LayoutPage'
import SummaryPage     from './pages/SummaryPage'
import StrategyPage    from './pages/StrategyPage'
import GroupsPage      from './pages/GroupsPage'
import SprintPage      from './pages/SprintPage'
import IdeaModal       from './components/IdeaModal'
import AddIdeaModal    from './components/AddIdeaModal'
import TriageModal     from './components/TriageModal'

const TABS = [
  { id: 'layout',   label: 'Layout',   icon: '📋' },
  { id: 'strategy', label: 'Strategy', icon: '🎯' },
  { id: 'sprint',   label: 'Sprint',   icon: '🏃' },
  { id: 'groups',   label: 'Groups',   icon: '🗂' },
  { id: 'summary',  label: 'Summary',  icon: '📊' },
]

// Fixed-size header button style (px not rem — never scales with font setting)
const HDR = 'border border-gray-200 dark:border-slate-700 rounded-lg font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors'
const HDR_STYLE = { fontSize: '11px', padding: '5px 10px' }

export default function App() {
  const [tab, setTab]         = useState('layout')
  const [groupFilter, setGroupFilter] = useState('')
  const [openId, setOpenId]   = useState(null)
  const [editId, setEditId]   = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [triageOpen, setTriageOpen]   = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [dark, toggleDark]    = useDarkMode()
  const { theme, setTheme }    = useUiTheme()
  const { fontSize, setFontSizeKey }  = useSettings()

  const { load, loading, error, ideas, getStatus } = useStore()

  useEffect(() => { load() }, [])

  const triageCount = ideas.filter(i => getStatus(i) === 'idea').length

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400">
      <div className="text-center"><div className="text-3xl mb-3 animate-pulse">💡</div><div className="text-sm font-medium">Loading…</div></div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-screen p-6">
      <div className="text-center max-w-sm">
        <div className="text-3xl mb-3">⚠️</div>
        <div className="text-base font-bold text-gray-800 mb-2">Connection error</div>
        <div className="text-sm text-gray-500 mb-4">{error}</div>
        <button onClick={load} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl">Retry</button>
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-screen bg-gray-50 dark:bg-slate-900 transition-colors">

      {/* ── Header ── fixed px sizes, never scales ── */}
      <header
        className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex-shrink-0"
        style={{ fontSize: '13px' }}
      >
        {/* Group filter — always visible */}
        {(
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            <span className="text-gray-400 dark:text-slate-500 font-semibold shrink-0" style={{ fontSize: '11px' }}>Group:</span>
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              className={`rounded-lg border px-2 py-1 font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200
                ${groupFilter ? 'border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'border-gray-200 bg-white text-gray-600'}`}
              style={{ fontSize: '11px' }}
            >
              <option value="">All ideas</option>
              <option value="__none__">∅ No group yet</option>
              {GROUPS.map(g => <option key={g.key} value={g.key}>{g.icon} {g.label}</option>)}
            </select>
            {groupFilter && (
              <button onClick={() => setGroupFilter('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300" style={{ fontSize: '11px' }}>×</button>
            )}
          </div>
        )}

        <button onClick={() => setSettingsOpen(true)} className={HDR} style={HDR_STYLE} title="Customise">⚙️</button>
        <button onClick={() => setTriageOpen(true)}   className={`${HDR} relative`} style={HDR_STYLE}>
          Triage
          {triageCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-violet-600 text-white rounded-full leading-none font-bold" style={{ fontSize: '9px', padding: '2px 4px' }}>{triageCount}</span>
          )}
        </button>
        <button onClick={() => setAddOpen(true)} className="rounded-lg font-semibold bg-violet-600 text-white" style={HDR_STYLE}>+ Add</button>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-hidden">
        {tab === 'layout'   && <LayoutPage   onOpenIdea={setOpenId} groupFilter={groupFilter} />}
        {tab === 'strategy' && <StrategyPage onOpenIdea={setOpenId} groupFilter={groupFilter} />}
        {tab === 'sprint'   && <SprintPage   onOpenIdea={setOpenId} groupFilter={groupFilter} />}
        {tab === 'groups'   && <GroupsPage   onOpenIdea={setOpenId} groupFilter={groupFilter} />}
        {tab === 'summary'  && <SummaryPage  onOpenIdea={setOpenId} groupFilter={groupFilter} />}
      </main>

      {/* ── Bottom tab nav ── */}
      <nav className="bottom-nav flex bg-white dark:bg-slate-800 border-t border-gray-100 dark:border-slate-700 flex-shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex flex-col items-center py-2 gap-0.5 font-semibold transition-colors ${tab === t.id ? 'text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-slate-500'}`}
            style={{ fontSize: '10px' }}
          >
            <span style={{ fontSize: '18px' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Modals ── */}
      {openId && <IdeaModal ideaId={openId} onClose={() => setOpenId(null)} onEdit={id => { setOpenId(null); setEditId(id) }} />}
      {(addOpen || editId) && <AddIdeaModal editId={editId || null} onClose={() => { setAddOpen(false); setEditId(null) }} />}
      {triageOpen && <TriageModal onClose={() => setTriageOpen(false)} />}
      {settingsOpen && (
        <SettingsDrawer
          open={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          dark={dark}
          toggleDark={toggleDark}
          theme={theme}
          setTheme={setTheme}
          fontSize={fontSize}
          setFontSizeKey={setFontSizeKey}
        />
      )}
    </div>
  )
}
