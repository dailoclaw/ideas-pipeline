import { useState } from 'react'
import { useStore } from '../lib/store'
import { scoreIdea } from '../lib/scoring'
import { TimePill, PlatPill, StatusBadge } from '../components/Pills'

const CLUSTERS = [
  { key: 'pay',        label: 'pay_modeller',       plats: ['pay'],  desc: 'Remuneration & pay analysis tools' },
  { key: 'hub',        label: 'Awards Hub',          plats: ['hub'],  desc: 'Award interpretation & rate lookup' },
  { key: 'html',       label: 'HR Tools (HTML)',     plats: ['html'], desc: 'Standalone HR tools & registers' },
]

export default function GroupsPage({ onOpenIdea }) {
  const { ideas, getStatus } = useStore()
  const [collapsed, setCollapsed] = useState({})

  const toggle = key => setCollapsed(s => ({ ...s, [key]: !s[key] }))

  const statusOrder = { building: 0, ready: 1, idea: 2, done: 3, shelved: 4 }

  return (
    <div className="flex flex-col h-full overflow-auto p-4 space-y-3">
      {CLUSTERS.map(cluster => {
        const clusterIdeas = ideas
          .filter(i => cluster.plats.includes(i.plat))
          .sort((a, b) => (statusOrder[getStatus(a)] ?? 5) - (statusOrder[getStatus(b)] ?? 5) || scoreIdea(b) - scoreIdea(a))

        const active = clusterIdeas.filter(i => !['done','shelved'].includes(getStatus(i)))
        const done   = clusterIdeas.filter(i => getStatus(i) === 'done')
        const isCollapsed = collapsed[cluster.key]

        return (
          <div key={cluster.key} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            {/* Header */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
              onClick={() => toggle(cluster.key)}
            >
              <div>
                <div className="font-bold text-gray-900 dark:text-slate-100 text-sm">{cluster.label}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500">{cluster.desc}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">{active.length} active</span>
                {done.length > 0 && <span className="text-xs font-semibold text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{done.length} done</span>}
                <span className={`text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} style={{fontSize:'10px'}}>▼</span>
              </div>
            </button>

            {/* Ideas list */}
            {!isCollapsed && (
              <div className="divide-y divide-gray-50 dark:divide-slate-700">
                {clusterIdeas.map(idea => {
                  const status = getStatus(idea)
                  return (
                    <div
                      key={idea.id}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors
                        ${['done','shelved'].includes(status) ? 'opacity-50' : ''}`}
                      onClick={() => onOpenIdea(idea.id)}
                    >
                      <span className="text-xs text-gray-400 dark:text-slate-500 w-7 flex-shrink-0">#{idea.id}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">{idea.name}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <TimePill time={idea.time} />
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  )
                })}
                {clusterIdeas.length === 0 && (
                  <div className="px-4 py-3 text-xs text-gray-400 dark:text-slate-500">No ideas in this group yet.</div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
