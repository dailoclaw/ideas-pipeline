import { useEffect, useRef } from 'react'
import { useStore } from '../lib/store'
import { TimePill, PlatPill, StatusBadge, ScoreBadge } from './Pills'

export default function IdeaModal({ ideaId, onClose, onEdit }) {
  const { ideas, statusHistory, getStatus, setStatus, deleteIdea } = useStore()
  const idea = ideas.find(i => i.id === ideaId)
  const ref = useRef()

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  if (!idea) return null

  const status = getStatus(idea)
  const history = statusHistory[idea.id] || []
  const statusLabels = { idea:'💡 Idea', building:'🔨 Building', ready:'✅ Ready', done:'✅ Done', shelved:'🗄 Shelved' }
  const dotColors = { idea:'bg-gray-400', building:'bg-blue-500', ready:'bg-green-500', done:'bg-violet-500', shelved:'bg-amber-500' }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={ref}
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="text-xs text-gray-400 font-medium mb-0.5">Idea #{idea.id}</div>
            <div className="text-lg font-bold text-gray-900 leading-tight">{idea.name}</div>
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <StatusBadge status={status} />
              <TimePill time={idea.time} />
              <PlatPill plat={idea.plat} />
              <ScoreBadge idea={idea} />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl p-1 -mt-1">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Quick actions for seed ideas */}
          {!idea.isNew && status !== 'done' && status !== 'shelved' && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setStatus(idea.id, 'building')}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-600 text-white"
              >🔨 Start Building</button>
              <button
                onClick={() => setStatus(idea.id, 'ready')}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-600 text-white"
              >✅ Move to Ready</button>
              <button
                onClick={() => setStatus(idea.id, 'done')}
                className="text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-600 text-white"
              >✓ Mark Done</button>
              <button
                onClick={() => setStatus(idea.id, 'shelved')}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500"
              >🗄 Shelve</button>
            </div>
          )}
          {!idea.isNew && status === 'done' && (
            <button
              onClick={() => setStatus(idea.id, null)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500"
            >↩ Unmark done</button>
          )}

          <Section label="Pitch" value={idea.pitch} />
          {idea.target && <Section label="Who it's for" value={idea.target} />}
          {idea.pain && <Section label="The Problem" value={idea.pain} />}
          {idea.mvp?.length > 0 && (
            <div>
              <div className="text-[0.625rem] font-bold uppercase tracking-widest text-gray-400 mb-1.5">MVP</div>
              <ul className="list-disc list-inside space-y-1">
                {idea.mvp.map((m, i) => (
                  <li key={i} className="text-sm text-gray-600">{m}</li>
                ))}
              </ul>
            </div>
          )}
          {idea.win && (
            <div>
              <div className="text-[0.625rem] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Why it wins</div>
              <div className="text-sm text-green-700 border-l-2 border-green-300 pl-3">{idea.win}</div>
            </div>
          )}
          {idea.notes && <Section label="Notes" value={idea.notes} />}

          {/* Status timeline */}
          <div className="border-t border-gray-100 pt-3">
            <div className="text-[0.625rem] font-bold uppercase tracking-widest text-gray-400 mb-2">Status history</div>
            {history.length === 0 && !idea.isNew && (
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <div className="w-2 h-2 rounded-full bg-gray-200" />
                <span>Source: IDEAS.md</span>
              </div>
            )}
            {history.length === 0 && idea.isNew && idea.addedAt && (
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <span className="font-semibold text-gray-700 w-16">💡 Idea</span>
                <span className="text-gray-400">{idea.addedAt}</span>
              </div>
            )}
            {history.map((h, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                <div className={`w-2 h-2 rounded-full ${dotColors[h.status] || 'bg-gray-400'}`} />
                <span className="font-semibold text-gray-700 w-20">{statusLabels[h.status] || h.status}</span>
                <span className="text-gray-400">{h.date}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions for user-added ideas */}
        {idea.isNew && (
          <div className="flex gap-2 p-4 border-t border-gray-100 flex-shrink-0">
            <button
              onClick={() => onEdit(idea.id)}
              className="flex-1 text-sm font-bold py-2 rounded-xl border border-gray-200 text-gray-600"
            >✏️ Edit</button>
            {idea.status !== 'shelved'
              ? <button onClick={() => setStatus(idea.id, 'shelved')} className="flex-1 text-sm font-bold py-2 rounded-xl border border-gray-200 text-amber-600">🗄 Shelve</button>
              : <button onClick={() => setStatus(idea.id, 'idea')} className="flex-1 text-sm font-bold py-2 rounded-xl border border-gray-200 text-green-600">↩ Unshelve</button>
            }
            <button
              onClick={async () => {
                if (!confirm(`Delete "${idea.name}"?`)) return
                await deleteIdea(idea.id)
                onClose()
              }}
              className="text-sm font-bold py-2 px-3 rounded-xl border border-red-100 text-red-500"
            >🗑</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Section({ label, value }) {
  return (
    <div>
      <div className="text-[0.625rem] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</div>
      <div className="text-sm text-gray-600 leading-relaxed">{value}</div>
    </div>
  )
}
