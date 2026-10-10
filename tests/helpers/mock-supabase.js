import { fixtureIdeas } from '../fixtures/ideas.js'

const clone = value => JSON.parse(JSON.stringify(value))
const tableNames = ['ideas', 'status_overrides', 'status_history', 'idea_activity',
  'idea_group_assignments', 'sprint_assignments']

export const backend = {
  tables: {}, requests: [], denied: [], nextId: 1,
  reset() {
    this.tables = Object.fromEntries(tableNames.map(name => [name, []]))
    this.tables.ideas = clone(fixtureIdeas)
    this.requests = []; this.denied = []; this.nextId = 1
  },
  deny(table, operation) { this.denied.push({ table, operation }) },
}
backend.reset()

// This client never imports an SDK, fetches a URL or opens a socket.
export const supabase = {
  from(table) {
    if (!tableNames.includes(table)) throw new Error(`Unknown fixture table: ${table}`)
    let operation = 'select', body, single = false, sort, filter = () => true
    const query = {
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
              if (row[key] == null && key === 'id') row.id = backend.nextId++
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
supabase.rpc = async name => {
  if (name !== 'can_access_ideas') throw new Error('Unknown fixture RPC')
  backend.authCalls.push('access')
  return { data: backend.authAllowed, error: backend.authError ? { message: 'Fixture RPC unavailable' } : null }
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
