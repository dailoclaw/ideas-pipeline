import { create } from 'zustand'
import { supabase } from './supabase'
import { SEED_IDEAS } from '../data/seedIdeas'

// ── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10)

export const useStore = create((set, get) => ({
  ideas: [],
  statusOverrides: {},   // { [id]: 'done' | 'shelved' | null }
  statusHistory: {},     // { [id]: [{status, date}] }
  loading: true,
  error: null,

  // ── Derived helpers ──────────────────────────────────────────────────────
  getStatus(idea) {
    const { statusOverrides } = get()
    if (idea.isNew) return idea.status
    return statusOverrides[idea.id] || idea.status
  },

  // ── Load ─────────────────────────────────────────────────────────────────
  async load() {
    set({ loading: true, error: null })
    try {
      // Fetch ideas
      const { data: rows, error } = await supabase
        .from('ideas')
        .select('*')
        .order('id')
      if (error) throw error

      // If empty → seed from bundled data
      if (!rows || rows.length === 0) {
        await get().seed()
        return
      }

      // Fetch status overrides
      const { data: overrides } = await supabase
        .from('status_overrides')
        .select('idea_id, status')
      const overrideMap = {}
      if (overrides) overrides.forEach(o => { overrideMap[o.idea_id] = o.status })

      // Fetch status history
      const { data: history } = await supabase
        .from('status_history')
        .select('idea_id, status, changed_at')
        .order('changed_at')
      const historyMap = {}
      if (history) {
        history.forEach(h => {
          if (!historyMap[h.idea_id]) historyMap[h.idea_id] = []
          historyMap[h.idea_id].push({ status: h.status, date: h.changed_at })
        })
      }

      // Normalise: Supabase uses snake_case, app uses camelCase
      const ideas = rows.map(r => ({
        id: r.id,
        name: r.name,
        status: r.status,
        time: r.time,
        plat: r.plat,
        pitch: r.pitch || '',
        target: r.target || '',
        pain: r.pain || '',
        mvp: r.mvp || [],
        win: r.win || '',
        notes: r.notes || '',
        addedAt: r.added_at,
        isNew: !r.is_seed,
        isV2: r.is_v2 || false,
        originalId: r.original_id,
      }))

      set({ ideas, statusOverrides: overrideMap, statusHistory: historyMap, loading: false })
    } catch (err) {
      console.error('Load error:', err)
      set({ error: err.message, loading: false })
    }
  },

  // ── Seed from bundled data ────────────────────────────────────────────────
  async seed() {
    const rows = SEED_IDEAS.map(i => ({
      id: i.id,
      name: i.name,
      status: i.status,
      time: i.time,
      plat: i.plat,
      pitch: i.pitch || '',
      target: i.target || '',
      pain: i.pain || '',
      mvp: i.mvp || [],
      win: i.win || '',
      notes: i.notes || '',
      added_at: i.addedAt || null,
      is_seed: true,
    }))

    const { error } = await supabase.from('ideas').upsert(rows)
    if (error) { set({ error: error.message, loading: false }); return }
    await get().load()
  },

  // ── Add idea ──────────────────────────────────────────────────────────────
  async addIdea(fields) {
    const newRow = {
      name: fields.name,
      status: 'idea',
      time: fields.time || '1-2w',
      plat: fields.plat || 'html',
      pitch: fields.pitch || '',
      target: fields.target || '',
      pain: fields.pain || '',
      mvp: fields.mvp || [],
      win: fields.win || '',
      notes: fields.notes || '',
      added_at: today(),
      is_seed: false,
    }
    const { data, error } = await supabase
      .from('ideas')
      .insert(newRow)
      .select()
      .single()
    if (error) throw error

    // Log initial status
    await supabase.from('status_history').insert({
      idea_id: data.id, status: 'idea', changed_at: today()
    })

    await get().load()
    return data.id
  },

  // ── Edit idea ──────────────────────────────────────────────────────────────
  async editIdea(id, fields) {
    const { error } = await supabase
      .from('ideas')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await get().load()
  },

  // ── Delete idea ───────────────────────────────────────────────────────────
  async deleteIdea(id) {
    await supabase.from('status_history').delete().eq('idea_id', id)
    await supabase.from('status_overrides').delete().eq('idea_id', id)
    const { error } = await supabase.from('ideas').delete().eq('id', id)
    if (error) throw error
    await get().load()
  },

  // ── Set status (works for both seed and user ideas) ───────────────────────
  async setStatus(id, status) {
    const { ideas } = get()
    const idea = ideas.find(i => i.id === id)
    if (!idea) return

    // Log history
    await supabase.from('status_history').insert({
      idea_id: id, status, changed_at: today()
    })

    if (idea.isNew) {
      // User-added idea — update directly
      await supabase.from('ideas').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    } else {
      // Seed idea — use overrides table
      const { statusOverrides } = get()
      if (status === null) {
        await supabase.from('status_overrides').delete().eq('idea_id', id)
        const newOverrides = { ...statusOverrides }
        delete newOverrides[id]
        set({ statusOverrides: newOverrides })
      } else {
        await supabase.from('status_overrides').upsert({ idea_id: id, status })
        set({ statusOverrides: { ...statusOverrides, [id]: status } })
      }
    }

    // Optimistic update for ideas array
    set(s => ({
      ideas: s.ideas.map(i =>
        i.id === id ? { ...i, status: idea.isNew ? status : i.status } : i
      )
    }))
  },

  // ── Batch set status ──────────────────────────────────────────────────────
  async batchSetStatus(ids, status) {
    await Promise.all([...ids].map(id => get().setStatus(id, status)))
    await get().load()
  },

  // ── Sprint weeks (localStorage — not critical for cross-device) ───────────
  getSprintWeeks(id, idea) {
    try {
      const map = JSON.parse(localStorage.getItem('ideas-webapp-sprint-weeks') || '{}')
      if (map[id] != null) return Math.max(1, parseInt(map[id]) || 1)
      return ({ '1w': 2, '1-2w': 3, '2-4w': 5 }[idea?.time] || 2)
    } catch { return 2 }
  },
  setSprintWeeks(id, weeks) {
    const map = JSON.parse(localStorage.getItem('ideas-webapp-sprint-weeks') || '{}')
    map[id] = weeks
    localStorage.setItem('ideas-webapp-sprint-weeks', JSON.stringify(map))
  },

  // ── Kanban sort (localStorage) ─────────────────────────────────────────────
  getKanbanSort() {
    try { return JSON.parse(localStorage.getItem('ideas-webapp-kanban-sort') || '{}') }
    catch { return {} }
  },
  setKanbanSort(col, sort) {
    const s = this.getKanbanSort()
    s[col] = sort
    localStorage.setItem('ideas-webapp-kanban-sort', JSON.stringify(s))
    // Trigger re-render by touching state
    set(s => ({ ...s }))
  },
}))
