# Supabase live inspection and backup preparation

Version 1.9.29 · 2026-10-11 · no database migrations applied.

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

## Next actions

1. User completes the hidden-password prompt; report only success or the non-secret error, never the password.
2. Review the private manifest/archive and captured scope. Inspect Storage usage and relevant Auth/platform configuration before claiming full recovery coverage.
3. Prepare an isolated staging project and compatible restore workflow; user enters any new credentials or approves paid options. Restore and verify records, identities, grants and configuration before database-changing work.
4. Inspect remaining live policies, owners, helpers, constraints and data-validation aggregates. Adapt the 001–005 candidates to the actual installation; preserve existing IDs/data.
5. Test real authorization/RPC/concurrency/audit behavior on staging. Coordinate production installation only after the reviewed gate passes.

## TLS failure and correction — v1.9.28

Two attempted captures on 2026-10-11 failed at `pg_dump` with `SSL error: certificate verify failed`. They remain incomplete; the logs do not show a password authentication result. The official [Supabase SSL guidance](https://supabase.com/docs/guides/platform/ssl-enforcement) requires its database CA for `verify-full`. The signed-in project settings Download certificate control identified the public official download URL. Certificate stored in `scripts/certificates/supabase-prod-ca-2021.crt`, SHA-256 `700723581420dd1ac98fd7e9ac529f0ef210eadcaf87fc868a3ad7d114c2f3b7`; Supabase Root 2021 CA, valid through 2031-04-26. It is a public CA, not a private key or credential.

A password-free PostgreSQL STARTTLS probe against the observed session pooler validates the certificate chain and exact hostname: verification OK, return code 0, process exit 0. No database login/query occurred in that probe. The runner retains full chain/hostname verification and rejects missing/changed CA bytes before asking for a password. Five ordinary backup tests pass. This establishes the TLS correction, not successful credentials, dump permissions, capture or restore acceptance. Retry the same local command above.

## Latest user direction — backup deferred

The subsequent private log showed `password authentication failed` after TLS was corrected. The user requested skipping backup for now. No recovery archive is complete; previous partial captures remain incomplete. Continue only read-only inspection/preparation while recovery and restored staging remain unresolved. Database migrations and production approval are still pending. Earlier retry instructions above are historical and apply only if the user resumes backup.
