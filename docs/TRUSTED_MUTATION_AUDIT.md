# Trusted mutation audit — local candidate

Version 1.9.23 · 2026-10-11 · **Not installed; production not approved**.

This continues the original step 2 audit requirement and step 12 release gate. Live backup, restored staging and Supabase changes remain deferred by the user. No step is marked complete on the strength of this candidate.

## What changes

`database/audit/005-trusted-mutation-audit.sql` is a one-time candidate after reviewed migrations 001, 001b, 002, 003 and 004. It adds server timestamp and canonical change triggers to ideas, status overrides, group assignments and sprint assignments. These four tables contain the primary mutations; existing create/status RPCs continue writing their transactional history and UI activity.

A private `app_private.idea_change_audit` stores the source table, operation, idea ID, authenticated actor UUID, server occurrence time, actual changed field names and selected operational before/after values. The trigger reads database OLD/NEW rows, rather than trusting a browser's claimed changes. `updated_at` is generated on the server for genuine changes, including INSERT/upsert; a no-op UPDATE retains the old time and produces no audit noise. Existing returning-row writes receive the server timestamp without a frontend payload change.

The canonical insert occurs inside the primary mutation transaction. An audit error aborts the write, and a transaction rollback removes both. Existing create/status request replay returns the original result without repeating canonical changes. A repeated assignment upsert with unchanged business values creates no extra audit record.

There is no parent or Auth foreign key on this audit table. Actual idea deletion, assignment cascades and subsequent account deletion retain the metadata. Assignment rekeying records both parent IDs; the indexed `idea_id` denotes the new parent, with the old ID in `before_values`.

## Privacy and trust boundaries

- Clients have no schema/table/column/sequence access or callable helper access. RLS has no client policies. The audit function uses SECURITY DEFINER with an empty search path and qualified objects; the timestamp function requires no elevated privileges. Installer/source ownership and inherited privilege checks fail closed.
- Only operational values are retained: IDs, status, seed/version/original ID, score, priority, group and sprint. Free-text contents, including name, pitch and notes, are omitted. Their changed field names remain, so same-length and NULL/empty edits are visible without copying content. This is change metadata, not a recoverable copy or proof of a particular note's contents.
- `auth.uid()` supplies the actor. Administrative changes without a JWT have a NULL actor rather than invented user attribution. Supabase JWT authenticity and actual privileged administration remain rollout concerns. A trusted owner/service administrator can alter data, disable triggers or alter audit storage; this is not tamper-proof protection from administrators.
- The public UI activity timeline remains caller-reported supporting activity, including its historical times. A fabricated activity report does not create a canonical mutation entry. This candidate deliberately does not present the old timeline as canonical, expose the private audit through a new API, backfill unverifiable events, or duplicate timeline rows. A future UI audit viewer would require its own reviewed access contract.
- New audit rows have no retention job. Before installation, approve retention/storage limits and operational access. Row conversion adds per-mutation work proportional to row size and one indexed insert per changed primary row; deleting an idea also records each existing assignment/override cascade. Benchmark realistic notes and bulk operations on staging. The existing constraints bound new input, but legacy oversized rows still need inspection.

The trigger implementation follows [PostgreSQL's row-change audit pattern](https://www.postgresql.org/docs/current/plpgsql-trigger.html); helper privilege and search-path choices follow [SECURITY DEFINER guidance](https://www.postgresql.org/docs/current/sql-createfunction.html).

## Evidence and limits

`npm run test:audit` runs 22 ordinary tests against actual SQL in disposable PGlite: actor/time derivation, no-op preservation, group/sprint writes and upserts, deletion/account retention, primary/audit rollback, denied client access, revocation, create/status replay, seed overrides, fabricated activity separation, administrator attribution, one-time installation, missing prerequisites, assignment rekey, NULL/empty notes and helper security.

These use fictional identities, not real JWTs, PostgREST or independent concurrent connections. They establish local SQL behavior and compatibility with existing RPCs, not live enforcement. The full regression results and recorded main CI are in [evidence](trusted-audit-evidence-v1.9.23.json). Earlier versioned evidence remains historical.

## Installation and verification when deferral is lifted

1. Verify live backup/restore and inspect actual schema, owners, inherited grants, triggers, exposed views/RPCs, helper bodies and identity configuration. Confirm all earlier reviewed prerequisites. Do not run source bootstraps against a live dataset as a shortcut.
2. Approve private audit retention, authorized operator access and expected administrative NULL-actor handling. Confirm the distinction between UI timeline reports and canonical metadata with acceptance reviewers.
3. On restored staging, install 005 once in a reviewed maintenance transaction after the other migrations. Existing audit objects intentionally cause failure; never drop history to make a rerun succeed. The candidate neither rewrites old data nor certifies historical events.
4. Use real member/outsider/anonymous/revoked JWTs and raw API requests to test returning updates, timestamp forgery, no-op upserts, protected/private access, create/status replay, assignment moves, deletion cascades and account removal. Inspect canonical rows administratively and reconcile them with actual primary rows. Verify owner and service-role behavior explicitly.
5. Inject an audit failure in disposable staging, confirm the entire edit/delete/RPC rolls back and the UI retains drafts with a visible failed save. Test two independent sessions and lost responses. Observe how additional deployed triggers interact and ensure none can mutate data after canonical capture or bypass it.
6. Measure write latency/audit growth and verify backup/restore retains audit rows and identities. Rollback planning must preserve closed authorization and retained evidence; disabling audit triggers is not a verified recovery plan. Complete remaining Edge/manual accessibility and deployment acceptance before approving production.
