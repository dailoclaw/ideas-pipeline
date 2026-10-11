# Step 12 — production release decision

Version 1.9.30 · 2026-10-11 · **NOT APPROVED / Not production-ready**.

The local repair work passes its current checks. Production approval remains withheld because critical database authorization and real integration evidence are missing. The user resumed live backup/staging preparation and read-only inspection on 2026-10-11; capture/restore and staging remain incomplete. The user subsequently approved and completed the live database migration without backup on 2026-10-11. See the current applied-rollout evidence below; this is not full production acceptance.

## Evidence and limits

Application source assessed: main `ab86823d2657af5645a8c93bff2deb4ef214a555`. Release test tooling and documentation were published to main at `0b9c0a9`; no application-source or database changes were made. The versioned evidence below preserves the local assessment at the time it was recorded. [Structured release evidence](release-evidence-v1.9.19.json) records versions, results, exact CI commit and open gates.

| Acceptance area | Verified | Still required |
|---|---|---|
| Authorization and failed writes | Local login/member allow/deny, missing RPC and revocation behavior; rejected/zero-row writes retain data and show failure. Disposable PostgreSQL tests enforce candidate RPC membership checks. | Real Supabase JWTs, deployed six-table policies/grants, raw-API bypass denial and trusted audit enforcement. Candidate 001 installs the membership gate; new 001b supplies local six-table policies, but no deployed acceptance is claimed. |
| Drafts and concurrency | Notes/score close, refresh recovery, failure/retry, account cleanup, local ordering and replay checks pass. Compiled fixture confirms immediate Escape persists notes. | Two independent database/API sessions, real lost-response replay and concurrent write/delete/status contention. Single-connection PGlite is not this evidence. |
| Summaries/exports and keyboard | Fixture reconciliation, pagination, timeline, scope, filters, native forms, checkbox separation, tab navigation, focus restoration and score disclosure pass. Compiled CSV contains the saved fictional capture and notes. | Reconcile all summaries/exports against persisted staging records, including legacy-data repair and date boundaries; manual screen-reader/zoom acceptance. |
| Browsers/build/dependencies | Node 24.21.0: lint, 287 strict tests (zero failures/TODOs/skips), build and bundle budgets pass. Installed headless Chrome 155.0.8059.39: 66 browser/review checks pass. Production-compiled fixture smoke passes in Chrome and bundled Chromium 151.0.7922.34. | Edge is not installed here. Actual deployed asset/cache behavior and installed Edge acceptance remain open. |
| CI | [Main CI run](https://github.com/dailoclaw/ideas-pipeline/actions/runs/38105773628) succeeded at `6cb52ba`, including all 281 published checks, compiled smoke, lint, build, budgets and production audit. | The subsequent release inspection candidate remains local, with no remote CI result; its six new tests are separate from published CI. CI success is not database or deployment approval. |
| Dependency exposure | [Full audit](dependency-audit-v1.9.25.json): zero. [Production audit](dependency-production-audit-v1.9.25.json): zero after the local Tailwind migration. | Tailwind migration and exact-commit CI are verified. Installed Edge remains open. Zero audit findings do not prove application security. |

`npm run test:release` checks the real `dist` assets for accidental fixture-hook inclusion, then builds a separate optimized fixture application into an automatically cleaned temporary directory. It cannot access the live database. This checks production bundling and UI behavior, not real Supabase integration. The normal production output is not overwritten. The test's bundle target matches the explicit Chrome/Edge 120+ target; installed-browser execution is still required for browser acceptance.

## Local authorization continuation

A six-table membership/column-grant candidate and fail-closed legacy bootstraps are now prepared with 26 local role checks. See [private-dataset access](PRIVATE_DATASET_ACCESS.md). Authorization candidate 001b is published at a345f57; main 05b4968 CI is verified green, including compiled smoke. Published [candidate 005](TRUSTED_MUTATION_AUDIT.md) adds private atomic canonical primary-change metadata, server timestamps and retained deletion evidence, tested locally with 22 SQL checks. UI supporting-event payload/time remains caller-reported and separate. Real JWT/staging, audit retention/owner/trigger review and rollout acceptance remain open. The previous versioned release evidence is historical, not an approval of these new changes.

## Critical blockers — address first

1. **Backup and staging are incomplete.** The user authorized resuming preparation/inspection and selected a local hidden-password CLI workflow. The user explicitly authorized and confirmed migration without backup; migration is now installed. Recovery remains unverified, and backup/staging acceptance remains open. Capture schema, rows, policies/grants, functions/triggers, sequences and configuration; restore into an isolated staging project and verify counts/identities. A source archive is not a database backup.
2. **Full database authorization is unfinished.** Inspect the deployed schema using the read-only [inspection candidate](../database/security/inspect-access.sql) in the approved workflow. Complete administrator-only membership and reviewed RLS/grants for all six tables. Deny anonymous, unlisted and revoked identities; deny direct create/status/audit bypasses and client-written trusted actors/times. Verify security-definer owners, locked paths, schemas/views/sequences and public RPC execution. Legacy source bootstraps now enable RLS; actual deployed schema and prior installation paths must still be inspected. Do not run them as a shortcut.
3. **Matching database/frontend integration is unverified.** Coordinate candidates 001–005 against the inspected staging schema, not blindly against assumed tables. Run legacy-data preflight/repair, preserve IDs, install identity/RPC/constraint changes once and confirm actual PostgREST signatures/cache. Exercise create, status, edit, notes, score, priority, group, sprint, deletion, outbox retry and exports through real authenticated API clients. Compare persisted parent/history/activity rows; a missing RPC must remain a visible failure, not a fallback to unsafe writes.

Detailed acceptance matrices and migration limits remain in [database access](DATABASE_ACCESS.md), [transactions](TRANSACTION_INTEGRITY.md), [history/exports](HISTORY_EXPORTS.md) and [validation](VALIDATION_RULES.md). Those steps remain open; this verdict does not relabel them complete.

## Step-by-step acceptance and rollout plan

1. Finish the three critical blockers above on restored staging; record the approved project, operator, source/migration versions, test date and results without secrets or private idea content.
2. Test allow/deny with real anonymous, permitted, unlisted, expired and revoked sessions using raw API calls as well as the UI. Attempt forged actor/timestamps, forbidden columns, direct audit insertion and private-ledger access. Inspect persisted rows after each failure; deny results must never be mistaken for a successful no-op.
3. Use two independent connections for simultaneous creates, duplicate UUID retries, competing statuses and deletion-versus-update. Force audit errors and lost responses; verify rollback, deduplication, predecessor history and conflict recovery. Test close/refresh/logout during draft and outbox saves. Reconcile counts, status, history, CSV and Markdown against the resulting persisted records.
4. Run `npm ci`, `npm run lint`, `npm run test:strict`, `npm run build`, `npm run check:bundle` and `npm run test:release` under Node 24. Confirm the exact candidate commit's remote workflow succeeds, including the added smoke step. Keep all failures ordinary; never waive a TODO failure as release approval.
5. On machines with supported installed browsers, run `npm run test:chrome`, `npm run test:edge`, and the compiled smoke with each explicit `TEST_BROWSER_CHANNEL`. Check narrow/desktop screens, normal and actual browser-toolbar 200% zoom, four themes and both modes. Headless doubled-root-text checks are useful evidence, not browser zoom certification. Manually exercise VoiceOver/NVDA controls, error announcements, focus containment/restoration and score explanations using the [accessibility checklist](ACCESSIBILITY.md).
6. Agree a safe deployment and recovery plan for the matching frontend/database contract. Confirm public frontend configuration, provider settings, HTTPS and asset caching. Keep older hashed lazy chunks available across rollout or verify stale-client recovery. Rehearse recovery on staging: retain closed authorization, identity allocation and deduplication ledger; select a frontend version compatible with the secured database. Do not reopen RLS/grants, reset IDs or drop ledger history to accommodate an old client. Verify backup restore into another isolated database and reconcile any post-backup writes before choosing recovery.
7. Record the final gate decision against the exact candidate versions only after those acceptance results pass. Deployment requires the user's authorization and an approved destination/workflow. Recheck deployed login, denied raw access, a designated test record, history/export and lazy-view loading; record rollback readiness. Completion of the tracker does not itself deploy anything.

## Work that can follow correctness/security acceptance

- Review/publish the completed local Tailwind migration, verify its CI and maintain dependency checks.
- Review build-input and development-server exposure whenever CI or build configuration changes.
- Consider additional view/data memoization only with profiling evidence; current initial bundle budgets already protect the measured reduction.
- Historical documentation and the unused known-defect helper can be archived after deciding how to preserve the original baseline. They are not runtime release blockers.

**Final verdict:** local behavior and published main CI are passing. Production remains **Not Ready** until real authorization/integration, backup/restore, Edge, manual accessibility and safe rollout evidence pass. No live operation or deployment was performed, and step 12 remains in progress.

## Historical local dependency guard continuation — v1.9.24

The audit candidate was pushed at 05b4968; its full 253-check CI is verified green. [Dependency review](DEPENDENCY_REVIEW.md) now records seven unresolved build findings, zero production-only findings, no compatible patched chain and a new local full-audit CI guard with 23 tests. The guard rejects new/worsened findings, failed feeds, production-path exposure and an expired explicit review; it is not vulnerability remediation or production approval. The Tailwind migration and existing live/Edge/manual acceptance gates remain open.

Then-local verification: all 276 strict tests, lint/build/bundle budgets, compiled fixture smoke and actual full-audit guard pass. [Recorded guard evidence](dependency-guard-evidence-v1.9.24.json) distinguishes these local results from the published main 253-check CI.

## Local Tailwind migration — v1.9.25

Published guard commit 4e2ff2b has green 276-check CI. Subsequent local migration removes the seven affected build packages: recorded full/production audits both zero. Local lint, 281 strict checks, build/budgets, compiled fixture smoke, 66 installed Chrome checks and the dependency guard pass. Visual coverage and limits are recorded in [migration evidence](TAILWIND_MIGRATION.md). This candidate is not pushed; Edge/manual acceptance and all deferred live database gates remain open.

## Local release inspection — v1.9.26

Tailwind migration 6cb52ba is now published with green 281-check CI. [Read-only inspection preparation](RELEASE_INSPECTION.md) adds private ledger, inherited grant, helper and audit-trigger metadata checks, verified with six disposable-database tests. Current local total is 287 strict checks; lint/build/budgets, compiled smoke and dependency guard pass. The inspection candidate is unpushed and has not run against Supabase. All live/Edge/manual release gates remain open.

## Live inspection / backup handoff — v1.9.27

[Current live findings](SUPABASE_LIVE_STATUS.md) confirm five public tables with RLS disabled and anonymous grants. Backup/staging preparation is now authorized, but no archive has been captured or restored and no staging project exists. Official PostgreSQL clients and the hidden-password runner are ready; three mocked security/failure tests pass. User local password entry is required. No live migrations or production acceptance occurred. Earlier deferral notes in this document/versioned evidence are historical.

Backup update v1.9.28: two captures failed before authentication because system CA trust did not include the required Supabase database CA. The corrected, pinned official CA passes a password-free chain/hostname probe; five backup tests pass. Capture/restore and staging still await the local hidden-password retry. No migration or release approval.

Latest direction v1.9.29: user deferred the unsuccessful backup again after password authentication failed. Read-only inspection can continue; no recovery copy/restored staging exists and no live migrations are applied. Earlier password-handoff instructions are historical. Production NOT APPROVED.


## Latest live database result — v1.9.30

[Live rollout evidence](SUPABASE_LIVE_STATUS.md#applied-live-rollout--2026-10-11) records the user-approved no-backup transaction, exact SQL artifact/digest, six-table record preservation and independent SQL-role denial checks. RLS/grants, atomic create/status/outbox RPCs, server audit/stamps and nine compatible validated constraints are installed. Legacy classifications were preserved with field-change validation rather than a CHECK that would break unrelated edits. Earlier candidate-only installation statements above are historical.

There are zero application Auth users/members. Create and enroll the intended email/password identity before asserting permitted workflow acceptance. No real JWT/API positive test, independent-session concurrency, backup/restore/staging, classification cleanup, Edge/manual accessibility or deployed frontend acceptance is claimed. The user override authorizes this migration; it does not convert missing recovery or integration evidence into a passed production gate.
