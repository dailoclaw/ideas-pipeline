import test from 'node:test'
import assert from 'node:assert/strict'
import { createSafeStorage, scopedKey, sanitizeSorts, sanitizeWeeks, sanitizeActivity } from '../src/lib/storage.js'
const event = { id: 'local-fixture', ideaId: 101, type: 'notes_updated', actor: 'You', occurredAt: '2026-10-10T10:00:00.000Z', payload: { fromLength: 0, toLength: 4 } }
const fixture = () => {
  const values = new Map(); let denied = false
  const storage = createSafeStorage(() => { if (denied) throw Error('denied'); return {
    getItem: key => values.get(key) ?? null,
    setItem: (key,value) => values.set(key,value), removeItem: key => values.delete(key),
  } })
  return { storage, values, deny: value => { denied = value } }
}
test('property access denial is lazy and keeps memory preferences usable', () => {
  const f = fixture(); f.deny(true)
  assert.equal(f.storage.read('a'), null)
  assert.equal(f.storage.write('a','dark'), false)
  assert.equal(f.storage.readChoice('a',['dark','light'],'light'), 'dark')
})
test('quota denial overrides old persistent values until a later successful write', () => {
  const values = new Map([['a','old']]); let quota = true
  const s = createSafeStorage(() => ({ getItem: k => values.get(k), setItem: (k,v) => { if (quota) throw Error('quota'); values.set(k,v) } }))
  assert.equal(s.write('a','new'),false); assert.equal(s.read('a'),'new')
  quota = false; assert.equal(s.write('a','latest'),true); assert.equal(values.get('a'),'latest')
})
test('failed deletion suppresses stale disk values in this session', () => {
  const f = fixture(); f.storage.write('a','private'); f.deny(true)
  assert.equal(f.storage.remove('a'), false); f.deny(false)
  assert.equal(f.storage.read('a'),null)
  f.storage.write('a','replacement'); assert.equal(f.storage.read('a'),'replacement')
})
test('required draft persistence reports unavailable durable writes', () => {
  const f = fixture(); f.deny(true)
  assert.throws(() => f.storage.required.getItem('a'), /unavailable/)
  assert.throws(() => f.storage.required.setItem('a','draft'), /unavailable/)
  assert.equal(f.storage.read('a'),'draft')
})
test('JSON parsing and serialization failures return safe defaults', () => {
  const f = fixture(); f.values.set('a','{')
  assert.deepEqual(f.storage.readJSON('a',{},sanitizeSorts),{})
  const circular = {}; circular.self = circular
  assert.equal(f.storage.writeJSON('b',circular),false)
})
test('healthy preferences remain available to a fresh storage instance', () => {
  const values = new Map(); const provider = () => ({ getItem: k => values.get(k) ?? null, setItem: (k,v) => values.set(k,v) })
  createSafeStorage(provider).writeJSON('a',{quick:'name'})
  assert.deepEqual(createSafeStorage(provider).readJSON('a',{},sanitizeSorts),{quick:'name'})
})
test('choice and sort validators reject inherited properties and unknown values', () => {
  const f = fixture(); f.values.set('a','__proto__')
  assert.equal(f.storage.readChoice('a',['glass','calm'],'glass'),'glass')
  for (const invalid of [null,[],5,'name']) assert.deepEqual(sanitizeSorts(invalid),{})
  assert.deepEqual(sanitizeSorts(JSON.parse('{"quick":"name","medium":"bogus","__proto__":"score"}')),{quick:'name'})
})
test('week preferences retain only safe IDs and bounded integer values', () => {
  assert.deepEqual(sanitizeWeeks({'101':8,'102':0,'103':9,'104':'2','105':2.5,'-1':2,'9007199254740992':2}),{'101':8})
  assert.deepEqual(sanitizeWeeks(null),{})
})
test('activity rejects malformed containers, dates, identifiers and payloads', () => {
  assert.deepEqual(sanitizeActivity({}),[])
  const invalid = [null,{}, {...event,ideaId:0}, {...event,occurredAt:'bad'}, {...event,payload:null}, {...event,payload:{toLength:4}}, {...event,type:'unknown'}, {...event,actor:{}}]
  assert.deepEqual(sanitizeActivity([...invalid,event]),[event])
})
test('account namespaces encode separators and isolate keys', () => {
  assert.equal(scopedKey('cache','a:b'),'cache:a%3Ab')
  assert.notEqual(scopedKey('cache','owner'),scopedKey('cache','other'))
})
