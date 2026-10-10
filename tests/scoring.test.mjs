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

const { scoreIdea, scoreDimensions, matrixQuadrant, getBuildNext } = await import('../src/lib/scoring.js')
test('score range and explanation reconcile rounding, manual offset and minimum', () => {
  const max={time:'1w',plat:'hub',mvp:Array(8).fill('step'),win:'w'.repeat(180),pain:'p'.repeat(400),scoreAdjust:99}
  assert.equal(scoreIdea(max),204)
  for(const i of [max,{...max,scoreAdjust:-99},{time:'2-4w',plat:'html',mvp:['a'],scoreAdjust:-99}]) {
    const d=scoreDimensions(i)
    assert.equal(scoreIdea(i),d.base+d.adjustment+d.floor)
    assert.equal(d.base,Math.round(d.effort+d.platform+d.mvp+d.novelty+d.pain))
    assert.ok(scoreIdea(i)>=1 && scoreIdea(i)<=204)
  }
})
test('malformed legacy values and prototype names cannot produce NaN or string scores',()=>{
  for(const key of ['constructor','__proto__','toString']) assert.equal(typeof scoreIdea({time:key,plat:key,mvp:{length:999},win:42,pain:null,scoreAdjust:'99'}),'number')
  assert.equal(scoreIdea({time:'constructor',plat:'constructor'}),32)
})
test('matrix placement uses attributes rather than seed IDs and retains unknowns',()=>{
  assert.equal(matrixQuadrant({id:23,time:'2-4w',plat:'html'}),'q4')
  assert.equal(matrixQuadrant({id:23,time:'1w',plat:'hub',mvp:Array(6).fill('step')}),'q1')
  assert.equal(matrixQuadrant({time:'obsolete',plat:'html'}),'unknown')
})
test('priority and score ties use stable IDs including build-next',()=>{
  const tied=[{id:9,name:'Same',time:'1w'},{id:2,name:'Same',time:'1w'}]
  for(const sort of ['score','name','id'])assert.equal(sortIdeas(tied,sort)[0].id,2)
  assert.equal(getBuildNext(tied,()=> 'idea').id,2)
})
