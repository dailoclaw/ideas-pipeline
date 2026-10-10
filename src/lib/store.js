import { validateIdeaFields, validateText, validateChoice, STATUSES, GROUP_KEYS, validSprintWeek } from './validation.js'
import { readAll } from './pagination.js'
import { isPastEvent } from './history.js'
import { create } from 'zustand'
import { supabase } from './supabase'
import { createDraftController } from './drafts.js'
import { safeStorage, scopedKey, sanitizeActivity, sanitizeSorts, sanitizeWeeks } from './storage.js'

// ── Helpers ────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().slice(0, 10)
const ACTIVITY_STORAGE_KEY = 'ideas-webapp-pending-activity'

const normaliseActivity = row => ({
  id: row.id,
  ideaId: row.idea_id,
  type: row.event_type,
  payload: row.payload || {},
  occurredAt: row.occurred_at,
  requestId: row.client_request_id,
  pending: false,
  actor: row.actor || 'You',
})

const normaliseIdea = r => ({
  id: r.id,
  name: typeof r.name === 'string' ? r.name : '',
  status: r.status,
  time: r.time,
  plat: r.plat,
  pitch: typeof r.pitch === 'string' ? r.pitch : '',
  target: typeof r.target === 'string' ? r.target : '',
  pain: typeof r.pain === 'string' ? r.pain : '',
  mvp: Array.isArray(r.mvp) ? r.mvp.filter(item => typeof item === 'string') : [],
  win: typeof r.win === 'string' ? r.win : '',
  notes: typeof r.notes === 'string' ? r.notes : '',
  addedAt: r.added_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  isNew: !r.is_seed,
  isV2: r.is_v2 || false,
  originalId: r.original_id,
  scoreAdjust: Number.isInteger(r.score_adjust) ? Math.max(-99, Math.min(99, r.score_adjust)) : 0,
  isPriority: r.is_priority === true,
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
const confirmMutation = async (name, args, expectedId) => {
  const { data, error } = await supabase.rpc(name, args)
  if (error) {
    if (error.code === 'PGRST202' || error.code === '42883') {
      throw new Error('This database needs the transaction migration before this action can be saved.')
    }
    throw error
  }
  if (!data || typeof data.replayed !== 'boolean' || !Number.isInteger(data.idea?.id)
    || expectedId != null && data.idea.id !== expectedId
    || data.history && (data.history.idea_id !== data.idea.id || data.history.id == null)
    || data.activity && (data.activity.idea_id !== data.idea.id || data.activity.id == null)
    || name === 'create_idea' && (!data.history || !data.activity)) {
    throw new Error('The database transaction could not be confirmed. Retry to check the same request.')
  }
  return data
}
const applyMutation = (set, result) => set(state => {
  const { idea: row, override, history, activity } = result
  const statusOverrides = { ...state.statusOverrides }
  if (override == null) delete statusOverrides[row.id]; else statusOverrides[row.id] = override
  const exists = state.ideas.some(idea => idea.id === row.id)
  return {
    ideas: exists ? state.ideas.map(idea => idea.id === row.id ? normaliseIdea(row) : idea) : [...state.ideas, normaliseIdea(row)],
    statusOverrides,
    ...(history ? { statusHistory: { ...state.statusHistory, [row.id]: [...(state.statusHistory[row.id] || []), { status: history.status, date: history.changed_at }] } } : {}),
    ...(activity ? { activityLog: { ...state.activityLog, [row.id]: [normaliseActivity(activity), ...(state.activityLog[row.id] || [])] } } : {}),
  }
})
const requireIdea = (get, id) => {
  const idea = get().ideas.find(i => i.id === id)
  if (!idea) throw new Error('This idea is no longer available. Reload the dataset and try again.')
  return idea
}
const labels = { addIdea: 'Create', editIdea: 'Edit', deleteIdea: 'Delete', setStatus: 'Status', updateNotes: 'Notes', setSprintAssignment: 'Sprint', setScoreAdjust: 'Score', setPriority: 'Priority', setGroupAssignment: 'Group', batchSetStatus: 'Batch status' }
async function mutate(set, get, method, id, args, work) {
  const key = String(id)
  const report = error => set({ saveFeedback: {
    level: 'error', method, id, retryAction: error?.retryAction,
    message: `${labels[method]}${typeof id === 'number' ? ` #${id}` : ''} failed: ${error?.message || 'The request failed. Please try again.'}`,
    retry: error?.retry || (() => get()[method](...args)),
  } })
  if (get().pendingSaves[key]) {
    const error = new Error('A save for this idea is already in progress. Wait for it to finish, then retry.')
    report(error)
    throw error
  }
  set(state => ({ dataRevision: state.dataRevision + 1, pendingSaves: { ...state.pendingSaves, [key]: true }, saveFeedback: null }))
  try { return await work() }
  catch (error) { report(error); throw error }
  finally {
    set(state => {
      const pendingSaves = { ...state.pendingSaves }
      delete pendingSaves[key]
      return { pendingSaves, dataRevision: state.dataRevision + 1 }
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

export const useStore = create((set, get) => {
  let loadTicket = 0
  const accountKey = key => scopedKey(key, get().draftAccount)
  let syncTask = null, accountGeneration = 0
  const writeLocalActivity = events => {
    const stored = safeStorage.writeJSON(accountKey(ACTIVITY_STORAGE_KEY), sanitizeActivity(events))
    set({outboxCount:events.length, outboxStorageError:!stored})
    return stored
  }
  const readLocalActivity = () => {
    const events = safeStorage.readJSON(accountKey(ACTIVITY_STORAGE_KEY), [], sanitizeActivity)
    if (events.some(event => !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(event.requestId || ''))) {
      const migrated = events.map(event => /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(event.requestId || '') ? event : ({...event,requestId:crypto.randomUUID()}))
      writeLocalActivity(migrated); return migrated
    }
    return events
  }
  const drafts = createDraftController({
    publish: (draftValues, draftStorageError) => set({ draftValues, draftStorageError }),
    save: async (id, field, value) => {
      const account = get().draftAccount
      if (get().pendingSaves[id]) await new Promise(resolve => {
        const unsubscribe = useStore.subscribe(state => {
          if (!state.pendingSaves[id] || state.draftAccount !== account) { unsubscribe(); resolve() }
        })
      })
      if (get().draftAccount !== account) throw new Error('Account changed; draft save stopped.')
      return field === 'notes' ? get().updateNotes(id, value) : get().setScoreAdjust(id, value)
    },
  })
  return ({
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
  dataRevision: 0,
  hasLoaded: false,
  datasetComplete:false, activityHistoryComplete:false,
  outboxCount:0, outboxStorageError:false, outboxError:null, outboxSyncing:false,
  draftAccount: null,
  draftValues: {},
  draftStorageError: false,
  configureDrafts(account) {
    if (get().draftAccount !== account) accountGeneration++
    drafts.configure(account); set({ draftAccount: account })
    set({outboxCount:readLocalActivity().length})
    // Unowned legacy activity cannot be safely attributed to a signed-in account.
    safeStorage.remove(ACTIVITY_STORAGE_KEY)
  },
  changeDraft(id, field, value) {
    const idea = requireIdea(get, id)
    drafts.change(id, field, value, field === 'notes' ? idea.notes : idea.scoreAdjust)
  },
  flushDrafts(id) { return drafts.flush(id) },
  flushAllDrafts() { return drafts.flushAll() },
  clearDrafts() {
    accountGeneration++; syncTask=null
    safeStorage.remove(accountKey(ACTIVITY_STORAGE_KEY))
    set({ draftAccount: null, outboxCount:0, outboxError:null }); drafts.clear()
  },
  saveFeedback: null,
  clearSaveFeedback() { set({ saveFeedback: null }) },

  // ── Derived helpers ──────────────────────────────────────────────────────
  getStatus(idea) {
    const { statusOverrides } = get()
    if (idea.isNew) return idea.status
    return statusOverrides[idea.id] || idea.status
  },

  // ── Load ─────────────────────────────────────────────────────────────────
  async load({ background = false, retry = 0 } = {}) {
    background = background || get().hasLoaded
    const ticket = ++loadTicket, revision = get().dataRevision
    if (!background) set({ loading: true, error: null })
    try {
      const rows = await readAll(supabase, 'ideas', '*', 'id')
      const overrides = await readAll(supabase, 'status_overrides', 'idea_id, status', 'idea_id')
      const overrideMap = {}
      if (overrides) overrides.forEach(o => { overrideMap[o.idea_id] = o.status })

      const history = await readAll(supabase, 'status_history', 'id, idea_id, status, changed_at', 'id')
      const historyMap = {}
      if (history) {
        [...history].sort((a,b)=>String(a.changed_at).localeCompare(String(b.changed_at)) || a.id-b.id).forEach(h => {
          if (!historyMap[h.idea_id]) historyMap[h.idea_id] = []
          historyMap[h.idea_id].push({ id:h.id, status: h.status, date: h.changed_at })
        })
      }

      let activityRows = [], activityError = null
      try { activityRows = await readAll(supabase, 'idea_activity', '*', 'id') }
      catch(error) { activityError = error }
      const activityMap = {}
      const combinedActivity = [
        ...(activityRows || []).map(normaliseActivity),
        ...readLocalActivity().filter(event => !activityRows.some(row => row.client_request_id === event.requestId)),
      ]
      combinedActivity.filter(event => isPastEvent(event) && sanitizeActivity([{...event,id:'local-validate'}]).length).forEach(event => {
        if (!activityMap[event.ideaId]) activityMap[event.ideaId] = []
        if (!activityMap[event.ideaId].some(existing => existing.id === event.id)) {
          activityMap[event.ideaId].push(event)
        }
      })
      Object.values(activityMap).forEach(events => events.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt)))

      const groupRows = await readAll(supabase, 'idea_group_assignments', 'idea_id, group_key', 'idea_id')
      const groupMap = {}
      if (groupRows) groupRows.forEach(r => { groupMap[r.idea_id] = r.group_key })

      const sprintRows = await readAll(supabase, 'sprint_assignments', 'idea_id, week_num', 'idea_id')
      const sprintMap = {}
      if (sprintRows) sprintRows.forEach(r => { sprintMap[r.idea_id] = r.week_num })

      // Normalise: Supabase uses snake_case, app uses camelCase
      const ideas = (rows || []).map(normaliseIdea)

      if (ticket !== loadTicket) return false
      if (revision !== get().dataRevision) {
        if (retry < 1) return get().load({ background: true, retry: retry + 1 })
        throw new Error('Refresh was overtaken by newer changes. Retry when saves finish.')
      }
      drafts.reconcile(ideas)
      set({
        datasetComplete: true, activityHistoryComplete: !activityError,
        hasLoaded: true,
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
      if (ticket !== loadTicket) return false
      set({ datasetComplete:false })
      console.error('Load error:', err)
      if (background) set({ saveFeedback: { level: 'warning', message: 'Refresh failed. Your last confirmed changes are still shown.', retry: () => get().load({ background: true }) } })
      else set({ error: err.message, loading: false })
      return false
    }
  },

  // Requires the matching transaction migration; never fall back to browser IDs.
  async addIdea(fields, requestId = crypto.randomUUID()) {
    return mutate(set, get, 'addIdea', 'create', [fields, requestId], async () => {
      const payload = validateIdeaFields(fields)
      let result
      try { result = await confirmMutation('create_idea', { p_request_id: requestId, p_fields: payload }) }
      catch (error) {
        if (error.code === '23505') { error.retryAction = 'refresh'; error.retry = () => get().load({ background: true }) }
        throw error
      }
      if (!result.replayed) applyMutation(set, result)
      await followUp(set, get, `Idea #${result.idea.id}`, [['refresh', () => get().load({ background: true })]])
      return result.idea.id
    })
  },
  async editIdea(id, fields) {
    return mutate(set, get, 'editIdea', id, [id, fields], async () => {
      fields = validateIdeaFields(fields, true)
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
      drafts.remove(id)
      writeLocalActivity(readLocalActivity().filter(event => Number(event.ideaId) !== id))
      const weeks = safeStorage.readJSON(accountKey('ideas-webapp-sprint-weeks'), {}, sanitizeWeeks)
      delete weeks[id]; safeStorage.writeJSON(accountKey('ideas-webapp-sprint-weeks'), weeks)
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
  async setStatus(id, status, request) {
    return mutate(set, get, 'setStatus', id, [id, status, request], async () => {
      const idea = requireIdea(get, id)
      if (status !== null) validateChoice(status, STATUSES, 'status')
      if (idea.isNew && status === null) throw new Error('Choose a status for this idea.')
      const operation = request || { id: crypto.randomUUID(), expectedStatus: get().getStatus(idea) }
      // Preserve the token/expected status if transport fails after server commit.
      try {
        const result = await confirmMutation('change_idea_status', {
          p_request_id: operation.id, p_idea_id: id, p_status: status, p_expected_status: operation.expectedStatus,
        }, id)
        if (result.replayed) {
          await followUp(set, get, `Status for #${id}`, [['refresh', () => get().load({ background: true })]])
        } else applyMutation(set, result)
      } catch (error) {
        // A conflict requires a refresh, rather than overwriting another client's decision.
        if (error.code === '40001') error.retryAction = 'refresh'
        error.retry = error.code === '40001' ? () => get().load({ background: true }) : () => get().setStatus(id, status, operation)
        throw error
      }
    })
  },
  async updateNotes(id, notes) {
    return mutate(set, get, 'updateNotes', id, [id, notes], async () => {
      notes = validateText(notes, 'notes', false)
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
    const map = safeStorage.readJSON(accountKey('ideas-webapp-sprint-weeks'), {}, sanitizeWeeks)
    const estimates = { '1w': 2, '1-2w': 3, '2-4w': 5 }
    return map[id] ?? (Object.hasOwn(estimates, idea?.time) ? estimates[idea.time] : 2)
  },
  getSprintAssignment(id) {
    return get().sprintAssignments[id] || null
  },
  async setSprintAssignment(id, week) {
    return mutate(set, get, 'setSprintAssignment', id, [id, week], async () => {
      requireIdea(get, id)
      if (week !== null && !validSprintWeek(week)) throw new Error('Start week must be an integer from 1 to 8.')
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
      if (!Number.isInteger(scoreAdjust) || Math.abs(scoreAdjust) > 99) throw new Error('Score adjustment must be an integer from −99 to 99.')
      const adj = scoreAdjust
      const row = await confirmRow(supabase.from('ideas').update({ score_adjust: adj, updated_at: new Date().toISOString() }).eq('id', id), 'id', id)
      set(state => ({ ideas: state.ideas.map(i => i.id === id ? { ...i, scoreAdjust: row.score_adjust } : i) }))
      if (previous !== row.score_adjust) await followUp(set, get, `Score for #${id}`, [['activity synchronization', recordActivity(get, id, 'score_adjusted', { from: previous, to: row.score_adjust })]])
    })
  },
  async setPriority(id, isPriority) {
    return mutate(set, get, 'setPriority', id, [id, isPriority], async () => {
      if (typeof isPriority !== 'boolean') throw new Error('Priority must be true or false.')
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
      if (groupKey !== '') validateChoice(groupKey, GROUP_KEYS, 'workspace')
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
    const requestId = crypto.randomUUID()
    const localEvent = {pending:true,id:`local-${requestId}`,requestId,ideaId,type,payload,occurredAt:new Date().toISOString(),actor:'You (pending)'}
    if (!sanitizeActivity([localEvent]).length) throw new Error('Invalid activity event')
    const pending=readLocalActivity()
    if(pending.length>=100) {
      set({outboxError:'Activity buffer full. Retry synchronization or export pending history; this new event could not be queued.',activityPersistenceAvailable:false})
      throw new Error('Activity buffer full; existing events have been retained')
    }
    writeLocalActivity([...pending,localEvent])
    set(state=>({activityLog:{...state.activityLog,[ideaId]:[localEvent,...(state.activityLog[ideaId] || [])]}}))
    if(get().activityPersistenceAvailable !== false) await get().syncActivity()
    return localEvent
  },
  async syncActivity() {
    if(syncTask)return syncTask
    const epoch=accountGeneration, account=get().draftAccount
    if(!account)return false
    const work=(async()=>{
      await Promise.resolve()
      set({outboxSyncing:true,outboxError:null})
      try {
        for(let n=0;n<100;n++) {
          if(epoch!==accountGeneration)return false
          const event=readLocalActivity()[0]
          if(!event) { set({activityPersistenceAvailable:true});return true }
          const {data,error}=await supabase.rpc('record_idea_activity',{p_request_id:event.requestId,p_idea_id:Number(event.ideaId),p_type:event.type,p_payload:event.payload,p_occurred_at:event.occurredAt})
          if(epoch!==accountGeneration)return false
          if(error)throw error
          if(!data?.activity?.id || data.activity.client_request_id !== event.requestId || Number(data.activity.idea_id) !== Number(event.ideaId) || data.activity.event_type !== event.type)throw new Error('Activity confirmation is incomplete')
          if (!get().ideas.some(idea => idea.id === Number(event.ideaId))) {
            writeLocalActivity(readLocalActivity().filter(item=>item.requestId!==event.requestId)); continue
          }
          const saved=normaliseActivity(data.activity)
          writeLocalActivity(readLocalActivity().filter(item=>item.requestId!==event.requestId))
          set(state=>({dataRevision:state.dataRevision+1,activityLog:{...state.activityLog,[event.ideaId]:[saved,...(state.activityLog[event.ideaId] || []).filter(item=>item.id!==event.id && item.id!==saved.id && item.requestId!==event.requestId)]}}))
        }
        return readLocalActivity().length===0
      } catch(error) {
        if(epoch===accountGeneration)set({outboxError:error.message || 'Activity synchronization unavailable',activityPersistenceAvailable:false})
        return false
      } finally {if(epoch===accountGeneration)set({outboxSyncing:false,outboxCount:readLocalActivity().length})}
    })().finally(()=>{if(syncTask===work)syncTask=null})
    syncTask=work;return work
  },
  exportPendingActivity() { return JSON.stringify(readLocalActivity(),null,2) },

  // ── Kanban sort (localStorage) ─────────────────────────────────────────────
  getKanbanSort() {
    return safeStorage.readJSON(accountKey('ideas-webapp-kanban-sort'), {}, sanitizeSorts)
  },
  setKanbanSort(col, sort) {
    if (!Object.hasOwn(sanitizeSorts({ [col]: sort }), col)) return
    const sorts = { ...get().getKanbanSort(), [col]: sort }
    safeStorage.writeJSON(accountKey('ideas-webapp-kanban-sort'), sorts)
    set(state => ({ preferenceRevision: (state.preferenceRevision || 0) + 1 }))
  },
})
})
