import { useState } from 'react'
import { useStore } from '../lib/store'
import { scoreIdea } from '../lib/scoring'
import { TimePill, StatusBadge } from '../components/Pills'
import { GROUPS } from '../data/groups'
import Icon from '../components/Icon'

const STATUS_ORDER = { building: 0, ready: 1, idea: 2, done: 3, shelved: 4 }

export default function GroupsPage({ onOpenIdea }) {
  const { ideas, getStatus, getGroup } = useStore()
  const [collapsed, setCollapsed] = useState({})
  const toggle = key => setCollapsed(s => ({ ...s, [key]: !s[key] }))

  return (
    <div className="groups-page h-full overflow-auto p-3 space-y-3">
      {GROUPS.map(group => {
        const groupIdeas = ideas
          .filter(i => getGroup(i.id) === group.key)
          .sort((a, b) =>
            (STATUS_ORDER[getStatus(a)] ?? 5) - (STATUS_ORDER[getStatus(b)] ?? 5) ||
            scoreIdea(b) - scoreIdea(a)
          )
        const active = groupIdeas.filter(i => !['done', 'shelved'].includes(getStatus(i))).length
        const done   = groupIdeas.filter(i => getStatus(i) === 'done').length
        const isOpen = !collapsed[group.key]

        return (
          <div key={group.key} className="group-section bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <button
              className="group-section__toggle w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              onClick={() => toggle(group.key)}
            >
              <div className="group-section__copy flex items-center gap-2">
                <span className="group-icon" aria-hidden="true"><Icon name={group.icon} size={18} /></span>
                <div>
                  <div className="font-bold text-gray-900 dark:text-slate-100 text-sm">{group.label}</div>
                  <div className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{group.desc}</div>
                </div>
              </div>
              <div className="group-section__metrics flex items-center gap-2 flex-shrink-0 ml-2">
                {groupIdeas.length === 0
                  ? <span className="text-xs text-gray-300 italic">No ideas assigned</span>
                  : <span className="text-xs font-bold text-violet-600 bg-violet-50 dark:bg-violet-900/30 dark:text-violet-400 px-2 py-0.5 rounded-full">{active} active</span>
                }
                {done > 0 && <span className="text-xs text-gray-400 bg-gray-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{done} done</span>}
                <Icon name={isOpen ? 'chevronDown' : 'chevronRight'} size={15} className="text-gray-400" />
              </div>
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700/50">
                {groupIdeas.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-400">
                    No ideas assigned to this group yet. Open any idea and set its group.
                  </div>
                ) : (
                  groupIdeas.map(idea => {
                    const status = getStatus(idea)
                    const faded  = ['done', 'shelved'].includes(status)
                    return (
                      <div
                        key={idea.id}
                        className={`px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${faded ? 'opacity-50' : ''}`}
                        onClick={() => onOpenIdea(idea.id)}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5 w-6">#{idea.id}</span>
                          <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 leading-snug">{idea.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 pl-8 flex-wrap">
                          <TimePill time={idea.time} />
                          <StatusBadge status={status} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
