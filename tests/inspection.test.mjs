import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
const source = path => readFile(new URL('../' + path, import.meta.url), 'utf8')
const inspection = await source('database/security/inspect-release.sql')
const setup = async () => {
 const db = await PGlite.create()
 await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE SCHEMA auth;
 CREATE TABLE auth.users(id uuid PRIMARY KEY);
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
 GRANT USAGE ON SCHEMA auth TO authenticated; GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`)
 for (const path of ['supabase-schema.sql','database/security/001-account-allowlist.sql','database/security/001b-private-dataset-access.sql','database/integrity/002-transaction-integrity.sql','database/history/003-activity-outbox.sql','database/validation/004-input-constraints.sql','database/audit/005-trusted-mutation-audit.sql']) await db.exec(await source(path))
 return db
}
const run = async (change, verify) => {
 const db = await setup()
 try { if (change) await db.exec(change); const results = await db.exec(inspection); await verify(results.filter(r => r.fields.length).map(r => r.rows), db) }
 finally { await db.close() }
}
test('release inspection reports expected private boundaries and all eight audit triggers', async () => {
 await run(null, rows => {
  assert.equal(rows[0].length,3); assert.ok(rows[0].every(r => r.relation_exists && r.rls_enabled))
  assert.ok(rows[1].filter(r => r.role_name !== 'service_role').every(r => !r.schema_usage && !r.schema_create && !r.can_assume_owner && !r.any_table_privilege && !r.any_column_privilege))
  assert.ok(rows[2].every(r => r.function_exists)); assert.equal(rows[3].length,8); assert.ok(rows[3].every(r => r.trigger_exists && r.tgenabled === 'O'))
  assert.ok(rows[2].filter(r => r.signature.includes('app_private.') && r.role_name === 'authenticated').every(r => !r.can_execute && !r.can_assume_owner))
 })
})
test('release inspection remains usable with missing private schema, helpers and roles', async () => {
 const db = await PGlite.create()
 try { const rows=(await db.exec(inspection)).filter(r=>r.fields.length).map(r=>r.rows); assert.ok(rows[0].every(r=>!r.relation_exists)); assert.ok(rows[1].every(r=>!r.role_exists && r.any_table_privilege === null)); assert.ok(rows[2].every(r=>!r.function_exists)); assert.ok(rows[3].every(r=>!r.trigger_exists)) }
 finally { await db.close() }
})
test('release inspection detects disabled and missing canonical triggers', async () => {
 await run('ALTER TABLE public.ideas DISABLE TRIGGER idea_canonical_audit; DROP TRIGGER idea_server_stamp ON public.sprint_assignments', rows => {
  assert.equal(rows[3].find(r=>r.table_name==='ideas'&&r.trigger_name==='idea_canonical_audit').tgenabled,'D')
  assert.equal(rows[3].find(r=>r.table_name==='sprint_assignments'&&r.trigger_name==='idea_server_stamp').trigger_exists,false)
 })
})
test('release inspection exposes inherited private column and sequence privileges', async () => {
 await run('CREATE ROLE fixture_reader; GRANT fixture_reader TO authenticated; GRANT SELECT(id) ON app_private.idea_change_audit TO fixture_reader; GRANT USAGE ON SEQUENCE app_private.idea_change_audit_id_seq TO fixture_reader', rows => {
  assert.equal(rows[1].find(r=>r.role_name==='authenticated'&&r.relation_name==='idea_change_audit').any_column_privilege,true)
  assert.equal(rows[5].find(r=>r.role_name==='authenticated'&&r.sequence_name==='idea_change_audit_id_seq').any_sequence_privilege,true)
 })
})
test('release inspection exposes unsafe helper settings and inherited execution', async () => {
 await run("ALTER FUNCTION app_private.audit_idea_mutation() SET search_path=public; CREATE ROLE fixture_helper; GRANT fixture_helper TO authenticated; GRANT EXECUTE ON FUNCTION app_private.audit_idea_mutation() TO fixture_helper", rows => {
  const row=rows[2].find(r=>r.signature==='app_private.audit_idea_mutation()'&&r.role_name==='authenticated')
  assert.equal(row.can_execute,true); assert.deepEqual(row.function_settings,['search_path=public'])
 })
})
test('release inspection reports extra triggers without returning private row contents', async () => {
 await run("CREATE TRIGGER fixture_extra BEFORE DELETE ON public.ideas FOR EACH ROW EXECUTE FUNCTION app_private.stamp_idea_mutation(); INSERT INTO public.ideas(name,pitch,time,plat) VALUES('Secret fixture name','Secret fixture pitch','1w','html')", async (rows, db) => {
  assert.ok(rows[4].some(r=>r.tgname==='fixture_extra')); assert.ok(!JSON.stringify(rows).includes('Secret fixture'))
  assert.equal((await db.query("SELECT name FROM public.ideas WHERE name='Secret fixture name'")).rows[0].name,'Secret fixture name')
  assert.equal((await db.query('SELECT count(*)::int AS n FROM app_private.idea_change_audit')).rows[0].n,1)
 })
})
