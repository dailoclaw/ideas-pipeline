import { useRef, useState, useCallback } from 'react'
import { useStore } from '../lib/store'
import { TimePill, PlatPill, StatusBadge, ScoreBadge, STATUS_ICONS } from './Pills'
import { GROUPS } from '../data/groups'
import { scoreIdea } from '../lib/scoring'
import ActivityTimeline from './ActivityTimeline'
import SaveFeedback from './SaveFeedback'
import Icon from './Icon'
import { useDialogFocus } from '../hooks/useDialogFocus'

const ALL_STATUSES = [
  { value: 'idea',        label: 'Idea' },
  { value: 'researching', label: 'Researching' },
  { value: 'ready',       label: 'Ready' },
  { value: 'building',    label: 'Building' },
  { value: 'done',        label: 'Done' },
  { value: 'shelved',     label: 'Shelved' },
]

export default function IdeaModal({ ideaId, onClose, onEdit }) {
  const { ideas, statusHistory, activityLog, getStatus, setStatus, deleteIdea, getGroup, setGroupAssignment, setPriority, pendingSaves, draftValues, draftStorageError, changeDraft, flushDrafts } = useStore()
  const idea = ideas.find(i => i.id === ideaId)
  const ref = useRef()
  const [activeTab, setActiveTab] = useState('overview')
  const [groupSaving, setGroupSaving] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [closing, setClosing] = useState(false)
  const draft = draftValues[ideaId] || {}
  const localNotes = draft.notes?.value ?? idea?.notes ?? ''
  const localAdj = draft.score?.value ?? idea?.scoreAdjust ?? 0
  const saveState = draft.notes?.state || 'idle'
  const adjSaving = ['pending', 'saving'].includes(draft.score?.state)
  async function leave(action = onClose) {
    if (closing) return
    setClosing(true)
    try { if (await flushDrafts(ideaId)) action() }
    finally { setClosing(false) }
  }
  useDialogFocus(ref, () => { void leave() })

  const handleStatusChange = useCallback(async (newStatus) => {
    if (!idea) return
    setStatusSaving(true)
    try {
      await setStatus(idea.id, newStatus)
    } catch { /* The shared feedback offers Retry. */ } finally {
      setStatusSaving(false)
    }
  }, [idea?.id, setStatus])

  if (!idea) return null

  const status = getStatus(idea)
  const history = statusHistory[idea.id] || []
  const activity = activityLog[idea.id] || []
  const groupKey = getGroup(idea.id)
  const groupIcon = GROUPS.find(group => group.key === groupKey)?.icon || 'groups'

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={e => { if (e.target === e.currentTarget) void leave() }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="idea-dialog-title"
        tabIndex={-1}
        className="app-dialog bg-white w-full sm:max-w-2xl lg:max-w-4xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="text-xs text-gray-400 font-medium mb-0.5">Idea #{idea.id}</div>
            <div id="idea-dialog-title" className="text-lg font-bold text-gray-900 leading-tight">{idea.name}</div>
            <div className="flex items-center gap-1.5 flex-wrap mt-2">
              <StatusBadge status={status} />
              <TimePill time={idea.time} />
              <PlatPill plat={idea.plat} />
              <ScoreBadge idea={idea} />
            </div>
          </div>
          <button disabled={closing} onClick={() => { void leave() }} className="text-gray-400 hover:text-gray-600 text-xl p-1 -mt-1" aria-label="Close idea details"><Icon name="close" size={20} /></button>
        </div>

        <div className="idea-detail-tabs" role="tablist" aria-label="Idea detail sections">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'overview'}
            className={activeTab === 'overview' ? 'is-active' : ''}
            onClick={() => setActiveTab('overview')}
          >Overview</button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'activity'}
            className={activeTab === 'activity' ? 'is-active' : ''}
            onClick={() => setActiveTab('activity')}
          >
            Activity
            {(activity.length + history.length) > 0 && <span>{activity.length + history.length}</span>}
          </button>
        </div>

        <SaveFeedback onRetry={feedback => {
          if (feedback.id === idea.id && ['updateNotes', 'setScoreAdjust'].includes(feedback.method)) return flushDrafts(idea.id)
          if (feedback.id === idea.id && feedback.method === 'deleteIdea') return feedback.retry().then(() => onClose())
          return feedback.retry()
        }} />
        {Object.values(draft).some(d => d.dirty && d.state === 'error') && <div className="save-feedback save-feedback--warning" role="status">
          <p>Unsaved draft retained. {draft.notes?.error || draft.score?.error}</p>
          <button type="button" disabled={closing || !!pendingSaves[idea.id]} onClick={() => { void flushDrafts(idea.id) }}>Retry draft</button>
        </div>}
        {draftStorageError && Object.values(draft).some(d => d.dirty) && <p role="status" className="px-4 text-xs text-amber-700">Browser storage is unavailable. Keep this page open to preserve the draft.</p>}
        {/* Body */}
        {activeTab === 'overview' ? (
        <div className="idea-detail-overview flex-1 overflow-y-auto p-4 space-y-4" role="tabpanel">
          {/* Priority flag */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 shrink-0 w-12">Priority</span>
            <button
              disabled={!!pendingSaves[idea.id]}
              onClick={() => { void setPriority(idea.id, !idea.isPriority).catch(() => {}) }}
              className={`idea-priority-toggle flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all
                ${idea.isPriority
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'border-gray-200 text-gray-400 hover:border-amber-200 hover:text-amber-500'}`}
            >
              <Icon name={idea.isPriority ? 'starFilled' : 'star'} size={14} />
              {idea.isPriority ? 'Priority — floats to top' : 'Set as priority'}
            </button>
          </div>

          {/* Score adjustment */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 shrink-0 w-12">Score</span>
            <div className="flex items-center gap-2 flex-1">
              <span className="text-xs text-gray-400">Base: {Math.max(1, scoreIdea({ ...idea, scoreAdjust: 0 }))}</span>
              <span className="text-xs text-gray-300">→</span>
              <input
                type="number"
                aria-label="Score adjustment"
                disabled={closing}
                min="-99" max="99" step="5"
                value={localAdj}
                onChange={e => changeDraft(idea.id, 'score', e.target.value)}
                className="w-20 text-sm font-bold text-center border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
              <span className={`text-xs font-bold ${
                localAdj > 0 ? 'text-green-600' : localAdj < 0 ? 'text-red-500' : 'text-gray-400'
              }`}>
                {localAdj > 0 ? `+${localAdj}` : localAdj < 0 ? `${localAdj}` : '±0'}
              </span>
              <span className="text-xs font-bold text-violet-600">
                = {Math.max(1, scoreIdea({ ...idea, scoreAdjust: 0 }) + localAdj)}
              </span>
              {adjSaving && <span className="text-[0.625rem] text-gray-400">Saving…</span>}
            </div>
          </div>

          {/* Group assignment — works for all ideas */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 shrink-0 w-12">Group</span>
            <div className="select-icon-field flex-1">
              <Icon name={groupIcon} size={16} />
              <select
                value={groupKey}
                aria-label="Idea group"
                disabled={groupSaving || !!pendingSaves[idea.id]}
                onChange={async e => {
                  setGroupSaving(true)
                  try { await setGroupAssignment(idea.id, e.target.value) }
                  catch { /* The shared feedback offers Retry. */ }
                  finally { setGroupSaving(false) }
                }}
                className="w-full text-sm font-semibold rounded-lg border border-gray-200 px-3 py-1.5 bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 disabled:opacity-50"
              >
                <option value="">No group</option>
                {GROUPS.map(g => (
                  <option key={g.key} value={g.key}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Universal status selector — works for all ideas, all statuses */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 shrink-0 w-12">Status</span>
            <div className="select-icon-field relative flex-1">
              <Icon name={STATUS_ICONS[status] || 'circleCheck'} size={16} />
              <select
                value={status}
                aria-label="Idea status"
                disabled={statusSaving || !!pendingSaves[idea.id]}
                onChange={e => handleStatusChange(e.target.value)}
                className="w-full text-sm font-semibold rounded-lg border border-gray-200 px-3 py-1.5 pr-8 appearance-none bg-white text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 disabled:opacity-50"
              >
                {ALL_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">
                <Icon name={statusSaving ? 'loader' : 'chevronDown'} size={14} className={statusSaving ? 'animate-spin' : ''} />
              </span>
            </div>
          </div>

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
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[0.625rem] font-bold uppercase tracking-widest text-gray-400">Notes</div>
              {['pending', 'saving'].includes(saveState) && <span className="text-[0.625rem] text-gray-400">Saving…</span>}
              {saveState === 'error' && <span className="text-xs text-red-600">Not saved</span>}
              {saveState === 'saved' && <span className="inline-flex items-center gap-1 text-[0.625rem] text-green-500 font-semibold"><Icon name="check" size={11} /> Saved</span>}
            </div>
            <textarea
              className="w-full text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 placeholder-gray-300"
              rows={3}
              placeholder="Add notes…"
              value={localNotes}
              disabled={closing}
              onChange={e => changeDraft(idea.id, 'notes', e.target.value)}
            />
          </div>

          <div className="activity-preview">
            <div>
              <span>Decision record</span>
              <strong>{activity.length + history.length > 0 ? 'See how this idea evolved' : 'Ready for its first decision'}</strong>
            </div>
            <button type="button" onClick={() => setActiveTab('activity')}>View activity <span aria-hidden="true">→</span></button>
          </div>
        </div>
        ) : (
          <div className="idea-detail-activity flex-1 overflow-y-auto" role="tabpanel">
            <ActivityTimeline idea={idea} activity={activity} statusHistory={history} />
          </div>
        )}

        {/* Footer actions for user-added ideas */}
        {idea.isNew && activeTab === 'overview' && (
          <div className="flex gap-2 p-4 border-t border-gray-100 flex-shrink-0">
            <button
              disabled={closing}
              onClick={() => { void leave(() => onEdit(idea.id)) }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-bold py-2 rounded-xl border border-gray-200 text-gray-600"
            ><Icon name="edit" size={15} /> Edit</button>
            <button
              onClick={async () => {
                if (!confirm(`Delete "${idea.name}"?`)) return
                try { if (!await flushDrafts(idea.id)) return; await deleteIdea(idea.id); onClose() }
                catch { /* Keep the dialog open for retry. */ }
              }}
              className="inline-flex items-center justify-center text-sm font-bold py-2 px-3 rounded-xl border border-red-100 text-red-500"
              disabled={!!pendingSaves[idea.id]}
              aria-label="Delete idea"
            ><Icon name="trash" size={16} /></button>
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
