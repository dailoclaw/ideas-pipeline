import { useState } from 'react'
import { useStore } from '../lib/store'
import { scoreIdea, gradeFromScore } from '../lib/scoring'
import { TimePill, PlatPill, StatusBadge } from '../components/Pills'

const STATUSES = ['building', 'ready', 'idea', 'done', 'shelved']

export default function SummaryPage({ onOpenIdea, groupFilter = '' }) {
  const { ideas, getStatus, getGroup } = useStore()
  const [filterStatus, setFilterStatus] = useState('all')
  const [sort, setSort] = useState('score')
  const [search, setSearch] = useState('')

  // Apply group filter first
  const groupIdeas = groupFilter === '__none__'
    ? ideas.filter(i => !getGroup(i.id))
    : groupFilter
      ? ideas.filter(i => getGroup(i.id) === groupFilter)
      : ideas

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = groupIdeas.filter(i => getStatus(i) === s).length
    return acc
  }, {})
  counts.all = groupIdeas.length

  let filtered = groupIdeas.filter(i => filterStatus === 'all' || getStatus(i) === filterStatus)
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
      const rows = groupIdeas.filter(i => getStatus(i) === s)
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

      {/* Search row */}
      <div className="px-4 py-2 bg-white dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700 flex-shrink-0 space-y-2">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search ideas…"
          className="w-full text-sm border border-gray-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-3 py-1.5 outline-none focus:border-violet-400 bg-gray-50"
        />
        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            className="flex-1 text-xs border border-gray-200 dark:border-slate-700 dark:bg-slate-700 dark:text-slate-100 rounded-lg px-2 py-1.5 bg-gray-50 outline-none"
          >
            <option value="score">Sort: Score ↓</option>
            <option value="name">Sort: Name A–Z</option>
            <option value="id">Sort: ID</option>
          </select>
          <button onClick={exportMd} className="text-xs font-bold border border-gray-200 dark:border-slate-600 dark:text-slate-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-700 whitespace-nowrap flex-shrink-0">
            ⬇ Export MD
          </button>
        </div>
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
                className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                onClick={() => onOpenIdea(i.id)}
              >
                {/* Title row — always wraps */}
                <div className="flex items-start gap-2 mb-1.5">
                  <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5 w-7">#{i.id}</span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 leading-snug">{i.name}</span>
                </div>
                {/* Pills row */}
                <div className="flex items-center gap-1.5 flex-wrap pl-9">
                  <StatusBadge status={st} />
                  <TimePill time={i.time} />
                  <span className="text-[0.6875rem] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-1.5 py-0.5 rounded-lg">{gradeFromScore(s)} {s}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
