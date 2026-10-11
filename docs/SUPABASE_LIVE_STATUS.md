# Supabase live inspection and backup preparation

Version 1.9.31 · 2026-10-11 · live migration applied and SQL-role checks passed.

**Latest direction:** the user explicitly approved live migration without backup, then confirmed the concrete dashboard warning. This supersedes the earlier prerequisite/deferral notes below. No backup or restored staging exists.

The user authorized resuming live backup/staging preparation and read-only inspection of Ideas Pipeline, project `uooouxgdurhwzzszlngc`. The earlier deferral is lifted for that work. Safari's signed-in dashboard confirmed the project identity. Subsequent backup choice: CLI, with the user entering the existing database password locally.

## Confirmed live findings

Read-only PostgreSQL catalog queries, wrapped in `BEGIN TRANSACTION READ ONLY`, returned:

| Application table | RLS enabled | Policy count | Anonymous table read / write grants |
|---|---|---|---|
| idea_activity | No | 0 | Yes / Yes |
| idea_group_assignments | Yes | 1 | Yes / Yes |
| ideas | No | 0 | Yes / Yes |
| sprint_assignments | No | 0 | Yes / Yes |
| status_history | No | 0 | Yes / Yes |
| status_overrides | No | 0 | Yes / Yes |

Write-grant query checks whether *any* INSERT/UPDATE/DELETE privilege exists, not that all three exist. Grants alone do not prove row access where RLS is enabled; the one group-assignment policy has not yet been inspected. Disabled RLS plus anonymous grants on five tables confirms an access-control gap; raw API behavior has not yet been tested. No private application relations appeared in the `public`/`app_private` table inventory. Live PostgreSQL version: 17.6.

The dashboard shows a Free organization plan, no backups and no branches. The backups page explicitly states that Free does not include project backups. No upgrade, billing change, staging project or permission change was performed. Queries used catalog metadata only; no application row content was fetched. The unsaved SQL editor tab may contain the inspection query.

## Ready local backup route

Official Homebrew PostgreSQL 17.11 client bottles and dependencies were downloaded, checked against their published SHA-256 digests and extracted into ignored `.local-tools/homebrew`. Dump, restore and psql version checks pass. System Homebrew installation was unsuccessful because its directories were not writable; their ownership/permissions were not altered. A registry server package evaluated earlier is not used by the runner.

The [runner](../scripts/backup-supabase.py) uses the observed session pooler host, port 5432 and project-specific postgres username. TLS uses `verify-full` with the checksum-pinned official Supabase database CA. The earlier system-CA assumption caused two failed connection attempts and has been corrected. It asks for the existing database password through a hidden local prompt, passes it only in child-process environment, and does not put it in commands, logs or a credential file. It captures a consistent full-database custom archive and role definitions without role passwords, checks the archive listing and records file checksums. Each capture receives a fresh private directory. No restore, migration, grant or RLS change is executed.

Backup archives include sensitive database/Auth contents. `private-backups/` and `.local-tools/` are ignored by Git; directories/files use 0700/0600 permissions. Do not attach or publish these files. Dump failures preserve an incomplete manifest and private logs; a partial archive must not be treated as a verified backup.

Run in your own local Terminal:

```sh
python3 /Users/dailoclaw/.openclaw/workspace/projects/ideas-webapp/scripts/backup-supabase.py
```

Enter the **database password**, not your Supabase dashboard login password. The password is hidden. Computer-use access to Terminal is blocked, so the agent cannot open/operate that prompt for you. Changing a database password would also require you to perform the credential change yourself.

**Current status:** backup deferred again by user on 2026-10-11. Tools and corrected CA remain available; no password retry is currently requested. No live backup has been captured. Even a successful dump remains unverified until restoration into isolated staging is tested. Database archives do not include Storage file bytes or all platform/Auth provider settings; those require separate inventory/capture. Global roles and Supabase-managed objects must be reviewed before restoring; never replay a raw archive into production or blindly recreate managed roles.

## Earlier backup-first next actions (superseded for the authorized rollout)

1. User completes the hidden-password prompt; report only success or the non-secret error, never the password.
2. Review the private manifest/archive and captured scope. Inspect Storage usage and relevant Auth/platform configuration before claiming full recovery coverage.
3. Prepare an isolated staging project and compatible restore workflow; user enters any new credentials or approves paid options. Restore and verify records, identities, grants and configuration before database-changing work.
4. Inspect remaining live policies, owners, helpers, constraints and data-validation aggregates. Adapt the 001–005 candidates to the actual installation; preserve existing IDs/data.
5. Test real authorization/RPC/concurrency/audit behavior on staging. Coordinate production installation only after the reviewed gate passes.

## TLS failure and correction — v1.9.28

Two attempted captures on 2026-10-11 failed at `pg_dump` with `SSL error: certificate verify failed`. They remain incomplete; the logs do not show a password authentication result. The official [Supabase SSL guidance](https://supabase.com/docs/guides/platform/ssl-enforcement) requires its database CA for `verify-full`. The signed-in project settings Download certificate control identified the public official download URL. Certificate stored in `scripts/certificates/supabase-prod-ca-2021.crt`, SHA-256 `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`; Supabase Root 2021 CA, valid through 2031-04-26. It is a public CA, not a private key or credential.

A password-free PostgreSQL STARTTLS probe against the observed session pooler validates the certificate chain and exact hostname: verification OK, return code 0, process exit 0. No database login/query occurred in that probe. The runner retains full chain/hostname verification and rejects missing/changed CA bytes before asking for a password. Five ordinary backup tests pass. This establishes the TLS correction, not successful credentials, dump permissions, capture or restore acceptance. Retry the same local command above.

## Earlier user direction — backup deferred

The subsequent private log showed `password authentication failed` after TLS was corrected. The user requested skipping backup for now. No recovery archive is complete; previous partial captures remain incomplete. Continue only read-only inspection/preparation while recovery and restored staging remain unresolved. Database migrations and production approval are still pending. Earlier retry instructions above are historical and apply only if the user resumes backup.


## Applied live rollout — 2026-10-11

The user confirmed the final production execution after automatic approval review required action-time confirmation. Executed through the signed-in Safari SQL Editor in project `uooouxgdurhwzzszlngc`, as database administrator. Migration query ID `b275d35e-104a-452f-801b-68ab74602a4d`; independent verification query ID `6b6491dc-d271-4fc4-a663-ef6bf5c7ef4c`. The dashboard saved the executed migration snippet. This is a Dashboard SQL installation, not a Supabase CLI migration-history registration; do not blindly run the earlier candidates again.

Exact reviewed artifact: [one-shot live transaction](../database/live/2026-10-11-private-dataset-rollout.sql). It combines 001 membership, 001b six-table access, 002 atomic transactions, 003 retry outbox, a [legacy-compatible alternative to 004](../database/live/004-legacy-compatible-validation.sql), and 005 canonical audit. Lock timeout 5 seconds, per-statement timeout 60 seconds. PostgreSQL transaction rollback applies on any failure. A temporary before/after count and sorted-row digest comparison aborts the transaction if existing contents change, excluding only the newly added nullable activity request-ID column. This comparison is an integrity check, not a recovery backup.

Preflight found the group-assignment cascading foreign key and sprint-week CHECK missing. There were zero orphan groups or invalid sprint weeks, so both constraints were added and validated. All existing rows passed name, pitch, length, MVP, adjustment, group and override validation. Exactly 100 ideas had legacy time/platform classifications, including `2-3d` and `pay_modeller`. Their values were preserved. A BEFORE trigger validates every new idea and each changed classification field independently; unchanged legacy codes do not block notes, score or status work. Full classification cleanup/CHECK validation remains open and requires a reviewed mapping, not guessed replacements. Do not install the original 004 on top of this alternative.

The successful transaction reported unchanged existing contents across all six tables:

| Table | Preserved records | Existing contents unchanged |
|---|---:|---|
| ideas | 230 | Yes |
| idea_group_assignments | 55 | Yes |
| status_history | 82 | Yes |
| status_overrides | 32 | Yes |
| idea_activity | 23 | Yes |
| sprint_assignments | 0 | Yes |

A separate committed-session [read-only verification](../database/live/verify-private-dataset-rollout.sql) passed anonymous read denial, unenrolled authenticated empty reads, denied create/status/activity RPC calls, and private membership-read denial. Catalog results: 6 protected public tables, 0 anonymous table/column grants, 8 enabled canonical audit/stamp triggers, 1 enabled classification guard, 9 validated rollout constraints, maximum existing idea ID 411, 0 canonical audit rows. No synthetic user or application mutation was used for the live checks.

**Access is not yet usable:** `auth.users` has zero users and the private membership table has zero entries. Signing into the Supabase dashboard is separate from signing into the application. The user must create their application email/password account through Authentication → Users → Add user → Create new user, completing the new-password entry/submission themselves. After the exact intended Auth identity is confirmed, enroll that account in `app_private.idea_members` and verify actual login and permitted workflows. Do not enroll an inferred dashboard identity. Do not paste passwords into chat.

Eight new disposable-PostgreSQL rollout checks pass, including legacy edits, new invalid classification rejection, orphan rollback, denied roles, repeat-installation refusal and the post-installation SQL. Real JWT/PostgREST allow/deny, independent-session concurrency, browser persisted workflows, Edge/manual accessibility, recovery/staging and retention acceptance remain open. Production is not approved merely because the migrations are installed.

Applied SQL SHA-256: `a8a0a27d040cd526b0eb680ef7e1a18c895390f85bfbcff5af87f20ff6ec367b`.

Local verification: the 294-check strict suite passed, then the final eighth rollout check was added and all eight passed, covering 295 distinct passing checks. Lint and production build pass. The sandbox initially blocked browser startup; the isolated suite passed with approved local browser execution. No additional live API request occurred.


## Next access acceptance — v1.9.31

Migration source and evidence published and verified on main at `3b09808`. Refreshed Authentication → Users visibly reports **No users in your project**. The footer's estimated 10 is not the actual count and does not identify an account. Opened Add user → Create new user in Safari. Email/password fields are untouched and no account was submitted. Computer-use policy requires the user to complete new-password entry and submission. This is a prepared handoff, not finished authentication setup.

Seven live anonymous PostgREST GET requests used only the existing application browser public key. Each of the six table ID projections with `limit=0`, and argument-free `can_access_ideas`, returned HTTP 401 with PostgreSQL code 42501 (permission denied). No records were returned or changed. [Non-secret result evidence](live-anonymous-access-v1.9.31.json) records each endpoint/status and limits. Unlike the earlier SQL-role checks, this verifies real anonymous API denial; it does not verify permitted-user access or unrelated/revoked identities.

Next: user creates the intended application email/password user in the prepared form, identifies its email or Auth UUID without sharing the password, then exact account enrollment and real login/workflow acceptance can continue. Credentials and personal account identifiers must stay out of public tracker/Git evidence. No user is automatically enrolled simply because it is the only account or shares the dashboard email. No Auth settings were changed, no invitation sent and no synthetic account created.


## Intended identity clarification — v1.9.32

Authentication now visibly shows an account with an email different from the intended address. The user confirmed the intended address; it must not be substituted with the visible account. No membership enrollment or Auth credential change was performed. User-controlled creation of the intended email/password account remains the next handoff. Exact email and UUID stay out of public Git evidence. Browser interaction was interrupted by the user switching Safari tabs; no new creation form is claimed prepared in this continuation.

After creation, independently verify the exact identity before granting private-dataset access with action-time approval, then test actual login and permitted workflows. Earlier zero-user observations above are historical. Anonymous API denial remains verified; authenticated acceptance and production approval remain open.


## Intended account verified — v1.9.33

The intended Auth email and UUID are now visibly present in Authentication. Prepared a separate exact-account enrollment query with guards for confirmed email, no deleted account and no unexpected existing member. It is staged, not executed. Action-time approval is pending before granting dataset access. No credentials, membership or application records changed. Personal identifiers remain excluded from public repository evidence. Real login and authenticated workflow acceptance remain open.


## Approved enrollment applied — v1.9.34

User confirmed granting the exact verified account access at action time. Guarded enrollment query `af4e4bc1-ce2c-4785-b790-d939c3804e4f` succeeded, returning one dataset member and intended-member-only true. Independent read-only verification query `46eecbfb-b245-46fb-8603-99b5d925f494` asserted the enrolled SQL role sees 230 ideas and membership true; the existing unenrolled identity sees zero and membership false. Both assertions passed. Claims were set locally inside a read-only transaction and rolled back; this is SQL authorization evidence, not real JWT login. No application row or Auth credential was changed.

Started the local application at `http://127.0.0.1:5173/` and prepared its Safari sign-in screen against the live project. User sign-in handoff is pending; no password or token was captured. Vercel project inventory displays No Production Deployment for Ideas Pipeline; no deployment was created or promoted. Real API/browser workflow acceptance remains open. Private email/UUID values are omitted from public evidence.


## Real authenticated browser reads — v1.9.35

User completed real email/password sign-in in Safari. Observed authenticated local application against live Supabase: Kanban records loaded, Summary reports 230 ideas, Strategy 29 active ideas, Sprint 0 scheduled / 29 unscheduled, Groups view loads, and existing idea details/notes plus 11 recorded activity events load. No visible access error in reviewed views. Navigation and history reads only; no record mutation, password/token extraction or sign-out. This establishes permitted-user browser login/read acceptance, not persisted write, concurrency, unrelated/revoked JWT or deployment acceptance.

The application runs locally at `http://127.0.0.1:5173/`; the user supplied credentials directly to the application. Summary status counts observed: Building 1, Ready 12, Discovery 2, Ideas 14, Done 18, Shelved 183 (total 230). Legacy unknown duration/platform labels remain visible and are not silently normalized. No claim of full workflow or release approval follows from read-only acceptance. No password, JWT or personal identity is stored in public evidence.


## Live write and audit acceptance — v1.9.36

Step 2 live write acceptance: created isolated QA idea #412 through the real authenticated browser, then saved notes, priority and Researching status. Independent read-only database reconciliation verified persisted fields, two status-history rows, four activity rows and four canonical audits with enrolled actor, server timestamps and no duplicated note text. Six rollback-only SQL-role denial checks passed for protected status, public actor forgery, private audit read/forgery, unenrolled notes write and status RPC. Initial unrelated-account probe stopped because no second unenrolled Auth user was available; corrected checks explicitly use a simulated identity and do not claim unrelated JWT acceptance. QA-only permanent deletion confirmation prepared; cleanup approval pending. Existing 230 ideas were not edited. Other persisted workflows, real unrelated/revoked JWT, retention and release acceptance remain open.

[Non-secret reconciliation evidence](live-write-access-v1.9.36.json) records executed verification query IDs, counts and exact acceptance limits. Total ideas currently 231 including the pending-cleanup QA record; production readiness remains not approved.


## Approved QA deletion and retained audit — v1.9.37

User approved permanently deleting only QA idea #412 at action time. Deleted through the actual authenticated application. Independent read-only live SQL confirms 230 ideas, zero QA parent/history/activity rows, no QA rows in any of the five child tables, and five retained canonical audit rows including the enrolled actor and server timestamp on DELETE. Isolated live create, notes, priority, status and deletion acceptance now verified; original ideas were not edited. Remaining group/sprint workflows, real unrelated/revoked JWT, concurrency, retention and release acceptance remain open.

[Cleanup evidence](live-qa-cleanup-v1.9.37.json) records the independent read-only query ID and results. Earlier 231-row and pending-cleanup entries are historical; the current dataset has 230 ideas. No production-readiness approval is implied.
