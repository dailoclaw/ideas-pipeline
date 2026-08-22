import { useEffect, useRef, useState } from 'react'
import { useStore } from './lib/store'
import { useDarkMode } from './hooks/useDarkMode'
import { useUiTheme, nextUiTheme, UI_THEMES } from './hooks/useUiTheme'
import { useSpotlight } from './hooks/useSpotlight'
import { useSettings } from './hooks/useSettings'
import { useAppLayout } from './hooks/useAppLayout'
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
import ObsidianConsole from './components/ObsidianConsole'
import Icon            from './components/Icon'
import { useDialogFocus } from './hooks/useDialogFocus'
import { downloadIdeasCsv } from './lib/csvExport'

const TABS = [
  { id: 'layout',   label: 'Layout',   icon: 'layout' },
  { id: 'strategy', label: 'Strategy', icon: 'target' },
  { id: 'sprint',   label: 'Sprint',   icon: 'bolt' },
  { id: 'groups',   label: 'Groups',   icon: 'groups' },
  { id: 'summary',  label: 'Summary',  icon: 'chart' },
]

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
  const [consoleTab, setConsoleTab] = useState('pulse')
  const [groupFilter, setGroupFilter] = useState('')
  const [openId, setOpenId]   = useState(null)
  const [editId, setEditId]   = useState(null)
  const [addOpen, setAddOpen] = useState(false)
  const [triageOpen, setTriageOpen]   = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false)
  const mobileToolsRef = useRef(null)
  const [dark, toggleDark]    = useDarkMode()
  const { theme, setTheme }    = useUiTheme()
  const { fontSize, setFontSizeKey }  = useSettings()
  const { appLayout, setAppLayout } = useAppLayout()

  const {
    load, loading, error, ideas, getStatus, getGroup, getSprintWeeks,
    getSprintAssignment, statusHistory, activityLog,
  } = useStore()
  useDialogFocus(mobileToolsRef, () => setMobileToolsOpen(false), mobileToolsOpen)
  useSpotlight(theme === 'aurora' && appLayout !== 'obsidian')

  useEffect(() => { load() }, [])

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) return
    const color = appLayout === 'obsidian'
      ? (dark ? '#090b0e' : '#eef3fa')
      : theme === 'calm'
        ? (dark ? '#0d2826' : '#153a37')
        : theme === 'aurora'
          ? (dark ? '#0b1220' : '#f1f6fb')
          : (dark ? '#11162b' : '#f2f5fb')
    meta.setAttribute('content', color)
  }, [theme, dark, appLayout])

  useEffect(() => {
    if (settingsOpen || addOpen || editId || triageOpen || mobileToolsOpen) return
    requestAnimationFrame(() => {
      const shell = document.querySelector(appLayout === 'obsidian' ? '.obsidian-main' : '.app-shell')
      if (shell) shell.scrollTop = 0
    })
  }, [tab, consoleTab, appLayout, settingsOpen, addOpen, editId, triageOpen, mobileToolsOpen])

  const triageCount = ideas.filter(i => getStatus(i) === 'idea').length
  const exportAllIdeas = () => downloadIdeasCsv({
    ideas,
    getStatus,
    getGroup,
    getSprintWeeks,
    getSprintAssignment,
    statusHistory,
    activityLog,
  })

  if (loading) return (
    <div className="flex items-center justify-center h-screen text-gray-400">
      <div className="text-center"><Icon name="lightbulb" size={34} className="mx-auto mb-3 animate-pulse" /><div className="text-sm font-medium">Loading…</div></div>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center h-screen p-6">
      <div className="text-center max-w-sm">
        <Icon name="alert" size={34} className="mx-auto mb-3 text-amber-500" />
        <div className="text-base font-bold text-gray-800 mb-2">Connection error</div>
        <div className="text-sm text-gray-500 mb-4">{error}</div>
        <button onClick={load} className="px-4 py-2 bg-violet-600 text-white text-sm font-bold rounded-xl">Retry</button>
      </div>
    </div>
  )

  return (
    <div className="app-shell flex flex-col h-screen bg-gray-50 dark:bg-slate-900 transition-colors">

      {appLayout === 'obsidian' ? (
        <ObsidianConsole
          active={consoleTab}
          setActive={setConsoleTab}
          groupFilter={groupFilter}
          setGroupFilter={setGroupFilter}
          onOpenIdea={setOpenId}
          onAdd={() => setAddOpen(true)}
          onSettings={() => setSettingsOpen(true)}
          onTriage={() => setTriageOpen(true)}
          onExport={exportAllIdeas}
          onOriginal={() => setAppLayout('original')}
          triageCount={triageCount}
          dark={dark}
          toggleDark={toggleDark}
        />
      ) : <>

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
            <div className="header-filter__control">
              <Icon name={GROUPS.find(group => group.key === groupFilter)?.icon || 'groups'} size={15} className="header-filter__icon" />
              <select
                value={groupFilter}
                onChange={e => setGroupFilter(e.target.value)}
                aria-label="Filter ideas by workspace"
                className={`header-filter__select rounded-lg border font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200
                  ${groupFilter ? 'border-violet-400 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' : 'border-gray-200 bg-white text-gray-600'}`}
              >
                <option value="">All ideas</option>
                <option value="__none__">No group yet</option>
                {GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
              </select>
            </div>
            {groupFilter && (
              <button onClick={() => setGroupFilter('')} className="header-filter__clear inline-grid place-items-center text-gray-400 hover:text-gray-600 dark:hover:text-slate-300" aria-label="Clear workspace filter"><Icon name="close" size={15} /></button>
            )}
        </div>

        <div className="header-utilities">
          <button
            onClick={() => setAppLayout('obsidian')}
            className="header-action layout-quick-toggle"
            title="Switch to Obsidian Console"
            aria-label="Switch to Obsidian Console layout"
          >
            <Icon name="activity" size={16} />
            <span>Console</span>
          </button>
          <button
            onClick={() => setTheme(nextUiTheme(theme))}
            className="header-action theme-quick-toggle"
            title={`Switch to ${UI_THEMES[nextUiTheme(theme)].label}`}
            aria-label={`Switch to ${UI_THEMES[nextUiTheme(theme)].label} theme`}
          >
            <AppMark />
            <span className="theme-quick-label">{UI_THEMES[theme].short}</span>
          </button>
          <button onClick={() => setSettingsOpen(true)} className="header-action header-action--icon" title="Customise" aria-label="Customise appearance"><Icon name="settings" size={17} /></button>
          <button onClick={() => setTriageOpen(true)} className="header-action header-action--triage relative" aria-label={`Triage ideas, ${triageCount} remaining`}>
            <Icon name="target" size={16} />
            <span>Triage</span>
            {triageCount > 0 && (
              <span className="triage-count">{triageCount}</span>
            )}
          </button>
          <button onClick={exportAllIdeas} className="header-action" title="Export every idea and its full details to CSV">
            <Icon name="download" size={16} />
            <span>Export</span>
          </button>
        </div>
        <button onClick={() => setAddOpen(true)} className="header-action header-action--primary" aria-label="New idea"><Icon name="plus" size={17} /><span>New</span></button>
        <button onClick={() => setMobileToolsOpen(true)} className="header-action mobile-tools-trigger" aria-label="Open workspace and app controls"><Icon name="more" size={22} /></button>
      </header>

      {mobileToolsOpen && (
        <div className="mobile-tools-overlay" onClick={e => { if (e.target === e.currentTarget) setMobileToolsOpen(false) }}>
          <div ref={mobileToolsRef} className="mobile-tools-sheet" role="dialog" aria-modal="true" aria-label="Workspace and app controls" tabIndex={-1}>
            <div className="mobile-tools-handle" aria-hidden="true" />
            <div className="mobile-tools-heading">
              <div>
                <strong>App controls</strong>
                <span>{UI_THEMES[theme].label}</span>
              </div>
              <button onClick={() => setMobileToolsOpen(false)} aria-label="Close app controls"><Icon name="close" size={18} /></button>
            </div>
            <label className="mobile-tools-field">
              <span>Workspace</span>
              <div className="select-icon-field">
                <Icon name={GROUPS.find(group => group.key === groupFilter)?.icon || 'groups'} size={17} />
                <select value={groupFilter} onChange={e => { setGroupFilter(e.target.value); setMobileToolsOpen(false) }}>
                  <option value="">All ideas</option>
                  <option value="__none__">No group yet</option>
                  {GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
                </select>
              </div>
            </label>
            <div className="mobile-tools-actions">
              <button onClick={() => { setMobileToolsOpen(false); setAppLayout('obsidian') }}>
                <span className="mobile-tools-action-icon"><Icon name="activity" size={20} /></span>
                <span><strong>Use Obsidian Console</strong><small>Switch to the operational layout</small></span>
              </button>
              <button onClick={() => { setMobileToolsOpen(false); setTriageOpen(true) }}>
                <span className="mobile-tools-action-icon"><Icon name="target" size={20} /></span>
                <span><strong>Triage ideas</strong><small>{triageCount} remaining</small></span>
              </button>
              <button onClick={() => { setMobileToolsOpen(false); exportAllIdeas() }}>
                <span className="mobile-tools-action-icon"><Icon name="download" size={20} /></span>
                <span><strong>Export all ideas</strong><small>Download every detail as a CSV file</small></span>
              </button>
              <button onClick={() => setTheme(nextUiTheme(theme))}>
                <span className="mobile-tools-action-icon"><AppMark /></span>
                <span><strong>Switch visual system</strong><small>Use {UI_THEMES[nextUiTheme(theme)].label}</small></span>
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
        {tab === 'sprint'   && <SprintPage groupFilter={groupFilter} />}
        {tab === 'groups'   && <GroupsPage onOpenIdea={setOpenId} />}
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

      </>}

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
          appLayout={appLayout}
          setAppLayout={setAppLayout}
        />
      )}
    </div>
  )
}
