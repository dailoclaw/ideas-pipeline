import { useStore } from '../lib/store'
import { scoreIdea, gradeFromScore, scoreDimensions, getBuildNext } from '../lib/scoring'
import { TimePill, PlatPill, StatusBadge } from '../components/Pills'

export default function StrategyPage({ onOpenIdea }) {
  const { ideas, getStatus, setStatus } = useStore()

  const active = ideas
    .filter(i => !['done','shelved'].includes(getStatus(i)))
    .sort((a, b) => scoreIdea(b) - scoreIdea(a))

  const recommend = getBuildNext(ideas, getStatus)

  const gradeColor = { A: 'text-green-600 bg-green-50 border-green-200', B: 'text-blue-600 bg-blue-50 border-blue-200', C: 'text-amber-600 bg-amber-50 border-amber-200', D: 'text-gray-500 bg-gray-50 border-gray-200' }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-auto p-4 space-y-6">

        {/* Build Next */}
        {recommend && (
          <div className="bg-gradient-to-r from-green-50 dark:from-green-900/20 to-violet-50 dark:to-violet-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
            <div className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-2">⭐ Recommended Next Build</div>
            <div className="text-base font-bold text-gray-900 dark:text-slate-100 mb-1">#{recommend.id} {recommend.name}</div>
            <div className="text-sm text-gray-500 dark:text-slate-400 mb-3">{recommend.pitch}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <TimePill time={recommend.time} />
              <PlatPill plat={recommend.plat} />
              <button onClick={() => setStatus(recommend.id, 'building')} className="ml-auto text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg">🔨 Start Building</button>
              <button onClick={() => onOpenIdea(recommend.id)} className="text-xs font-semibold text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg">Details</button>
            </div>
          </div>
        )}

        {/* Priority Ranking */}
        <div>
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3">Priority Score Ranking</div>
          <div className="space-y-2">
            {active.map((idea, idx) => {
              const score = scoreIdea(idea)
              const grade = gradeFromScore(score)
              const dims = scoreDimensions(idea)
              const status = getStatus(idea)
              return (
                <div
                  key={idea.id}
                  className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 flex items-center gap-3 cursor-pointer hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
                  onClick={() => onOpenIdea(idea.id)}
                >
                  {/* Rank */}
                  <div className="text-xs font-bold text-gray-300 dark:text-slate-600 w-5 text-center flex-shrink-0">#{idx + 1}</div>

                  {/* Grade badge */}
                  <div className={`text-xs font-bold border rounded-lg px-1.5 py-0.5 flex-shrink-0 ${gradeColor[grade]}`}>{grade}</div>

                  {/* Score bar */}
                  <div className="flex-shrink-0 w-14">
                    <div className="flex justify-between text-xs font-bold text-violet-600 dark:text-violet-400 mb-0.5">{score}</div>
                    <div className="h-1 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${score}%` }} />
                    </div>
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 truncate">#{idea.id} {idea.name}</div>
                    <div className="text-xs text-gray-400 dark:text-slate-500 truncate hidden sm:block">{idea.pitch.slice(0, 60)}…</div>
                  </div>

                  {/* Pills */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <TimePill time={idea.time} />
                    <StatusBadge status={status} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Score breakdown guide */}
        <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Score formula (0–100)</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-slate-400">
            <div>⚡ Effort (quick = higher): up to 40</div>
            <div>🏢 Platform fit: up to 25</div>
            <div>📋 MVP depth: up to 20</div>
            <div>💡 Novelty: up to 15</div>
          </div>
        </div>
      </div>
    </div>
  )
}
