import test from 'node:test'
import assert from 'node:assert/strict'
import { createSessionController } from '../src/auth/session.js'
const tick = () => new Promise(resolve => setTimeout(resolve, 5))
const owner = { user: { id: 'owner' } }
function fixture({ initial = null, allowed = true, rpcError = null } = {}) {
  let listener, subscriptions = 0, exits = 0, state
  const calls = []
  const client = {
    rpc: async name => { calls.push(name); return { data: allowed, error: rpcError } },
    auth: {
      getSession: async () => ({ data: { session: initial }, error: null }),
      onAuthStateChange: fn => { listener = fn; subscriptions++; return { data: { subscription: { unsubscribe: () => subscriptions-- } } } },
      signInWithPassword: async credentials => { calls.push(credentials); return { data: { session: owner }, error: null } },
      signOut: async () => ({ error: null }),
    },
  }
  const controller = createSessionController(client, value => { state = value }, () => { exits++ })
  return { client, controller, calls, emit: value => listener('TEST', value), get state() { return state }, get exits() { return exits }, get subscriptions() { return subscriptions } }
}
test('anonymous session never requests membership or authorizes', async () => {
  const f = fixture(); await tick(); assert.equal(f.state.status, 'signed-out'); assert.deepEqual(f.calls, []); f.controller.stop()
})
test('a permitted session authorizes only after membership resolves', async () => {
  const f = fixture({ initial: owner }); await tick(); assert.equal(f.state.status, 'authorized'); assert.deepEqual(f.calls, ['can_access_ideas']); f.controller.stop()
})
for (const [label, allowed, rpcError] of [['unlisted',false,null],['unavailable',null,{message:'Unavailable'}],['wrong shape','true',null]]) {
  test(`${label} membership fails closed`, async () => {
    const f = fixture({ initial: owner, allowed, rpcError }); await tick(); assert.equal(f.state.status, 'denied'); f.controller.stop()
  })
}
test('login trims email and leaves password unchanged', async () => {
  const f=fixture(); await tick(); await f.controller.signIn(' owner@example.test ', ' spaces '); assert.deepEqual(f.calls[0], {email:'owner@example.test',password:' spaces '}); assert.equal(f.state.status,'authorized'); f.controller.stop()
})
test('credential failure is recoverable and does not leak backend details', async () => {
  const f=fixture(); await tick(); f.client.auth.signInWithPassword=async()=>({error:{message:'sensitive backend detail'}}); await assert.rejects(f.controller.signIn('e','p'), /Sign-in failed/); assert.equal(f.state.status,'signed-out'); f.controller.stop()
})
test('missing login session never authorizes', async () => {
  const f=fixture(); await tick(); f.client.auth.signInWithPassword=async()=>({data:{}}); await assert.rejects(f.controller.signIn('e','p'),/did not return a session/); assert.equal(f.state.status,'signed-out'); f.controller.stop()
})
test('late positive membership cannot undo sign-out', async () => {
  const f=fixture(); await tick(); let resolve; f.client.rpc=()=>new Promise(r=>{resolve=r}); f.emit(owner); await tick(); f.emit(null); await tick(); resolve({data:true,error:null}); await tick(); assert.equal(f.state.status,'signed-out'); f.controller.stop()
})
test('stopping a controller ignores stale work and unsubscribes', async () => {
  const f=fixture(); await tick(); f.emit(owner); f.controller.stop(); await tick(); assert.equal(f.subscriptions,0); assert.equal(f.state.status,'signed-out')
})
for (const [label,value] of [['logout',null],['account switch',{user:{id:'other'}}]]) {
  test(`${label} destroys an admitted app realm`, async () => {
    const f=fixture({initial:owner}); await tick(); f.emit(value); await tick(); assert.equal(f.exits,1); assert.equal(f.state.status,'checking'); f.controller.stop()
  })
}
test('repeated session refresh retains admitted UI', async()=>{
  const f=fixture({initial:owner}); await tick(); f.emit(owner); await tick(); assert.equal(f.state.status,'authorized'); assert.equal(f.exits,0); f.controller.stop()
})
test('membership revocation during recheck clears the admitted realm',async()=>{
  const f=fixture({initial:owner}); await tick(); f.client.rpc=async()=>({data:false,error:null}); f.controller.recheck(); await tick(); assert.equal(f.exits,1); f.controller.stop()
})
test('local sign out clears the realm even when auth API would fail',async()=>{
  const f=fixture({initial:owner}); await tick(); f.client.auth.signOut=()=>{throw Error('offline')}; await f.controller.signOut(); assert.equal(f.exits,1); f.controller.stop()
})

const { configureSupabase } = await import('../src/auth/config.js')
for (const [label, url, key] of [['missing', undefined, undefined], ['malformed','not a URL','key'],['insecure','http://example.test','key'],['blank key','https://example.test',' ']]) {
  test(`${label} configuration fails without creating a client`,()=>{
    let calls=0
    const result=configureSupabase(()=>{calls++;return {}},url,key)
    assert.equal(calls,0);assert.equal(result.client,null);assert.match(result.error,/Set a valid/)
  })
}
test('valid configuration uses memory-only sessions and disables URL token handling',()=>{
  let options
  const client={};const result=configureSupabase((_url,_key,o)=>{options=o;return client},'https://example.test','public-key')
  assert.equal(result.client,client);assert.deepEqual(options.auth,{persistSession:false,detectSessionInUrl:false,autoRefreshToken:true})
})
test('local Supabase development can use loopback HTTP',()=>{
  const result=configureSupabase(()=>({}),'http://127.0.0.1:54321','key');assert.equal(result.error,'')
})
test('SDK construction failure becomes a safe setup error',()=>{
  const result=configureSupabase(()=>{throw Error('backend secret')},'https://example.test','key');assert.equal(result.client,null);assert.ok(!result.error.includes('backend secret'))
})
