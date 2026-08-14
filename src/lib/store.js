import { create } from 'zustand'
import { supabase } from './supabase'
import { SEED_IDEAS } from '../data/seedIdeas'

// ── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10)
const ACTIVITY_STORAGE_KEY = 'ideas-webapp-pending-activity'

const readLocalActivity = () => {
  try { return JSON.parse(localStorage.getItem(ACTIVITY_STORAGE_KEY) || '[]') }
  catch { return [] }
}

const writeLocalActivity = events => {
  try { localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(events.slice(-100))) }
  catch { /* localStorage may be unavailable in private browsing */ }
}

const normaliseActivity = row => ({
  id: row.id,
  ideaId: row.idea_id,
  type: row.event_type,
  payload: row.payload || {},
  occurredAt: row.occurred_at,
  actor: row.actor || 'You',
})

export const useStore = create((set, get) => ({
  ideas: [],
  statusOverrides: {},   // { [id]: 'done' | 'shelved' | null }
  statusHistory: {},     // { [id]: [{status, date}] }
  activityLog: {},       // { [id]: [{type, payload, occurredAt, actor}] }
  activityPersistenceAvailable: null,
  groupAssignments: {},  // { [id]: groupKey }
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

      // Fetch richer decision/activity history. The app remains usable while
      // older deployments are waiting for the idea_activity migration.
      const { data: activityRows, error: activityError } = await supabase
        .from('idea_activity')
        .select('id, idea_id, event_type, payload, occurred_at, actor')
        .order('occurred_at', { ascending: false })
      const activityMap = {}
      const combinedActivity = [
        ...(activityRows || []).map(normaliseActivity),
        ...readLocalActivity(),
      ]
      combinedActivity.forEach(event => {
        if (!activityMap[event.ideaId]) activityMap[event.ideaId] = []
        if (!activityMap[event.ideaId].some(existing => existing.id === event.id)) {
          activityMap[event.ideaId].push(event)
        }
      })
      Object.values(activityMap).forEach(events => events.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)))

      // Fetch group assignments
      const { data: groupRows } = await supabase
        .from('idea_group_assignments')
        .select('idea_id, group_key')
      const groupMap = {}
      if (groupRows) groupRows.forEach(r => { groupMap[r.idea_id] = r.group_key })

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
        scoreAdjust: r.score_adjust || 0,
        isPriority: r.is_priority || false,
      }))

      set({
        ideas,
        statusOverrides: overrideMap,
        statusHistory: historyMap,
        activityLog: activityMap,
        activityPersistenceAvailable: !activityError,
        groupAssignments: groupMap,
        loading: false,
      })
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
    const { ideas } = get()
    const maxId = ideas.length > 0 ? Math.max(...ideas.map(i => i.id)) : 0
    const newRow = {
      id: maxId + 1,
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

    await get().logActivity(data.id, 'created', { name: data.name })

    await get().load()
    return data.id
  },

  // ── Edit idea ──────────────────────────────────────────────────────────────
  async editIdea(id, fields) {
    const before = get().ideas.find(i => i.id === id)
    const { error } = await supabase
      .from('ideas')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    const changedFields = before
      ? Object.keys(fields).filter(key => JSON.stringify(before[key]) !== JSON.stringify(fields[key]))
      : []
    await get().logActivity(id, 'idea_updated', { changedFields })
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
    const previousStatus = get().getStatus(idea)

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
    await get().logActivity(id, 'status_changed', { from: previousStatus, to: status })
  },

  // ── Update notes (any idea — seed or user-added) ───────────────────────────
  async updateNotes(id, notes) {
    const before = get().ideas.find(i => i.id === id)?.notes || ''
    const { error } = await supabase
      .from('ideas')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    set(s => ({
      ideas: s.ideas.map(i => i.id === id ? { ...i, notes } : i)
    }))
    if (before !== notes) {
      await get().logActivity(id, 'notes_updated', {
        fromLength: before.length,
        toLength: notes.length,
      })
    }
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
  // ── Score adjustment + priority ──────────────────────────────────────────────────────
  async setScoreAdjust(id, scoreAdjust) {
    const adj = Math.max(-99, Math.min(99, parseInt(scoreAdjust) || 0))
    const previous = get().ideas.find(i => i.id === id)?.scoreAdjust || 0
    await supabase.from('ideas').update({ score_adjust: adj, updated_at: new Date().toISOString() }).eq('id', id)
    set(s => ({ ideas: s.ideas.map(i => i.id === id ? { ...i, scoreAdjust: adj } : i) }))
    if (previous !== adj) await get().logActivity(id, 'score_adjusted', { from: previous, to: adj })
  },
  async setPriority(id, isPriority) {
    const previous = Boolean(get().ideas.find(i => i.id === id)?.isPriority)
    await supabase.from('ideas').update({ is_priority: isPriority, updated_at: new Date().toISOString() }).eq('id', id)
    set(s => ({ ideas: s.ideas.map(i => i.id === id ? { ...i, isPriority } : i) }))
    if (previous !== isPriority) await get().logActivity(id, 'priority_changed', { from: previous, to: isPriority })
  },

  // ── Group assignment ──────────────────────────────────────────────────────
  getGroup(ideaId) {
    return get().groupAssignments[ideaId] || ''
  },
  async setGroupAssignment(ideaId, groupKey) {
    const previous = get().groupAssignments[ideaId] || ''
    if (groupKey) {
      await supabase.from('idea_group_assignments').upsert(
        { idea_id: ideaId, group_key: groupKey, updated_at: new Date().toISOString() },
        { onConflict: 'idea_id' }
      )
    } else {
      await supabase.from('idea_group_assignments').delete().eq('idea_id', ideaId)
    }
    set(s => {
      const ga = { ...s.groupAssignments }
      if (groupKey) { ga[ideaId] = groupKey } else { delete ga[ideaId] }
      return { groupAssignments: ga }
    })
    if (previous !== groupKey) await get().logActivity(ideaId, 'group_changed', { from: previous, to: groupKey })
  },

  // ── Activity & decision timeline ──────────────────────────────────────────
  async logActivity(ideaId, type, payload = {}) {
    const localEvent = {
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ideaId,
      type,
      payload,
      occurredAt: new Date().toISOString(),
      actor: 'You',
    }

    const pending = [...readLocalActivity(), localEvent]
    writeLocalActivity(pending)
    set(s => ({
      activityLog: {
        ...s.activityLog,
        [ideaId]: [localEvent, ...(s.activityLog[ideaId] || [])],
      },
    }))

    if (get().activityPersistenceAvailable === false) return localEvent

    const { data, error } = await supabase
      .from('idea_activity')
      .insert({
        idea_id: ideaId,
        event_type: type,
        payload,
        occurred_at: localEvent.occurredAt,
        actor: 'You',
      })
      .select('id, idea_id, event_type, payload, occurred_at, actor')
      .single()

    // Keep the local event as an offline-safe fallback when the new table is
    // unavailable or the device is temporarily disconnected.
    if (error || !data) {
      set({ activityPersistenceAvailable: false })
      return localEvent
    }

    const savedEvent = normaliseActivity(data)
    set({ activityPersistenceAvailable: true })
    writeLocalActivity(readLocalActivity().filter(event => event.id !== localEvent.id))
    set(s => ({
      activityLog: {
        ...s.activityLog,
        [ideaId]: (s.activityLog[ideaId] || []).map(event => event.id === localEvent.id ? savedEvent : event),
      },
    }))
    return savedEvent
  },

  // ── Kanban sort (localStorage) ─────────────────────────────────────────────
  getKanbanSort() {
    try { return JSON.parse(localStorage.getItem('ideas-webapp-kanban-sort') || '{}') }
    catch { return {} }
  },
  setKanbanSort(col, sort) {
    const s = get().getKanbanSort()
    s[col] = sort
    localStorage.setItem('ideas-webapp-kanban-sort', JSON.stringify(s))
    // Trigger re-render by touching state
    set(s => ({ ...s }))
  },
}))
