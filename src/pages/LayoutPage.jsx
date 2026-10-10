import { useShallow } from 'zustand/react/shallow'
import { matrixQuadrant } from '../lib/scoring'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { scoreIdea, scopeIdeas, sortIdeas, getBuildNext, isStale, daysOld } from '../lib/scoring'
import { TimePill, PlatPill, ScoreBadge, StatusRail } from '../components/Pills'
import Icon from '../components/Icon'
import { useMorphPill } from '../hooks/useMorphPill'

const VIEWS = ['kanban', 'matrix', 'features']
const VIEW_LABELS = { kanban: 'Kanban', matrix: 'Matrix', features: 'Feature Cards' }

export default function LayoutPage({ onOpenIdea, groupFilter = '' }) {
  const [view, setView] = useState('kanban')
  const { ideas, getStatus, setStatus, getKanbanSort, setKanbanSort, groupAssignments, statusOverrides, pendingSaves } = useStore(useShallow(state => ({
    ideas: state.ideas,
    getStatus: state.getStatus,
    setStatus: state.setStatus,
    getKanbanSort: state.getKanbanSort,
    setKanbanSort: state.setKanbanSort,
    groupAssignments: state.groupAssignments,
    statusOverrides: state.statusOverrides,
    pendingSaves: state.pendingSaves,
    preferenceRevision: state.preferenceRevision,
  })))
  const [selected, setSelected] = useState(new Set())
  const canvasRef = useRef(null)
  const switcherRef = useRef(null)
  useMorphPill(switcherRef, view)

  useEffect(() => {
    const scroller = canvasRef.current?.closest('.obsidian-main') || canvasRef.current
    if (scroller) scroller.scrollTop = 0
  }, [view])

  const filteredIdeas = scopeIdeas(ideas, groupAssignments, groupFilter)

  const scopeVersion = `${groupFilter}:${view}`
  const currentScope = useRef(scopeVersion)
  currentScope.current = scopeVersion
  const visibleIds = new Set(view === 'kanban' ? filteredIdeas.filter(idea => getStatus(idea) === 'done' || getStatus(idea) !== 'shelved').map(idea => idea.id) : [])
  const visibleSelected = new Set([...selected].filter(id => visibleIds.has(id)))
  useLayoutEffect(() => {
    setSelected(new Set())
    if (useStore.getState().saveFeedback?.method === 'batchSetStatus') useStore.getState().clearSaveFeedback()
  }, [groupFilter, view])
  useLayoutEffect(() => {
    setSelected(previous => {
      const next = new Set([...previous].filter(id => visibleIds.has(id)))
      if (next.size === previous.size) return previous
      return next
    })
    if (selected.size !== visibleSelected.size && useStore.getState().saveFeedback?.method === 'batchSetStatus') useStore.getState().clearSaveFeedback()
  }, [ideas, groupAssignments, statusOverrides, view, groupFilter, selected])
  useEffect(() => {
    currentScope.current = scopeVersion
    return () => {
      currentScope.current = null
      if (useStore.getState().saveFeedback?.method === 'batchSetStatus') useStore.getState().clearSaveFeedback()
    }
  }, [])

  const toggleSelect = (id, e) => {
    e.stopPropagation()
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const clearSelected = () => setSelected(new Set())

  return (
    <div className="layout-page flex flex-col h-full overflow-hidden">
      {/* Toggle bar */}
      <div ref={switcherRef} className="view-switcher flex gap-1.5 px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex-shrink-0 flex-wrap">
        {VIEWS.map(v => (
          <button
            key={v}
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`view-switcher__button px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all
              ${view === v ? 'is-active bg-violet-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >{VIEW_LABELS[v]}</button>
        ))}
      </div>

      <p className="px-4 py-1 text-xs text-gray-500">Selections clear when the workspace or view changes.</p>

      {/* View */}
      <div ref={canvasRef} className="layout-canvas flex-1 overflow-auto p-3 sm:p-4">
        {view === 'kanban'   && <KanbanView ideas={filteredIdeas} getStatus={getStatus} setStatus={setStatus} onOpen={onOpenIdea} selected={visibleSelected} toggleSelect={toggleSelect} getKanbanSort={getKanbanSort} setKanbanSort={setKanbanSort} pendingSaves={pendingSaves} />}
        {view === 'matrix'  && <MatrixView ideas={filteredIdeas} getStatus={getStatus} onOpen={onOpenIdea} />}
        {view === 'features' && <FeaturesView ideas={filteredIdeas} onOpen={onOpenIdea} />}
      </div>

      {/* Batch bar */}
      {visibleSelected.size > 0 && (
        <BatchBar
          disabled={!!pendingSaves.batch}
          count={visibleSelected.size}
          onAction={async status => {
            try {
              await useStore.getState().batchSetStatus(visibleSelected, status)
              if (currentScope.current === scopeVersion) clearSelected()
            }
            catch {
              if (currentScope.current !== scopeVersion && useStore.getState().saveFeedback?.method === 'batchSetStatus') useStore.getState().clearSaveFeedback()
            }
          }}
          onClear={clearSelected}
        />
      )}
    </div>
  )
}

// ── Kanban ───────────────────────────────────────────────────────────────────
function KanbanView({ ideas, getStatus, setStatus, onOpen, selected, toggleSelect, getKanbanSort, setKanbanSort, pendingSaves }) {
  const ks = getKanbanSort()
  const activeFilter = i => { const s = getStatus(i); return s !== 'done' && s !== 'shelved' }
  const quick   = sortIdeas(ideas.filter(i => i.time === '1w'   && activeFilter(i)), ks.quick   || 'score')
  const medium  = sortIdeas(ideas.filter(i => i.time === '1-2w' && activeFilter(i)), ks.medium  || 'score')
  const project = sortIdeas(ideas.filter(i => i.time === '2-4w' && activeFilter(i)), ks.project || 'score')
  const unknown = sortIdeas(ideas.filter(i => !['1w', '1-2w', '2-4w'].includes(i.time) && activeFilter(i)), 'score')
  const done    = ideas.filter(i => getStatus(i) === 'done')
  const recommend = getBuildNext(ideas, getStatus)

  const card = i => {
    const stale = isStale(i, getStatus)
    const sel = selected.has(i.id)
    const status = getStatus(i)
    return (
      <div
        key={i.id}
        className={`kb-card idea-card bg-white border rounded-xl p-2.5 cursor-pointer
          ${sel ? 'border-violet-400 bg-violet-50 shadow-sm shadow-violet-100' : 'border-gray-200 hover:border-violet-300'}`}
        style={{ '--v': Math.min(100, scoreIdea(i)) }}
        onClick={e => { if (!e.target.closest('button,input')) onOpen(i.id) }}
      >
        <i className="au-bracket" aria-hidden="true" /><i className="au-bracket" aria-hidden="true" />
        <i className="au-bracket" aria-hidden="true" /><i className="au-bracket" aria-hidden="true" />
        <StatusRail status={status} />
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className="text-xs font-semibold text-gray-800 leading-snug flex-1">
            <button type="button" className="card-open text-left" aria-label={`Open #${i.id} ${i.name}`} onClick={() => onOpen(i.id)} onKeyDown={e => { if (e.key.toLowerCase() === 'x') { e.preventDefault(); toggleSelect(i.id, e) } }}>
              {i.isPriority && <Icon name="starFilled" size={12} className="inline mr-1 text-amber-500" />}#{i.id} {i.name}</button>
          </div>
          <input
            aria-label={`Select #${i.id} ${i.name}`}
            type="checkbox"
            checked={sel}
            onChange={e => toggleSelect(i.id, e)}
            onClick={e => e.stopPropagation()}
            className="mt-0.5 flex-shrink-0 accent-violet-600"
          />
        </div>
        <div className="text-[0.6875rem] text-gray-400 leading-snug mb-1.5">{i.pitch.slice(0, 60)}…</div>
        <div className="flex items-center gap-1 flex-wrap">
          <ScoreBadge idea={i} />
          {stale && <span className="icon-pill inline-flex items-center gap-1 text-[0.625rem] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full"><Icon name="clock" size={11} /> {daysOld(i)}d</span>}
        </div>
        <span className="au-keys" aria-hidden="true"><kbd>↵</kbd> open · <kbd>X</kbd> select</span>
      </div>
    )
  }

  const SortSelect = ({ col }) => (
    <select
      aria-label={`Sort ${col} ideas`} value={ks[col] || 'score'}
      onChange={e => setKanbanSort(col, e.target.value)}
      onClick={e => e.stopPropagation()}
      className="text-[0.625rem] border border-gray-200 rounded-md px-1 py-0.5 bg-gray-50 text-gray-500 outline-none"
    >
      <option value="score">Score</option>
      <option value="name">Name</option>
      <option value="id">ID</option>
    </select>
  )

  const renderColumn = ({ ideas, label, icon, color, col }) => (
    <div className="kanban-column min-w-0">
      <div className="kanban-column__header flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100">
        <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-wider" style={{ color }}><Icon name={icon} size={13} /> {label} ({ideas.length})</span>
        {col && SortSelect({ col })}
      </div>
      <div className="kb-cards">{ideas.map(card)}</div>
    </div>
  )

  return (
    <div>
      {/* Build Next banner */}
      {recommend && (
        <div className="build-next flex items-center gap-2 flex-wrap bg-gradient-to-r from-green-50 to-violet-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
          <span className="build-next__eyebrow inline-flex items-center gap-1 text-[0.625rem] font-bold text-green-700 uppercase tracking-wider whitespace-nowrap"><Icon name="starFilled" size={12} /> Build Next</span>
          <span className="build-next__title text-xs font-bold text-gray-800 flex-1 min-w-0 truncate">#{recommend.id} {recommend.name}</span>
          <span className="build-next__time"><TimePill time={recommend.time} /></span>
          <div className="build-next__actions">
            <button
              disabled={!!pendingSaves[recommend.id]}
              onClick={() => { void setStatus(recommend.id, 'building').catch(() => {}) }}
              className="inline-flex items-center justify-center gap-1 text-[0.6875rem] font-bold bg-green-600 text-white px-3 py-1 rounded-lg whitespace-nowrap"
            ><Icon name="hammer" size={13} /> Start</button>
            <button
              onClick={() => onOpen(recommend.id)}
              className="text-[0.6875rem] font-semibold text-gray-500 border border-gray-200 px-3 py-1 rounded-lg whitespace-nowrap"
            >Details</button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {renderColumn({ ideas: quick, label: 'Quick — 1 wk', icon: 'bolt', color: '#059669', col: 'quick' })}
        {renderColumn({ ideas: medium, label: 'Medium — 1–2 wks', icon: 'clock', color: '#2563eb', col: 'medium' })}
        {renderColumn({ ideas: project, label: 'Project — 2–4 wks', icon: 'blocks', color: '#d97706', col: 'project' })}
        {unknown.length > 0 && renderColumn({ ideas: unknown, label: 'Unknown build time — edit to classify', icon: 'clock', color: '#9090b8', col: null })}
        {done.length > 0 && renderColumn({ ideas: done, label: 'Done', icon: 'circleCheck', color: '#5254d6', col: null })}
      </div>
    </div>
  )
}

function Quad({ ideas, label, color, bg, border, onOpen }) {
  return (
    <div className={`rounded-xl p-3 ${bg} border ${border}`}>
      <div className="text-[0.625rem] font-bold uppercase tracking-wide mb-2" style={{ color }}>{label}</div>
      {ideas.map(i => (
        <button type="button" aria-label={`Open #${i.id} ${i.name}`} key={i.id} className="block text-left text-xs text-gray-600 py-0.5 cursor-pointer hover:text-violet-600" onClick={() => onOpen(i.id)}>
          <span className="font-semibold text-gray-800">#{i.id}</span> {i.name}
          {i.isNew && <span className="ml-1 text-[0.5625rem] font-bold bg-violet-100 text-violet-600 px-1 py-0.5 rounded">NEW</span>}
        </button>
      ))}
    </div>
  )
}

// ── Effort × Impact Matrix ───────────────────────────────────────────────────
function MatrixView({ ideas, getStatus, onOpen }) {
  const active = i => !['done','shelved'].includes(getStatus(i))
  const quadrants = { q1: [], q2: [], q3: [], q4: [], unknown: [] }
  sortIdeas(ideas.filter(active), 'score').forEach(idea => quadrants[matrixQuadrant(idea)].push(idea))
  const { q1, q2, q3, q4, unknown } = quadrants

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-gray-500">Heuristic: high impact = platform + MVP + novelty + pain ≥ 40 / 65. Low effort = 1–2 weeks; high effort = 2–4 weeks. Manual adjustment affects ranking only. Placement updates with idea attributes.</p>
      {unknown.length > 0 && <Quad onOpen={onOpen} ideas={unknown} label="Unknown classification — edit to classify" color="#9090b8" bg="bg-gray-50/50" border="border-gray-200" />}
      <div className="flex justify-between text-[0.625rem] text-gray-400 px-1"><span>← High effort</span><span>Low effort →</span></div>
      <div className="grid grid-cols-2 gap-2">
        <Quad onOpen={onOpen} ideas={q2} label="High impact · High effort — Build next quarter"   color="#d97706" bg="bg-amber-50/50" border="border-amber-200" />
        <Quad onOpen={onOpen} ideas={q1} label="High impact · Low effort — Build now"            color="#059669" bg="bg-green-50/50"  border="border-green-200" />
        <Quad onOpen={onOpen} ideas={q4} label="Low impact · High effort — Reconsider"            color="#9090b8" bg="bg-gray-50/50"   border="border-gray-200" />
        <Quad onOpen={onOpen} ideas={q3} label="Low impact · Low effort — Fill gaps"              color="#5254d6" bg="bg-violet-50/50" border="border-violet-200" />
      </div>
      <div className="flex justify-between text-[0.625rem] text-gray-400 px-1"><span>↑ Low impact</span><span>High impact ↑</span></div>
    </div>
  )
}

// ── Feature Cards ────────────────────────────────────────────────────────────
function FeaturesView({ ideas, onOpen }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ideas.map(i => (
        <div
          key={i.id}
          className="idea-card bg-white border border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-violet-300"
          onClick={e => { if (!e.target.closest('button,input')) onOpen(i.id) }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <button type="button" className="card-open text-left text-sm font-bold text-gray-900" aria-label={`Open #${i.id} ${i.name}`} onClick={() => onOpen(i.id)}>#{i.id} {i.name}</button>
            <TimePill time={i.time} />
          </div>
          <p className="text-xs text-gray-500 leading-relaxed mb-3">{i.pitch}</p>
          <div className="text-xs text-green-700 border-l-2 border-green-200 pl-2">{i.win}</div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            <PlatPill plat={i.plat} />
            <ScoreBadge idea={i} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Batch action bar ─────────────────────────────────────────────────────────
function BatchBar({ count, onAction, onClear, disabled }) {
  return (
    <div className="batch-bar fixed left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-2xl z-40 text-xs font-bold whitespace-nowrap">
      <span className="batch-bar__count text-gray-300 mr-1">{count} selected</span>
      <button disabled={disabled} onClick={() => onAction('building')} className="batch-bar__action inline-flex items-center justify-center gap-1 bg-blue-600 px-2.5 py-1.5 rounded-lg"><Icon name="hammer" size={13} /> Building</button>
      <button disabled={disabled} onClick={() => onAction('ready')}    className="batch-bar__action inline-flex items-center justify-center gap-1 bg-green-600 px-2.5 py-1.5 rounded-lg"><Icon name="circleCheck" size={13} /> Ready</button>
      <button disabled={disabled} onClick={() => onAction('done')}     className="batch-bar__action inline-flex items-center justify-center gap-1 bg-violet-600 px-2.5 py-1.5 rounded-lg"><Icon name="check" size={13} /> Done</button>
      <button disabled={disabled} onClick={() => onAction('shelved')}  className="batch-bar__action inline-flex items-center justify-center border border-white/20 px-2.5 py-1.5 rounded-lg text-amber-300" aria-label="Shelve selected ideas"><Icon name="archive" size={14} /></button>
      <button onClick={onClear} className="batch-bar__clear inline-grid place-items-center text-gray-400 ml-1 px-1" aria-label="Clear selection"><Icon name="close" size={15} /></button>
    </div>
  )
}
