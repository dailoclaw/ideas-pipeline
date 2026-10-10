import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { backend } from './helpers/mock-supabase.js'
import { loadFixtureStore } from './helpers/load-store.mjs'
import { knownDefect } from './helpers/known-defect.mjs'

const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
}
globalThis.fetch = () => { throw new Error('Network access is forbidden in store fixtures') }
const { useStore } = await loadFixtureStore()
beforeEach(async () => {
  values.clear(); backend.reset()
  useStore.setState({ ideas: [], statusOverrides: {}, statusHistory: {}, activityLog: {},
    activityPersistenceAvailable: null, groupAssignments: {}, sprintAssignments: {}, loading: true, error: null })
  await useStore.getState().load()
})

test('fixture client loads representative records and normalized fields', () => {
  assert.equal(useStore.getState().ideas.length, 5)
  assert.equal(useStore.getState().ideas.find(i => i.id === 103).isNew, true)
  assert.equal(useStore.getState().error, null)
  assert.equal(useStore.getState().loading, false)
})

test('successful notes save persists to fixture and local state', async () => {
  await useStore.getState().updateNotes(101, 'Updated fixture notes')
  assert.equal(backend.tables.ideas.find(i => i.id === 101).notes, 'Updated fixture notes')
  assert.equal(useStore.getState().ideas.find(i => i.id === 101).notes, 'Updated fixture notes')
})

test('checked sprint failure rejects and preserves prior state', async () => {
  backend.deny('sprint_assignments', 'upsert')
  await assert.rejects(useStore.getState().setSprintAssignment(101, 8), { message: 'Fixture permission denied', code: '42501' })
  assert.equal(useStore.getState().getSprintAssignment(101), null)
})

for (const [name, table, operation, mutate, read, original] of [
  ['status', 'status_overrides', 'upsert', s => s.setStatus(101, 'building'), s => s.getStatus(s.ideas.find(i => i.id === 101)), 'idea'],
  ['priority', 'ideas', 'update', s => s.setPriority(101, true), s => s.ideas.find(i => i.id === 101).isPriority, false],
  ['score', 'ideas', 'update', s => s.setScoreAdjust(101, 99), s => s.ideas.find(i => i.id === 101).scoreAdjust, 0],
  ['group', 'idea_group_assignments', 'upsert', s => s.setGroupAssignment(101, 'intel'), s => s.getGroup(101), ''],
]) test(`denied ${name} write must reject and retain prior state`, t => knownDefect(t, 'C2: store ignores mutation errors', async () => {
  backend.deny(table, operation)
  const outcome = await mutate(useStore.getState()).then(() => 'resolved', () => 'rejected')
  assert.deepEqual({ outcome, value: read(useStore.getState()) }, { outcome: 'rejected', value: original })
}))

test('simultaneous status writes must retain both overrides', t => knownDefect(t, 'C5: stale override map overwrites concurrent result', async () => {
  await Promise.all([useStore.getState().setStatus(101, 'ready'), useStore.getState().setStatus(102, 'ready')])
  assert.equal(backend.tables.status_overrides.length, 2)
  assert.deepEqual(useStore.getState().statusOverrides, { 101: 'ready', 102: 'ready' })
}))

test('malformed activity storage must not prevent logging', t => knownDefect(t, 'C6: activity buffer lacks shape validation', async () => {
  localStorage.setItem('ideas-webapp-pending-activity', '{}')
  await assert.doesNotReject(useStore.getState().logActivity(101, 'notes_updated', { toLength: 1 }))
}))

test('null Kanban storage must fall back to an empty map', t => knownDefect(t, 'C6: Kanban map lacks shape validation', () => {
  localStorage.setItem('ideas-webapp-kanban-sort', 'null')
  assert.doesNotThrow(() => useStore.getState().setKanbanSort('quick', 'name'))
}))

test('failed parent deletion must preserve status history', t => knownDefect(t, 'C8: child deletes occur before parent succeeds', async () => {
  backend.tables.status_history.push({ id: 1, idea_id: 103, status: 'ready', changed_at: '2026-09-01' })
  backend.deny('ideas', 'delete')
  await assert.rejects(useStore.getState().deleteIdea(103), { message: 'Fixture permission denied', code: '42501' })
  assert.equal(backend.tables.status_history.length, 1)
}))
