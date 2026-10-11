import test, { before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
const owner='00000000-0000-0000-0000-000000000001', outsider='00000000-0000-0000-0000-000000000002'
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8')
const migration=await source('database/audit/005-trusted-mutation-audit.sql')
let db
const query=async(sql,args=[])=>{
 await db.exec('SAVEPOINT statement_check')
 try {const rows=(await db.query(sql,args)).rows;await db.exec('RELEASE SAVEPOINT statement_check');return rows}
 catch(e){await db.exec('ROLLBACK TO SAVEPOINT statement_check;RELEASE SAVEPOINT statement_check');throw e}
}
const as=async(role,uid='')=>{await db.exec('RESET ROLE');await query("SELECT set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('SET ROLE '+role)}
const audit=async()=>{await db.exec('RESET ROLE');return query('SELECT * FROM app_private.idea_change_audit ORDER BY id')}
const create=async(token=randomUUID())=>(await query('SELECT public.create_idea($1,$2::jsonb) AS result',[token,JSON.stringify({name:'Private name',pitch:'Private pitch',notes:'Private notes'})]))[0].result
before(async()=>{
 db=await PGlite.create()
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`)
 await db.query('INSERT INTO auth.users VALUES($1),($2)',[owner,outsider])
 for(const p of ['supabase-schema.sql','database/security/001-account-allowlist.sql'])await db.exec(await source(p))
 await db.query('INSERT INTO app_private.idea_members(user_id) VALUES($1)',[owner])
 await db.exec("INSERT INTO public.ideas(id,name,pitch,status,time,plat,is_seed) VALUES(101,'Seed','Pitch','idea','1w','html',true),(500,'Added','Pitch','ready','1w','html',false)")
 for(const p of ['database/security/001b-private-dataset-access.sql','database/integrity/002-transaction-integrity.sql','database/history/003-activity-outbox.sql','database/validation/004-input-constraints.sql'])await db.exec(await source(p))
 await db.exec(migration)
})
after(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec('RESET ROLE;BEGIN')})
afterEach(async()=>{await db.exec('ROLLBACK;RESET ROLE')})
test('actual supporting edits create canonical metadata with authenticated actor and server time',async()=>{
 await as('authenticated',owner)
 const row=(await query("UPDATE public.ideas SET notes='Secret notes',score_adjust=5,is_priority=true,updated_at='2099-01-01' WHERE id=500 RETURNING *"))[0]
 assert.ok(new Date(row.updated_at)<new Date('2099-01-01'))
 const entries=await audit();assert.equal(entries.length,1);const e=entries[0]
 assert.equal(e.actor_id,owner);assert.equal(e.operation,'UPDATE');assert.equal(e.idea_id,500)
 assert.deepEqual(e.changed_fields,['is_priority','notes','score_adjust']);assert.equal(e.before_values.score_adjust,0);assert.equal(e.after_values.score_adjust,5)
 assert.ok(Math.abs(Date.now()-new Date(e.occurred_at).getTime())<15000);assert.equal(e.after_values.notes,undefined)
})
test('no-op update preserves timestamp and creates no audit noise',async()=>{
 await as('authenticated',owner)
 const old=(await query('SELECT updated_at FROM public.ideas WHERE id=500'))[0].updated_at
 const row=(await query("UPDATE public.ideas SET notes=notes,updated_at='2099-01-01' WHERE id=500 RETURNING updated_at"))[0]
 assert.deepEqual(row.updated_at,old);assert.deepEqual(await audit(),[])
})
for(const [table,field,value,next] of [['idea_group_assignments','group_key',"'intel'","'infra'"],['sprint_assignments','week_num','2','3']])test(`${table} insert/update/delete are audited from persisted rows`,async()=>{
 await as('authenticated',owner)
 await query(`INSERT INTO public.${table}(idea_id,${field},updated_at) VALUES(500,${value},'2099-01-01')`)
 await query(`UPDATE public.${table} SET ${field}=${next},updated_at='1900-01-01' WHERE idea_id=500`)
 await query(`DELETE FROM public.${table} WHERE idea_id=500`)
 const rows=await audit();assert.deepEqual(rows.map(x=>x.operation),['INSERT','UPDATE','DELETE'])
 assert.ok(rows.every(x=>x.actor_id===owner&&x.source_table===table&&x.idea_id===500));assert.deepEqual(rows[1].changed_fields,[field])
})
test('assignment conflict upsert creates only one audit per actual change',async()=>{
 await as('authenticated',owner)
 for(let i=0;i<2;i++)await query("INSERT INTO public.sprint_assignments(idea_id,week_num,updated_at) VALUES(500,2,'2099-01-01') ON CONFLICT(idea_id) DO UPDATE SET week_num=excluded.week_num,updated_at=excluded.updated_at")
 assert.equal((await audit()).length,1)
})
test('deletion retains parent and cascading assignment audit without parent foreign keys',async()=>{
 await as('authenticated',owner)
 await query("INSERT INTO public.idea_group_assignments(idea_id,group_key) VALUES(500,'intel')")
 await query('INSERT INTO public.sprint_assignments(idea_id,week_num) VALUES(500,2)')
 await query('DELETE FROM public.ideas WHERE id=500 RETURNING id')
 const rows=await audit();assert.deepEqual(rows.filter(x=>x.operation==='DELETE').map(x=>x.source_table).sort(),['idea_group_assignments','ideas','sprint_assignments'])
 assert.equal((await query('SELECT count(*) AS n FROM public.ideas WHERE id=500'))[0].n,0)
 await query('DELETE FROM auth.users WHERE id=$1',[owner]);assert.equal((await audit()).length,rows.length)
})
test('audit storage failure rolls back edit, timestamp and canonical audit together',async()=>{
 await db.exec("ALTER TABLE app_private.idea_change_audit ADD CONSTRAINT fixture_fail CHECK(operation='IMPOSSIBLE')")
 await as('authenticated',owner)
 const before=(await query('SELECT notes,updated_at FROM public.ideas WHERE id=500'))[0]
 await assert.rejects(query("UPDATE public.ideas SET notes='Unsaved' WHERE id=500 RETURNING *"),/fixture_fail/)
 assert.deepEqual((await query('SELECT notes,updated_at FROM public.ideas WHERE id=500'))[0],before);assert.deepEqual(await audit(),[])
})
test('failed validation cannot leave canonical evidence for a failed mutation',async()=>{
 await as('authenticated',owner)
 await assert.rejects(query('UPDATE public.ideas SET score_adjust=1000 WHERE id=500'),/check constraint/)
 assert.deepEqual(await audit(),[])
})
test('whole transaction rollback removes primary writes and audit rows',async()=>{
 await as('authenticated',owner);await db.exec('SAVEPOINT mutation')
 await query("UPDATE public.ideas SET notes='Rolled back' WHERE id=500")
 await db.exec('ROLLBACK TO SAVEPOINT mutation;RELEASE SAVEPOINT mutation')
 assert.deepEqual(await audit(),[])
})
for(const role of ['anon','authenticated'])test(`${role} cannot read/forge/update/delete private canonical audit or invoke helpers`,async()=>{
 await as(role,role==='authenticated'?owner:'')
 for(const sql of ['SELECT * FROM app_private.idea_change_audit','DELETE FROM app_private.idea_change_audit',"UPDATE app_private.idea_change_audit SET actor_id=null","INSERT INTO app_private.idea_change_audit(source_table) VALUES('forged')",'SELECT app_private.audit_idea_mutation()','SELECT app_private.stamp_idea_mutation()'])await assert.rejects(query(sql),/permission denied/)
})
test('outsider and revoked member produce no primary writes or audit entries',async()=>{
 await as('authenticated',outsider);assert.deepEqual(await query("UPDATE public.ideas SET notes='Denied' WHERE id=500 RETURNING id"),[])
 await db.exec('RESET ROLE');await query('DELETE FROM app_private.idea_members');await as('authenticated',owner)
 assert.deepEqual(await query('DELETE FROM public.ideas WHERE id=500 RETURNING id'),[]);assert.deepEqual(await audit(),[])
})
test('create/status RPCs retain replay semantics and atomic canonical changes',async()=>{
 await as('authenticated',owner);const token=randomUUID(),created=await create(token);await create(token)
 const statusToken=randomUUID();for(let i=0;i<2;i++)await query("SELECT public.change_idea_status($1,$2,'building','idea')",[statusToken,created.idea.id])
 const rows=await audit();assert.deepEqual(rows.map(x=>x.operation),['INSERT','UPDATE']);assert.equal(rows[1].after_values.status,'building');assert.equal(rows[0].after_values.name,undefined)
})
test('seed status RPC audits the override without modifying seed status',async()=>{
 await as('authenticated',owner)
 await query("SELECT public.change_idea_status($1,101,'building','idea')",[randomUUID()])
 const rows=await audit();assert.equal(rows.length,1);assert.equal(rows[0].source_table,'status_overrides');assert.equal(rows[0].after_values.status,'building')
 assert.equal((await query('SELECT status FROM public.ideas WHERE id=101'))[0].status,'idea')
})
test('caller-reported activity cannot fabricate canonical mutation evidence',async()=>{
 await as('authenticated',owner)
 await query("SELECT public.record_idea_activity($1,500,'score_adjusted',$2::jsonb,'2000-01-01')",[randomUUID(),JSON.stringify({from:0,to:99})])
 assert.deepEqual(await audit(),[])
 assert.equal((await query('SELECT score_adjust FROM public.ideas WHERE id=500'))[0].score_adjust,0)
})
test('administrator changes with no JWT retain null actor instead of invented user attribution',async()=>{
 await as('postgres')
 await query("UPDATE public.ideas SET notes='Admin change' WHERE id=500")
 assert.equal((await audit())[0].actor_id,null)
})
test('reinstallation aborts without replacing retained evidence',async()=>{
 await as('authenticated',owner);await query("UPDATE public.ideas SET notes='Keep evidence' WHERE id=500");await db.exec('RESET ROLE;SAVEPOINT install')
 await assert.rejects(db.exec(migration.replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'')),/already exists/)
 await db.exec('ROLLBACK TO SAVEPOINT install;RELEASE SAVEPOINT install');assert.equal((await audit()).length,1)
})
test('missing source prerequisite aborts installation without weakening remaining audit',async()=>{
 await db.exec('ALTER TABLE public.sprint_assignments DISABLE ROW LEVEL SECURITY;SAVEPOINT install')
 await assert.rejects(db.exec(migration.replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'')),/Missing RLS-protected audit source/)
 await db.exec('ROLLBACK TO SAVEPOINT install;RELEASE SAVEPOINT install')
 await as('authenticated',owner);await query("UPDATE public.ideas SET notes='Still protected' WHERE id=500");assert.equal((await audit()).length,1)
})
test('assignment rekey retains old and new parent IDs for reconciliation',async()=>{
 await as('authenticated',owner);await query("INSERT INTO public.idea_group_assignments(idea_id,group_key) VALUES(500,'intel')")
 await query('UPDATE public.idea_group_assignments SET idea_id=101 WHERE idea_id=500')
 const e=(await audit())[1];assert.equal(e.idea_id,101);assert.equal(e.before_values.idea_id,500);assert.equal(e.after_values.idea_id,101)
})
test('audit failure rolls back deletion and all cascading assignments',async()=>{
 await as('authenticated',owner);await query('INSERT INTO public.sprint_assignments(idea_id,week_num) VALUES(500,2)')
 await db.exec("RESET ROLE;ALTER TABLE app_private.idea_change_audit ADD CONSTRAINT fixture_fail CHECK(operation<>'DELETE')")
 await as('authenticated',owner);await assert.rejects(query('DELETE FROM public.ideas WHERE id=500 RETURNING id'),/fixture_fail/)
 assert.equal((await query('SELECT id FROM public.ideas WHERE id=500')).length,1);assert.equal((await query('SELECT idea_id FROM public.sprint_assignments WHERE idea_id=500')).length,1)
 assert.equal((await audit()).length,1)
})
test('NULL-to-empty notes is a real mutation without duplicating private text',async()=>{
 await query('UPDATE public.ideas SET notes=null WHERE id=500');await as('authenticated',owner)
 await query("UPDATE public.ideas SET notes='' WHERE id=500")
 const rows=await audit();assert.deepEqual(rows[1].changed_fields,['notes']);assert.equal(rows[1].before_values.notes,undefined);assert.equal(rows[1].after_values.notes,undefined)
})
test('identity-backed audit storage is closed and helpers have reviewed security properties',async()=>{
 assert.equal((await query("SELECT relrowsecurity FROM pg_class WHERE oid='app_private.idea_change_audit'::regclass"))[0].relrowsecurity,true)
 const functions=await query("SELECT proname,prosecdef,proconfig FROM pg_proc WHERE oid IN ('app_private.stamp_idea_mutation()'::regprocedure,'app_private.audit_idea_mutation()'::regprocedure)")
 assert.ok(functions.every(f=>f.proconfig.includes('search_path=""')));assert.equal(functions.find(f=>f.proname==='audit_idea_mutation').prosecdef,true);assert.equal(functions.find(f=>f.proname==='stamp_idea_mutation').prosecdef,false)
 await as('authenticated',owner);await assert.rejects(query("SELECT nextval('app_private.idea_change_audit_id_seq')"),/permission denied/)
})
