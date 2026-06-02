import { useState } from 'react'
import { useStore } from '../lib/store'
import { scoreIdea, gradeFromScore } from '../lib/scoring'
import { TimePill, PlatPill, StatusBadge } from '../components/Pills'

const STATUSES = ['building', 'ready', 'idea', 'done', 'shelved']

export default function SummaryPage({ onOpenIdea }) {
  const { ideas, getStatus } = useStore()
  const [filterStatus, setFilterStatus] = useState('all')
  const [sort, setSort] = useState('score')
  const [search, setSearch] = useState('')

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = ideas.filter(i => getStatus(i) === s).length
    return acc
  }, {})
  counts.all = ideas.length

  let filtered = ideas.filter(i => filterStatus === 'all' || getStatus(i) === filterStatus)
  if (search) {
    const q = search.toLowerCase()
    filtered = filtered.filter(i => i.name.toLowerCase().includes(q) || i.pitch.toLowerCase().includes(q) || String(i.id).includes(q))
  }
  filtered.sort((a, b) => {
    if (sort === 'score')  return scoreIdea(b) - scoreIdea(a)
    if (sort === 'name')   return a.name.localeCompare(b.name)
    if (sort === 'id')     return a.id - b.id
    return 0
  })

  const exportMd = () => {
    const date = new Date().toISOString().slice(0,10)
    const sections = ['building','ready','idea','done'].map(s => {
      const rows = ideas.filter(i => getStatus(i) === s)
      if (!rows.length) return ''
      const labels = { building:'🔨 Building', ready:'✅ Ready to Build', idea:'💡 Ideas', done:'✅ Done' }
      const body = rows.map(i => {
        const mvp = (i.mvp||[]).map(m=>`  - ${m}`).join('\n')
        return `### #${i.id} ${i.name}\n**Status:** ${s} | **Build:** ${i.time} | **Platform:** ${i.plat}\n\n**Pitch:** ${i.pitch}\n\n**Why it wins:** ${i.win}\n\n**MVP:**\n${mvp}\n`
      }).join('\n---\n\n')
      return `## ${labels[s]}\n\n${body}`
    }).filter(Boolean).join('\n\n')
    const md = `# Ideas Pipeline\n_Exported: ${date}_\n\n${sections}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([md], {type:'text/markdown'}))
    a.download = `ideas-pipeline-${date}.md`
    a.click()
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Stats bar */}
      <div className="flex gap-2 px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 overflow-x-auto flex-shrink-0">
        {[['all', 'All', '#5254d6'], ['building','🔨','#2563eb'], ['ready','✅','#059669'], ['idea','💡','#9090b8'], ['done','✓','#5254d6'], ['shelved','🗄','#d97706']].map(([s, label, color]) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all
              ${filterStatus === s ? 'text-white' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            style={filterStatus === s ? { background: color, borderColor: color } : {}}
          >
            {label} <span className="opacity-75">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search + sort + export */}
      <div className="flex gap-2 px-4 py-2 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex-shrink-0">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ideas…"
          className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 outline-none focus:border-violet-400 bg-gray-50"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-gray-50 outline-none"
        >
          <option value="score">Score ↓</option>
          <option value="name">Name</option>
          <option value="id">ID</option>
        </select>
        <button onClick={exportMd} className="text-xs font-bold border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 whitespace-nowrap">
          ⬇ MD
        </button>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <div className="divide-y divide-gray-50">
          {filtered.map(i => {
            const s = scoreIdea(i)
            const st = getStatus(i)
            return (
              <div
                key={i.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer"
                onClick={() => onOpenIdea(i.id)}
              >
                <span className="text-xs text-gray-400 w-7 flex-shrink-0">#{i.id}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-800 truncate">{i.name}</div>
                  <div className="text-xs text-gray-400 truncate hidden sm:block">{i.pitch.slice(0,80)}</div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <StatusBadge status={st} />
                  <TimePill time={i.time} />
                  <span className="hidden sm:block text-[11px] font-bold text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded-lg">{gradeFromScore(s)} {s}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
