# Regression baseline — v1.8.1

This document preserves the historical step 1 baseline. Current results are recorded in the step additions below and the HTML tracker. Tests run against fictional, in-memory records and preserve correct-behavior assertions for defects awaiting repair.

## Run

Use Node 24 (see `.nvmrc`). On a fresh checkout:

```sh
npm ci
npx playwright install chromium
npm test
npm run build
```

Available commands:

| Command | Purpose |
|---|---|
| `npm test` | Store and Chromium baseline checks |
| `npm run test:store` | Store checks without a browser or server |
| `npm run test:browser` | Browser checks against an ephemeral localhost Vite server |
| `npm run test:strict` | All correct-behavior assertions enforced as ordinary failures |

The original baseline recorded **5 passes and 13 TODO failures across 18 tests**. TODO failures mean the recorded application defects still reproduce; they are not skipped assertions and are not production approval. Any unexpected test failure fails the command. An unexpected pass in a known-defect test also fails, prompting promotion to an ordinary regression test.

The original strict-mode run exited unsuccessfully with **13 failures**; current counts are recorded below. Use it while fixing defects. Once a behavior is repaired, remove the `knownDefect` wrapper and keep its correct-behavior assertion as a normal passing test. Do not weaken assertions to match the bug or add more TODOs to hide regressions.

## Isolation

- `helpers/mock-supabase.js` implements only in-memory query behavior. It does not import the Supabase SDK or open a network connection.
- The store loader rewrites imports in a disposable copy of `src/lib/store.js`. It never loads the real connection module; store-test `fetch` is forbidden.
- `vite.config.mjs` replaces the Supabase module and uses the fixture directory as its environment directory, so `.env.local` is not read.
- Every browser context blocks and records requests outside the test server's exact localhost origin; an attempted external request fails the test.
- Each test resets its fixture data/context. No remote server, public key or database password is needed.
- Test-only `window.__baseline` access is injected by the test Vite configuration. It is absent from normal development/production builds.
- These fixtures are not a PostgreSQL emulator. They cannot certify RLS, database transactions, server limits or genuine multi-device behavior. Those need a real staging database in a later authorized step.

## Captured defects

| Audit ID | Regression checks |
|---|---|
| C2 | Denied status, priority, score and group writes must reject and preserve prior state |
| C3 | Closing detail immediately must persist pending notes |
| C5 | Simultaneous status writes must retain both overrides |
| C6 | Malformed activity/Kanban storage and denied preference storage must remain usable |
| C7 | Scoped totals and workspace comparison must react to assignment changes |
| C8 | Failed parent deletion must preserve history |
| M6 | Action button must return to idle under StrictMode |

Passing controls cover normalized fixture loading, successful notes persistence, checked sprint rejection, every primary page, and create-form persistence. This scope is a starting baseline, not exhaustive coverage of the full audit.

## Preserved work and database status

Created branch: `codex/regression-baseline`, from commit `48acf68` (full commit recorded in the backup manifest).

Pre-change working-tree archive:

`/Users/dailoclaw/.codex/visualizations/2026/10/10/01a124e9-40ed-78c0-89e9-859b5e60fbe0/baseline-backup/ideas-webapp-pre-baseline.tar.gz`

SHA-256:

`5659c8917ae9b62b4f5937f05564e9cd27c97043ab446e3121b5edc61945f9b0`

The archive includes existing tracked source and untracked review files, including local SQL schema files. It excludes Git internals, dependency/build folders, credentials/environment files, deployment metadata and AWS configuration. The accompanying `manifest.json` records scope and exclusions. For recovery, verify its checksum and extract to a separate empty directory before copying selected files; do not blindly overwrite the working checkout.

**Live database backup and remote staging were explicitly deferred by the user.** The archive is a source backup, not a live data backup. Local fixtures do not contain real records. No production database, policy or deployment was changed. Before database repairs, arrange a real database backup with schema, rows, policies/grants and a verified restore into staging.

## Baseline verification

- Production build passes with the same JS/CSS asset hashes as v1.8.0.
- Existing `src/` and review files are checked byte-for-byte against the preservation archive.
- Baseline test mode reproduces known failures; strict mode demonstrates they remain unresolved.
- npm dependency advisory metadata is recorded separately in ignored `test-results/dependency-audit.json`; installation reported 13 advisories (3 moderate, 10 high). No automated upgrades were applied. Deduplicate/transitive advisory counts and assess actual exposure before planning dependency repairs.
- Generated test logs/results belong in ignored `test-results/`, not fixture source or production code.

## Step 2 additions — v1.9.0

At step 2, `npm test` ran 46 checks: 33 pass and 13 original known defects remain.
`npm run test:auth` runs 22 passing session/configuration checks. Six additional
browser checks exercise anonymous gating, credential failure/retry, unlisted accounts,
unavailable membership RPCs, session loss and settings sign-out. The existing baseline
counts above remain the historical step 1 result.

The auth fixture defaults to a fictional permitted account for existing workflow checks;
`?signedOut` starts auth tests without a session. The fixture RPC is only a boolean stub:
these tests do not validate JWTs, passwords against Supabase, or PostgreSQL RLS.
Account allowlist/RLS/audit enforcement still requires restored staging tests.

## Step 3 additions — v1.9.2

`npm test` now runs **74 checks: 68 pass, 6 known failures**. Strict mode reports
**68 passes and 6 actual failures**. Store/browser failure injection covers network
and zero-row responses in addition to permission denial. Failed primary writes do
not update state or log success activity; warnings distinguish a confirmed mutation
from failed history/activity/refresh. Partial batches retry only failed IDs.

Seven baseline failures are now passing regressions: status/priority/score/group
permission handling, concurrent override merging, safe parent deletion and StrictMode
action reuse. The six remaining defects concern immediate-close notes, storage and
stale summary membership. See `docs/RELIABLE_SAVES.md` for guarantees and limits.

## Step 4 additions — v1.9.3

`npm test`: **108 checks, 102 pass, 6 known failures**. `npm run test:database`
executes 20 ordinary passing checks against the actual migration in a disposable
PGlite PostgreSQL WASM instance. No real Auth identities, JWTs or Supabase database
are used. Ten new store and four browser checks cover transactional rollback, returned
IDs, lost-response replay, missing RPCs, conflicts and explicit empty-dataset behavior.
The earlier status/history-warning check now requires rollback of both tables.

The private RPC ledger fixture serializes mutations for UI testing; PostgreSQL tests
independently enforce the transaction contract. PGlite has one connection, so its
parallel request check does not simulate cross-session contention. Restored staging,
real JWT/RLS tests and multi-session acceptance remain deferred. See
[step 4 verification and rollout](../docs/TRANSACTION_INTEGRITY.md).

## Step 5 additions — v1.9.5

`npm test`: **131 checks, 126 pass, 5 known failures**. Immediate-close notes loss
is promoted to an ordinary passing regression. `npm run test:drafts` runs nine
controller checks without a browser/database. Six additional store and eight browser
checks cover serialization, waiting, refresh, dismissal/Edit, bounded score, failed
close/retry, account-scoped reload recovery and logout cleanup. See
[autosave guarantees and limits](../docs/SAFE_AUTOSAVE.md).

## Step 6 additions — v1.9.7

`npm test`: **147 checks, 145 pass, 2 known C7 failures**. Strict mode reports
145 passes and the same two actual failures. Three C6 tests now pass normally.
Ten adapter, four store and two browser checks cover blocked/quota storage,
cache validation, memory fallback, account isolation, deletion/logout cleanup
and healthy appearance reload. `npm run test:storage` runs the ten adapter checks.
See [storage guarantees and limits](../docs/STORAGE_RESILIENCE.md).

## Step 7 additions — v1.9.9

`npm test` and strict mode: **157 passing checks, zero known/TODO failures**.
Two C7 regressions are ordinary passing checks. Three scope/order checks and
seven browser checks cover summary/console map updates, shared workspace scope,
priority ordering, hidden selection/retry safety and triage counts. Passing
the baseline suite does not approve production; the remaining audit steps and
deferred real database acceptance still apply. See
[summary/workflow guarantees](../docs/SUMMARY_WORKFLOWS.md).

## Step 8 additions — v1.9.11

**180 ordinary passing checks; zero known/TODO failures.** Eight history/paging,
six store, five PostgreSQL and four browser checks cover complete paginated
exports, date boundaries, honest history, outbox replay and visible failure states.
Migration 003 executes in local PGlite only; real JWT/RLS, independent-session
contention and Supabase installation remain deferred. See
[history/export guarantees and rollout](../docs/HISTORY_EXPORTS.md).

## Step 9 additions — v1.9.13

**191 ordinary passing checks; zero known/TODO failures in strict mode.** Eleven
additional store/scoring/PostgreSQL/browser checks cover trimming, type/range
rejection, score reconciliation, prototype keys, ID ties, attribute placement,
unknown classifications and invalid sprint recovery. Existing unknown-workspace
browser coverage now also exercises the repair section. SQL 004 is tested only
in PGlite; real data preflight, legacy repair and Supabase rollout are deferred.
See [validation/planning rules](../docs/VALIDATION_RULES.md).

## Step 10 additions — v1.9.15

**201 ordinary passing checks; zero known/TODO failures in strict mode.** Six
application keyboard/contrast and four isolated review checks cover separate
controls, Enter form submission, tab semantics, modal isolation/restoration,
score disclosure, native advancement, supported-theme text, unique IDs, unsafe
hashes, tall slides, lightbox focus and blocked storage. Review fixtures use the
same controller as generators and do not require ignored HTML/assets. Real
screen-reader/browser-release acceptance remains release-gate work. See
[accessibility guarantees and review generation](../docs/ACCESSIBILITY.md).


## Step 11/12 additions — v1.9.19

205 ordinary strict checks pass without TODOs or skipped checks. Step 11 adds
parallel reads, lazy module reuse/error recovery and stable matrix-focus coverage.
Step 12 supports explicitly selected installed browsers:

```sh
npm run test:chrome  # installed Chrome, 62 browser/review checks
npm run test:edge    # installed Edge required; never falls back to Chromium
npm run build
npm run test:release # disposable optimized fixture build + default Chromium smoke
TEST_BROWSER_CHANNEL=chrome npm run test:release
TEST_BROWSER_CHANNEL=msedge npm run test:release
```

The release smoke builds into a unique temporary directory, never overwrites
`dist`, ignores `.env.local`, uses fictional records and blocks every non-local
request. It verifies real production assets exclude the fixture hook, then checks
optimized fixture navigation, lazy dialogs, keyboard capture, immediate-close
notes, CSV reconciliation, narrow doubled text and anonymous gating. Temporary
output/server/browser resources are removed afterwards. Existing untracked review
assets remain untouched. Do not deploy the temporary fixture build.

Installed Chrome 155.0.8059.39 passes all 62 checks and the compiled fixture smoke;
bundled Chromium 151.0.7922.34 passes all 205 checks and its compiled smoke. Edge
is unavailable on the current machine, so no Edge pass is claimed. Main's CI is
verified green at ab86823; the new smoke CI step is published at 0b9c0a9 and locally verified,
but its remote result is not yet verified. Live JWT/RLS and multi-session tests, actual
Supabase reconciliation, assistive technology and deployment/rollback acceptance
remain open. See [release decision](../docs/RELEASE_GATE.md).


## Local authorization continuation — v1.9.21 (current)

`npm run test:access` runs 26 SQL role checks against the real local 001b candidate.
The suite models unsafe legacy policies/table/column grants before installation,
then checks allowed application writes and denies protected/anonymous/private
access. Guards reject inherited privileges, owner/bypass roles, unsafe helpers
and missing tables. Per-test transactions and per-statement savepoints isolate
expected permission errors; no Supabase connection or real JWT is used. Bootstrap
fixtures now enable RLS, and the existing missing-RLS test explicitly disables a
fixture table to test the guard. Current full results are in the HTML tracker.
See [authorization candidate and limits](../docs/PRIVATE_DATASET_ACCESS.md).

### Canonical mutation audit — v1.9.23

`npm run test:audit` executes 22 local SQL tests for migration 005, using fictional identities in disposable PGlite. It verifies actual primary changes produce private canonical metadata atomically, server timestamps replace supplied times, no-op upserts do not add noise, replay is preserved, audit failure rolls back edit/deletion, deletion/account removal retain metadata, and clients cannot read or forge audit storage. Existing caller-reported timeline events remain separate. No real JWT, PostgREST, multi-connection, live migration or production approval is claimed. See [audit candidate and staging acceptance](../docs/TRUSTED_MUTATION_AUDIT.md).

### Full-audit regression guard — v1.9.24

`tests/dependencies.test.mjs` has 23 ordinary tests for scoped advisory review, feed failure, expiry, severity/range/chain changes and development-only installed paths. It uses preserved audit evidence and does not contact the network. `npm run check:dependencies` separately checks the actual live feed and is required in CI. Seven existing build findings remain unresolved; production audit and Tailwind migration acceptance remain separate requirements.
