import test, {before,after,beforeEach,afterEach} from 'node:test'
import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
const source=p=>readFile(new URL('../'+p,import.meta.url),'utf8')
const rollout=await source('database/live/2026-10-11-private-dataset-rollout.sql')
const owner='00000000-0000-0000-0000-000000000001'
async function fixture(){
 const db=await PGlite.create()
 await db.exec(`CREATE ROLE anon;CREATE ROLE authenticated;CREATE SCHEMA auth;CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated;GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`)
 await db.exec(await source('supabase-schema.sql'))
 await db.exec(`ALTER TABLE public.idea_group_assignments DROP CONSTRAINT idea_group_assignments_idea_id_fkey;
 ALTER TABLE public.sprint_assignments DROP CONSTRAINT sprint_assignments_week_num_check;
 INSERT INTO public.ideas(id,name,pitch,time,plat,status,is_seed) VALUES(101,'Legacy','Pitch','2-3d','pay_modeller','idea',true),(411,'Current','Pitch','1w','html','ready',false);
 INSERT INTO public.idea_group_assignments VALUES(101,'pay',now());INSERT INTO public.sprint_assignments VALUES(101,2,now());`)
 return db
}
let db
before(async()=>{db=await fixture();await db.exec(rollout);await db.query('INSERT INTO auth.users VALUES($1)',[owner]);await db.query('INSERT INTO app_private.idea_members(user_id) VALUES($1)',[owner])})
after(async()=>{await db?.close()})
beforeEach(async()=>{await db.exec('RESET ROLE;BEGIN')})
afterEach(async()=>{await db.exec('ROLLBACK;RESET ROLE')})
async function query(sql,args=[]){
 await db.exec('SAVEPOINT check_statement')
 try{const rows=(await db.query(sql,args)).rows;await db.exec('RELEASE SAVEPOINT check_statement');return rows}
 catch(e){await db.exec('ROLLBACK TO SAVEPOINT check_statement;RELEASE SAVEPOINT check_statement');throw e}
}
async function as(role,uid=''){await db.exec('RESET ROLE');await query("SELECT set_config('request.jwt.claim.sub',$1,true)",[uid]);await db.exec('SET LOCAL ROLE '+role)}
test('combined live SQL preserves records and validates compatible constraints',async()=>{
 assert.equal((await query('SELECT count(*) AS n FROM public.ideas'))[0].n,2)
 const row=(await query('SELECT time,plat FROM public.ideas WHERE id=101'))[0];assert.deepEqual(row,{time:'2-3d',plat:'pay_modeller'})
 const constraints=await query("SELECT conname,convalidated FROM pg_constraint WHERE conname LIKE 'ideas_valid_%' OR conname IN ('groups_idea_cascade_fk','sprints_valid_week','groups_valid_key','overrides_valid_status')")
 assert.equal(constraints.length,9);assert.ok(constraints.every(c=>c.convalidated))
 assert.equal((await query("SELECT count(*) AS n FROM pg_class WHERE relnamespace='public'::regnamespace AND relrowsecurity AND relkind='r'"))[0].n,6)
})
test('live compatibility permits unrelated legacy edits and valid status changes',async()=>{
 await as('authenticated',owner)
 assert.equal((await query("UPDATE public.ideas SET notes='Saved notes' WHERE id=101 RETURNING notes"))[0].notes,'Saved notes')
 const changed=(await query("SELECT public.change_idea_status('11111111-1111-1111-1111-111111111111',101,'building','idea') AS value"))[0].value
 assert.equal(changed.override,'building')
 await query("UPDATE public.ideas SET time='1w' WHERE id=101")
 assert.equal((await query('SELECT plat FROM public.ideas WHERE id=101'))[0].plat,'pay_modeller')
})
test('classification guard rejects new invalid fields and changes to invalid legacy fields',async()=>{
 await as('authenticated',owner)
 for(const sql of ["UPDATE public.ideas SET time='2w' WHERE id=101","UPDATE public.ideas SET plat='unknown' WHERE id=101","UPDATE public.ideas SET time=null WHERE id=101"]){await assert.rejects(query(sql),/Invalid idea/)}
 await assert.rejects(query("SELECT public.create_idea('22222222-2222-2222-2222-222222222222','{\"name\":\"New\",\"pitch\":\"Pitch\",\"plat\":\"pay_modeller\"}')"),/Invalid idea platform/)
 const item=(await query("SELECT public.create_idea('33333333-3333-3333-3333-333333333333','{\"name\":\"New\",\"pitch\":\"Pitch\"}') AS value"))[0].value
 assert.ok(item.idea.id>411)
})
test('anonymous and unenrolled roles remain denied after combined rollout',async()=>{
 await as('anon');await assert.rejects(query('SELECT * FROM public.ideas'),/permission denied/)
 await as('authenticated');assert.deepEqual(await query('SELECT id FROM public.ideas'),[])
 await assert.rejects(query("SELECT public.create_idea('44444444-4444-4444-4444-444444444444','{\"name\":\"Denied\",\"pitch\":\"Pitch\"}')"),/Dataset access denied/)
 await assert.rejects(query('SELECT * FROM app_private.idea_members'),/permission denied/)
})
test('added assignment constraints reject orphans and invalid sprint weeks',async()=>{
 await as('authenticated',owner)
 await assert.rejects(query('INSERT INTO public.sprint_assignments VALUES(411,9,now())'),/sprints_valid_week/)
 await as('authenticated',owner);await db.exec('RESET ROLE')
 await assert.rejects(query("INSERT INTO public.idea_group_assignments VALUES(999,'pay',now())"),/groups_idea_cascade_fk/)
})
test('one-shot rollout rejects a second installation without modifying existing data',async()=>{
 await assert.rejects(db.exec(rollout),/Existing rollout detected/)
 await db.exec('ROLLBACK')
 assert.equal((await db.query('SELECT count(*) AS n FROM public.ideas')).rows[0].n,2)
 // Restore the transaction expected by afterEach.
 await db.exec('BEGIN')
})
test('orphan preflight failure rolls back the entire installation',async()=>{
 const isolated=await fixture()
 try{
  await isolated.exec("INSERT INTO public.idea_group_assignments VALUES(999,'pay',now())")
  await assert.rejects(isolated.exec(rollout),/groups_idea_cascade_fk/);await isolated.exec('ROLLBACK')
  assert.equal((await isolated.query("SELECT to_regprocedure('public.can_access_ideas()') AS installed")).rows[0].installed,null)
  assert.equal((await isolated.query('SELECT count(*) AS n FROM public.idea_group_assignments')).rows[0].n,2)
 }finally{await isolated.close()}
})
test('post-installation SQL verifies deny paths without live data mutations',async()=>{
 const isolated=await fixture()
 try{
  await isolated.exec(rollout)
  const results=await isolated.exec(await source('database/live/verify-private-dataset-rollout.sql'))
  const rows=results.find(r=>r.rows?.some(row=>row.check_name==='protected_public_tables')).rows
  const counts=Object.fromEntries(rows.map(r=>[r.check_name,r.result]))
  assert.equal(counts.protected_public_tables,6);assert.equal(counts.anonymous_table_grants,0)
  assert.equal(counts.canonical_audit_triggers,8);assert.equal(counts.classification_guard,1)
  assert.equal(counts.validated_rollout_constraints,9);assert.equal(counts.auth_users,0)
  assert.equal(counts.canonical_audit_rows,0);assert.equal(counts.ideas,2)
 }finally{await isolated.close()}
})
