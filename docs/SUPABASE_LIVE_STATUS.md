# Supabase live inspection and backup preparation

Version 1.9.30 · 2026-10-11 · live migration applied and SQL-role checks passed.

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
