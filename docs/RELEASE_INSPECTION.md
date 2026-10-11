# Read-only release security inspection

Version 1.9.26 · 2026-10-11 · local candidate only.

The Tailwind migration `6cb52ba113951a85960b2081714352ee1d33ca7c` is published to main and origin/main was verified; [exact-commit CI](https://github.com/dailoclaw/ideas-pipeline/actions/runs/38105773628) passed 281 checks. This subsequent work extends the original step 2/12 inspection preparation. Live backup and staging remain deferred; no SQL has been run against Supabase.

## Gap addressed

The original `inspect-access.sql` reports public tables/functions and basic trigger settings. It predates the private canonical audit. It does not show missing private audit objects, effective private column/sequence grants, audit-helper execution/ownership or required trigger timing and events. Reviewers could therefore miss a private grant inherited through another role, a disabled or absent canonical trigger, or an unsafe helper search path.

The new [inspection candidate](../database/security/inspect-release.sql) supplements that script. Its read-only transaction reports:

- Expected private membership, request ledger and canonical audit relations, owners and RLS flags, including missing objects.
- Effective anonymous/member/service-role schema, table and column privileges and inherited ownership access.
- Exact expected RPC/helper signatures, missing functions, definer mode, owner, settings and effective execution/ownership access.
- All eight required timestamp/audit triggers, including absence, enabled state, timing/events and bound function settings.
- Other primary-table triggers and private sequence privileges for interaction and bypass review.

This is administrator metadata, not a safe public endpoint. It returns no application rows, Auth identities, JWTs or function bodies. It does not automatically certify authorization: RLS policies, helper bodies, privileged roles, unexpected views/functions/default grants, service-role behavior, trigger ordering and real API behavior still need review. Run both inspection scripts, not this supplement alone.

## Local verification

Six ordinary tests execute the actual SQL in disposable PGlite databases: expected protected objects, missing roles/schema/functions, disabled/missing triggers, inherited column/sequence access, unsafe helper search path/inherited execution, and extra triggers with a fictional private row. The latter confirms row contents are not returned and inspection leaves the row and audit count intact. Each fixture is closed after testing. These are local metadata checks, not real JWT, PostgREST or separate-connection acceptance.

## When live work is authorized

1. Obtain the approved backup/restore and restored-staging workflow; do not run this candidate while the current deferral remains.
2. An approved administrator runs both read-only scripts on staging. Record the reviewed source version and date. Keep output private because role/owner and schema metadata describe the security boundary.
3. Investigate missing objects, unexpected relation types, inherited client access, callable private helpers, unsafe owners/settings and absent/disabled/unexpected triggers. Compare with the reviewed 001–005 candidates. Do not install or rerun candidates merely to make the report look clean.
4. Inspect helper bodies and all exposed views/RPCs separately in the approved workflow. Validate real anonymous, permitted, unlisted and revoked sessions, direct bypass attempts and persisted canonical rows.
5. Complete concurrency, audit retention/ownership, restore/recovery, installed Edge and manual accessibility evidence before approving deployment. This candidate records metadata; it neither installs changes nor approves a release.

[Structured local evidence](release-inspection-evidence-v1.9.26.json) records the published commit/CI and current 287-check local result. Lint, build, bundle budgets, compiled fixture smoke and the live dependency guard pass. The new inspection branch is not pushed.
