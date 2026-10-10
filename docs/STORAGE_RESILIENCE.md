# Step 6 — configuration and storage resilience

Verified locally in v1.9.7. No Supabase migration, live backup, staging copy or deployment was performed.

## Behavior

- The existing authentication gate validates URL/key configuration before mounting App. Missing, malformed or insecure configuration and SDK construction failures produce a setup error instead of protected queries. These checks remain covered by the 22 authentication tests.
- `src/lib/storage.js` accesses browser storage lazily and guards reads, writes, deletes, JSON parsing and serialization. Failed writes keep the newest value in memory; a later successful write can persist it. Failed deletes use a memory tombstone so an older disk value is not immediately resurrected.
- Theme, font, layout, Kanban sorts, duration preferences, drafts and pending activity use account-scoped keys. Only harmless legacy appearance preferences are used as defaults. Unowned legacy activity is removed on account setup; it is not assigned to the current user. Legacy unowned Kanban/duration data is not imported.
- Validators allow only known appearance/sort choices, positive safe idea IDs, bounded integer durations (1–8), bounded score drafts (-99–99), and activity events with valid dates and type-specific payloads. Malformed or unexpected containers are discarded safely. Validation of database rows and business rules belongs to later steps.
- Confirmed deletion removes that idea's drafts, local activity and duration preference. Sign-out/access loss attempts removal of the current account's drafts and pending activity before the existing full-page reload clears application memory. Appearance preferences remain available to that account.
- Drafts use the same adapter but still report failed durable persistence to the user. A memory fallback does not claim refresh-safe recovery.

## Verification

`npm test`: **147 checks, 145 pass, 2 recorded C7 summary failures, zero unexpected failures**. Strict mode reports those two failures as actual failures; neither is accepted as release approval. The three original C6 storage failures are ordinary passing regressions.

Sixteen additional checks cover lazy property-access denial, read denial, quota errors, stale-value suppression, required draft persistence, invalid JSON/serialization, fresh-instance reads, allowlists, numeric bounds, event payloads, namespaces, account isolation, deletion/logout cleanup and browser appearance changes/reload. Existing draft checks still pass. Production build passes.

All browser tests use Chromium and fictional local fixtures, block non-local requests and exercise the actual React application. Tracker preview is checked at 1440, 768, 390 and 320 pixels in light/dark modes. Installed Chrome/Edge and real Supabase acceptance remain part of the release gate.

## Limits and remaining work

Memory fallback lasts only in the current application realm. When storage denies deletion, disk removal cannot be guaranteed; tombstones suppress stale reads for the session only. Browser storage is neither encrypted nor an authorization boundary. Account prefixes prevent accidental mixing, not access by scripts executing on the same origin.

The existing pending activity cache still keeps at most 100 events and does not implement durable replay or export. Step 8 will address retention/reconciliation. Local caches are not database backups. Live authorization, transaction rollout and staging tests from steps 2/4 remain deferred by user instruction.

## Repeat verification

1. Run `npm test`; expect 145 passes and only the two named C7 defects.
2. Run `npm run test:strict`; expect the same 145 passes and those two actual failures.
3. Run `npm run build`.
4. In the isolated fixture browser, deny `Storage.getItem` and `setItem`, open Customise, change visual system/text size and navigate Summary. Verify no blank screen or runtime error.
5. With normal storage, change appearance and reload; verify the account-scoped values return. Insert malformed/null cache values and reload/open an idea; verify it remains usable.
6. Review the tracker and deferred database prerequisites before claiming production readiness.
