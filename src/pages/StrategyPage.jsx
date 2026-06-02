import { useStore } from '../lib/store'
import { scoreIdea, gradeFromScore, getBuildNext } from '../lib/scoring'
import { TimePill, StatusBadge } from '../components/Pills'

const GRADE_STYLE = {
  A: 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800',
  B: 'text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800',
  C: 'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/20 dark:border-amber-800',
  D: 'text-gray-500 bg-gray-50 border-gray-200 dark:text-slate-400 dark:bg-slate-900/30 dark:border-slate-700',
}

export default function StrategyPage({ onOpenIdea }) {
  const { ideas, getStatus, setStatus } = useStore()

  const active = ideas
    .filter(i => !['done', 'shelved'].includes(getStatus(i)))
    .sort((a, b) => scoreIdea(b) - scoreIdea(a))

  const recommend = getBuildNext(ideas, getStatus)

  return (
    <div className="h-full overflow-auto p-3 space-y-4">

      {/* Build Next */}
      {recommend && (
        <div className="bg-gradient-to-r from-green-50 to-violet-50 dark:from-green-900/20 dark:to-violet-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-4">
          <div className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-wider mb-2">⭐ Recommended Next Build</div>
          <div className="font-bold text-gray-900 dark:text-slate-100 leading-snug mb-1">#{recommend.id} {recommend.name}</div>
          <div className="text-sm text-gray-500 dark:text-slate-400 mb-3 leading-relaxed">{recommend.pitch}</div>
          <div className="flex flex-wrap items-center gap-2">
            <TimePill time={recommend.time} />
            <button
              onClick={() => setStatus(recommend.id, 'building')}
              className="text-xs font-bold bg-green-600 text-white px-3 py-1.5 rounded-lg"
            >🔨 Start Building</button>
            <button
              onClick={() => onOpenIdea(recommend.id)}
              className="text-xs font-semibold text-gray-500 border border-gray-200 dark:border-slate-600 px-3 py-1.5 rounded-lg"
            >Details</button>
          </div>
        </div>
      )}

      {/* Priority ranking */}
      <div>
        <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-3 px-1">
          Priority Score Ranking — {active.length} active ideas
        </div>
        <div className="space-y-2">
          {active.map((idea, idx) => {
            const score  = scoreIdea(idea)
            const grade  = gradeFromScore(score)
            const status = getStatus(idea)
            return (
              <div
                key={idea.id}
                className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-3 cursor-pointer hover:border-violet-300 dark:hover:border-violet-600 transition-colors"
                onClick={() => onOpenIdea(idea.id)}
              >
                {/* Top row: rank + grade + score bar + pills */}
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs text-gray-300 dark:text-slate-600 w-5 text-center flex-shrink-0 font-bold">#{idx + 1}</span>
                  <span className={`text-xs font-bold border rounded-lg px-1.5 py-0.5 flex-shrink-0 ${GRADE_STYLE[grade]}`}>{grade}</span>
                  {/* Score bar */}
                  <div className="flex items-center gap-1.5 flex-1">
                    <div className="flex-1 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: `${score}%` }} />
                    </div>
                    <span className="text-xs font-bold text-violet-600 dark:text-violet-400 flex-shrink-0">{score}</span>
                  </div>
                  <div className="flex-shrink-0"><StatusBadge status={status} /></div>
                </div>

                {/* Idea name — always wraps, never truncated */}
                <div className="pl-7">
                  <div className="text-sm font-semibold text-gray-800 dark:text-slate-200 leading-snug mb-1">
                    #{idea.id} {idea.name}
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <TimePill time={idea.time} />
                    <span className="text-xs text-gray-400 dark:text-slate-500">{idea.pitch.slice(0, 70)}{idea.pitch.length > 70 ? '…' : ''}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Formula legend */}
      <div className="bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3">
        <div className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500 mb-2">Score formula (0–100)</div>
        <div className="grid grid-cols-2 gap-y-1 text-xs text-gray-500 dark:text-slate-400">
          <span>⚡ Quick build: up to 40</span>
          <span>🏢 Platform fit: up to 25</span>
          <span>📋 MVP depth: up to 20</span>
          <span>💡 Novelty: up to 15</span>
        </div>
      </div>
    </div>
  )
}
