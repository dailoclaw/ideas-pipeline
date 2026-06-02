import { useState } from 'react'
import { useStore } from '../lib/store'
import { scoreIdea, sortIdeas, getBuildNext, isStale, daysOld } from '../lib/scoring'
import { TimePill, PlatPill, ScoreBadge } from '../components/Pills'

const VIEWS = ['kanban', 'matrix', 'features']
const VIEW_LABELS = { kanban: 'Kanban', matrix: 'Matrix', features: 'Feature Cards' }

export default function LayoutPage({ onOpenIdea }) {
  const [view, setView] = useState('kanban')
  const { ideas, getStatus, setStatus, getKanbanSort, setKanbanSort } = useStore()
  const [selected, setSelected] = useState(new Set())

  const toggleSelect = (id, e) => {
    e.stopPropagation()
    setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const clearSelected = () => setSelected(new Set())

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toggle bar */}
      <div className="flex gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex-shrink-0 overflow-x-auto">
        {VIEWS.map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all
              ${view === v ? 'bg-violet-600 text-white' : 'border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >{VIEW_LABELS[v]}</button>
        ))}
      </div>

      {/* View */}
      <div className="flex-1 overflow-auto p-3 sm:p-4">
        {view === 'kanban'   && <KanbanView ideas={ideas} getStatus={getStatus} setStatus={setStatus} onOpen={onOpenIdea} selected={selected} toggleSelect={toggleSelect} getKanbanSort={getKanbanSort} setKanbanSort={setKanbanSort} />}
        {view === 'matrix'  && <MatrixView ideas={ideas} getStatus={getStatus} onOpen={onOpenIdea} />}
        {view === 'features' && <FeaturesView ideas={ideas} getStatus={getStatus} onOpen={onOpenIdea} />}
      </div>

      {/* Batch bar */}
      {selected.size > 0 && (
        <BatchBar
          count={selected.size}
          onAction={async status => {
            await useStore.getState().batchSetStatus(selected, status)
            clearSelected()
          }}
          onClear={clearSelected}
        />
      )}
    </div>
  )
}

// ── Kanban ───────────────────────────────────────────────────────────────────
function KanbanView({ ideas, getStatus, setStatus, onOpen, selected, toggleSelect, getKanbanSort, setKanbanSort }) {
  const ks = getKanbanSort()
  const activeFilter = i => { const s = getStatus(i); return s !== 'done' && s !== 'shelved' }
  const quick   = sortIdeas(ideas.filter(i => i.time === '1w'   && activeFilter(i)), ks.quick   || 'score')
  const medium  = sortIdeas(ideas.filter(i => i.time === '1-2w' && activeFilter(i)), ks.medium  || 'score')
  const project = sortIdeas(ideas.filter(i => i.time === '2-4w' && activeFilter(i)), ks.project || 'score')
  const done    = ideas.filter(i => getStatus(i) === 'done')
  const recommend = getBuildNext(ideas, getStatus)

  const card = i => {
    const stale = isStale(i, getStatus)
    const sel = selected.has(i.id)
    return (
      <div
        key={i.id}
        className={`kb-card idea-card bg-white border rounded-xl p-2.5 cursor-pointer
          ${sel ? 'border-violet-400 bg-violet-50 shadow-sm shadow-violet-100' : 'border-gray-200 hover:border-violet-300'}`}
        onClick={() => onOpen(i.id)}
      >
        <div className="flex items-start justify-between gap-1 mb-1">
          <div className="text-xs font-semibold text-gray-800 leading-snug flex-1">
            #{i.id} {i.name}
          </div>
          <input
            type="checkbox"
            checked={sel}
            onChange={() => {}}
            onClick={e => toggleSelect(i.id, e)}
            className="mt-0.5 flex-shrink-0 accent-violet-600"
          />
        </div>
        <div className="text-[0.6875rem] text-gray-400 leading-snug mb-1.5">{i.pitch.slice(0, 60)}…</div>
        <div className="flex items-center gap-1 flex-wrap">
          <ScoreBadge idea={i} />
          {stale && <span className="text-[0.625rem] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">🟠 {daysOld(i)}d</span>}
        </div>
      </div>
    )
  }

  const SortSelect = ({ col }) => (
    <select
      value={ks[col] || 'score'}
      onChange={e => setKanbanSort(col, e.target.value)}
      onClick={e => e.stopPropagation()}
      className="text-[0.625rem] border border-gray-200 rounded-md px-1 py-0.5 bg-gray-50 text-gray-500 outline-none"
    >
      <option value="score">Score</option>
      <option value="name">Name</option>
      <option value="id">ID</option>
    </select>
  )

  const Col = ({ ideas, label, color, col }) => (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-gray-100">
        <span className="text-[0.6875rem] font-bold uppercase tracking-wider" style={{ color }}>{label} ({ideas.length})</span>
        {col && <SortSelect col={col} />}
      </div>
      <div className="kb-cards">{ideas.map(card)}</div>
    </div>
  )

  return (
    <div>
      {/* Build Next banner */}
      {recommend && (
        <div className="flex items-center gap-2 flex-wrap bg-gradient-to-r from-green-50 to-violet-50 border border-green-200 rounded-xl px-3 py-2 mb-3">
          <span className="text-[0.625rem] font-bold text-green-700 uppercase tracking-wider whitespace-nowrap">⭐ Build Next</span>
          <span className="text-xs font-bold text-gray-800 flex-1 min-w-0 truncate">#{recommend.id} {recommend.name}</span>
          <TimePill time={recommend.time} />
          <button
            onClick={() => setStatus(recommend.id, 'building')}
            className="text-[0.6875rem] font-bold bg-green-600 text-white px-2.5 py-1 rounded-lg whitespace-nowrap"
          >🔨 Start</button>
          <button
            onClick={() => onOpen(recommend.id)}
            className="text-[0.6875rem] font-semibold text-gray-500 border border-gray-200 px-2.5 py-1 rounded-lg whitespace-nowrap"
          >Details</button>
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Col ideas={quick}   label="⚡ Quick — 1 wk"      color="#059669" col="quick" />
        <Col ideas={medium}  label="⏱ Medium — 1–2 wks"   color="#2563eb" col="medium" />
        <Col ideas={project} label="🏗 Project — 2–4 wks"  color="#d97706" col="project" />
        {done.length > 0 && <Col ideas={done} label="✅ Done" color="#5254d6" col={null} />}
      </div>
    </div>
  )
}

// ── Effort × Impact Matrix ───────────────────────────────────────────────────
function MatrixView({ ideas, getStatus, onOpen }) {
  const active = i => !['done','shelved'].includes(getStatus(i))
  const PLACED = new Set([23,25,50,74,58,60,52,6,65,57,73,51,18])
  const q1 = [23,25,50,74,58].map(id => ideas.find(i=>i.id===id)).filter(Boolean).filter(active)
  const q2 = [60,52,6].map(id => ideas.find(i=>i.id===id)).filter(Boolean).filter(active)
  const q3 = [65,57,73].map(id => ideas.find(i=>i.id===id)).filter(Boolean).filter(active)
  const q4 = [51,18].map(id => ideas.find(i=>i.id===id)).filter(Boolean).filter(active)
  ideas.filter(i => !PLACED.has(i.id) && active(i)).forEach(i => {
    if      (i.time === '1w')                          q1.push(i)
    else if (i.time === '1-2w' && i.plat === 'hub')   q2.push(i)
    else if (i.time === '2-4w')                        q2.push(i)
    else                                               q3.push(i)
  })

  const Quad = ({ ideas, label, color, bg, border }) => (
    <div className={`rounded-xl p-3 ${bg} border ${border}`}>
      <div className="text-[0.625rem] font-bold uppercase tracking-wide mb-2" style={{ color }}>{label}</div>
      {ideas.map(i => (
        <div key={i.id} className="text-xs text-gray-600 py-0.5 cursor-pointer hover:text-violet-600" onClick={() => onOpen(i.id)}>
          <span className="font-semibold text-gray-800">#{i.id}</span> {i.name}
          {i.isNew && <span className="ml-1 text-[0.5625rem] font-bold bg-violet-100 text-violet-600 px-1 py-0.5 rounded">NEW</span>}
        </div>
      ))}
    </div>
  )

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[0.625rem] text-gray-400 px-1"><span>← High effort</span><span>Low effort →</span></div>
      <div className="grid grid-cols-2 gap-2">
        <Quad ideas={q2} label="⬆ High impact · High effort — Build next quarter" color="#d97706" bg="bg-amber-50/50" border="border-amber-200" />
        <Quad ideas={q1} label="★ High impact · Low effort — Build now"          color="#059669" bg="bg-green-50/50"  border="border-green-200" />
        <Quad ideas={q4} label="Low impact · High effort — Reconsider"            color="#9090b8" bg="bg-gray-50/50"   border="border-gray-200" />
        <Quad ideas={q3} label="Low impact · Low effort — Fill gaps"              color="#5254d6" bg="bg-violet-50/50" border="border-violet-200" />
      </div>
      <div className="flex justify-between text-[0.625rem] text-gray-400 px-1"><span>↑ Low impact</span><span>High impact ↑</span></div>
    </div>
  )
}

// ── Feature Cards ────────────────────────────────────────────────────────────
function FeaturesView({ ideas, getStatus, onOpen }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {ideas.map(i => (
        <div
          key={i.id}
          className="idea-card bg-white border border-gray-200 rounded-2xl p-4 cursor-pointer hover:border-violet-300"
          onClick={() => onOpen(i.id)}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="text-sm font-bold text-gray-900">#{i.id} {i.name}</div>
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
function BatchBar({ count, onAction, onClear }) {
  return (
    <div className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-2xl px-4 py-2.5 flex items-center gap-2 shadow-2xl z-40 text-xs font-bold whitespace-nowrap">
      <span className="text-gray-300 mr-1">{count} selected</span>
      <button onClick={() => onAction('building')} className="bg-blue-600 px-2.5 py-1.5 rounded-lg">🔨 Building</button>
      <button onClick={() => onAction('ready')}    className="bg-green-600 px-2.5 py-1.5 rounded-lg">✅ Ready</button>
      <button onClick={() => onAction('done')}     className="bg-violet-600 px-2.5 py-1.5 rounded-lg">✓ Done</button>
      <button onClick={() => onAction('shelved')}  className="border border-white/20 px-2.5 py-1.5 rounded-lg text-amber-300">🗄</button>
      <button onClick={onClear} className="text-gray-400 ml-1 px-1">✕</button>
    </div>
  )
}
