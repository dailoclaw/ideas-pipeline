import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeTimeline, localDayKey, decisionPeriods, buildMomentum, isPastEvent } from '../src/lib/history.js'
import { readAll } from '../src/lib/pagination.js'
process.env.TZ='Australia/Adelaide'
const event=(to,day='2026-10-09T01:00:00Z')=>({id:to,ideaId:1,type:'status_changed',payload:{from:'idea',to},occurredAt:day})
test('empty history stays empty without synthesizing a captured event',()=>assert.deepEqual(mergeTimeline(1,[],[]),[]))
test('legacy predecessors use original history before deduplication',()=>{
 const result=mergeTimeline(1,[event('ready')],[{status:'ready',date:'2026-10-09'},{status:'building',date:'2026-10-10'}],Date.parse('2026-10-11T00:00:00Z'))
 assert.equal(result.find(e=>e.payload.to==='building').payload.from,'ready')
})
test('one rich event suppresses only one matching legacy transition',()=>{
 const result=mergeTimeline(1,[event('ready')],[{status:'ready',date:'2026-10-09'},{status:'idea',date:'2026-10-09'},{status:'ready',date:'2026-10-09'}],Date.parse('2026-10-11T00:00:00Z'))
 assert.equal(result.length,3);assert.equal(result.filter(e=>e.payload.to==='ready').length,2)
})
test('Adelaide local midnight uses the local day rather than UTC',()=>assert.equal(localDayKey('2026-10-09T14:00:00Z'),'2026-10-10'))
test('calendar-day periods include the DST boundary and exclude future/non-decision events',()=>{
 const now=new Date('2026-10-10T00:10:00+10:30')
 const periods=decisionPeriods([event('ready','2026-09-11T00:00:00+09:30'),event('done','2026-09-10T23:59:59+09:30'),event('building','2026-10-10T00:11:00+10:30'),{...event('notes','2026-10-09T00:00:00+10:30'),type:'notes_updated'}],now)
 assert.equal(periods.recent.length,1);assert.equal(periods.prior.length,1)
 assert.equal(buildMomentum(periods.recent,now).reduce((n,w)=>n+w.count,0),1)
})
test('invalid/null/future timestamps cannot be counted as activity',()=>{
 for(const occurredAt of [null,'bad','2999-01-01T00:00:00Z'])assert.equal(isPastEvent({occurredAt}),false)
})
test('paging continues under a server cap smaller than the requested page',async()=>{
 const source=Array.from({length:1203},(_,n)=>({id:n+1}));let cursor=0
 const client={from:()=>({select(){return this},order(){return this},gt(_k,n){cursor=n;return this},limit(){return Promise.resolve({data:source.filter(r=>r.id>cursor).slice(0,37),error:null})}})}
 assert.equal((await readAll(client,'ideas','*','id')).length,1203)
})
test('paging rejects a repeated cursor instead of claiming completeness',async()=>{
 const client={from:()=>({select(){return this},order(){return this},gt(){return this},limit:async()=>({data:[{id:1}],error:null})})}
 await assert.rejects(readAll(client,'ideas','*','id'),/did not advance/)
})
