# Step 4 — local transaction integrity implementation (v1.9.3)

**Local implementation verified; database rollout remains open.** No live SQL,
backup, staging project or deployment was performed. This branch must not be
published as a working backend integration before the coordinated migration.
The deferred step 2 authorization work is still required.

## Changes and guarantees

- `database/integrity/002-transaction-integrity.sql` preserves existing integer IDs,
  adds `GENERATED ALWAYS AS IDENTITY` and starts allocation above the current maximum.
  Deletion and rolled-back inserts consume IDs rather than reusing them. Gaps are expected.
  The table lock prevents a write racing the initial sequence setup. Repeat installation
  aborts instead of resetting allocation; inspect an existing default/identity explicitly.
- The migration refuses disabled/missing RLS or missing cascading foreign keys on any
  of the five child tables. This is a prerequisite check, **not proof of secure policies**.
  Exhausted integer IDs abort; widening parent/child IDs needs a separate inspected migration.
- `create_idea` commits the idea, initial status history, activity and request ledger
  together. `change_idea_status` locks the parent before changing a seed override or
  user idea, history, activity and ledger. An error in any part rolls back the transaction.
  Both functions check current administrator-managed membership, including before replay.
- Status writes supply the previously loaded status. A stale decision fails with a
  conflict and a **Refresh dataset** action; refreshing never repeats that mutation.
  An unchanged effective status does not fabricate a history/activity event. Clearing
  a seed override records its actual resulting status, rather than null.
- Create/status RPCs derive their audit actor from `auth.uid()` and timestamps/dates
  from PostgreSQL. The browser no longer writes their audit rows separately. Other
  edit/notes/score/group/sprint events remain client-written; securing the full audit
  surface and denying bypass writes remains step 2.
- A private ledger keys requests by account and UUID. Matching retries return the
  saved result; changing an already committed request's inputs fails rather than
  creating another idea. Replays cause a read-only refresh so an old response does
  not overwrite a later decision or resurrect a deleted idea. Request locks serialize
  overlapping retries. The ledger is inaccessible to client roles and persists after
  parent deletion so old requests remain deduplicated.
- The app has no fallback to client-generated IDs or nontransactional status writes.
  A missing RPC produces a visible migration-required error. Per-idea pending guards
  and functional map merging from step 3 remain in place.
- Empty reads remain empty. Automatic seed upsert and its unused store import/method
  were removed: refreshing after deleting all ideas cannot silently recreate them.
  Initial seed data remains in source and can be exported explicitly for a new empty
  dataset before identity installation:

  ```sh
  node scripts/export-initial-seed.mjs > /tmp/ideas-initial-seed.sql
  ```

  This only writes a local SQL file. Administrator review/approved execution is separate.
  The export locks the dataset, refuses nonempty or identity-enabled databases and inserts
  without upsert, preserving original seed IDs/text. Never use it to restore deleted data
  or reset an existing dataset.

## Verification and limits

Run `npm run test:database` for the real SQL in a disposable **PGlite PostgreSQL WASM**
instance. It has no Supabase connection, remote environment settings or real data.
The Auth schema, roles, `auth.uid()` and member-read policies are local test fixtures.

Twenty PostgreSQL checks cover preserved/generated/nonreused IDs, explicit-ID denial,
migration guards/repeat abort, request replay/input conflicts/deletion, seed reset,
server actors, no-op/stale statuses, create/history/activity rollback, denied/revoked
membership, private-ledger access, five-table cascades and explicit seed initialization.
Ten new store tests and four new Chromium tests cover returned IDs, missing/malformed
RPCs, lost-response retry, rollback, stale conflicts, empty loads and visible recovery.

PGlite uses a single serialized connection. Parallel submitted requests test sequence
allocation but **do not certify contention across separate PostgreSQL sessions**.
Likewise, local role tests do not validate Supabase JWT issuance, PostgREST schema cache,
Realtime, actual deployed grants/policies or the complete step 2 acceptance matrix.
Chrome/Edge stable smoke testing remains part of the release gate.

The ledger contains request payloads/results, including potentially deleted idea text.
Agree retention, deletion/privacy behavior and retry lifetime before rollout. Purging a
ledger record ends its deduplication guarantee. Do not expose its private schema through
PostgREST or grant client access. Client request tokens currently survive retries in the
same open form/store action; modal closure/page reload can lose them. Durable draft and
request recovery is step 5; this is not a blanket exactly-once guarantee across sessions.

A stale background load may still race a different local save. Refresh/draft ordering is
also step 5. Batch status changes are atomic **per idea**, with partial batch reporting;
they are not one transaction for the entire selection. Audit cascades intentionally
remove parent history as in the supplied schema, so this does not create an immutable,
retained deletion audit. Direct table status/creation and audit bypasses must be denied
in the coordinated step 2 policy/column-grant rollout.

## Deferred rollout and acceptance instructions

1. Resume the user-deferred database backup/restore workflow; inspect actual schema,
   owners, policies, table/column/sequence grants, triggers and public RPCs. Reconcile
   differences instead of blindly running source schema scripts that disable RLS.
2. Complete step 2 membership enrollment and six-table RLS. Restrict direct client
   creates/status/seed override/audit writes so approved RPCs are the only paths for
   these operations; preserve required non-status edits with reviewed column grants.
   Confirm the privileged function owner and private-schema boundaries. Do not regard
   merely setting `relrowsecurity` as secure policy installation.
3. On restored staging, run migration 002 once in an administrator transaction. Verify
   preserved IDs/row counts, sequence start, all five cascades, locked search paths and
   function grants. If it aborts, roll back and inspect the cause; never reset the sequence
   to the surviving maximum after deletion. Initialize fresh seeds only before this step.
4. Test two independent PostgreSQL sessions/real authenticated API clients: simultaneous
   creates, duplicate request UUIDs, competing same-idea statuses and delete versus status.
   Assert unique IDs, one mutation per request, accurate predecessor history, no lost
   overrides, no deadlock left unrecovered and no partial parent/audit changes on failure.
5. Repeat deny/revoke/forged input tests using real JWTs and raw APIs. Force each audit
   failure and verify persisted rows, then test lost-response replay, no-op/reset and all
   intended authorized workflows. Confirm PostgREST exposes and resolves RPC signatures.
6. Publish the matching frontend only after staging passes, with a rollback plan that
   retains identity allocation, deduplication records and closed authorization. Old clients
   submitting explicit IDs are intentionally incompatible; never reopen grants/RLS to
   accommodate them. Record actual rollout evidence before completing this step remotely.
