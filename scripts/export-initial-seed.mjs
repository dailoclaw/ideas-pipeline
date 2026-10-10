import { SEED_IDEAS } from '../src/data/seedIdeas.js'

// Administrator bootstrap only; never executes SQL or connects to a database.
export function initialSeedSQL() {
  const rows = SEED_IDEAS.map(i => ({
    id: i.id, name: i.name, status: i.status, time: i.time, plat: i.plat,
    pitch: i.pitch || '', target: i.target || '', pain: i.pain || '', mvp: i.mvp || [],
    win: i.win || '', notes: i.notes || '', added_at: i.addedAt || null, is_seed: true,
  }))
  const payload = JSON.stringify(rows)
  if (payload.includes('$initial_seed$')) throw new Error('Seed SQL delimiter occurs in source data')
  return `-- LOCAL EXPORT: review/restore-test before any approved administrator execution.
-- Run only for a new empty dataset, BEFORE identity migration 002. Never upsert existing ideas.
BEGIN;
LOCK TABLE public.ideas IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.ideas) THEN RAISE EXCEPTION 'Dataset is not empty'; END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_attribute WHERE attrelid = 'public.ideas'::regclass
    AND attname = 'id' AND attidentity <> '') THEN
    RAISE EXCEPTION 'Initialize seeds before identity allocation';
  END IF;
END $$;
INSERT INTO public.ideas(id, name, status, time, plat, pitch, target, pain, mvp, win, notes, added_at, is_seed)
SELECT id, name, status, time, plat, pitch, target, pain, mvp, win, notes, added_at, is_seed
FROM jsonb_to_recordset($initial_seed$${payload}$initial_seed$::jsonb)
AS seed(id integer, name text, status text, time text, plat text, pitch text, target text, pain text,
  mvp text[], win text, notes text, added_at date, is_seed boolean);
COMMIT;
`
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) process.stdout.write(initialSeedSQL())
