# Step 2: secure database access — local authentication implementation (v1.9.0)

Status: **In progress. No deployed security fix is claimed.**

Step 1 is published on main at `ab3acb1`. Step 2 starts on `codex/database-access`.
Live backup and staging remain deferred by the user's instruction. No SQL was executed
against a database; email/password authentication is implemented locally, and no deployed policies have changed.

## Confirmed source findings

- `supabase-schema.sql:79–84` explicitly disables RLS on all six application tables.
- `supabase-activity-timeline-migration.sql:16` disables it again for activity. Running
  either legacy script after a security migration would reopen access.
- `src/lib/supabase.js` creates a browser client with a public key. `src/main.jsx`
  previously mounted the app directly. It now mounts AuthGate, which loads the app only after a positive can_access_ideas RPC result.
- `src/lib/store.js` sends an actor of `You` and client timestamps. Activity and
  status history are separate client writes, so authorization alone will not make
  their content a reliable audit trail.
- Child tables reference ideas with cascading deletion in supplied SQL. Actual
  deployed constraints, grants, policies and RPCs have **not** been inspected.

A public key is expected in a browser app; moving it out of JavaScript does not fix
open database authorization. Supabase's [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security)
requires database policies tied to authenticated identity. All authenticated accounts
must not automatically receive access to this personal dataset.

## Implementation sequence

1. **Capture deployed metadata when the deferred database workflow resumes.** Run
   `database/security/inspect-access.sql` as an administrator, first on staging.
   It runs in a read-only transaction and returns metadata, not idea content or
   credentials. Review missing tables, effective grants, PUBLIC access, role bypass,
   column grants, policy expressions, constraints, triggers and public RPC execution.
   Review security-definer function bodies separately in the admin console; an
   unsafe RPC can defeat otherwise correct table policies. Include public views,
   sequences, schema usage, exposed schemas and Realtime publication configuration
   in the administrator review; this script does not certify those surfaces.
2. **Enroll the permitted identity.** The user confirmed one private dataset and email/password login. Confirm the existing
   Supabase Auth user(s) and whether this is one shared personal dataset or distinct
   workspaces. The current UI's Groups/Spaces are classifications, not authorization
   boundaries. Do not infer ownership from labels or use editable user metadata.
   Use an administrator-maintained allowlist for the confirmed single private dataset.
3. **Verify the implemented gate on staging.** Local session/login tests pass. Wait for session resolution before
   mounting/loading the data app. Add login, logout, session-expiry and access-denied
   states. Subscribe/unsubscribe correctly under StrictMode; clear sensitive in-memory
   state and account-specific caches on logout/account change. No anonymous fallback
   or service-role key in frontend code. Configure provider/redirect settings in
   staging for the selected login flow; confirm signup behavior explicitly.
4. **Prepare an atomic, versioned migration against the inspected schema.** Put an
   admin-only allowlist in a private schema. Enable RLS on all six tables, remove
   permissive legacy policies and unnecessary grants, and add explicit authenticated
   membership conditions for reads/writes. Validate parent access for child records.
   Restrict allowlist writes and helper-function execution; lock any security-definer
   helper's search_path and schema-qualify relations. An empty allowlist must deny all
   access. Check sequences and RPC permissions. Rewrite legacy install/upgrade scripts
   so they cannot disable RLS again. Keep policies independent of browser state.
5. **Make audit records originate from actual mutations.** Database mutation functions
   or triggers must derive actors from authenticated identity and event times from
   server time. Deny direct client insert/update/delete of trusted audit rows. Remove
   duplicate client audit writes in the coordinated frontend change. Distinguish
   user commentary from trusted mutation events. Preserve existing history as legacy,
   unverified data rather than presenting it as retrospectively trustworthy. Cascade
   deletion currently removes audit records; define required retention before claiming
   an immutable audit. Coordinate transaction work with step 4 of the repair plan.
6. **Test with real JWTs on restored staging.** Use the matrix below against every
   table and approved RPC. Browser mocks cannot validate PostgreSQL grants, RLS or
   identity. Confirm raw API denial independently of hiding UI controls. Capture
   pre/post row state so a successful HTTP response with zero affected rows is not
   misread as a successful mutation. Test recovery and existing data migration.
7. **Roll out frontend and policies together only after the gate passes.** Restore-test
   the backup, enroll the permitted account, verify its login and deploy coordinated
   changes. Check the old anonymous client is denied. Verify authorized workflows on
   the new build. A rollback must restore functionality without disabling RLS or
   reopening public grants. Keep the app gated until that is possible.

## Required staging acceptance matrix

| Identity / condition | Expected result |
|---|---|
| Anonymous public-key client | All six tables and protected RPCs deny reads/writes |
| Authenticated account absent from allowlist | Same denial; no membership management |
| Authorized account | Intended create/read/update/delete and child workflows work |
| Authorized account revoked during session | Next database request denied; app clears data |
| Expired session, refresh failure, logout, account switch | No stale protected app/caches or anonymous fallback |
| Forged actor, time, audit update/delete/direct insert | Rejected; trusted events record server-derived identity/time |
| Denied parent or child mutation | No partial data/audit writes or false success |
| Concurrent mutations | Exactly one accurate event per committed mutation |
| Re-run old schema/upgrade scripts | Cannot reopen access or replace secure policies |
| Re-run new migration / empty allowlist / failed transaction | Safe repeat or explicit abort; no partially open state |
| Authenticated read via public views/RPC/Realtime | No route around table authorization |
| Existing records and legitimate workflow after coordinated rollout | Data preserved and permitted user retains access |

## Verification performed locally

Source locations and six-table inventory were checked. The read-only inspection was
reviewed against PostgreSQL catalog shapes; **it has not been parsed or executed by
PostgreSQL** because no local database runtime or approved staging connection exists.
No staging security acceptance test is marked passed. The expanded isolated suite records 46 checks: 33 pass and 13 unchanged known defects. The production build passes.

The access model and login flow are confirmed. Administrator enrollment, six-table RLS and trusted-audit implementation remain open; actual rollout requires the deferred backup/staging workflow. Keep step 2 open
until the staging matrix proves access control and coordinated login work.

## Local gate behavior and deployment prerequisites

- The app uses `signInWithPassword`; there is no public signup or password-reset flow.
  Provision the permitted account and manage recovery through Supabase administration.
- `database/security/001-account-allowlist.sql` is an **unexecuted draft** for the RPC.
  Its empty allowlist denies everyone. It does not install the six application table
  policies or make client-written events trustworthy. Do not deploy it alone as a fix.
- Sessions and passwords are not persisted by this app. A refresh/closed page requires
  login again. Token refresh operates while the page is open. Supabase project settings
  determine token expiration; local sign-out does not revoke already-issued access JWTs.
- Signed-out users do not load the protected app. A denied or unavailable RPC keeps it
  gated. Focus/session refresh rechecks membership; RLS must deny revoked accounts on
  every database request independently of the UI.
- Logout, account changes and access loss destroy the application realm by reloading,
  clearing in-memory stores and drafts. Already-sent database mutations may still finish
  server-side. Draft preservation remains step 5; legacy local activity caches and
  preferences still require the step 6 storage review.
- Same-account refresh does not remount the data app. Auth callbacks schedule membership
  checks outside the SDK callback, unsubscribe during cleanup, and ignore stale results.
- Missing settings, invalid URLs and remote HTTP URLs show a setup error; loopback HTTP
  remains available for local Supabase development.
- Keep this branch local until staged RLS, audit and authenticated workflow checks pass.
  The existing live deployment remains unchanged; merging/deploying this gate before
  the RPC and permitted account are configured would deny the legitimate user's access.
