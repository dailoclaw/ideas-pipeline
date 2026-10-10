import test, { before, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'

let db
const owner = '00000000-0000-0000-0000-000000000001'
const outsider = '00000000-0000-0000-0000-000000000002'
const migration = await readFile(new URL('../database/integrity/002-transaction-integrity.sql', import.meta.url), 'utf8')
const query = async (sql, args = []) => (await db.query(sql, args)).rows
const count = async table => Number((await query(`SELECT count(*) AS n FROM ${table}`))[0].n)
const create = async (token = randomUUID(), fields = { name: 'Local test', pitch: 'Fictional pitch' }) =>
  (await query('SELECT public.create_idea($1::uuid, $2::jsonb) AS result', [token, JSON.stringify(fields)]))[0].result
const status = async (id, to, from = 'idea', token = randomUUID()) =>
  (await query('SELECT public.change_idea_status($1::uuid,$2::integer,$3::text,$4::text) AS result', [token, id, to, from]))[0].result
const identity = async uid => { await query("SELECT set_config('request.jwt.claim.sub', $1, false)", [uid]) }

before(async () => {
  db = await PGlite.create()
  await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    GRANT USAGE ON SCHEMA auth TO authenticated;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated;`)
  await query('INSERT INTO auth.users(id) VALUES ($1),($2)', [owner, outsider])
  await db.exec(await readFile(new URL('../supabase-schema.sql', import.meta.url), 'utf8'))
  await db.exec(await readFile(new URL('../database/security/001-account-allowlist.sql', import.meta.url), 'utf8'))
  await query('INSERT INTO app_private.idea_members(user_id) VALUES ($1)', [owner])
  await db.exec("INSERT INTO public.ideas(id,name,status,is_seed) VALUES (101,'Seed','idea',true),(500,'Existing','ready',false);")
  await identity(owner)
})
after(async () => { await db?.close() })

test('migration aborts before changing IDs when source RLS is disabled', async () => {
  await assert.rejects(db.exec(migration), /six-table RLS/)
  await db.exec('ROLLBACK')
  assert.equal((await query("SELECT attidentity FROM pg_attribute WHERE attrelid='public.ideas'::regclass AND attname='id'"))[0].attidentity, '')
  // Test fixture policies, not a claimed production security migration.
  for (const table of ['ideas','status_overrides','status_history','idea_activity','idea_group_assignments','sprint_assignments']) {
    await db.exec(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;
      CREATE POLICY fixture_member_read ON public.${table} FOR SELECT TO authenticated USING (public.can_access_ideas());
      GRANT SELECT ON public.${table} TO authenticated;`)
  }
  // Guard against deployments whose child constraints diverge from supplied SQL.
  await db.exec('ALTER TABLE public.sprint_assignments DROP CONSTRAINT sprint_assignments_idea_id_fkey')
  await assert.rejects(db.exec(migration), /cascading idea foreign keys/)
  await db.exec('ROLLBACK; ALTER TABLE public.sprint_assignments ADD FOREIGN KEY (idea_id) REFERENCES public.ideas(id) ON DELETE CASCADE')
  await db.exec(migration)
})
test('existing IDs survive and generated IDs start above the old maximum', async () => {
  assert.deepEqual((await query('SELECT id FROM public.ideas ORDER BY id')).map(i => i.id), [101,500])
  const result = await create()
  assert.equal(result.idea.id, 501)
  assert.equal(result.history.idea_id, 501)
  assert.equal(result.activity.actor, owner)
  assert.equal(result.idea.is_seed, false)
})
test('deleted IDs are never reused', async () => {
  const first = await create()
  await query('DELETE FROM public.ideas WHERE id=$1', [first.idea.id])
  assert.ok((await create()).idea.id > first.idea.id)
})
test('migration repeat aborts rather than resetting a sequence after deletion', async () => {
  await assert.rejects(db.exec(migration), /ID default already exists/)
  await db.exec('ROLLBACK')
  assert.ok((await create()).idea.id > 501)
})
test('parallel local requests receive distinct generated IDs', async () => {
  const results = await Promise.all(Array.from({ length: 12 }, () => create()))
  assert.equal(new Set(results.map(r => r.idea.id)).size, 12)
})
test('identical create retries yield one idea/history/activity and a replay', async () => {
  const token = randomUUID(), n = await count('public.ideas')
  const first = await create(token), second = await create(token)
  assert.equal(second.idea.id, first.idea.id)
  assert.equal(second.replayed, true)
  assert.equal(await count('public.ideas'), n + 1)
  assert.equal((await query('SELECT count(*) AS n FROM public.idea_activity WHERE idea_id=$1',[first.idea.id]))[0].n, 1)
  await assert.rejects(create(token,{name:'Different',pitch:'Changed'}), /different values/)
})
test('a replay after deletion does not resurrect the idea', async () => {
  const token = randomUUID(), first = await create(token)
  await query('DELETE FROM public.ideas WHERE id=$1',[first.idea.id])
  assert.equal((await create(token)).replayed,true)
  assert.equal((await query('SELECT id FROM public.ideas WHERE id=$1',[first.idea.id])).length,0)
})
test('seed changes/reset and user changes commit exact server audit rows', async () => {
  const first = await status(101,'ready')
  assert.equal(first.idea.status,'idea'); assert.equal(first.override,'ready')
  assert.deepEqual(first.activity.payload,{from:'idea',to:'ready'})
  assert.equal(first.history.status,'ready')
  const reset = await status(101,null,'ready')
  assert.equal(reset.override,null); assert.equal(reset.history.status,'idea')
  const user = await status(500,'building','ready')
  assert.equal(user.idea.status,'building')
  assert.equal(user.activity.actor,owner)
})
test('same request/no-op status changes cannot duplicate decision events', async () => {
  const before = await count('public.idea_activity')
  const token = randomUUID(), first = await status(101,'ready','idea',token)
  assert.equal((await status(101,'ready','idea',token)).replayed,true)
  const same = await status(101,'ready','ready')
  assert.equal(same.history,null); assert.equal(same.activity,null)
  assert.equal(await count('public.idea_activity'),before + 1)
  assert.ok(first.history.id)
})
test('stale status conflicts reject without replacing the newer decision', async () => {
  const before = await count('public.status_history')
  await assert.rejects(status(101,'done','idea'), /changed elsewhere/)
  assert.equal((await query('SELECT status FROM public.status_overrides WHERE idea_id=101'))[0].status,'ready')
  assert.equal(await count('public.status_history'),before)
})
test('history failure rolls back status and idempotency ledger together', async () => {
  const token = randomUUID(), before = await count('app_private.idea_mutation_requests')
  await db.exec("ALTER TABLE public.status_history ADD CONSTRAINT test_history_failure CHECK(status <> 'shelved')")
  await assert.rejects(status(101,'shelved','ready',token), /test_history_failure/)
  assert.equal((await query('SELECT status FROM public.status_overrides WHERE idea_id=101'))[0].status,'ready')
  assert.equal(await count('app_private.idea_mutation_requests'),before)
  await db.exec('ALTER TABLE public.status_history DROP CONSTRAINT test_history_failure')
  assert.equal((await status(101,'shelved','ready',token)).history.status,'shelved')
})
test('activity failure rolls back create and its history, allowing a safe retry', async () => {
  const token=randomUUID(), before=await count('public.ideas'), history=await count('public.status_history')
  await db.exec("ALTER TABLE public.idea_activity ADD CONSTRAINT test_activity_failure CHECK(event_type <> 'created') NOT VALID")
  await assert.rejects(create(token), /test_activity_failure/)
  assert.equal(await count('public.ideas'),before); assert.equal(await count('public.status_history'),history)
  await db.exec('ALTER TABLE public.idea_activity DROP CONSTRAINT test_activity_failure')
  assert.equal((await create(token)).replayed,false)
})
test('invalid status/reset/forged create fields cannot change persisted data', async () => {
  const before=await count('public.ideas')
  await assert.rejects(status(500,null,'building'), /Choose a status/)
  await assert.rejects(status(101,'invented','shelved'), /Invalid status/)
  await assert.rejects(create(randomUUID(),{name:'Forged',pitch:'Text',id:700,actor:'Other'}), /Invalid idea fields/)
  await assert.rejects(create(randomUUID(),{name:'Bad MVP',pitch:'Text',mvp:[{}]}), /Invalid idea fields/)
  assert.equal(await count('public.ideas'),before)
})
test('anonymous/unlisted callers cannot execute mutations or read the private ledger', async () => {
  await db.exec('SET ROLE anon')
  await assert.rejects(create(), /permission denied/)
  await db.exec('RESET ROLE; SET ROLE authenticated')
  await identity(outsider)
  await assert.rejects(create(), /Dataset access denied/)
  await assert.rejects(status(101,'idea','shelved'), /Dataset access denied/)
  await assert.rejects(query('SELECT * FROM app_private.idea_mutation_requests'), /permission denied/)
  await identity(owner)
  const result=await create()
  assert.equal(result.activity.actor,owner)
  await db.exec('RESET ROLE')
})
test('parent deletion cascades all five child tables in PostgreSQL', async () => {
  const result=await create(), id=result.idea.id
  await query('INSERT INTO public.status_overrides(idea_id,status) VALUES($1,$2)',[id,'done'])
  await query('INSERT INTO public.idea_group_assignments(idea_id,group_key) VALUES($1,$2)',[id,'intel'])
  await query('INSERT INTO public.sprint_assignments(idea_id,week_num) VALUES($1,1)',[id])
  await query('DELETE FROM public.ideas WHERE id=$1',[id])
  for(const table of ['status_overrides','status_history','idea_activity','idea_group_assignments','sprint_assignments'])
    assert.equal((await query(`SELECT count(*) AS n FROM public.${table} WHERE idea_id=$1`,[id]))[0].n,0)
})

test('user status activity failure also rolls back the parent update', async () => {
  await db.exec("ALTER TABLE public.idea_activity ADD CONSTRAINT test_status_activity CHECK(event_type <> 'status_changed') NOT VALID")
  await assert.rejects(status(500,'done','building'), /test_status_activity/)
  assert.equal((await query('SELECT status FROM public.ideas WHERE id=500'))[0].status,'building')
  await db.exec('ALTER TABLE public.idea_activity DROP CONSTRAINT test_status_activity')
})
test('missing parent and null request IDs reject before creating audit data', async () => {
  const before=await count('public.status_history')
  await assert.rejects(status(999999,'done'), /no longer exists/)
  await assert.rejects(create(null), /request ID is required/)
  assert.equal(await count('public.status_history'),before)
})
test('revocation denies replay of an already committed request', async () => {
  const token=randomUUID()
  await create(token)
  await query('DELETE FROM app_private.idea_members WHERE user_id=$1',[owner])
  await assert.rejects(create(token), /Dataset access denied/)
  await query('INSERT INTO app_private.idea_members(user_id) VALUES($1)',[owner])
})
test('rollback consumes its ID, and explicit legacy IDs cannot bypass identity allocation', async () => {
  const first=await create()
  await db.exec("ALTER TABLE public.idea_activity ADD CONSTRAINT test_id_rollback CHECK(event_type <> 'created') NOT VALID")
  await assert.rejects(create(), /test_id_rollback/)
  await db.exec('ALTER TABLE public.idea_activity DROP CONSTRAINT test_id_rollback')
  const next=await create()
  assert.ok(next.idea.id > first.idea.id + 1)
  await assert.rejects(query("INSERT INTO public.ideas(id,name) VALUES(90000,'Legacy explicit ID')"), /non-DEFAULT value/)
})

test('initial seeds remain available through an explicit empty-dataset administrator export', async () => {
  const { initialSeedSQL } = await import('../scripts/export-initial-seed.mjs')
  const { SEED_IDEAS } = await import('../src/data/seedIdeas.js')
  const fresh = await PGlite.create()
  try {
    await fresh.exec(await readFile(new URL('../supabase-schema.sql', import.meta.url),'utf8'))
    await fresh.exec(initialSeedSQL())
    const rows=(await fresh.query('SELECT id,name,notes FROM public.ideas ORDER BY id')).rows
    assert.equal(rows.length,SEED_IDEAS.length)
    for (const idea of SEED_IDEAS) assert.equal(rows.find(r => r.id===idea.id).name,idea.name)
    await assert.rejects(fresh.exec(initialSeedSQL()), /not empty/)
    await fresh.exec('ROLLBACK')
    assert.equal((await fresh.query('SELECT count(*) AS n FROM public.ideas')).rows[0].n,SEED_IDEAS.length)
  } finally { await fresh.close() }
})
