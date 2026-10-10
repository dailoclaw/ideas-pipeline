import { useShallow } from 'zustand/react/shallow'
import { useState } from 'react'
import { useStore } from '../lib/store'
import { sortIdeas, scopeIdeas } from '../lib/scoring'
import { TimePill, StatusBadge } from '../components/Pills'
import { GROUPS } from '../data/groups'
import Icon from '../components/Icon'

const STATUS_ORDER = { building: 0, ready: 1, researching: 2, idea: 3, done: 4, shelved: 5 }

export default function GroupsPage({ onOpenIdea, groupFilter = '' }) {
  const { ideas, getStatus, groupAssignments } = useStore(useShallow(state => ({
    ideas: state.ideas,
    getStatus: state.getStatus,
    groupAssignments: state.groupAssignments,
    statusOverrides: state.statusOverrides,
  })))
  const [collapsed, setCollapsed] = useState({})
  const scoped = scopeIdeas(ideas, groupAssignments, groupFilter)
  const visibleGroups = groupFilter ? GROUPS.filter(group => group.key === groupFilter) : GROUPS
  const ungrouped = sortIdeas(scoped.filter(idea => !groupAssignments[idea.id]), 'score')
  const unknown = sortIdeas(scoped.filter(idea => groupAssignments[idea.id] && !GROUPS.some(group => group.key === groupAssignments[idea.id])), 'score')
  const toggle = key => setCollapsed(s => ({ ...s, [key]: !s[key] }))

  return (
    <div className="groups-page h-full overflow-auto p-3 space-y-3">
      {(!groupFilter || groupFilter === '__none__') && (
        <section className="group-section bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
          <h2 className="font-bold">No workspace · {ungrouped.length}</h2>
          {ungrouped.map(idea => (
            <button key={idea.id} className="block text-left py-2" onClick={() => onOpenIdea(idea.id)}>
              #{idea.id} {idea.name} <StatusBadge status={getStatus(idea)} />
            </button>
          ))}
        </section>
      )}
      {unknown.length > 0 && <section className="group-section bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-4">
        <h2 className="font-bold">Unknown workspace · {unknown.length}</h2>
        <p className="text-xs text-gray-500">Open an idea to assign a supported workspace.</p>
        {unknown.map(idea => <button key={idea.id} className="block text-left py-2" onClick={() => onOpenIdea(idea.id)}>#{idea.id} {idea.name} <StatusBadge status={getStatus(idea)} /></button>)}
      </section>}
      {visibleGroups.map(group => {
        const groupIdeas = sortIdeas(scopeIdeas(scoped, groupAssignments, group.key), 'score')
          .sort((a, b) =>
            (STATUS_ORDER[getStatus(a)] ?? 5) - (STATUS_ORDER[getStatus(b)] ?? 5)
          )
        const active = groupIdeas.filter(i => !['done', 'shelved'].includes(getStatus(i))).length
        const done   = groupIdeas.filter(i => getStatus(i) === 'done').length
        const isOpen = !collapsed[group.key]

        return (
          <div key={group.key} className="group-section bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl overflow-hidden">
            <button
              className="group-section__toggle w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              aria-expanded={isOpen} aria-controls={`workspace-${group.key}`} onClick={() => toggle(group.key)}
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
              <div id={`workspace-${group.key}`} className="border-t border-gray-100 dark:border-slate-700 divide-y divide-gray-50 dark:divide-slate-700/50">
                {groupIdeas.length === 0 ? (
                  <div className="px-4 py-3 text-xs text-gray-400">
                    No ideas assigned to this group yet. Open any idea and set its group.
                  </div>
                ) : (
                  groupIdeas.map(idea => {
                    const status = getStatus(idea)
                    const faded  = ['done', 'shelved'].includes(status)
                    return (
                      <button type="button"
                        key={idea.id}
                        className={`block w-full text-left px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors ${faded ? 'opacity-50' : ''}`}
                        aria-label={`Open #${idea.id} ${idea.name}`} onClick={() => onOpenIdea(idea.id)}
                      >
                        <span className="flex items-start gap-2">
                          <span className="text-xs text-gray-400 dark:text-slate-500 flex-shrink-0 mt-0.5 w-6">#{idea.id}</span>
                          <span className="text-sm font-semibold text-gray-800 dark:text-slate-200 leading-snug">{idea.name}</span>
                        </span>
                        <span className="flex items-center gap-1.5 mt-1.5 pl-8 flex-wrap">
                          <TimePill time={idea.time} />
                          <StatusBadge status={status} />
                        </span>
                      </button>
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
