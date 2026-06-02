import { useState } from 'react'
import { useStore } from '../lib/store'
import { scoreIdea } from '../lib/scoring'
import { TimePill, StatusBadge } from '../components/Pills'

const CLUSTERS = [
  { key: 'pay',  label: 'pay_modeller',   plats: ['pay'],  desc: 'Remuneration & pay analysis' },
  { key: 'hub',  label: 'Awards Hub',     plats: ['hub'],  desc: 'Award interpretation & rates' },
  { key: 'html', label: 'HR Tools (HTML)',plats: ['html'], desc: 'Standalone HR tools & registers' },
]

const STATUS_ORDER = { building: 0, ready: 1, idea: 2, done: 3, shelved: 4 }

export default function GroupsPage({ onOpenIdea }) {
  const { ideas, getStatus } = useStore()
  // Start all expanded
  const [collapsed, setCollapsed] = useState({})
  const toggle = key => setCollapsed(s => ({ ...s, [key]: !s[key] }))

  return (
    <div className="h-full overflow-auto p-3 space-y-3">
      {CLUSTERS.map(cluster => {
        const clusterIdeas = ideas
          .filter(i => cluster.plats.includes(i.plat))
          .sort((a, b) =>
            (STATUS_ORDER[getStatus(a)] ?? 5) - (STATUS_ORDER[getStatus(b)] ?? 5) ||
            scoreIdea(b) - scoreIdea(a)
          )
        const active  = clusterIdeas.filter(i => !['done', 'shelved'].includes(getStatus(i))).length
        const done    = clusterIdeas.filter(i => getStatus(i) === 'done').length
        const isOpen  = !collapsed[cluster.key]   // default: open

        return (
          <div key={cluster.key} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">

            {/* Section header — tap to toggle */}
            <button
              className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => toggle(cluster.key)}
            >
              <div>
                <div className="font-bold text-gray-900 dark:text-slate-100 text-sm">{cluster.label}</div>
                <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{cluster.desc}</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs font-bold text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400 px-2 py-0.5 rounded-full">{active} active</span>
                {done > 0 && <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{done} done</span>}
                {/* Static chevron character — changes, no CSS rotation needed */}
                <span className="text-gray-400 text-xs">{isOpen ? '▼' : '▶'}</span>
              </div>
            </button>

            {/* Ideas list */}
            {isOpen && (
              <div className="border-t border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700/50">
                {clusterIdeas.length === 0 && (
                  <div className="px-4 py-3 text-xs text-gray-400">No ideas in this group yet.</div>
                )}
                {clusterIdeas.map(idea => {
                  const status = getStatus(idea)
                  const faded  = ['done', 'shelved'].includes(status)
                  return (
                    <div
                      key={idea.id}
                      className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${faded ? 'opacity-50' : ''}`}
                      onClick={() => onOpenIdea(idea.id)}
                    >
                      {/* Title row — always wraps */}
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5 w-6">#{idea.id}</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 leading-snug">{idea.name}</span>
                      </div>
                      {/* Pills row */}
                      <div className="flex items-center gap-1.5 mt-1.5 pl-8 flex-wrap">
                        <TimePill time={idea.time} />
                        <StatusBadge status={status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
