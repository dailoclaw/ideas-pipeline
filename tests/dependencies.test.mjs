import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { reviewAudit, reviewDevelopmentPaths } from '../scripts/check-dependencies.mjs'
const report = JSON.parse(await readFile(new URL('../docs/dependency-audit-v1.9.19.json', import.meta.url)))
const baseline = JSON.parse(await readFile(new URL('../docs/dependency-review-baseline.json', import.meta.url)))
const now = new Date('2026-10-11T00:00:00Z')
const check = (r = report, b = baseline, date = now) => reviewAudit(r, b, date)
const copy = () => structuredClone(report)
const summary = r => { const v=r.metadata.vulnerabilities; for(const key of ['info','low','moderate','high','critical'])v[key]=Object.values(r.vulnerabilities).filter(x=>x.severity===key).length;v.total=Object.keys(r.vulnerabilities).length;return r }
test('reviewed seven affected packages remain visible and pass the scoped guard',()=>{assert.deepEqual(check().failures,[]);assert.equal(check().affectedPackages,7)})
test('removal of findings is allowed without fabricating repaired status',()=>{const r=copy();r.vulnerabilities={};assert.equal(check(summary(r)).affectedPackages,0)})
test('new affected package fails review',()=>{const r=copy();r.vulnerabilities.unreviewed={...r.vulnerabilities.braces,name:'unreviewed'};assert.match(check(summary(r)).failures.join(),/Unreviewed affected package/)})
test('severity escalation fails review',()=>{const r=copy();r.vulnerabilities.braces.severity='critical';assert.match(check(summary(r)).failures.join(),/Worsened severity/)})
test('new advisory fails even within an accepted package',()=>{const r=copy();r.vulnerabilities.braces.via[0].url='https://github.com/advisories/NEW';assert.match(check(r).failures.join(),/New or changed advisory/)})
test('changed advisory affected range requires renewed review',()=>{const r=copy();r.vulnerabilities.braces.via[0].range='*';assert.match(check(r).failures.join(),/New or changed advisory/)})
test('new transitive dependency chain fails',()=>{const r=copy();r.vulnerabilities.tailwindcss.via.push('braces');assert.match(check(r).failures.join(),/Unreviewed dependency chain/)})
test('dangling dependency chain fails',()=>{const r=copy();r.vulnerabilities.tailwindcss.via.push('missing');assert.match(check(r).failures.join(),/Unreviewed dependency chain/)})
test('expired review fails even with unchanged findings',()=>assert.match(check(report,baseline,new Date('2026-11-11')).failures.join(),/expired/))
test('last review day remains valid',()=>assert.deepEqual(check(report,baseline,new Date('2026-11-10T23:59:59Z')).failures,[]))
for(const r of [null,{}, {error:{code:'ENETWORK'}}, {metadata:{vulnerabilities:{}},vulnerabilities:[]}])test('invalid or failed audit response is rejected '+JSON.stringify(r),()=>assert.throws(()=>check(r),/Invalid or failed/))
test('missing advisory list fails closed',()=>{const r=copy();delete r.vulnerabilities.braces.via;assert.throws(()=>check(r),/Invalid vulnerability/)})
test('unknown severity fails closed',()=>{const r=copy();r.vulnerabilities.braces.severity='unknown';assert.throws(()=>check(r),/Invalid vulnerability/)})
test('inconsistent npm totals cannot conceal findings',()=>{const r=copy();r.metadata.vulnerabilities.total=0;assert.throws(()=>check(r),/total disagrees/)})
test('invalid review expiry fails closed',()=>assert.throws(()=>check(report,{...baseline,reviewValidThrough:''}),/Invalid dependency review/))
test('invalid calendar expiry cannot extend review silently',()=>assert.throws(()=>check(report,{...baseline,reviewValidThrough:'2026-99-99'}),/Invalid dependency review expiry/))
test('inherited object keys are not valid audit severities',()=>{const r=copy();r.vulnerabilities.braces.severity='constructor';assert.throws(()=>check(r),/Invalid vulnerability/)})

const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url)))
test('accepted findings are present exclusively on development-only paths',()=>assert.deepEqual(reviewDevelopmentPaths(report,lock),[]))
test('moving a reviewed build finding into production fails review',()=>{const l=structuredClone(lock);l.packages[report.vulnerabilities.braces.nodes[0]].dev=false;assert.match(reviewDevelopmentPaths(report,l).join(),/outside a development-only/)})
test('missing installed node fails the development-only check',()=>{const l=structuredClone(lock);delete l.packages[report.vulnerabilities.braces.nodes[0]];assert.match(reviewDevelopmentPaths(report,l).join(),/outside a development-only/)})
