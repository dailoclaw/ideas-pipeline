import { useState, useEffect } from 'react'
import { useStore } from '../lib/store'

const EMPTY = { name:'', pitch:'', target:'', pain:'', mvp:[''], win:'', time:'1-2w', plat:'html', notes:'' }

export default function AddIdeaModal({ editId, onClose }) {
  const { ideas, addIdea, editIdea } = useStore()
  const existing = editId ? ideas.find(i => i.id === editId) : null
  const [form, setForm] = useState(existing ? {
    name: existing.name, pitch: existing.pitch, target: existing.target,
    pain: existing.pain, mvp: existing.mvp?.length ? existing.mvp : [''],
    win: existing.win, time: existing.time, plat: existing.plat, notes: existing.notes
  } : EMPTY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const handler = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }))
  const setMvp = (i, val) => setForm(f => {
    const mvp = [...f.mvp]; mvp[i] = val; return { ...f, mvp }
  })
  const addMvp = () => setForm(f => ({ ...f, mvp: [...f.mvp, ''] }))
  const removeMvp = i => setForm(f => ({ ...f, mvp: f.mvp.filter((_, j) => j !== i) }))

  const submit = async () => {
    if (!form.name.trim()) { setError('Name is required'); return }
    if (!form.pitch.trim()) { setError('Pitch is required'); return }
    setSaving(true)
    setError('')
    try {
      const data = { ...form, mvp: form.mvp.filter(Boolean) }
      if (existing) {
        await editIdea(existing.id, data)
      } else {
        await addIdea(data)
      }
      onClose()
    } catch (e) {
      setError(e.message)
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="app-dialog bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl max-h-[95vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900">{existing ? 'Edit idea' : 'Add new idea'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl p-1">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Field label="Name *">
            <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Award Rate Monitor" />
          </Field>
          <Field label="Pitch *">
            <textarea className="input h-16 resize-none" value={form.pitch} onChange={e => set('pitch', e.target.value)} placeholder="One sentence — what it does and why it matters" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Build time">
              <select className="input" value={form.time} onChange={e => set('time', e.target.value)}>
                <option value="1w">⚡ 1 week</option>
                <option value="1-2w">⏱ 1–2 weeks</option>
                <option value="2-4w">🏗 2–4 weeks</option>
              </select>
            </Field>
            <Field label="Platform">
              <select className="input" value={form.plat} onChange={e => set('plat', e.target.value)}>
                <option value="html">HTML tool</option>
                <option value="hub">Awards Hub</option>
                <option value="pay">Pay Modeller</option>
              </select>
            </Field>
          </div>
          <Field label="Who it's for">
            <input className="input" value={form.target} onChange={e => set('target', e.target.value)} placeholder="Specific person in a specific situation" />
          </Field>
          <Field label="The Problem">
            <textarea className="input h-20 resize-none" value={form.pain} onChange={e => set('pain', e.target.value)} placeholder="The exact daily problem this solves" />
          </Field>
          <div>
            <div className="label">MVP bullets</div>
            {form.mvp.map((m, i) => (
              <div key={i} className="flex gap-2 mb-1.5">
                <input
                  className="input flex-1"
                  value={m}
                  onChange={e => setMvp(i, e.target.value)}
                  placeholder={`Step ${i + 1}`}
                />
                {form.mvp.length > 1 && (
                  <button onClick={() => removeMvp(i)} className="text-red-400 px-2">✕</button>
                )}
              </div>
            ))}
            <button onClick={addMvp} className="text-xs text-violet-600 font-semibold mt-1">+ Add step</button>
          </div>
          <Field label="Why it wins">
            <textarea className="input h-16 resize-none" value={form.win} onChange={e => set('win', e.target.value)} placeholder="One clear differentiator" />
          </Field>
          <Field label="Notes">
            <textarea className="input h-16 resize-none" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any extra context for Dailo" />
          </Field>
        </div>

        {error && <div className="px-4 py-2 text-sm text-red-600 bg-red-50">{error}</div>}

        <div className="flex gap-3 p-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-violet-600 text-white text-sm font-bold disabled:opacity-50"
          >{saving ? 'Saving…' : (existing ? 'Save changes' : 'Add idea')}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <div className="label">{label}</div>
      {children}
    </div>
  )
}
