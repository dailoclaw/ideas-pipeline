import { safeStorage } from '../src/lib/storage.js'
import test, { beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { backend } from './helpers/mock-supabase.js'
import { loadFixtureStore } from './helpers/load-store.mjs'

const values = new Map()
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  removeItem: key => values.delete(key),
  setItem: (key, value) => values.set(key, String(value)),
}
globalThis.fetch = () => { throw new Error('Network access is forbidden in store fixtures') }
const { useStore } = await loadFixtureStore()
beforeEach(async () => {
  useStore.getState().clearDrafts()
  values.clear(); safeStorage.clearMemory(); backend.reset()
  useStore.setState({ ideas: [], statusOverrides: {}, statusHistory: {}, activityLog: {},
    hasLoaded: false, dataRevision: 0, draftAccount: null, draftValues: {}, draftStorageError: false, activityPersistenceAvailable: null, groupAssignments: {}, sprintAssignments: {}, loading: true, error: null, pendingSaves: {}, saveFeedback: null })
  useStore.getState().configureDrafts('owner')
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
]) test(`denied ${name} write must reject and retain prior state`, async () => {
  backend.deny(table, operation)
  const outcome = await mutate(useStore.getState()).then(() => 'resolved', () => 'rejected')
  assert.deepEqual({ outcome, value: read(useStore.getState()) }, { outcome: 'rejected', value: original })
  assert.equal(backend.tables.status_history.length, 0)
  assert.equal(backend.tables.idea_activity.length, 0)
  assert.equal(useStore.getState().saveFeedback.level, 'error')
})

test('simultaneous status writes must retain both overrides', async () => {
  await Promise.all([useStore.getState().setStatus(101, 'ready'), useStore.getState().setStatus(102, 'ready')])
  assert.equal(backend.tables.status_overrides.length, 2)
  assert.deepEqual(useStore.getState().statusOverrides, { 101: 'ready', 102: 'ready' })
})

test('malformed activity storage must not prevent logging', async () => {
  localStorage.setItem('ideas-webapp-pending-activity:owner', '{}')
  await assert.doesNotReject(useStore.getState().logActivity(101, 'notes_updated', { fromLength: 0, toLength: 1 }))
})

test('null Kanban storage must fall back to an empty map', () => {
  localStorage.setItem('ideas-webapp-kanban-sort:owner', 'null')
  assert.doesNotThrow(() => useStore.getState().setKanbanSort('quick', 'name'))
})

test('failed parent deletion must preserve status history', async () => {
  backend.tables.status_history.push({ id: 1, idea_id: 103, status: 'ready', changed_at: '2026-09-01' })
  backend.deny('ideas', 'delete')
  await assert.rejects(useStore.getState().deleteIdea(103), { message: 'Fixture permission denied', code: '42501' })
  assert.equal(backend.tables.status_history.length, 1)
})

const updates = [
  ['notes', 'ideas', s => s.updateNotes(101, 'Unconfirmed draft'), s => s.ideas.find(i => i.id === 101).notes, 'Original notes'],
  ['user status', 'ideas', s => s.setStatus(103, 'building'), s => s.getStatus(s.ideas.find(i => i.id === 103)), 'ready'],
  ['priority', 'ideas', s => s.setPriority(101, true), s => s.ideas.find(i => i.id === 101).isPriority, false],
  ['score', 'ideas', s => s.setScoreAdjust(101, 20), s => s.ideas.find(i => i.id === 101).scoreAdjust, 0],
  ['edit', 'ideas', s => s.editIdea(101, { name: 'Not persisted' }), s => s.ideas.find(i => i.id === 101).name, 'Fixture intake'],
]
for (const [name, table, write, read, original] of updates) {
  for (const fault of ['zero', 'network']) test(`${name} ${fault} failure rejects without state or activity changes`, async () => {
    backend.fault(table, 'update', fault)
    await assert.rejects(write(useStore.getState()))
    assert.equal(read(useStore.getState()), original)
    assert.equal(backend.tables.idea_activity.length, 0)
    assert.equal(backend.tables.status_history.length, 0)
    assert.equal(useStore.getState().saveFeedback.level, 'error')
    assert.deepEqual(useStore.getState().pendingSaves, {})
  })
}
test('unknown idea rejects visibly instead of silently succeeding', async () => {
  await assert.rejects(useStore.getState().setStatus(999, 'ready'), /no longer available/)
  assert.match(useStore.getState().saveFeedback.message, /#999/)
})
test('failed transactional history rolls back status and publishes a save error', async () => {
  backend.deny('status_history', 'insert')
  await assert.rejects(useStore.getState().setStatus(101, 'ready'))
  assert.equal(useStore.getState().getStatus(useStore.getState().ideas[0]), 'idea')
  assert.equal(backend.tables.status_overrides.length, 0)
  assert.equal(backend.tables.idea_activity.length, 0)
  assert.equal(useStore.getState().saveFeedback.level, 'error')
})
test('activity transport failure cannot turn persisted notes into a failed save', async () => {
  backend.fault('idea_activity', 'insert', 'network')
  await useStore.getState().updateNotes(101, 'Persisted despite logging failure')
  assert.equal(backend.tables.ideas[0].notes, 'Persisted despite logging failure')
  assert.equal(useStore.getState().ideas[0].notes, 'Persisted despite logging failure')
  assert.equal(useStore.getState().saveFeedback.level, 'warning')
})
test('creation followed by a failed refresh keeps the inserted idea and retries only reads', async () => {
  backend.deny('ideas', 'select')
  const id = await useStore.getState().addIdea({ name: 'Saved once', pitch: 'Fixture pitch' })
  assert.equal(useStore.getState().ideas.find(i => i.id === id).name, 'Saved once')
  assert.equal(useStore.getState().error, null)
  assert.equal(useStore.getState().loading, false)
  assert.match(useStore.getState().saveFeedback.message, /saved, but refresh/)
  backend.denied = []
  await useStore.getState().saveFeedback.retry()
  assert.equal(backend.tables.ideas.filter(i => i.name === 'Saved once').length, 1)
  assert.equal(backend.requests.filter(r => r.table === 'ideas' && r.operation === 'insert').length, 1)
})
test('failed secondary refresh preserves confirmed assignment maps', async () => {
  await useStore.getState().setGroupAssignment(101, 'intel')
  backend.deny('idea_group_assignments', 'select')
  assert.equal(await useStore.getState().load({ background: true }), false)
  assert.equal(useStore.getState().getGroup(101), 'intel')
  assert.equal(useStore.getState().error, null)
})
test('partial batch waits for every write and retry targets only failures', async () => {
  backend.deny('ideas', 'update')
  await assert.rejects(useStore.getState().batchSetStatus([101, 103], 'building'), /1 saved; 1 failed/)
  assert.equal(useStore.getState().getStatus(useStore.getState().ideas.find(i => i.id === 101)), 'building')
  assert.equal(useStore.getState().getStatus(useStore.getState().ideas.find(i => i.id === 103)), 'ready')
  const retry = useStore.getState().saveFeedback.retry
  backend.denied = []
  await retry()
  assert.equal(backend.tables.status_history.filter(r => r.idea_id === 101).length, 1)
  assert.equal(backend.tables.status_history.filter(r => r.idea_id === 103).length, 1)
  assert.deepEqual(useStore.getState().pendingSaves, {})
})
test('same idea cannot submit duplicate saves while the first is pending', async () => {
  const saving = useStore.getState().setPriority(101, true)
  await assert.rejects(useStore.getState().setPriority(101, true), /already in progress/)
  await saving
  assert.equal(backend.requests.filter(r => r.table === 'ideas' && r.operation === 'update').length, 1)
})
test('zero-row deletion cannot remove local state or child history', async () => {
  backend.tables.status_history.push({ id: 1, idea_id: 103, status: 'ready' })
  backend.fault('ideas', 'delete', 'zero')
  await assert.rejects(useStore.getState().deleteIdea(103), /Deletion could not be confirmed/)
  assert.ok(useStore.getState().ideas.some(i => i.id === 103))
  assert.equal(backend.tables.status_history.length, 1)
})
test('successful deletion cascades child fixtures and keeps a failed refresh distinct', async () => {
  backend.tables.status_history.push({ id: 1, idea_id: 103, status: 'ready' })
  backend.deny('ideas', 'select')
  await useStore.getState().deleteIdea(103)
  assert.equal(backend.tables.status_history.length, 0)
  assert.equal(useStore.getState().ideas.some(i => i.id === 103), false)
  assert.equal(useStore.getState().saveFeedback.level, 'warning')
})
test('clearing a seed override records its effective status instead of null', async () => {
  await useStore.getState().setStatus(101, 'done')
  await useStore.getState().setStatus(101, null)
  assert.equal(useStore.getState().getStatus(useStore.getState().ideas[0]), 'idea')
  assert.equal(backend.tables.status_history.at(-1).status, 'idea')
})

// Step 4: the fixture tests the client contract; database.test.mjs executes the SQL.
test('create omits a client ID even when a higher idea is absent from loaded state', async () => {
  backend.nextIdeaId = 9001
  const id = await useStore.getState().addIdea({ name: 'Server allocated', pitch: 'Fixture pitch' })
  assert.equal(id, 9001)
  assert.equal(backend.requests.find(r => r.table === 'ideas' && r.operation === 'insert').body.id, undefined)
  assert.equal(backend.rpcRequests[0].name, 'create_idea')
})
test('lost create response retries the same request without duplicate rows', async () => {
  backend.fault('create_idea', 'rpc', 'lost-response')
  await assert.rejects(useStore.getState().addIdea({ name: 'Exactly one', pitch: 'Fixture pitch' }))
  const retry = useStore.getState().saveFeedback.retry
  backend.faults = []
  await retry()
  assert.equal(backend.tables.ideas.filter(i => i.name === 'Exactly one').length, 1)
  assert.equal(backend.tables.idea_activity.length, 1)
  assert.equal(backend.tables.status_history.length, 1)
  assert.equal(backend.rpcRequests[0].args.p_request_id, backend.rpcRequests[1].args.p_request_id)
})
test('lost status response retries without duplicate history or stale overwrite', async () => {
  backend.fault('change_idea_status', 'rpc', 'lost-response')
  await assert.rejects(useStore.getState().setStatus(101, 'ready'))
  const retry = useStore.getState().saveFeedback.retry
  backend.tables.status_overrides[0].status = 'done' // Another client changed it after the commit.
  backend.faults = []
  await retry()
  assert.equal(useStore.getState().getStatus(useStore.getState().ideas[0]), 'done')
  assert.equal(backend.tables.status_history.length, 1)
  assert.equal(backend.tables.idea_activity.length, 1)
})
test('stale status requires read-only refresh and cannot overwrite another client', async () => {
  backend.tables.status_overrides.push({ idea_id: 101, status: 'done' })
  await assert.rejects(useStore.getState().setStatus(101, 'ready'), { code: '40001' })
  assert.equal(useStore.getState().saveFeedback.retryAction, 'refresh')
  await useStore.getState().saveFeedback.retry()
  assert.equal(useStore.getState().getStatus(useStore.getState().ideas[0]), 'done')
  assert.equal(backend.tables.status_history.length, 0)
})
test('transactional activity failure preserves the previous status and history', async () => {
  backend.deny('idea_activity', 'insert')
  await assert.rejects(useStore.getState().setStatus(101, 'ready'))
  assert.equal(backend.tables.status_overrides.length, 0)
  assert.equal(backend.tables.status_history.length, 0)
  assert.equal(useStore.getState().statusOverrides[101], undefined)
})
test('missing transaction RPC rejects visibly with no legacy write fallback', async () => {
  backend.fault('create_idea', 'rpc', 'unavailable')
  await assert.rejects(useStore.getState().addIdea({ name: 'Not created', pitch: 'Text' }), /transaction migration/)
  assert.equal(backend.requests.filter(r => r.operation !== 'select').length, 0)
})
test('malformed transaction confirmation retains client state', async () => {
  backend.fault('change_idea_status', 'rpc', 'zero')
  await assert.rejects(useStore.getState().setStatus(101, 'ready'), /could not be confirmed/)
  assert.deepEqual(useStore.getState().statusOverrides, {})
})
test('empty reads remain empty and never automatically reinsert deleted seeds', async () => {
  backend.tables.ideas = []
  assert.equal(await useStore.getState().load(), true)
  assert.equal(useStore.getState().ideas.length, 0)
  assert.equal(backend.requests.filter(r => r.operation !== 'select').length, 0)
})
test('deleted highest ID is not reused for a subsequent create', async () => {
  const first = await useStore.getState().addIdea({ name: 'Delete me', pitch: 'Text' })
  await useStore.getState().deleteIdea(first)
  const next = await useStore.getState().addIdea({ name: 'After deletion', pitch: 'Text' })
  assert.ok(next > first)
})
test('create history failure leaves no idea or activity and can retry the request', async () => {
  backend.deny('status_history','insert')
  await assert.rejects(useStore.getState().addIdea({ name:'Rollback create',pitch:'Text' }))
  assert.equal(backend.tables.ideas.length,5)
  const retry = useStore.getState().saveFeedback.retry
  backend.denied = []
  await retry()
  assert.equal(backend.tables.ideas.length,6)
  assert.equal(backend.tables.idea_activity.length,1)
})

test('notes and score drafts flush serially and preserve the latest values', async () => {
  useStore.getState().configureDrafts('owner')
  useStore.getState().changeDraft(101,'notes','Store-owned draft')
  useStore.getState().changeDraft(101,'score',200)
  assert.equal(await useStore.getState().flushDrafts(101),true)
  assert.equal(backend.tables.ideas[0].notes,'Store-owned draft')
  assert.equal(backend.tables.ideas[0].score_adjust,99)
  assert.equal(useStore.getState().draftValues[101].notes.dirty,false)
})
test('failed draft flush retains dirty text and retries the latest draft', async () => {
  useStore.getState().configureDrafts('owner');backend.deny('ideas','update')
  useStore.getState().changeDraft(101,'notes','Retained text')
  assert.equal(await useStore.getState().flushDrafts(101),false)
  assert.equal(useStore.getState().draftValues[101].notes.state,'error')
  backend.denied=[];useStore.getState().changeDraft(101,'notes','Latest retained text')
  assert.equal(await useStore.getState().flushDrafts(101),true)
  assert.equal(backend.tables.ideas[0].notes,'Latest retained text')
})
test('manual refresh retains the app shell and unsaved draft', async () => {
  useStore.getState().configureDrafts('owner')
  useStore.getState().changeDraft(101,'notes','Draft before refresh')
  const refreshing=useStore.getState().load()
  assert.equal(useStore.getState().loading,false)
  await refreshing
  assert.equal(useStore.getState().draftValues[101].notes.value,'Draft before refresh')
})
test('refresh read begun before a status mutation cannot overwrite the confirmed map', async () => {
  const refreshing=useStore.getState().load({background:true})
  await useStore.getState().setStatus(101,'ready')
  await refreshing
  assert.equal(useStore.getState().statusOverrides[101],'ready')
  assert.equal(useStore.getState().loading,false)
})
test('deleting an idea removes its draft and scheduled saves', async () => {
  useStore.getState().configureDrafts('owner')
  useStore.getState().changeDraft(103,'notes','Deleted draft')
  await useStore.getState().deleteIdea(103)
  assert.equal(useStore.getState().draftValues[103],undefined)
  assert.deepEqual(JSON.parse(values.get('ideas-webapp-drafts-v1:owner')), {})
})
test('draft flush waits for another same-idea save rather than rejecting the notes', async () => {
  useStore.getState().configureDrafts('owner')
  const saving=useStore.getState().setPriority(101,true)
  useStore.getState().changeDraft(101,'notes','After priority')
  const flush=useStore.getState().flushDrafts(101)
  await saving;assert.equal(await flush,true)
  assert.equal(backend.tables.ideas[0].is_priority,true)
  assert.equal(backend.tables.ideas[0].notes,'After priority')
})

test('account preferences and pending activity cannot leak into another account', async () => {
  useStore.setState({ activityPersistenceAvailable:false })
  await useStore.getState().logActivity(101,'notes_updated',{fromLength:0,toLength:3})
  useStore.getState().setKanbanSort('quick','name')
  assert.equal(JSON.parse(values.get('ideas-webapp-pending-activity:owner')).length,1)
  useStore.getState().clearDrafts()
  useStore.getState().configureDrafts('other')
  await useStore.getState().load()
  assert.deepEqual(useStore.getState().getKanbanSort(),{})
  assert.equal((useStore.getState().activityLog[101] || []).filter(e=>e.id.startsWith('local-')).length,0)
})
test('deleted idea removes its local activity and duration without erasing others', async () => {
  useStore.setState({ activityPersistenceAvailable:false })
  for(const id of [101,102]) await useStore.getState().logActivity(id,'notes_updated',{fromLength:0,toLength:3})
  values.set('ideas-webapp-sprint-weeks:owner',JSON.stringify({101:8,102:3}))
  await useStore.getState().deleteIdea(101)
  assert.deepEqual(JSON.parse(values.get('ideas-webapp-sprint-weeks:owner')),{102:3})
  assert.deepEqual(JSON.parse(values.get('ideas-webapp-pending-activity:owner')).map(e=>e.ideaId),[102])
})
test('sort writes remain usable under quota errors and reject invalid choices', () => {
  const original = localStorage.setItem
  try {
    localStorage.setItem = () => { throw Error('quota') }
    useStore.getState().setKanbanSort('quick','name')
    useStore.getState().setKanbanSort('quick','bogus')
    assert.deepEqual(useStore.getState().getKanbanSort(),{quick:'name'})
  } finally { localStorage.setItem = original }
})
test('logout removes current account pending activity', async () => {
  useStore.setState({ activityPersistenceAvailable:false })
  await useStore.getState().logActivity(101,'notes_updated',{fromLength:0,toLength:3})
  useStore.getState().clearDrafts()
  assert.equal(values.has('ideas-webapp-pending-activity:owner'),false)
})

test('paginated load and CSV include more than 1000 ideas under smaller server caps',async()=>{
 backend.tables.ideas=Array.from({length:1203},(_,i)=>({...backend.tables.ideas[0],id:i+1,name:`Fixture ${i+1}`}));backend.rowCap=37
 try {
  assert.equal(await useStore.getState().load(),true);assert.equal(useStore.getState().ideas.length,1203)
  const {createIdeasCsv}=await import('../src/lib/csvExport.js')
  assert.equal(createIdeasCsv(useStore.getState()).split('\r\n').length,1204)
 }finally{delete backend.rowCap}
})
test('unavailable activity history is explicitly incomplete without blanking ideas',async()=>{
 backend.deny('idea_activity','select');await useStore.getState().load()
 assert.equal(useStore.getState().datasetComplete,true);assert.equal(useStore.getState().activityHistoryComplete,false)
})
test('lost activity response retries one stable token and creates exactly one row',async()=>{
 backend.fault('record_idea_activity','rpc','lost-response')
 await useStore.getState().logActivity(101,'notes_updated',{fromLength:0,toLength:3})
 assert.equal(useStore.getState().outboxCount,1);assert.equal(backend.tables.idea_activity.length,1)
 backend.faults=[];assert.equal(await useStore.getState().syncActivity(),true)
 assert.equal(useStore.getState().outboxCount,0);assert.equal(backend.tables.idea_activity.length,1)
 assert.equal(useStore.getState().activityLog[101].length,1)
})
test('full outbox preserves all existing events and warns instead of truncating',async()=>{
 useStore.setState({activityPersistenceAvailable:false})
 for(let n=0;n<100;n++)await useStore.getState().logActivity(101,'notes_updated',{fromLength:n,toLength:n+1})
 await assert.rejects(useStore.getState().logActivity(101,'notes_updated',{fromLength:100,toLength:101}),/buffer full/)
 assert.equal(JSON.parse(useStore.getState().exportPendingActivity()).length,100)
 assert.match(useStore.getState().outboxError,/buffer full/)
})
test('parallel sync clicks share a worker and cannot duplicate activity',async()=>{
 useStore.setState({activityPersistenceAvailable:false})
 await useStore.getState().logActivity(101,'notes_updated',{fromLength:0,toLength:3})
 await Promise.all([useStore.getState().syncActivity(),useStore.getState().syncActivity()])
 assert.equal(backend.tables.idea_activity.length,1)
})
test('legacy token migration cannot replace a token whose response was lost',async()=>{
 useStore.setState({activityPersistenceAvailable:false})
 await useStore.getState().logActivity(101,'notes_updated',{fromLength:0,toLength:1})
 const pending=JSON.parse(useStore.getState().exportPendingActivity()),token=pending[0].requestId
 values.set('ideas-webapp-pending-activity:owner',JSON.stringify([...pending,{...pending[0],id:'local-legacy',requestId:undefined}]))
 const recovered=JSON.parse(useStore.getState().exportPendingActivity())
 assert.equal(recovered[0].requestId,token);assert.notEqual(recovered[1].requestId,token)
})
