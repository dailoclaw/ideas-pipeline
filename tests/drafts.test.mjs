import test from 'node:test'
import assert from 'node:assert/strict'
import { createDraftController } from '../src/lib/drafts.js'
const deferred = () => { let resolve,reject; const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject} }
const setup = (save=async()=>{}) => {
  const values=new Map();let snapshot,error
  const storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}
  const controller=createDraftController({save,publish:(s,e)=>{snapshot=s;error=e},storage:()=>storage})
  controller.configure('owner')
  return {controller,values,storage,get state(){return snapshot},get storageError(){return error}}
}

test('immediate flush saves pending notes and score outside the dialog lifecycle',async()=>{
  const writes=[], f=setup(async(...args)=>writes.push(args))
  f.controller.change(101,'notes','Draft','Old'); f.controller.change(101,'score',999,0)
  assert.equal(await f.controller.flush(101),true)
  assert.deepEqual(writes,[[101,'notes','Draft'],[101,'score',99]])
  assert.equal(f.state[101].notes.dirty,false); assert.equal(f.state[101].score.value,99)
  assert.deepEqual(JSON.parse(f.values.get('ideas-webapp-drafts-v1:owner')), {})
  f.controller.clear()
})
test('edits during an older save remain visible and persist strictly after it',async()=>{
  const first=deferred(),writes=[]
  const f=setup(async(id,field,value)=>{writes.push(value);if(writes.length===1)await first.promise})
  f.controller.change(101,'notes','Older','Original')
  const saving=f.controller.flush(101); await Promise.resolve(); await Promise.resolve()
  f.controller.change(101,'notes','Latest','Original')
  assert.equal(f.state[101].notes.value,'Latest')
  assert.equal(writes.length,1)
  first.resolve(); assert.equal(await saving,true)
  assert.deepEqual(writes,['Older','Latest']); assert.equal(f.state[101].notes.dirty,false)
  f.controller.clear()
})
test('multiple flushes share one worker and never send overlapping writes',async()=>{
  const first=deferred();let n=0
  const f=setup(async()=>{n++;await first.promise})
  f.controller.change(101,'notes','Draft','Old')
  const one=f.controller.flush(101),two=f.controller.flush(101)
  await Promise.resolve();await Promise.resolve();assert.equal(n,1)
  first.resolve();assert.deepEqual(await Promise.all([one,two]),[true,true])
  f.controller.clear()
})
test('a rejected older write retains the newest draft and permits explicit retry',async()=>{
  const first=deferred();let n=0;const writes=[]
  const f=setup(async(id,field,value)=>{writes.push(value);if(n++===0)await first.promise})
  f.controller.change(101,'notes','Old draft','Original')
  const saving=f.controller.flush(101);await Promise.resolve();await Promise.resolve()
  f.controller.change(101,'notes','Newest draft','Original')
  first.reject(new Error('Denied'));assert.equal(await saving,false)
  assert.equal(f.state[101].notes.value,'Newest draft');assert.equal(f.state[101].notes.state,'error')
  assert.equal(await f.controller.flush(101),true);assert.deepEqual(writes,['Old draft','Newest draft'])
  f.controller.clear()
})
test('reload restores only the same account dirty values and waits for review',async()=>{
  const f=setup(); f.controller.change(101,'notes','Recover me','Old')
  let state;let n=0
  const restored=createDraftController({save:async()=>n++,storage:()=>f.storage,publish:s=>state=s})
  restored.configure('other');assert.deepEqual(state,{})
  restored.clear();restored.configure('owner')
  assert.equal(state[101].notes.value,'Recover me');assert.equal(state[101].notes.state,'error');assert.equal(n,0)
  restored.reconcile([{id:101,notes:'Remote update',scoreAdjust:0}]);assert.equal(state[101].notes.value,'Recover me')
  assert.equal(await restored.flush(101),true);assert.equal(n,1)
  restored.clear(); f.controller.clear()
})
test('storage failures and malformed/null values cannot throw or discard active drafts',()=>{
  for(const raw of ['null','[]','{','{"101":{"notes":{},"score":200,"evil":"bad"}}']){
    const f=setup();f.controller.clear(); f.values.set('ideas-webapp-drafts-v1:owner',raw);f.controller.configure('owner')
    assert.deepEqual(f.state,{})
    f.controller.clear()
  }
  let state,error
  const f=createDraftController({save:async()=>{},publish:(s,e)=>{state=s;error=e},storage:()=>{throw new Error('Storage denied')}})
  assert.doesNotThrow(()=>f.configure('owner'))
  f.change(101,'notes','Retained in memory','Old');assert.equal(state[101].notes.value,'Retained in memory');assert.equal(error,true)
  f.clear()
})
test('reconcile never replaces dirty text or deletes drafts from partial dataset reads',()=>{
  const f=setup();f.controller.change(101,'notes','Draft','Old')
  f.controller.reconcile([{id:101,notes:'Old',scoreAdjust:0}]);assert.equal(f.state[101].notes.value,'Draft')
  f.controller.reconcile([]);assert.equal(f.state[101].notes.value,'Draft')
  f.controller.remove(101);assert.equal(f.state[101],undefined)
  assert.deepEqual(JSON.parse(f.values.get('ideas-webapp-drafts-v1:owner')), {})
  f.controller.clear()
})
test('account cleanup cancels scheduled drafts and prevents later queued fields saving',async()=>{
  const first=deferred(),writes=[];const f=setup(async(id,field)=>{writes.push(field);await first.promise})
  f.controller.change(101,'notes','Draft','Old');f.controller.change(101,'score',10,0)
  const saving=f.controller.flush(101);await Promise.resolve();await Promise.resolve();f.controller.clear()
  first.resolve();await saving;assert.deepEqual(writes,['notes']);assert.deepEqual(f.state,{})
  assert.equal(f.values.has('ideas-webapp-drafts-v1:owner'),false)
})

test('an old account worker cannot save or publish another account drafts',async()=>{
  const first=deferred();let state;const writes=[]
  const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)}
  const f=createDraftController({storage:()=>storage,publish:s=>state=s,save:async(id,field,value)=>{writes.push(value);if(value==='Old account')await first.promise}})
  f.configure('old');f.change(101,'notes','Old account','Original');const old=f.flush(101)
  await Promise.resolve();await Promise.resolve();f.clear();f.configure('new');f.change(101,'notes','New account','Original')
  const latest=f.flush(101);assert.equal(await latest,true);first.resolve();assert.equal(await old,false)
  assert.deepEqual(writes,['Old account','New account']);assert.equal(state[101].notes.value,'New account')
  assert.equal(values.has('ideas-webapp-drafts-v1:old'),false)
  f.clear()
})
