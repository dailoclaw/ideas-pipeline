import { useState } from 'react'
import { useStore } from '../lib/store'
import { scoreIdea } from '../lib/scoring'
import { TimePill, PlatPill } from '../components/Pills'

const WEEKS = 8
const SPRINT_KEY = 'ideas-webapp-sprint-plan'  // { [ideaId]: weekNum }

function loadPlan() {
  try { return JSON.parse(localStorage.getItem(SPRINT_KEY) || '{}') } catch { return {} }
}
function savePlan(plan) {
  localStorage.setItem(SPRINT_KEY, JSON.stringify(plan))
}

export default function SprintPage({ onOpenIdea }) {
  const { ideas, getStatus, getSprintWeeks } = useStore()
  const [plan, setPlan]     = useState(loadPlan)
  const [selected, setSelected] = useState(null)  // id of idea being assigned

  const active = ideas
    .filter(i => !['done', 'shelved'].includes(getStatus(i)))
    .sort((a, b) => scoreIdea(b) - scoreIdea(a))

  const scheduled   = active.filter(i => plan[i.id])
  const unscheduled = active.filter(i => !plan[i.id])

  const assignToWeek = (ideaId, week) => {
    const next = { ...plan }
    if (week === null) { delete next[ideaId] }
    else { next[ideaId] = week }
    setPlan(next)
    savePlan(next)
    setSelected(null)
  }

  const totalWeeks = scheduled.reduce((sum, i) => sum + (getSprintWeeks(i.id, i) || 1), 0)

  // Build week grid: weekNum → list of ideas
  const grid = {}
  for (let w = 1; w <= WEEKS; w++) grid[w] = []
  scheduled.forEach(i => {
    const w = plan[i.id]
    if (w >= 1 && w <= WEEKS) grid[w].push(i)
  })

  return (
    <div className="h-full overflow-auto p-3 space-y-4">

      {/* Stats bar */}
      <div className="flex gap-3 flex-wrap">
        <StatPill label="Scheduled" value={scheduled.length} color="text-violet-600" />
        <StatPill label="Unscheduled" value={unscheduled.length} color="text-gray-500" />
        <StatPill label="Total weeks" value={totalWeeks} color="text-blue-600" />
      </div>

      {/* Week grid */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2 px-1">Sprint Plan</div>
        <div className="space-y-2">
          {Array.from({ length: WEEKS }, (_, i) => i + 1).map(week => {
            const weekIdeas = grid[week]
            return (
              <div key={week} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900/50">
                  <span className="text-xs font-bold text-gray-600 dark:text-slate-400">Week {week}</span>
                  {week <= 4
                    ? <span className="text-xs text-gray-400">Month 1</span>
                    : <span className="text-xs text-amber-500">Month 2</span>
                  }
                  <span className="ml-auto text-xs text-gray-400">{weekIdeas.length} idea{weekIdeas.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="p-2 min-h-[48px]">
                  {weekIdeas.length === 0 && (
                    <div className="text-xs text-gray-300 dark:text-slate-600 py-2 px-1 italic">Empty — drag an idea here</div>
                  )}
                  {weekIdeas.map(idea => (
                    <div
                      key={idea.id}
                      className="flex items-start gap-2 p-2 mb-1 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-800 dark:text-slate-200 leading-snug">#{idea.id} {idea.name}</div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          <TimePill time={idea.time} />
                          <span className="text-xs text-gray-400">{getSprintWeeks(idea.id, idea)} wks</span>
                        </div>
                      </div>
                      <button
                        onClick={() => assignToWeek(idea.id, null)}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0 px-1 text-sm"
                        title="Remove from sprint"
                      >✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Backlog */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2 px-1">
          Backlog — {unscheduled.length} unscheduled (tap to assign)
        </div>
        <div className="space-y-1.5">
          {unscheduled.map(idea => (
            <div key={idea.id}>
              <div
                className={`bg-white dark:bg-slate-800 border rounded-xl p-3 cursor-pointer transition-colors
                  ${selected === idea.id
                    ? 'border-violet-400 dark:border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-gray-200 dark:border-slate-700 hover:border-violet-300'
                  }`}
                onClick={() => setSelected(selected === idea.id ? null : idea.id)}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 leading-snug">
                      #{idea.id} {idea.name}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <TimePill time={idea.time} />
                      <PlatPill plat={idea.plat} />
                    </div>
                  </div>
                  <span className="text-gray-400 dark:text-slate-500 text-xs flex-shrink-0 mt-0.5">
                    {selected === idea.id ? '▲' : '▼'}
                  </span>
                </div>
              </div>

              {/* Week picker — expands inline */}
              {selected === idea.id && (
                <div className="mt-1 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
                  <div className="text-xs font-semibold text-gray-500 dark:text-slate-400 mb-2">Assign to week:</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {Array.from({ length: WEEKS }, (_, i) => i + 1).map(w => (
                      <button
                        key={w}
                        onClick={() => assignToWeek(idea.id, w)}
                        className="py-2 rounded-lg border text-xs font-bold border-gray-200 dark:border-slate-700 hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-colors"
                      >Wk {w}</button>
                    ))}
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="mt-2 w-full text-xs text-gray-400 py-1.5 border border-gray-100 dark:border-slate-700 rounded-lg"
                  >Cancel</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-3 py-2 text-center min-w-[80px]">
      <div className={`text-lg font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-400 dark:text-slate-500">{label}</div>
    </div>
  )
}
