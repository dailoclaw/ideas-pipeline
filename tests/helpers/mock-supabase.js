import { fixtureIdeas } from '../fixtures/ideas.js'

const clone = value => JSON.parse(JSON.stringify(value))
const tableNames = ['ideas', 'status_overrides', 'status_history', 'idea_activity',
  'idea_group_assignments', 'sprint_assignments']

export const backend = {
  tables: {}, requests: [], denied: [], faults: [], nextId: 1,
  reset() {
    this.tables = Object.fromEntries(tableNames.map(name => [name, []]))
    this.tables.ideas = clone(fixtureIdeas)
    this.requests = []; this.denied = []; this.faults = []; this.nextId = 1
    this.nextIdeaId = Math.max(...this.tables.ideas.map(i => i.id)) + 1
    this.rpcRequests = []; this.mutationRequests = new Map(); this.rpcQueue = Promise.resolve()
  },
  deny(table, operation) { this.denied.push({ table, operation }) },
  fault(table, operation, kind) { this.faults.push({ table, operation, kind }) },
}
backend.reset()

// This client never imports an SDK, fetches a URL or opens a socket.
export const supabase = {
  from(table) {
    if (!tableNames.includes(table)) throw new Error(`Unknown fixture table: ${table}`)
    let limit=Infinity; let operation = 'select', body, single = false, sort, filter = () => true
    const query = {
      limit(value) { limit=value; return this },
      gt(field,value) { const previous=filter;filter=row=>previous(row) && Number(row[field])>value;return this },
      select() { return this },
      order(field, options = {}) { sort = { field, ascending: options.ascending !== false }; return this },
      eq(field, value) { const previous = filter; filter = row => previous(row) && row[field] === value; return this },
      insert(value) { operation = 'insert'; body = value; return this },
      upsert(value) { operation = 'upsert'; body = value; return this },
      update(value) { operation = 'update'; body = value; return this },
      delete() { operation = 'delete'; return this },
      single() { single = true; return this },
      then(resolve, reject) {
        return Promise.resolve().then(() => {
          backend.requests.push({ table, operation, body: body === undefined ? null : clone(body) })
          const fault = backend.faults.find(f => f.table === table && f.operation === operation)
          if (fault?.kind === 'network') throw new TypeError('Fixture network failure')
          if (fault?.kind === 'zero') return { data: single ? null : [], error: null }
          if (backend.denied.some(d => d.table === table && d.operation === operation)) {
            return { data: null, error: { message: 'Fixture permission denied', code: '42501' } }
          }
          let data = []
          const rows = backend.tables[table]
          if (operation === 'select') data = rows.filter(filter).map(clone)
          if (operation === 'insert' || operation === 'upsert') {
            for (const value of Array.isArray(body) ? body : [body]) {
              const row = clone(value)
              const key = table === 'ideas' ? 'id' : ['status_history', 'idea_activity'].includes(table) ? 'id' : 'idea_id'
              if (row[key] == null && key === 'id') row.id = table === 'ideas' ? backend.nextIdeaId++ : backend.nextId++
              const existing = rows.findIndex(item => item[key] === row[key])
              if (existing >= 0 && operation === 'insert') return { data: null, error: { message: 'Fixture duplicate key', code: '23505' } }
              if (existing >= 0) rows[existing] = { ...rows[existing], ...row }
              else rows.push(row)
              data.push(row)
            }
          }
          if (operation === 'update') {
            rows.forEach(row => { if (filter(row)) { Object.assign(row, clone(body)); data.push(row) } })
          }
          if (operation === 'delete') {
            data = rows.filter(filter)
            backend.tables[table] = rows.filter(row => !filter(row))
            if (table === 'ideas') for (const child of tableNames.filter(name => name !== 'ideas')) {
              backend.tables[child] = backend.tables[child].filter(row => !data.some(idea => idea.id === row.idea_id))
            }
          }
          if (sort) data.sort((a, b) => (a[sort.field] > b[sort.field] ? 1 : a[sort.field] < b[sort.field] ? -1 : 0) * (sort.ascending ? 1 : -1))
          if(operation === 'select')data=data.slice(0,Math.min(limit,backend.rowCap ?? Infinity))
          return { data: clone(single ? data[0] ?? null : data), error: null }
        }).then(resolve, reject)
      },
    }
    return query
  },
}

// Auth-only fixture. JWT validation and PostgreSQL permissions still require staging.
export const configurationError = ''
const initialSession = () => new URLSearchParams(location.search).has('signedOut') ? null : { user: { id: 'fixture-owner' } }
let fixtureSession = typeof location === 'undefined' ? null : initialSession()
const authListeners = new Set()
backend.authAllowed = true
backend.authError = false
backend.authCalls = []
backend.emitAuth = (event, session) => {
  fixtureSession = session
  for (const listener of authListeners) listener(event, session)
}
// Isolated UI contract fixture. SQL atomicity is separately tested in PGlite.
supabase.rpc = async (name, args) => {
  if (name === 'can_access_ideas') {
    backend.authCalls.push('access')
    return { data: backend.authAllowed, error: backend.authError ? { message: 'Fixture RPC unavailable' } : null }
  }
  const queued = backend.rpcQueue.catch(() => {}).then(async () => {
  backend.rpcRequests.push({ name, args: clone(args) })
  const fault = backend.faults.find(f => f.table === name)
  if (fault?.kind === 'unavailable') return { data: null, error: { message: 'Missing RPC', code: 'PGRST202' } }
  if (fault?.kind === 'network') throw new TypeError('Fixture network failure')
  if (fault?.kind === 'zero') return { data: null, error: null }
  const saved = backend.mutationRequests.get(args.p_request_id)
  if (saved) {
    if (JSON.stringify(saved.args) !== JSON.stringify(args)) return { data: null, error: { message: 'This request was already saved with different values', code: '23505' } }
    return { data: { ...clone(saved.result), replayed: true }, error: null }
  }
  const before = clone(backend.tables)
  const confirmed = async query => {
    const { data, error } = await query.select('*').single()
    if (error) throw error
    if (!data) throw new Error('No matching record was saved.')
    return data
  }
  let result
  try {
    let idea, override = null, previous, effective, history = null, activity = null
    if (name === 'record_idea_activity') {
      if(!backend.tables.ideas.some(i=>i.id===args.p_idea_id))throw new Error('Idea no longer exists')
      const activity=await confirmed(supabase.from('idea_activity').insert({idea_id:args.p_idea_id,event_type:args.p_type,payload:args.p_payload,actor:'fixture-owner',occurred_at:args.p_occurred_at,client_request_id:args.p_request_id}))
      result=clone({activity,replayed:false});backend.mutationRequests.set(args.p_request_id,{args:clone(args),result})
      if(fault?.kind === 'lost-response')return {data:null,error:{message:'Fixture response lost after commit'}}
      return {data:result,error:null}
    }
    if (name === 'create_idea') {
      idea = await confirmed(supabase.from('ideas').insert({ ...args.p_fields, status: 'idea', is_seed: false, added_at: '2026-10-10' }))
      effective = 'idea'
    } else if (name === 'change_idea_status') {
      idea = backend.tables.ideas.find(i => i.id === args.p_idea_id)
      if (!idea) throw new Error('Idea no longer exists')
      previous = idea.is_seed ? backend.tables.status_overrides.find(o => o.idea_id === idea.id)?.status || idea.status : idea.status
      if (previous !== args.p_expected_status) throw { message: 'Status changed elsewhere. Refresh the dataset before retrying.', code: '40001' }
      effective = args.p_status ?? idea.status
      if (idea.is_seed) {
        if (args.p_status === null) {
          const { error } = await supabase.from('status_overrides').delete().eq('idea_id', idea.id)
          if (error) throw error
        } else override = (await confirmed(supabase.from('status_overrides').upsert({ idea_id: idea.id, status: args.p_status }))).status
      } else idea = await confirmed(supabase.from('ideas').update({ status: args.p_status }).eq('id', idea.id))
    } else throw new Error('Unknown fixture RPC')
    if (name === 'create_idea' || previous !== effective) {
      history = await confirmed(supabase.from('status_history').insert({ idea_id: idea.id, status: effective, changed_at: '2026-10-10' }))
      activity = await confirmed(supabase.from('idea_activity').insert({ idea_id: idea.id,
        event_type: name === 'create_idea' ? 'created' : 'status_changed',
        payload: name === 'create_idea' ? { name: idea.name } : { from: previous, to: effective },
        actor: 'fixture-owner', occurred_at: new Date().toISOString() }))
    }
    result = clone({ idea, override, history, activity, replayed: false })
    backend.mutationRequests.set(args.p_request_id, { args: clone(args), result })
  } catch (error) {
    backend.tables = before
    return { data: null, error }
  }
  if (fault?.kind === 'lost-response') throw new TypeError('Fixture response lost after commit')
  return { data: result, error: null }
  })
  backend.rpcQueue = queued
  return queued
}
supabase.auth = {
  onAuthStateChange(listener) {
    authListeners.add(listener)
    return { data: { subscription: { unsubscribe: () => authListeners.delete(listener) } } }
  },
  getSession: async () => ({ data: { session: fixtureSession }, error: null }),
  signInWithPassword: async ({ email, password }) => {
    backend.authCalls.push('signIn')
    if (email !== 'owner@example.test' || password !== 'fixture-password') return { data: {}, error: { message: 'Invalid credentials' } }
    fixtureSession = { user: { id: 'fixture-owner' } }
    backend.emitAuth('SIGNED_IN', fixtureSession)
    return { data: { session: fixtureSession }, error: null }
  },
  signOut: async () => {
    backend.emitAuth('SIGNED_OUT', null)
    return { error: null }
  },
}
