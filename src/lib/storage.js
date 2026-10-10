// Access the browser API lazily: even the localStorage property can throw.
export function createSafeStorage(provider = () => localStorage) {
  const memory = new Map(), overrides = new Set()
  let readFailed = false
  const api = {
    read(key) {
      readFailed = false
      if (overrides.has(key)) return memory.get(key) ?? null
      try {
        const value = provider().getItem(key)
        if (value == null) memory.delete(key); else memory.set(key, value)
        return value
      } catch { readFailed = true; return memory.get(key) ?? null }
    },
    write(key, value) {
      value = String(value); memory.set(key, value)
      try { provider().setItem(key, value); overrides.delete(key); return true }
      catch { overrides.add(key); return false }
    },
    remove(key) {
      memory.delete(key)
      try { provider().removeItem(key); overrides.delete(key); return true }
      catch { overrides.add(key); return false }
    },
    readJSON(key, fallback, sanitize) {
      try { const raw = api.read(key); return raw == null ? fallback : sanitize(JSON.parse(raw)) }
      catch { return fallback }
    },
    writeJSON(key, value) {
      try { return api.write(key, JSON.stringify(value)) }
      catch { return false }
    },
    readChoice(key, choices, fallback) {
      const value = api.read(key)
      return choices.includes(value) ? value : fallback
    },
    clearMemory() { memory.clear(); overrides.clear() },
    // Drafts must distinguish durable storage from an in-memory fallback.
    required: {
      getItem(key) { const value = api.read(key); if (readFailed) throw new Error('Storage unavailable'); return value },
      setItem(key, value) { if (!api.write(key, value)) throw new Error('Storage unavailable') },
      removeItem(key) { if (!api.remove(key)) throw new Error('Storage unavailable') },
    },
  }
  return api
}
export const safeStorage = createSafeStorage()
export const scopedKey = (key, account) => `${key}:${encodeURIComponent(account || 'unassigned')}`
export const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value)
export const validIdeaId = value => /^[1-9]\d*$/.test(String(value)) && Number.isSafeInteger(Number(value))
export function sanitizeSorts(value) {
  if (!isRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, sort]) =>
    ['quick','medium','project'].includes(key) && ['score','name','id'].includes(sort)))
}
export function sanitizeWeeks(value) {
  if (!isRecord(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([id, weeks]) => validIdeaId(id) && Number.isInteger(weeks) && weeks >= 1 && weeks <= 8))
}
const types = new Set(['created','status_changed','priority_changed','score_adjusted','group_changed','sprint_scheduled','notes_updated','idea_updated'])
export function sanitizeActivity(value) {
  if (!Array.isArray(value)) return []
  return value.filter(event => {
    if (!isRecord(event) || typeof event.id !== 'string' || !event.id.startsWith('local-') || !validIdeaId(event.ideaId)
      || !types.has(event.type) || typeof event.actor !== 'string' || typeof event.occurredAt !== 'string'
      || !/^\d{4}-\d{2}-\d{2}T/.test(event.occurredAt) || !Number.isFinite(Date.parse(event.occurredAt)) || !isRecord(event.payload)) return false
    const p = event.payload
    switch (event.type) {
      case 'created': return typeof p.name === 'string'
      case 'status_changed': return ['idea','researching','ready','building','done','shelved'].includes(p.from) && ['idea','researching','ready','building','done','shelved'].includes(p.to)
      case 'priority_changed': return typeof p.from === 'boolean' && typeof p.to === 'boolean'
      case 'score_adjusted': return [p.from,p.to].every(n => Number.isInteger(n) && n >= -99 && n <= 99)
      case 'group_changed': return [p.from,p.to].every(s => typeof s === 'string')
      case 'sprint_scheduled': return [p.from,p.to].every(n => n === null || Number.isInteger(n) && n >= 1 && n <= 8)
      case 'notes_updated': return [p.fromLength,p.toLength].every(n => Number.isSafeInteger(n) && n >= 0)
      case 'idea_updated': return Array.isArray(p.changedFields) && p.changedFields.every(s => typeof s === 'string')
      default: return false
    }
  })
}
