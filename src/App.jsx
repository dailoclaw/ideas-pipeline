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
  { id: 'layout',   label: 'Layout',   icon: 'layout' },
  { id: 'strategy', label: 'Strategy', icon: 'target' },
  { id: 'sprint',   label: 'Sprint',   icon: 'bolt' },
  { id: 'groups',   label: 'Groups',   icon: 'groups' },
  { id: 'summary',  label: 'Summary',  icon: 'chart' },
]

const ICON_PATHS = {
  layout: <><rect x="3" y="4" width="7" height="16" rx="2"/><rect x="14" y="4" width="7" height="7" rx="2"/><rect x="14" y="15" width="7" height="5" rx="2"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M18 6l3-3M17 3h4v4"/></>,
  bolt: <path d="M13 2L4.5 13h6L9.5 22 19.5 9h-6L13 2z"/>,
  groups: <><rect x="3" y="4" width="8" height="7" rx="2"/><rect x="13" y="4" width="8" height="7" rx="2"/><rect x="3" y="13" width="8" height="7" rx="2"/><rect x="13" y="13" width="8" height="7" rx="2"/></>,
  chart: <><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 00-1.88-.34 1.7 1.7 0 00-1.03 1.56V21h-4v-.08A1.7 1.7 0 008.96 19.4a1.7 1.7 0 00-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-1.56-1.03H3v-4h.08A1.7 1.7 0 004.6 8.96a1.7 1.7 0 00-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 008.96 4.6 1.7 1.7 0 0010 3.08V3h4v.08a1.7 1.7 0 001.03 1.56 1.7 1.7 0 001.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0019.4 9c.23.62.82 1.03 1.48 1.03H21v4h-.08A1.7 1.7 0 0019.4 15z"/></>,
  more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
}

function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  )
}

function AppMark() {
  return (
    <svg className="app-mark" viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="markA" x1="5" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9d90ff" />
          <stop offset="1" stopColor="#6351e3" />
        </linearGradient>
        <linearGradient id="markB" x1="34" y1="5" x2="8" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#65ead3" />
          <stop offset="1" stopColor="#3ea99d" />
        </linearGradient>
      </defs>
      <path d="M20 3 35 11.5v17L20 37 5 28.5v-17L20 3Z" fill="url(#markA)"/>
      <path d="M20 3v17L5 28.5v-17L20 3Z" fill="url(#markB)"/>
      <path d="m20 20 15-8.5v17L20 37V20Z" fill="rgba(255,255,255,.24)"/>
      <path d="m5 11.5 15 8.5 15-8.5" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1"/>
    </svg>
  )
}

export default function App() {
  const [tab, setTab]         = useState('layout')
  const [groupFilter, setGroupFilter] = useState('')
  const [openId, setOpenId]   = useState(null)
  const [editId, setEditId]   = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [triageOpen, setTriageOpen]   = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false)
  const [dark, toggleDark]    = useDarkMode()
  const { theme, setTheme }    = useUiTheme()
  const { fontSize, setFontSizeKey }  = useSettings()

  const { load, loading, error, ideas, getStatus } = useStore()

  useEffect(() => { load() }, [])

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const color = theme === 'calm'
      ? (dark ? '#0d2826' : '#153a37')
      : (dark ? '#11162b' : '#f2f5fb')
    meta.setAttribute('content', color)
  }, [theme, dark])

  useEffect(() => {
    if (settingsOpen || addOpen || editId || triageOpen || mobileToolsOpen) return
    requestAnimationFrame(() => {
      const shell = document.querySelector('.app-shell')
      if (shell) shell.scrollTop = 0
    })
  }, [settingsOpen, addOpen, editId, triageOpen, mobileToolsOpen])

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
    <div className="app-shell flex flex-col h-screen bg-gray-50 dark:bg-slate-900 transition-colors">

      <header className="app-header bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
        <div className="brand-lockup">
          <span className="brand-mark"><AppMark /></span>
          <span className="brand-copy">
            <strong>HR Initiative Tracker</strong>
            <small>IdeaFlow</small>
          </span>
        </div>

        <div className="header-filter min-w-0">
            <span className="header-filter__label text-gray-400 dark:text-slate-500 font-semibold">Workspace</span>
            <select
              value={groupFilter}
              onChange={e => setGroupFilter(e.target.value)}
              aria-label="Filter ideas by workspace"
              className={`header-filter__select rounded-lg border font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200
                ${groupFilter ? 'border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'border-gray-200 bg-white text-gray-600'}`}
            >
              <option value="">All ideas</option>
              <option value="__none__">∅ No group yet</option>
              {GROUPS.map(g => <option key={g.key} value={g.key}>{g.icon} {g.label}</option>)}
            </select>
            {groupFilter && (
              <button onClick={() => setGroupFilter('')} className="header-filter__clear text-gray-400 hover:text-gray-600 dark:hover:text-slate-300" aria-label="Clear workspace filter">×</button>
            )}
        </div>

        <div className="header-utilities">
          <button
            onClick={() => setTheme(theme === 'glass' ? 'calm' : 'glass')}
            className="header-action theme-quick-toggle"
            title={`Switch to ${theme === 'glass' ? 'Calm Command' : 'Luminous Glass'}`}
            aria-label={`Switch to ${theme === 'glass' ? 'Calm Command' : 'Luminous Glass'} theme`}
          >
            <AppMark />
            <span className="theme-quick-label">{theme === 'glass' ? 'Glass' : 'Calm'}</span>
          </button>
          <button onClick={() => setSettingsOpen(true)} className="header-action header-action--icon" title="Customise" aria-label="Customise appearance"><Icon name="settings" size={17} /></button>
          <button onClick={() => setTriageOpen(true)} className="header-action header-action--triage relative" aria-label={`Triage ideas, ${triageCount} remaining`}>
            <Icon name="target" size={16} />
            <span>Triage</span>
            {triageCount > 0 && (
              <span className="triage-count">{triageCount}</span>
            )}
          </button>
        </div>
        <button onClick={() => setAddOpen(true)} className="header-action header-action--primary" aria-label="New idea"><Icon name="plus" size={17} /><span>New</span></button>
        <button onClick={() => setMobileToolsOpen(true)} className="header-action mobile-tools-trigger" aria-label="Open workspace and app controls"><Icon name="more" size={22} /></button>
      </header>

      {mobileToolsOpen && (
        <div className="mobile-tools-overlay" onClick={e => { if (e.target === e.currentTarget) setMobileToolsOpen(false) }}>
          <div className="mobile-tools-sheet" role="dialog" aria-modal="true" aria-label="Workspace and app controls">
            <div className="mobile-tools-handle" aria-hidden="true" />
            <div className="mobile-tools-heading">
              <div>
                <strong>App controls</strong>
                <span>{theme === 'glass' ? 'Luminous Glass' : 'Calm Command'}</span>
              </div>
              <button onClick={() => setMobileToolsOpen(false)} aria-label="Close app controls">✕</button>
            </div>
            <label className="mobile-tools-field">
              <span>Workspace</span>
              <select value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setMobileToolsOpen(false) }}>
                <option value="">All ideas</option>
                <option value="__none__">∅ No group yet</option>
                {GROUPS.map(g => <option key={g.key} value={g.key}>{g.icon} {g.label}</option>)}
              </select>
            </label>
            <div className="mobile-tools-actions">
              <button onClick={() => { setMobileToolsOpen(false); setTriageOpen(true) }}>
                <span className="mobile-tools-action-icon"><Icon name="target" size={20} /></span>
                <span><strong>Triage ideas</strong><small>{triageCount} remaining</small></span>
              </button>
              <button onClick={() => setTheme(theme === 'glass' ? 'calm' : 'glass')}>
                <span className="mobile-tools-action-icon"><AppMark /></span>
                <span><strong>Switch visual system</strong><small>{theme === 'glass' ? 'Use Calm Command' : 'Use Luminous Glass'}</small></span>
              </button>
              <button onClick={() => { setMobileToolsOpen(false); setSettingsOpen(true) }}>
                <span className="mobile-tools-action-icon"><Icon name="settings" size={20} /></span>
                <span><strong>Appearance</strong><small>Theme and text size</small></span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Main content ── */}
      <main className="app-main flex-1 overflow-hidden">
        {tab === 'layout'   && <LayoutPage   onOpenIdea={setOpenId} groupFilter={groupFilter} />}
        {tab === 'strategy' && <StrategyPage onOpenIdea={setOpenId} groupFilter={groupFilter} />}
        {tab === 'sprint'   && <SprintPage   onOpenIdea={setOpenId} groupFilter={groupFilter} />}
        {tab === 'groups'   && <GroupsPage   onOpenIdea={setOpenId} groupFilter={groupFilter} />}
        {tab === 'summary'  && <SummaryPage  onOpenIdea={setOpenId} groupFilter={groupFilter} />}
      </main>

      {/* ── Bottom tab nav ── */}
      <nav className="bottom-nav flex bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 flex-shrink-0" aria-label="Primary navigation">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`bottom-nav__item flex-1 flex flex-col items-center font-semibold transition-colors ${tab === t.id ? 'is-active text-violet-600 dark:text-violet-400' : 'text-gray-400 dark:text-slate-500'}`}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            <span className="bottom-nav__icon"><Icon name={t.icon} size={19} /></span>
            <span>{t.label}</span>
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
