# Local private-dataset authorization candidate

Version 1.9.21 · 2026-10-11 · **Local only; not installed on Supabase**.

This continues the outstanding step 2/12 authorization work within the original 12-step plan. The user-deferred backup, restored staging and live deployment work remains deferred. Production is not approved.

## Changes and boundaries

`database/security/001b-private-dataset-access.sql` is a coordinated installation candidate for the confirmed single private dataset. Groups/workspaces classify ideas; they do not own separate datasets. Administrator-maintained membership controls the entire dataset.

| Surface | Permitted member | Anonymous / unrelated / missing identity |
|---|---|---|
| All six application tables | Read rows | Anonymous lacks grants; unrelated/missing identity reads return no rows |
| Idea descriptive fields, notes, score, priority, updated_at | Column-limited updates with confirmed returned rows | No matching updates |
| Idea ID/status/seed/version/original-ID/creation metadata | No direct update; status uses the existing transactional RPC | Denied |
| Idea creation | Existing `create_idea` RPC only | Denied |
| Deletion | User-added (`is_seed=false`) ideas only; existing cascades retained | No matching deletions |
| Workspace/sprint assignment | Upsert/delete with visible parent and existing FK/constraint checks | Rejected writes / no matching deletion |
| Status override, status history, activity | Read only; reviewed RPCs perform writes | Denied |
| Membership / request ledger / identity sequences | No direct client access or self-enrollment | Denied |

The candidate replaces existing policies on the six known tables, removes table **and column** grants to PUBLIC/anon/authenticated, enables RLS and grants only the paths used by the current app. It also removes leftover membership/ledger policies and client grants and revokes private-schema access. Existing owners and unrelated schemas/tables/functions are not rewritten. Membership helper ownership, SECURITY DEFINER and an empty search path are checked. Client membership in privileged/owner roles is rejected.

The final effective-privilege checks detect inherited grants that explicit revokes cannot remove. Such a mismatch aborts the transaction and requires inspection of the inherited role, rather than silently leaving protected fields writable or modifying unrelated roles. Candidate reinstallation does not reset identities, data or request ledgers. Ordinary table ownership/service administration is still privileged; this is not protection from an administrator.

Both historical bootstrap scripts now enable RLS instead of disabling it. New tables deny clients until reviewed policies/RPCs exist; rerunning those scripts does not intentionally reopen previously secured tables. This is a source change, not a change to a deployed installation. Legacy NULL seed flags are conservatively excluded from deletion; inspect and repair classification on staging rather than guessing they are user-added.

PostgreSQL treats privileges and row policies separately, and combines permissive policies using OR; an old permissive policy must not remain alongside membership checks. See [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html), [column privilege revocation](https://www.postgresql.org/docs/current/sql-revoke.html), and [Supabase RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Local evidence

`npm run test:access` executes **26 ordinary checks** in disposable PGlite using actual SQL, including dirty legacy policies/table/column grants, anonymous/unrelated/no-identity reads, allowed edits, protected-column denial, upserts, seed deletion, cascades, membership/ledger privacy, same-session revocation, RPC compatibility, bootstrap/reinstallation, inherited grants, privileged roles, sequences/truncate, unsafe helper paths and missing-table rollback.

SQL role changes and `auth.uid()` use fictional fixture identities. They do not verify Supabase JWT issuance, actual deployed inheritance/owners, PostgREST upsert SQL, pooled connections or independent-session concurrency. The complete strict suite passes all 231 checks, with zero failures, TODOs or skips. Lint, build, bundle budgets and the compiled fixture smoke also pass. See [recorded evidence](private-access-evidence-v1.9.21.json). The frontend/source bundle is unchanged by this continuation.

Published main CI at `be4c868` succeeded, including the new compiled fixture smoke: [exact run](https://github.com/dailoclaw/ideas-pipeline/actions/runs/38102902666). This local policy branch has not been pushed or run remotely.

## Audit trust still open

Direct client writes to status/history/activity are denied by this candidate. Create/status RPCs generate atomic server audit rows, and the supporting-activity RPC derives the actor from the authenticated account. However, supporting activity payloads and historical occurrence time are still caller-supplied, validated reports, and their persistence remains separate from the primary edit. The policy does not make them a verified atomic mutation audit. Browser-written `updated_at` is still accepted to preserve current edit/upsert payloads; it is not trusted server evidence. A coordinated trigger/RPC design for those remaining mutations is still required before claiming complete trusted audit coverage. Deletion cascades still remove parent history; retained deletion auditing/ledger retention needs an explicit rollout decision.

## Approved staging sequence when the deferral is lifted

1. Complete a verified live backup/restore and inspect the actual deployment, effective role inheritance, all table/column/sequence grants, owners, views, exposed schemas, RPCs, triggers and default privileges. This candidate covers known tables/private metadata; an unrelated exposed view or privileged public RPC could bypass it and must be reviewed separately.
2. Reconcile the actual schema and enroll the exact approved Auth account through an administrator. Confirm no client can assume owner/BYPASSRLS roles. Review the candidate's replacement of existing policies; do not apply it blindly to a project with other authorization needs.
3. For a fresh restored schema, the intended order is bootstrap → 001 membership → **001b access** → 002 transactions → 003 activity outbox → 004 constraints. Existing installations require an inspected, coordinated path: 002/003 are one-time migrations and must not be rerun. Do not reset generated IDs or execute seed initialization against a nonempty dataset.
4. Use a reviewed maintenance workflow so fail-closed installation gaps do not surprise the legitimate user. Test the exact PostgREST returning/update/upsert behavior and schema cache against these column grants. An authorization failure/zero-row result must remain a visible failed save; do not broaden grants to hide it.
5. Run real JWT anonymous/member/outsider/expired/revoked and raw bypass tests, including private schema, protected columns, forged audit data and independent-session races. Reconcile persisted rows and exports; complete the remaining supporting-mutation audit design and manual Edge/accessibility/recovery checks in [release acceptance](RELEASE_GATE.md).
6. Only then approve the coordinated frontend/database rollout. Keep RLS closed during recovery; do not return to legacy anonymous access, reset identities or discard deduplication records. Record actual installation/acceptance before marking steps 2 or 12 complete.
