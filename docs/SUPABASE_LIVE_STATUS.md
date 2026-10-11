# Supabase live inspection and backup preparation

Version 1.9.27 · 2026-10-11 · no database migrations applied.

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

The [runner](../scripts/backup-supabase.py) uses the observed session pooler host, port 5432 and project-specific postgres username. TLS uses `verify-full` with the system CA bundle. It asks for the existing database password through a hidden local prompt, passes it only in child-process environment, and does not put it in commands, logs or a credential file. It captures a consistent full-database custom archive and role definitions without role passwords, checks the archive listing and records file checksums. Each capture receives a fresh private directory. No restore, migration, grant or RLS change is executed.

Backup archives include sensitive database/Auth contents. `private-backups/` and `.local-tools/` are ignored by Git; directories/files use 0700/0600 permissions. Do not attach or publish these files. Dump failures preserve an incomplete manifest and private logs; a partial archive must not be treated as a verified backup.

Run in your own local Terminal:

```sh
python3 /Users/dailoclaw/.openclaw/workspace/projects/ideas-webapp/scripts/backup-supabase.py
```

Enter the **database password**, not your Supabase dashboard login password. The password is hidden. Computer-use access to Terminal is blocked, so the agent cannot open/operate that prompt for you. Changing a database password would also require you to perform the credential change yourself.

**Current status:** tools verified; password handoff pending. No live backup has been captured. Even a successful dump remains unverified until restoration into isolated staging is tested. Database archives do not include Storage file bytes or all platform/Auth provider settings; those require separate inventory/capture. Global roles and Supabase-managed objects must be reviewed before restoring; never replay a raw archive into production or blindly recreate managed roles.

## Next actions

1. User completes the hidden-password prompt; report only success or the non-secret error, never the password.
2. Review the private manifest/archive and captured scope. Inspect Storage usage and relevant Auth/platform configuration before claiming full recovery coverage.
3. Prepare an isolated staging project and compatible restore workflow; user enters any new credentials or approves paid options. Restore and verify records, identities, grants and configuration before database-changing work.
4. Inspect remaining live policies, owners, helpers, constraints and data-validation aggregates. Adapt the 001–005 candidates to the actual installation; preserve existing IDs/data.
5. Test real authorization/RPC/concurrency/audit behavior on staging. Coordinate production installation only after the reviewed gate passes.
