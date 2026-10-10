import { useCallback, useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { useDialogFocus } from '../hooks/useDialogFocus'
import { sortIdeas, scopeIdeas } from '../lib/scoring'
import { TimePill, PlatPill, ScoreBadge } from './Pills'
import LedgeButton from './LedgeButton'
import SaveFeedback from './SaveFeedback'
import Icon from './Icon'

const THROW_MS = 240

export default function TriageModal({ onClose, groupFilter = '' }) {
  const { ideas, groupAssignments, getStatus, setStatus, pendingSaves } = useStore()
  const [sessionIds] = useState(() => sortIdeas(scopeIdeas(ideas, groupAssignments, groupFilter).filter(i => getStatus(i) === 'idea'), 'score').map(i => i.id))
  const [decided, setDecided] = useState(new Set())
  const [skipped, setSkipped] = useState(new Set())
  const [thrown, setThrown] = useState(null)
  const busy = useRef(false)
  const dialogRef = useRef(null)
  useDialogFocus(dialogRef, onClose)

  const queue = sessionIds.map(id => ideas.find(idea => idea.id === id)).filter(idea => idea && getStatus(idea) === 'idea' && !decided.has(idea.id))
  const remaining = queue.filter(i => !skipped.has(i.id))
  const current = remaining[0] || null
  const upNext = remaining.slice(1, 3)
  const deferredCount = queue.filter(i => skipped.has(i.id)).length

  const act = useCallback(async action => {
    if (!current || busy.current) return
    busy.current = true
    setThrown(current.id)
    try {
      const statusMap = { building: 'building', ready: 'ready', shelve: 'shelved' }
      if (action === 'skip') {
        await new Promise(resolve => setTimeout(resolve, THROW_MS))
        setSkipped(s => new Set([...s, current.id]))
        if (useStore.getState().saveFeedback?.id === current.id) useStore.getState().clearSaveFeedback()
      } else {
        await Promise.all([setStatus(current.id, statusMap[action]), new Promise(resolve => setTimeout(resolve, THROW_MS))])
        setDecided(s => new Set([...s, current.id]))
      }
    } finally {
      setThrown(null)
      busy.current = false
    }
  }, [current, setStatus])

  const retryDecision = async feedback => {
    await feedback.retry()
    const state = useStore.getState()
    const idea = state.ideas.find(item => item.id === feedback.id)
    if (feedback.method === 'setStatus' && sessionIds.includes(feedback.id) && idea && state.getStatus(idea) !== 'idea') {
      setDecided(previous => new Set([...previous, feedback.id]))
    }
  }

  const pct = sessionIds.length ? Math.round(((decided.size + deferredCount) / sessionIds.length) * 100) : 100

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="triage-dialog-title" tabIndex={-1} className="app-dialog triage-dialog bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span id="triage-dialog-title" className="text-base font-bold text-gray-900">Triage</span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-xs text-gray-400">{remaining.length} left</span>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1" aria-label="Close triage"><Icon name="close" size={20} /></button>
        </div>

        <p className="px-4 py-2 text-xs text-gray-500" role="status">{decided.size} decided · {deferredCount} deferred · {remaining.length} left</p>
        <SaveFeedback onRetry={retryDecision} />
        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {!current ? (
            <div className="text-center py-12">
              <Icon name="sparkles" size={38} className="mx-auto mb-3 text-violet-500" />
              <div className="text-lg font-bold text-gray-800 mb-1">{thrown !== null ? 'Saving decision…' : deferredCount ? 'Review paused' : 'All triaged!'}</div>
              <div className="text-sm text-gray-500">{deferredCount ? `${deferredCount} ${deferredCount === 1 ? 'idea deferred for later; its status is' : 'ideas deferred for later; their statuses are'} unchanged.` : 'No ideas left to review.'}</div>
              {deferredCount > 0 && <button className="mt-4 px-4 py-2 rounded-lg border border-gray-200" onClick={() => setSkipped(new Set())}>Review deferred ideas</button>}
            </div>
          ) : (
            <div className="au-deck" data-leaving={thrown === current.id ? 'true' : 'false'}>
              {/* The rest of the queue, physically behind the card being decided. */}
              {upNext.map((idea, n) => (
                <div className="au-deck__peek" key={idea.id} style={{ '--n': n + 1 }} aria-hidden="true">
                  <span>#{idea.id} {idea.name}</span>
                </div>
              ))}

              <div className="au-deck__top space-y-4" key={current.id}>
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
            </div>
          )}
        </div>

        {/* Actions */}
        {current && (
          <div key={current.id} className="p-4 border-t border-gray-100 flex-shrink-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <LedgeButton
                disabled={thrown !== null || !!pendingSaves[current.id]}
                onAct={() => act('building')}
                icon="hammer"
                runLabel="Moving…"
                doneLabel="Building"
                className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold"
              >Start Building</LedgeButton>
              <LedgeButton
                disabled={thrown !== null || !!pendingSaves[current.id]}
                onAct={() => act('ready')}
                icon="circleCheck"
                runLabel="Moving…"
                doneLabel="Ready"
                className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl bg-green-600 text-white text-sm font-bold"
              >Move to Ready</LedgeButton>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                disabled={thrown !== null || !!pendingSaves[current.id]}
                onClick={() => { void act('shelve').catch(() => {}) }}
                className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500"
              ><Icon name="archive" size={16} /> Shelve</button>
              <button
                disabled={thrown !== null || !!pendingSaves[current.id]}
                onClick={() => { void act('skip').catch(() => {}) }}
                className="inline-flex items-center justify-center gap-1.5 py-3 rounded-xl border border-dashed border-gray-200 text-sm text-gray-400"
              ><Icon name="skipForward" size={16} /> Skip for now</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
