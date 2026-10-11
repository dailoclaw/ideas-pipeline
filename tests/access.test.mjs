import test, { before, after, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
let db, inCase = false
const owner='00000000-0000-0000-0000-000000000001', outsider='00000000-0000-0000-0000-000000000002'
const tables=['ideas','status_overrides','status_history','idea_activity','idea_group_assignments','sprint_assignments']
const source=path=>readFile(new URL('../'+path,import.meta.url),'utf8')
const query=async(sql,args=[]) => {
 if (!inCase) return (await db.query(sql,args)).rows
 await db.exec('SAVEPOINT statement_check')
 try { const rows=(await db.query(sql,args)).rows;await db.exec('RELEASE SAVEPOINT statement_check');return rows }
 catch(error) { await db.exec('ROLLBACK TO SAVEPOINT statement_check; RELEASE SAVEPOINT statement_check');throw error }
}
const as=async(role,uid='')=>{await db.exec('RESET ROLE');await query("SELECT set_config('request.jwt.claim.sub',$1,false)",[uid]);await db.exec('SET ROLE '+role)}
before(async()=>{
 db=await PGlite.create()
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`)
 await query('INSERT INTO auth.users VALUES($1),($2)',[owner,outsider])
 await db.exec(await source('supabase-schema.sql'))
 await db.exec(await source('database/security/001-account-allowlist.sql'))
 await query('INSERT INTO app_private.idea_members(user_id) VALUES($1)',[owner])
 await db.exec("INSERT INTO public.ideas(id,name,pitch,status,time,plat,is_seed) VALUES(101,'Seed','Pitch','idea','1w','html',true),(500,'Added','Pitch','ready','1w','html',false)")
 // Model an unsafe legacy installation, including column grants left by prior revokes.
 for(const table of tables)await db.exec(`GRANT ALL ON public.${table} TO PUBLIC,anon,authenticated;GRANT UPDATE ON public.${table} TO authenticated;CREATE POLICY legacy_open ON public.${table} USING(true) WITH CHECK(true)`)
 await db.exec('GRANT UPDATE(status,is_seed),INSERT(name) ON public.ideas TO authenticated;GRANT USAGE ON SCHEMA app_private TO authenticated;GRANT INSERT(user_id) ON app_private.idea_members TO authenticated;CREATE POLICY legacy_membership_open ON app_private.idea_members USING(true) WITH CHECK(true)')
 await db.exec(await source('database/security/001b-private-dataset-access.sql'))
 await db.exec(await source('database/integrity/002-transaction-integrity.sql'))
 await db.exec(await source('database/history/003-activity-outbox.sql'))
 await db.exec(await source('database/validation/004-input-constraints.sql'))
})
after(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec('RESET ROLE');await db.exec('BEGIN');inCase=true})
afterEach(async()=>{inCase=false;await db.exec('ROLLBACK;RESET ROLE')})
for(const role of ['anon','authenticated'])test(`${role} without membership cannot read any application table`,async()=>{
 await as(role,role==='authenticated'?outsider:'')
 for(const table of tables){if(role==='anon')await assert.rejects(query('SELECT * FROM public.'+table),/permission denied/);else assert.deepEqual(await query('SELECT * FROM public.'+table),[])}
})
test('permitted member reads every table and edits allowed fields with returning rows',async()=>{
 await as('authenticated',owner)
 for(const table of tables)await query('SELECT * FROM public.'+table)
 const rows=await query("UPDATE public.ideas SET name='Edited',notes='Saved',score_adjust=4,is_priority=true,updated_at=now() WHERE id=500 RETURNING *")
 assert.equal(rows.length,1);assert.equal(rows[0].notes,'Saved');assert.equal(rows[0].score_adjust,4)
})
for(const field of ['id','status','is_seed','is_v2','original_id','created_at','added_at'])test(`member cannot bypass protected idea column ${field}`,async()=>{
 await as('authenticated',owner);await assert.rejects(query(`UPDATE public.ideas SET ${field}=${field==='id'?'DEFAULT':field} WHERE id=500`),/permission denied/)
})
test('member cannot create ideas directly or write status/audit tables',async()=>{
 await as('authenticated',owner)
 await assert.rejects(query("INSERT INTO public.ideas(name,pitch) VALUES('Forged','Pitch')"),/permission denied/)
 for(const table of ['status_overrides','status_history','idea_activity']){
  await assert.rejects(query('DELETE FROM public.'+table),/permission denied/)
  await assert.rejects(query('UPDATE public.'+table+' SET idea_id=idea_id'),/permission denied/)
 }
 await assert.rejects(query("INSERT INTO public.idea_activity(idea_id,event_type,actor) VALUES(101,'created','forged')"),/permission denied/)
 await assert.rejects(query("INSERT INTO public.status_overrides(idea_id,status) VALUES(101,'done')"),/permission denied/)
})
for(const [table,field,value] of [['idea_group_assignments','group_key',"'intel'"],['sprint_assignments','week_num','2']])test(`member assignment upsert and delete works for ${table}`,async()=>{
 await as('authenticated',owner)
 for(let i=0;i<2;i++)assert.equal((await query(`INSERT INTO public.${table}(idea_id,${field},updated_at) VALUES(101,${value},now()) ON CONFLICT(idea_id) DO UPDATE SET idea_id=excluded.idea_id,${field}=excluded.${field},updated_at=excluded.updated_at RETURNING *`)).length,1)
 assert.equal((await query(`DELETE FROM public.${table} WHERE idea_id=101 RETURNING *`)).length,1)
 await assert.rejects(query(`INSERT INTO public.${table}(idea_id,${field}) VALUES(99999,${value})`),/row-level security/)
})
test('unlisted member cannot change rows or attach an assignment',async()=>{
 await as('authenticated',outsider)
 assert.equal((await query("UPDATE public.ideas SET notes='Denied' WHERE id=500 RETURNING *")).length,0)
 assert.equal((await query('DELETE FROM public.ideas WHERE id=500 RETURNING *')).length,0)
 await assert.rejects(query("INSERT INTO public.idea_group_assignments(idea_id,group_key) VALUES(101,'intel')"),/row-level security/)
})
test('seed deletion is denied, added idea deletion cascades assignments',async()=>{
 await as('authenticated',owner)
 assert.equal((await query('DELETE FROM public.ideas WHERE id=101 RETURNING *')).length,0)
 await query("INSERT INTO public.idea_group_assignments VALUES(500,'intel',now())")
 assert.equal((await query('DELETE FROM public.ideas WHERE id=500 RETURNING *')).length,1)
 assert.equal((await query('SELECT * FROM public.idea_group_assignments WHERE idea_id=500')).length,0)
})
test('membership and private ledger are inaccessible and cannot be self-enrolled',async()=>{
 await as('authenticated',owner)
 for(const table of ['idea_members','idea_mutation_requests'])await assert.rejects(query('SELECT * FROM app_private.'+table),/permission denied/)
 await assert.rejects(query('INSERT INTO app_private.idea_members(user_id) VALUES($1)',[outsider]),/permission denied/)
})
test('revocation removes reads, edits and RPC access in the same session',async()=>{
 await db.exec('DELETE FROM app_private.idea_members')
 await as('authenticated',owner)
 assert.deepEqual(await query('SELECT * FROM public.ideas'),[])
 assert.equal((await query("UPDATE public.ideas SET notes='Denied' RETURNING id")).length,0)
 await assert.rejects(query('SELECT public.create_idea($1,$2::jsonb)',[randomUUID(),JSON.stringify({name:'Denied',pitch:'Pitch'})]),/Dataset access denied/)
})
test('approved create/status/activity RPCs remain usable with no direct audit grants',async()=>{
 await as('authenticated',owner)
 const created=(await query('SELECT public.create_idea($1,$2::jsonb) AS result',[randomUUID(),JSON.stringify({name:'RPC capture',pitch:'Pitch'})]))[0].result
 assert.equal(created.activity.actor,owner)
 const changed=(await query("SELECT public.change_idea_status($1,$2,'building','idea') AS result",[randomUUID(),created.idea.id]))[0].result
 assert.equal(changed.idea.status,'building');assert.equal(changed.history.status,'building')
 const activity=(await query("SELECT public.record_idea_activity($1,$2,'notes_updated',$3::jsonb,now()) AS result",[randomUUID(),created.idea.id,JSON.stringify({fromLength:0,toLength:3})]))[0].result
 assert.equal(activity.activity.actor,owner)
})
test('legacy bootstraps and policy reinstallation never reopen RLS or status grants',async()=>{
 await db.exec(await source('supabase-schema.sql'));await db.exec(await source('supabase-activity-timeline-migration.sql'))
 await db.exec(await source('database/security/001b-private-dataset-access.sql'))
 await db.exec('BEGIN')
 for(const table of tables)assert.equal((await query('SELECT relrowsecurity FROM pg_class WHERE oid=$1::regclass',['public.'+table]))[0].relrowsecurity,true)
 assert.equal((await query("SELECT count(*) AS n FROM pg_policies WHERE schemaname='public' AND policyname='legacy_open'"))[0].n,0)
 await as('authenticated',owner);await assert.rejects(query("UPDATE public.ideas SET status='done' WHERE id=500"),/permission denied/)
})


test('inherited status-column privilege aborts policy installation atomically',async()=>{
 await db.exec('CREATE ROLE legacy_writer;GRANT UPDATE(status) ON public.ideas TO legacy_writer;GRANT legacy_writer TO authenticated')
 await db.exec('SAVEPOINT candidate_check')
 const candidate=(await source('database/security/001b-private-dataset-access.sql')).replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'')
 await assert.rejects(db.exec(candidate),/inherited protected-column privilege/)
 await db.exec('ROLLBACK TO SAVEPOINT candidate_check;RELEASE SAVEPOINT candidate_check')
 assert.equal((await query("SELECT count(*) AS n FROM pg_policies WHERE tablename='ideas' AND policyname='dataset_member_read'"))[0].n,1)
})
test('client inheritance of a privileged role aborts before policy replacement',async()=>{
 await db.exec('CREATE ROLE elevated BYPASSRLS;GRANT elevated TO authenticated;SAVEPOINT candidate_check')
 const candidate=(await source('database/security/001b-private-dataset-access.sql')).replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'')
 await assert.rejects(db.exec(candidate),/Client roles must not be privileged/)
 await db.exec('ROLLBACK TO SAVEPOINT candidate_check;RELEASE SAVEPOINT candidate_check')
})
test('client roles cannot truncate, allocate identities or invoke mutation RPCs anonymously',async()=>{
 await as('authenticated',owner)
 await assert.rejects(query('TRUNCATE public.ideas CASCADE'),/permission denied/)
 await assert.rejects(query("SELECT nextval(pg_get_serial_sequence('public.ideas','id'))"),/permission denied/)
 await as('anon')
 await assert.rejects(query('SELECT public.can_access_ideas()'),/permission denied/)
 await assert.rejects(query('SELECT public.create_idea($1,$2::jsonb)',[randomUUID(),JSON.stringify({name:'Denied',pitch:'Pitch'})]),/permission denied/)
})


test('authenticated role with no identity cannot read or update the dataset',async()=>{
 await as('authenticated')
 for(const table of tables)assert.deepEqual(await query('SELECT * FROM public.'+table),[])
 assert.equal((await query("UPDATE public.ideas SET notes='Denied' RETURNING id")).length,0)
})
test('unsafe membership helper search path aborts before changing access rules',async()=>{
 await db.exec("ALTER FUNCTION public.can_access_ideas() SET search_path=public;SAVEPOINT candidate_check")
 const candidate=(await source('database/security/001b-private-dataset-access.sql')).replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'')
 await assert.rejects(db.exec(candidate),/empty search_path/)
 await db.exec('ROLLBACK TO SAVEPOINT candidate_check;RELEASE SAVEPOINT candidate_check')
})
test('missing application table aborts policy installation before replacing existing policies',async()=>{
 await db.exec('DROP TABLE public.sprint_assignments;SAVEPOINT candidate_check')
 const candidate=(await source('database/security/001b-private-dataset-access.sql')).replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'')
 await assert.rejects(db.exec(candidate),/Missing or unsupported application table/)
 await db.exec('ROLLBACK TO SAVEPOINT candidate_check;RELEASE SAVEPOINT candidate_check')
 assert.equal((await query("SELECT count(*) AS n FROM pg_policies WHERE tablename='ideas' AND policyname='dataset_member_read'"))[0].n,1)
})


test('inherited column REFERENCES privilege is rejected without weakening the role boundary',async()=>{
 await db.exec('CREATE ROLE legacy_reference;GRANT REFERENCES(idea_id) ON public.sprint_assignments TO legacy_reference;GRANT legacy_reference TO authenticated;SAVEPOINT candidate_check')
 const candidate=(await source('database/security/001b-private-dataset-access.sql')).replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'')
 await assert.rejects(db.exec(candidate),/Unexpected inherited client privileges/)
 await db.exec('ROLLBACK TO SAVEPOINT candidate_check;RELEASE SAVEPOINT candidate_check')
})
