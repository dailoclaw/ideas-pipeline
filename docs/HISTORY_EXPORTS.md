# Step 8 — trustworthy history and exports

Local implementation verified in v1.9.11. Source pushed to main at ff1c366 by request; remote verified. Migration 003 is a rollout candidate, not installed in Supabase. Live backup/staging, authorization and transaction prerequisites remain deferred by user instruction.

## Behavior

- Console Activity has no fabricated snapshot events. Detail timelines no longer invent creation events from an added date. Legacy status rows retain date-only precision; their predecessors are computed before deduplication. Each rich transition suppresses at most one matching legacy row, preserving repeated transitions. Counts use the merged, validated timeline and disclose filtered versus total counts.
- Shared decision types drive timeline filters and momentum. Local calendar-day boundaries handle Adelaide midnight/DST, and future/invalid timestamps do not count. Future pending timestamps remain queued with a visible server rejection, rather than being silently deleted. Legacy date-only records cannot reveal precise event times; same-day rich/legacy matching is best-effort.
- All six tables load by ascending unique primary key, seeking past the previous page until an empty response. A smaller server cap does not terminate pagination. Invalid/nonadvancing pages or late errors discard partial accumulation. Failed refresh preserves the last confirmed dataset and explicitly marks it incomplete. Optional history failure preserves the application with an incomplete-history warning.
- CSV and workspace Markdown perform a fresh paginated load before downloading. Incomplete required data or remote history blocks export with visible retry. CSV contains every loaded idea and current assignments/history, with pending activity annotated. JSON export preserves pending outbox entries and their retry tokens; it is an archive, not an import/replay interface.
- Pending activity uses stable UUIDs, account-scoped guarded storage and one synchronization worker. A lost acknowledgement retries the same UUID. Migration 003 uses the private request ledger from migration 002 to serialize/replay requests and returns the same committed activity row. Conflicting payload reuse is rejected. Actor identity comes from Auth; timestamps/payloads are validated. Create/status audit stays with its existing atomic RPCs.
- The buffer holds 100 pending events. At capacity it preserves all existing entries, exposes a full-buffer error and declines to queue the additional event; the already-confirmed primary mutation remains saved with a history warning. Retry and pending JSON export are visible. Failed browser persistence is explicit and only retains memory until reload. Sign-out still clears current-account pending history under the step 6 privacy policy; the notice explains this and offers export first. Denied deletion cannot guarantee disk erasure.
- Deletion removes queued idea events; late synchronization cannot recreate a deleted idea's UI history. Account changes stop subsequent worker writes. Already-issued requests cannot be cancelled. The RPC ledger intentionally survives parent deletion to prevent re-insertion on replay.

## Verification

**180 ordinary passing checks, zero known/TODO failures.** Added eight history/paging checks, six store checks, five PostgreSQL checks and four browser checks. Coverage includes 1,203 CSV records under a 37-row cap, incomplete data, repeated legacy transitions, Adelaide midnight/DST, future/non-decision events, lost-response and parallel retry, mixed legacy tokens, full buffer, honest empty states and blocked downloads. Production build and desktop/mobile tracker/history checks pass.

PostgreSQL tests execute the actual SQL in disposable PGlite with fictional identities. Browser fixtures block external requests. Neither test authenticates with Supabase, verifies installed Chrome/Edge or simulates independent PostgreSQL sessions.

## Deferred rollout and limits

1. Obtain the approved live backup and restored staging environment.
2. Complete step 2 six-table RLS/grants and install/verify migrations 001/002 first. Migration 003 checks prerequisites and aborts on repeat install; run it once through the administrator workflow after inspecting the deployed schema.
3. Verify allowed/denied real JWTs, revoked account replay, independent-session retries, lost responses and full-buffer recovery against Supabase. Confirm old pending archives are reconciled. Legacy created/status outbox claims are deliberately rejected by this RPC; archive/reconcile them rather than forging server decision audit.
4. Keep frontend/database rollout coordinated: without RPC 003, secondary activity remains pending and visible; it never falls back to duplicate-prone direct inserts. Create/status still require migration 002.
5. This RPC makes secondary activity retry idempotent; it does not make each primary mutation plus secondary event atomic or prove client payload claims match previous database values. Trusted audit for all mutations remains step 2 work. Data loads span separate queries, not one database snapshot; concurrent remote changes still require release acceptance and reconciliation. Pagination prevents row-cap truncation but is not a backup.
6. No automatic outbox replay occurs during startup; restored events await explicit Retry activity sync. Normal online mutations attempt synchronization. If more than 100 events arrive during one worker run, another explicit retry drains the remainder.

Repeat locally with `npm test`, `npm run test:strict` and `npm run build`. Review the current HTML tracker before claiming release readiness; steps 9–12 and deferred database acceptance remain open.
