import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../lib/store'
import { scoreIdea } from '../lib/scoring'
import { TimePill, PlatPill, ScoreBadge } from './Pills'

export default function TriageModal({ onClose }) {
  const { ideas, getStatus, setStatus } = useStore()
  const [skipped, setSkipped] = useState(new Set())
  const [idx, setIdx] = useState(0)

  // Queue: all 'idea' status, sorted by score desc
  const queue = ideas
    .filter(i => getStatus(i) === 'idea')
    .sort((a, b) => scoreIdea(b) - scoreIdea(a))

  const remaining = queue.filter(i => !skipped.has(i.id))
  const current = remaining[0] || null
  const done = queue.length - remaining.length

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const act = useCallback(async action => {
    if (!current) return
    if (action === 'skip') {
      setSkipped(s => new Set([...s, current.id]))
      return
    }
    const statusMap = { building: 'building', ready: 'ready', shelve: 'shelved' }
    await setStatus(current.id, statusMap[action])
  }, [current, setStatus])

  const pct = queue.length > 0 ? Math.round((done / queue.length) * 100) : 100

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-base font-bold text-gray-900">Triage</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400">{remaining.length} left</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!current ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">🎉</div>
              <div className="text-lg font-bold text-gray-800 mb-1">All triaged!</div>
              <div className="text-sm text-gray-500">No ideas left to review.</div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="text-xl font-bold text-gray-900 leading-tight mb-2">
                  #{current.id} {current.name}
                  {current.isNew && <span className="ml-2 text-xs font-bold bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">NEW</span>}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <TimePill time={current.time} />
                  <PlatPill plat={current.plat} />
                  <ScoreBadge idea={current} />
                </div>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed">{current.pitch}</p>

              {current.pain && (
                <div>
                  <div className="text-[0.625rem] font-bold uppercase tracking-widest text-gray-400 mb-1">The Problem</div>
                  <p className="text-sm text-gray-600">{current.pain}</p>
                </div>
              )}

              {current.mvp?.length > 0 && (
                <div>
                  <div className="text-[0.625rem] font-bold uppercase tracking-widest text-gray-400 mb-1.5">MVP</div>
                  <ul className="list-disc list-inside space-y-1">
                    {current.mvp.map((m, i) => <li key={i} className="text-sm text-gray-600">{m}</li>)}
                  </ul>
                </div>
              )}

              <div className="border-l-2 border-green-300 pl-3 text-sm text-green-700">{current.win}</div>
            </div>
          )}
        </div>

        {/* Actions */}
        {current && (
          <div className="p-4 border-t border-gray-100 flex-shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => act('building')}
                className="py-3 rounded-xl bg-blue-600 text-white text-sm font-bold"
              >🔨 Start Building</button>
              <button
                onClick={() => act('ready')}
                className="py-3 rounded-xl bg-green-600 text-white text-sm font-bold"
              >✅ Move to Ready</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => act('shelve')}
                className="py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500"
              >🗄 Shelve</button>
              <button
                onClick={() => act('skip')}
                className="py-3 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400"
              >⏭ Skip for now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
