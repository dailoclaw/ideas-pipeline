// Drafts belong to the store, not a mounted dialog. Saves for one idea run in order.
export function createDraftController({ save, publish, storage = () => localStorage }) {
  let account = null, entries = {}, storageError = false, generation = 0
  const timers = new Map(), workers = new Map()
  const key = () => `ideas-webapp-drafts-v1:${account}`
  const snapshot = () => Object.fromEntries(Object.entries(entries).map(([id, fields]) => [id,
    Object.fromEntries(Object.entries(fields).map(([field, draft]) => [field, { ...draft }]))]))
  function emit() {
    storageError = false
    if (account) {
      try {
        const dirty = Object.fromEntries(Object.entries(entries).map(([id, fields]) => [id,
          Object.fromEntries(Object.entries(fields).filter(([,d]) => d.dirty).map(([f,d]) => [f, d.value]))]).filter(([,fields]) => Object.keys(fields).length))
        storage().setItem(key(), JSON.stringify(dirty))
      } catch { storageError = true }
    }
    publish(snapshot(), storageError)
  }
  function cancel(id) { clearTimeout(timers.get(String(id))); timers.delete(String(id)) }
  async function flush(id) {
    id = String(id); cancel(id)
    if (workers.has(id)) return workers.get(id)
    const epoch = generation
    const work = (async () => {
      // Start on the next microtask so workers is installed before the loop runs.
      await Promise.resolve()
      for (;;) {
        if (epoch !== generation) return false
        const pair = Object.entries(entries[id] || {}).find(([,d]) => d.dirty)
        if (!pair) return true
        const [field, draft] = pair, revision = draft.revision, value = draft.value
        draft.state = 'saving'; emit()
        try {
          await save(Number(id), field, value)
          if (epoch !== generation) return false
          if (entries[id]?.[field] === draft && draft.revision === revision) {
            draft.dirty = false; draft.state = 'saved'; draft.error = ''
          }
        } catch (error) {
          if (epoch !== generation) return false
          if (entries[id]?.[field]) { entries[id][field].state = 'error'; entries[id][field].error = error?.message || 'Save failed. Retry your draft.' }
          cancel(id); emit(); return false // No retry loop on permission/network failure.
        }
        emit()
      }
    })().finally(() => { if (workers.get(id) === work) workers.delete(id) })
    workers.set(id, work)
    return work
  }
  return {
    configure(userId) {
      if (!userId || account === userId) return
      if (account) throw new Error('Clear drafts before changing accounts')
      account = userId
      try {
        const data = JSON.parse(storage().getItem(key()) || '{}')
        if (!data || Array.isArray(data) || typeof data !== 'object') throw new Error('Invalid draft data')
        for (const [id, fields] of Object.entries(data)) {
          if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)) || !fields || Array.isArray(fields) || typeof fields !== 'object') continue
          for (const [field, value] of Object.entries(fields)) {
            if (!(field === 'notes' && typeof value === 'string' || field === 'score' && Number.isInteger(value) && value >= -99 && value <= 99)) continue
            entries[id] ||= {}
            entries[id][field] = { value, dirty: true, revision: 1, state: 'error', error: 'Recovered draft. Review and retry to save.' }
          }
        }
      } catch { storageError = true }
      publish(snapshot(), storageError)
    },
    change(id, field, value, original) {
      if (!['notes', 'score'].includes(field)) throw new Error('Unknown draft field')
      if (field === 'score') value = Math.max(-99, Math.min(99, parseInt(value) || 0))
      else value = String(value)
      const fields = entries[id] ||= {}, previous = fields[field]
      fields[field] = { value, dirty: previous?.dirty || value !== original, revision: (previous?.revision || 0) + 1, state: 'pending', error: '' }
      emit(); cancel(id)
      timers.set(String(id), setTimeout(() => { void flush(id) }, field === 'notes' ? 800 : 600))
    },
    flush,
    flushAll: () => Promise.all(Object.keys(entries).map(flush)),
    reconcile(ideas) {
      for (const idea of ideas) for (const [field, draft] of Object.entries(entries[idea.id] || {})) {
        const saved = field === 'notes' ? idea.notes : idea.scoreAdjust
        if (!draft.dirty || draft.state !== 'saving' && draft.value === saved) delete entries[idea.id][field]
      }
      emit()
    },
    remove(id) { cancel(id); delete entries[id]; emit() },
    clear() {
      generation++; workers.clear()
      for (const id of timers.keys()) cancel(id)
      if (account) try { storage().removeItem(key()) } catch { /* Best effort on denied storage. */ }
      entries = {}; account = null; publish({}, false)
    },
  }
}
