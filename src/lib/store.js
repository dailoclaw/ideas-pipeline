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

const normaliseIdea = r => ({
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
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  isNew: !r.is_seed,
  isV2: r.is_v2 || false,
  originalId: r.original_id,
  scoreAdjust: r.score_adjust || 0,
  isPriority: r.is_priority || false,
})

// Returned rows distinguish a confirmed write from an RLS-filtered no-op.
const confirmRow = async (query, field, expected) => {
  const { data, error } = await query.select('*').single()
  if (error) throw error
  if (!data || Array.isArray(data) || data[field] == null || (expected != null && data[field] !== expected)) {
    throw new Error('No matching record was saved. Reload the dataset and try again.')
  }
  return data
}
const confirmDelete = async (query, field, expected, allowEmpty = false) => {
  const { data, error } = await query.select(field)
  if (error) throw error
  if (!Array.isArray(data) || !(data.length === 1 && data[0]?.[field] === expected || allowEmpty && data.length === 0)) {
    throw new Error('Deletion could not be confirmed. Reload the dataset and try again.')
  }
}
const requireIdea = (get, id) => {
  const idea = get().ideas.find(i => i.id === id)
  if (!idea) throw new Error('This idea is no longer available. Reload the dataset and try again.')
  return idea
}
const labels = { addIdea: 'Create', editIdea: 'Edit', deleteIdea: 'Delete', setStatus: 'Status', updateNotes: 'Notes', setSprintAssignment: 'Sprint', setScoreAdjust: 'Score', setPriority: 'Priority', setGroupAssignment: 'Group', batchSetStatus: 'Batch status' }
async function mutate(set, get, method, id, args, work) {
  const key = String(id)
  const report = error => set({ saveFeedback: {
    level: 'error', method, id,
    message: `${labels[method]}${typeof id === 'number' ? ` #${id}` : ''} failed: ${error?.message || 'The request failed. Please try again.'}`,
    retry: error?.retry || (() => get()[method](...args)),
  } })
  if (get().pendingSaves[key]) {
    const error = new Error('A save for this idea is already in progress. Wait for it to finish, then retry.')
    report(error)
    throw error
  }
  set(state => ({ pendingSaves: { ...state.pendingSaves, [key]: true }, saveFeedback: null }))
  try { return await work() }
  catch (error) { report(error); throw error }
  finally {
    set(state => {
      const pendingSaves = { ...state.pendingSaves }
      delete pendingSaves[key]
      return { pendingSaves }
    })
  }
}
async function followUp(set, get, description, tasks) {
  const failed = []
  for (const [name, task] of tasks) {
    try { if (await task() === false) failed.push(name) }
    catch { failed.push(name) }
  }
  if (failed.length) set({ saveFeedback: { level: 'warning', message: `${description} saved, but ${failed.join(' and ')} could not be completed. The saved change has been kept.`, retry: () => get().load({ background: true }) } })
}
const recordActivity = (get, id, type, payload) => async () => {
  await get().logActivity(id, type, payload)
  return get().activityPersistenceAvailable !== false
}

export const useStore = create((set, get) => ({
  ideas: [],
  statusOverrides: {},   // { [id]: 'done' | 'shelved' | null }
  statusHistory: {},     // { [id]: [{status, date}] }
  activityLog: {},       // { [id]: [{type, payload, occurredAt, actor}] }
  activityPersistenceAvailable: null,
  groupAssignments: {},  // { [id]: groupKey }
  sprintAssignments: {}, // { [id]: weekNum }
  loading: true,
  error: null,
  pendingSaves: {},
  saveFeedback: null,
  clearSaveFeedback() { set({ saveFeedback: null }) },

  // ── Derived helpers ──────────────────────────────────────────────────────
  getStatus(idea) {
    const { statusOverrides } = get()
    if (idea.isNew) return idea.status
    return statusOverrides[idea.id] || idea.status
  },

  // ── Load ─────────────────────────────────────────────────────────────────
  async load({ background = false } = {}) {
    if (!background) set({ loading: true, error: null })
    try {
      // Fetch ideas
      const { data: rows, error } = await supabase
        .from('ideas')
        .select('*')
        .order('id')
      if (error) throw error
      if (!Array.isArray(rows)) throw new Error('Ideas could not be loaded.')

      // If empty → seed from bundled data
      if (!background && (!rows || rows.length === 0)) {
        return await get().seed()
      }

      // Fetch status overrides
      const { data: overrides, error: overridesError } = await supabase
        .from('status_overrides')
        .select('idea_id, status')
      if (overridesError) throw overridesError
      if (!Array.isArray(overrides)) throw new Error('Status data could not be loaded.')
      const overrideMap = {}
      if (overrides) overrides.forEach(o => { overrideMap[o.idea_id] = o.status })

      // Fetch status history
      const { data: history, error: historyError } = await supabase
        .from('status_history')
        .select('idea_id, status, changed_at')
        .order('changed_at')
      if (historyError) throw historyError
      if (!Array.isArray(history)) throw new Error('History data could not be loaded.')
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
      const { data: groupRows, error: groupError } = await supabase
        .from('idea_group_assignments')
        .select('idea_id, group_key')
      if (groupError) throw groupError
      if (!Array.isArray(groupRows)) throw new Error('Group data could not be loaded.')
      const groupMap = {}
      if (groupRows) groupRows.forEach(r => { groupMap[r.idea_id] = r.group_key })

      // Fetch sprint assignments so exports include the current plan.
      const { data: sprintRows, error: sprintError } = await supabase
        .from('sprint_assignments')
        .select('idea_id, week_num')
      if (sprintError) throw sprintError
      if (!Array.isArray(sprintRows)) throw new Error('Sprint data could not be loaded.')
      const sprintMap = {}
      if (sprintRows) sprintRows.forEach(r => { sprintMap[r.idea_id] = r.week_num })

      // Normalise: Supabase uses snake_case, app uses camelCase
      const ideas = (rows || []).map(normaliseIdea)

      set({
        ideas,
        statusOverrides: overrideMap,
        statusHistory: historyMap,
        activityLog: activityMap,
        activityPersistenceAvailable: !activityError,
        groupAssignments: groupMap,
        sprintAssignments: sprintMap,
        loading: false,
        error: null,
      })
      return true
    } catch (err) {
      console.error('Load error:', err)
      if (background) set({ saveFeedback: { level: 'warning', message: 'Refresh failed. Your last confirmed changes are still shown.', retry: () => get().load({ background: true }) } })
      else set({ error: err.message, loading: false })
      return false
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

    const { data, error } = await supabase.from('ideas').upsert(rows).select('id')
    if (error || !Array.isArray(data) || data.length !== rows.length || rows.some(row => !data.some(saved => saved.id === row.id))) {
      set({ error: error?.message || 'Initial data save could not be confirmed.', loading: false }); return false
    }
    return await get().load()
  },

  // Primary writes commit before state changes; secondary failures never repeat the mutation.
  async addIdea(fields) {
    return mutate(set, get, 'addIdea', 'create', [fields], async () => {
      const ids = get().ideas.map(i => i.id)
      const row = await confirmRow(supabase.from('ideas').insert({
        id: (ids.length ? Math.max(...ids) : 0) + 1,
        name: fields.name, status: 'idea', time: fields.time || '1-2w', plat: fields.plat || 'html',
        pitch: fields.pitch || '', target: fields.target || '', pain: fields.pain || '',
        mvp: fields.mvp || [], win: fields.win || '', notes: fields.notes || '',
        added_at: today(), is_seed: false,
      }), 'id')
      set(state => ({ ideas: [...state.ideas, normaliseIdea(row)] }))
      await followUp(set, get, `Idea #${row.id}`, [
        ['status history', () => confirmRow(supabase.from('status_history').insert({ idea_id: row.id, status: 'idea', changed_at: today() }), 'id')],
        ['activity synchronization', recordActivity(get, row.id, 'created', { name: row.name })],
        ['refresh', () => get().load({ background: true })],
      ])
      return row.id
    })
  },
  async editIdea(id, fields) {
    return mutate(set, get, 'editIdea', id, [id, fields], async () => {
      const before = requireIdea(get, id)
      const row = await confirmRow(supabase.from('ideas').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id), 'id', id)
      set(state => ({ ideas: state.ideas.map(idea => idea.id === id ? normaliseIdea(row) : idea) }))
      const changedFields = Object.keys(fields).filter(key => JSON.stringify(before[key]) !== JSON.stringify(fields[key]))
      await followUp(set, get, `Idea #${id}`, [
        ['activity synchronization', recordActivity(get, id, 'idea_updated', { changedFields })],
        ['refresh', () => get().load({ background: true })],
      ])
    })
  },
  async deleteIdea(id) {
    return mutate(set, get, 'deleteIdea', id, [id], async () => {
      requireIdea(get, id)
      // Supplied schema has cascading foreign keys. Never delete children before the parent.
      await confirmDelete(supabase.from('ideas').delete().eq('id', id), 'id', id)
      set(state => {
        const maps = {}
        for (const key of ['statusOverrides', 'statusHistory', 'activityLog', 'groupAssignments', 'sprintAssignments']) {
          maps[key] = { ...state[key] }; delete maps[key][id]
        }
        return { ideas: state.ideas.filter(idea => idea.id !== id), ...maps }
      })
      await followUp(set, get, `Deletion of #${id}`, [['refresh', () => get().load({ background: true })]])
    })
  },
  async setStatus(id, status) {
    return mutate(set, get, 'setStatus', id, [id, status], async () => {
      const idea = requireIdea(get, id)
      if (idea.isNew && status === null) throw new Error('Choose a status for this idea.')
      const previousStatus = get().getStatus(idea)
      let effectiveStatus = status === null ? idea.status : status
      if (idea.isNew) {
        const row = await confirmRow(supabase.from('ideas').update({ status, updated_at: new Date().toISOString() }).eq('id', id), 'id', id)
        effectiveStatus = row.status
        set(state => ({ ideas: state.ideas.map(i => i.id === id ? normaliseIdea(row) : i) }))
      } else {
        if (status === null) await confirmDelete(supabase.from('status_overrides').delete().eq('idea_id', id), 'idea_id', id, !get().statusOverrides[id])
        else {
          const row = await confirmRow(supabase.from('status_overrides').upsert({ idea_id: id, status }), 'idea_id', id)
          effectiveStatus = row.status
        }
        set(state => {
          const statusOverrides = { ...state.statusOverrides }
          if (status === null) delete statusOverrides[id]; else statusOverrides[id] = effectiveStatus
          return { statusOverrides }
        })
      }
      await followUp(set, get, `Status for #${id}`, [
        ['status history', async () => {
          const row = await confirmRow(supabase.from('status_history').insert({ idea_id: id, status: effectiveStatus, changed_at: today() }), 'id')
          set(state => ({ statusHistory: { ...state.statusHistory, [id]: [...(state.statusHistory[id] || []), { status: row.status, date: row.changed_at }] } }))
        }],
        ['activity synchronization', recordActivity(get, id, 'status_changed', { from: previousStatus, to: effectiveStatus })],
      ])
    })
  },
  async updateNotes(id, notes) {
    return mutate(set, get, 'updateNotes', id, [id, notes], async () => {
      const before = requireIdea(get, id).notes || ''
      const row = await confirmRow(supabase.from('ideas').update({ notes, updated_at: new Date().toISOString() }).eq('id', id), 'id', id)
      const savedNotes = row.notes || ''
      set(state => ({ ideas: state.ideas.map(i => i.id === id ? { ...i, notes: savedNotes } : i) }))
      if (before !== savedNotes) await followUp(set, get, `Notes for #${id}`, [['activity synchronization', recordActivity(get, id, 'notes_updated', { fromLength: before.length, toLength: savedNotes.length })]])
    })
  },
  async batchSetStatus(ids, status) {
    const unique = [...new Set(ids)]
    return mutate(set, get, 'batchSetStatus', 'batch', [unique, status], async () => {
      const results = await Promise.allSettled(unique.map(id => get().setStatus(id, status)))
      const failed = unique.filter((_id, index) => results[index].status === 'rejected')
      if (failed.length) {
        const error = new Error(`${unique.length - failed.length} saved; ${failed.length} failed. Retry applies only to failed ideas.`)
        error.retry = () => get().batchSetStatus(failed, status)
        throw error
      }
    })
  },

  // ── Sprint weeks (localStorage — not critical for cross-device) ───────────
  getSprintWeeks(id, idea) {
    try {
      const map = JSON.parse(localStorage.getItem('ideas-webapp-sprint-weeks') || '{}')
      if (map[id] != null) return Math.max(1, parseInt(map[id]) || 1)
      return ({ '1w': 2, '1-2w': 3, '2-4w': 5 }[idea?.time] || 2)
    } catch { return 2 }
  },
  getSprintAssignment(id) {
    return get().sprintAssignments[id] || null
  },
  async setSprintAssignment(id, week) {
    return mutate(set, get, 'setSprintAssignment', id, [id, week], async () => {
      requireIdea(get, id)
      const previous = get().getSprintAssignment(id)
      let savedWeek = week
      if (week === null) await confirmDelete(supabase.from('sprint_assignments').delete().eq('idea_id', id), 'idea_id', id, previous === null)
      else {
        const row = await confirmRow(supabase.from('sprint_assignments').upsert({ idea_id: id, week_num: week, updated_at: new Date().toISOString() }), 'idea_id', id)
        savedWeek = row.week_num
      }
      set(state => { const sprintAssignments = { ...state.sprintAssignments }; if (week === null) delete sprintAssignments[id]; else sprintAssignments[id] = savedWeek; return { sprintAssignments } })
      if (previous !== savedWeek) await followUp(set, get, `Sprint for #${id}`, [['activity synchronization', recordActivity(get, id, 'sprint_scheduled', { from: previous, to: savedWeek })]])
    })
  },
  async setScoreAdjust(id, scoreAdjust) {
    return mutate(set, get, 'setScoreAdjust', id, [id, scoreAdjust], async () => {
      const previous = requireIdea(get, id).scoreAdjust || 0
      const adj = Math.max(-99, Math.min(99, parseInt(scoreAdjust) || 0))
      const row = await confirmRow(supabase.from('ideas').update({ score_adjust: adj, updated_at: new Date().toISOString() }).eq('id', id), 'id', id)
      set(state => ({ ideas: state.ideas.map(i => i.id === id ? { ...i, scoreAdjust: row.score_adjust } : i) }))
      if (previous !== row.score_adjust) await followUp(set, get, `Score for #${id}`, [['activity synchronization', recordActivity(get, id, 'score_adjusted', { from: previous, to: row.score_adjust })]])
    })
  },
  async setPriority(id, isPriority) {
    return mutate(set, get, 'setPriority', id, [id, isPriority], async () => {
      const previous = Boolean(requireIdea(get, id).isPriority)
      const row = await confirmRow(supabase.from('ideas').update({ is_priority: isPriority, updated_at: new Date().toISOString() }).eq('id', id), 'id', id)
      set(state => ({ ideas: state.ideas.map(i => i.id === id ? { ...i, isPriority: row.is_priority } : i) }))
      if (previous !== row.is_priority) await followUp(set, get, `Priority for #${id}`, [['activity synchronization', recordActivity(get, id, 'priority_changed', { from: previous, to: row.is_priority })]])
    })
  },
  getGroup(id) { return get().groupAssignments[id] || '' },
  async setGroupAssignment(id, groupKey) {
    return mutate(set, get, 'setGroupAssignment', id, [id, groupKey], async () => {
      requireIdea(get, id)
      const previous = get().getGroup(id)
      let savedGroup = groupKey
      if (groupKey) {
        const row = await confirmRow(supabase.from('idea_group_assignments').upsert({ idea_id: id, group_key: groupKey, updated_at: new Date().toISOString() }, { onConflict: 'idea_id' }), 'idea_id', id)
        savedGroup = row.group_key
      }
      else await confirmDelete(supabase.from('idea_group_assignments').delete().eq('idea_id', id), 'idea_id', id, !previous)
      set(state => { const groupAssignments = { ...state.groupAssignments }; if (savedGroup) groupAssignments[id] = savedGroup; else delete groupAssignments[id]; return { groupAssignments } })
      if (previous !== savedGroup) await followUp(set, get, `Group for #${id}`, [['activity synchronization', recordActivity(get, id, 'group_changed', { from: previous, to: savedGroup })]])
    })
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
