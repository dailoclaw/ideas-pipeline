import test from 'node:test'
import assert from 'node:assert/strict'
import { scopeIdeas, sortIdeas } from '../src/lib/scoring.js'
const ideas = [{id:1,name:'Alpha',time:'1w',isPriority:false},{id:2,name:'Zulu',time:'2-4w',isPriority:true},{id:3,name:'Beta',time:'1-2w',isPriority:false}]
test('scope distinguishes all, assigned, unassigned and unknown workspaces', () => {
  const groups = {1:'intel'}
  assert.deepEqual(scopeIdeas(ideas,groups).map(i=>i.id),[1,2,3])
  assert.deepEqual(scopeIdeas(ideas,groups,'intel').map(i=>i.id),[1])
  assert.deepEqual(scopeIdeas(ideas,groups,'__none__').map(i=>i.id),[2,3])
  assert.deepEqual(scopeIdeas(ideas,groups,'unknown'),[])
})
test('every supported sort places priority first and leaves source order intact', () => {
  for (const sort of ['score','name','id']) assert.equal(sortIdeas(ideas,sort)[0].id,2)
  assert.deepEqual(ideas.map(i=>i.id),[1,2,3])
})
test('scope consumes updated assignment maps immediately', () => {
  assert.equal(scopeIdeas(ideas,{},'intel').length,0)
  assert.equal(scopeIdeas(ideas,{2:'intel'},'intel')[0].id,2)
})
