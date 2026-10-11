import { useShallow } from 'zustand/react/shallow'
import { validateIdeaFields, TIMES, PLATFORMS } from '../lib/validation.js'
import { useRef, useState } from 'react'
import { useStore } from '../lib/store'
import { useDialogFocus } from '../hooks/useDialogFocus'
import SaveFeedback from './SaveFeedback'
import Icon from './Icon'
import { TIME_ICONS } from './Pills'

const EMPTY = { name:'', pitch:'', target:'', pain:'', mvp:[''], win:'', time:'1-2w', plat:'html', notes:'' }

export default function AddIdeaModal({ editId, onClose }) {
  const { ideas, addIdea, editIdea, saveFeedback } = useStore(useShallow(state => ({
    ideas: state.ideas,
    addIdea: state.addIdea,
    editIdea: state.editIdea,
    saveFeedback: state.saveFeedback,
  })))
  const existing = editId ? ideas.find(i => i.id === editId) : null
  const [form, setForm] = useState(existing ? {
    name: existing.name, pitch: existing.pitch, target: existing.target,
    pain: existing.pain, mvp: existing.mvp?.length ? existing.mvp : [''],
    win: existing.win, time: existing.time, plat: existing.plat, notes: existing.notes
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const requestId = useRef(null)
  const dialogRef = useRef(null)
  useDialogFocus(dialogRef, () => { if (!saving) onClose() })

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setMvp = (i, val) => setForm(f => {
    const mvp = [...f.mvp]; mvp[i] = val; return { ...f, mvp }
  })
  const addMvp = () => setForm(f => ({ ...f, mvp: [...f.mvp, ''] }))
  const removeMvp = i => setForm(f => ({ ...f, mvp: f.mvp.filter((_, j) => j !== i) }))

  const submit = async () => {
    if (saving) return
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.pitch.trim()) { setError('Pitch is required'); return }
    setSaving(true)
    setError('')
    try {
      const data = validateIdeaFields(form)
      if (existing) {
        await editIdea(existing.id, data)
      } else {
        requestId.current ||= crypto.randomUUID()
        await addIdea(data, requestId.current)
      }
      onClose()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget && !saving) onClose() }}
    >
      <form noValidate onSubmit={e => { e.preventDefault(); void submit() }} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="add-idea-title" tabIndex={-1} className="app-dialog bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl max-h-[95vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <h2 id="add-idea-title" className="text-base font-bold text-gray-900">{existing ? 'Edit idea' : 'Add new idea'}</h2>
          <button type="button" disabled={saving} onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl p-1" aria-label="Close idea form"><Icon name="close" size={20} /></button>
        </div>

        <SaveFeedback onRetry={feedback => {
          if (feedback.level === 'error' && (feedback.method === 'addIdea' && !existing || feedback.method === 'editIdea' && feedback.id === existing?.id)) return submit()
          return feedback.retry()
        }} />
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Field label="Name *" id="idea-name">
            <input id="idea-name" required aria-invalid={!!error && !form.name.trim()} aria-describedby={error ? "idea-form-error" : undefined} className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Award Rate Monitor" />
          </Field>
          <Field label="Pitch *" id="idea-pitch">
            <textarea id="idea-pitch" required aria-invalid={!!error && !form.pitch.trim()} aria-describedby={error ? "idea-form-error" : undefined} className="input h-16 resize-none" value={form.pitch} onChange={e => set('pitch', e.target.value)} placeholder="One sentence — what it does and why it matters" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Build time" id="idea-time">
              <div className="select-icon-field">
                <Icon name={Object.hasOwn(TIME_ICONS, form.time) ? TIME_ICONS[form.time] : 'clock'} size={16} />
                <select id="idea-time" className="input" value={form.time} onChange={e => set('time', e.target.value)}>
                  {!TIMES.includes(form.time) && <option value={form.time}>Unknown — choose a build time</option>}
                  <option value="1w">1 week</option>
                  <option value="1-2w">1–2 weeks</option>
                  <option value="2-4w">2–4 weeks</option>
                </select>
              </div>
            </Field>
            <Field label="Platform" id="idea-plat">
              <select id="idea-plat" className="input" value={form.plat} onChange={e => set('plat', e.target.value)}>
                {!PLATFORMS.includes(form.plat) && <option value={form.plat}>Unknown — choose a platform</option>}
                  <option value="html">HTML tool</option>
                <option value="hub">Awards Hub</option>
                <option value="pay">Pay Modeller</option>
              </select>
            </Field>
          </div>
          <Field label="Who it's for" id="idea-target">
            <input id="idea-target" className="input" value={form.target} onChange={e => set('target', e.target.value)} placeholder="Specific person in a specific situation" />
          </Field>
          <Field label="The Problem" id="idea-pain">
            <textarea id="idea-pain" className="input h-20 resize-none" value={form.pain} onChange={e => set('pain', e.target.value)} placeholder="The exact daily problem this solves" />
          </Field>
          <div>
            <div className="label">MVP bullets</div>
            {form.mvp.map((m, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <input
                  aria-label={`MVP step ${i + 1}`} className="input flex-1"
                  value={m}
                  onChange={e => setMvp(i, e.target.value)}
                  placeholder={`Step ${i + 1}`}
                />
                {form.mvp.length > 1 && (
                  <button type="button" onClick={() => removeMvp(i)} className="text-red-400 px-2" aria-label={`Remove step ${i + 1}`}><Icon name="close" size={18} /></button>
                )}
              </div>
            ))}
            <button type="button" onClick={addMvp} className="inline-flex items-center gap-1 text-xs text-violet-600 font-semibold mt-1"><Icon name="plus" size={14} /> Add step</button>
          </div>
          <Field label="Why it wins" id="idea-win">
            <textarea id="idea-win" className="input h-16 resize-none" value={form.win} onChange={e => set('win', e.target.value)} placeholder="One clear differentiator" />
          </Field>
          <Field label="Notes" id="idea-notes">
            <textarea id="idea-notes" className="input h-16 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any extra context for Dailo" />
          </Field>
        </div>

        {error && <div id="idea-form-error" role={saveFeedback?.level === 'error' && saveFeedback.message.includes(error) ? 'note' : 'alert'} className="px-4 py-2 text-sm text-red-600 bg-red-50">{error}</div>}

        <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0">
          <button type="button" disabled={saving} onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500">Cancel</button>
          <button type="submit"
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50"
          >{saving ? 'Saving…' : (existing ? 'Save changes' : 'Add idea')}</button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="label block">{label}</label>
      {children}
    </div>
  )
}
