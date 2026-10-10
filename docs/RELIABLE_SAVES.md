# Step 3 — confirmed saves (v1.9.2)

Completed locally on `codex/reliable-saves`. No SQL was applied to a live database.
The application remains **not production-ready** while authorization, IDs/transactions,
drafts, storage and release acceptance are open.

## Behavior

| Result | Application behavior |
|---|---|
| Confirmed primary write | Use returned values in state; then record history/activity |
| Permission/network error or no matching returned row | Preserve prior state, show an inline error and Retry |
| Missing local idea | Reject visibly; do not silently resolve |
| Another save pending for this idea | Disable related controls; reject duplicate requests with recoverable feedback |
| Partial batch | Wait for all requests, retain confirmed successes, report counts and retry only failed IDs |
| Write committed but history/activity failed | Keep the saved change and show a synchronization/history warning |
| Write committed but refresh failed | Keep confirmed state and app shell; offer a read-only refresh |
| Notes/score write failed | Keep editable draft and offer retry using the latest visible value |
| Parent delete failed | Keep parent and child history intact |

The store confirms returned IDs for inserts/updates/upserts and checks delete results.
Clearing an already-absent assignment is explicitly idempotent; zero-row parent deletion
is not accepted as success. Required secondary reads now check errors before replacing
state. Optional activity fallback remains local and is identified as unsynchronized.

Status changes persist before logging history, reducing false success events. They are
still separate requests; transaction guarantees and trusted server audit belong to steps
2/4. A history warning cannot reconstruct a missing record simply by refreshing. The
activity outbox still needs step 8 replay/retention work.

## Verification

- `npm test`: **74 checks, 68 pass, 6 known failures, zero unexpected failures**.
- `npm run test:strict`: intended correct-behavior assertions still fail for those six
  defects; this suite is not a production acceptance pass.
- Production build and JavaScript syntax checks pass.
- 28 new checks cover denied/network/zero-row writes, missing ideas, failure after commit,
  background read failure, partial-batch retry, duplicate-save guards, effective reset
  status and visible retry across detail/strategy/triage/create/delete workflows.
- Seven original failures are promoted to ordinary passing regressions: four denied
  mutations, concurrent override merging, safe parent deletion and StrictMode reuse.
- Tests use fictional in-memory fixtures and Chromium with external requests blocked.
  Fixtures do not certify actual PostgreSQL constraints, RLS, transactions or transport
  behavior. Parent cascades follow supplied SQL; verify deployed constraints on staging.

## Remaining limits

Immediate-close notes loss, malformed activity/Kanban storage, blocked preference
storage and stale summary membership are the six remaining recorded failures.

Same-idea conflicts are rejected with retry rather than queued. Database-generated IDs,
multi-device concurrency and atomic status/history mutations remain step 4. A transport
error may be ambiguous after the server commits; database idempotency remains necessary
before claiming safe replay of every create request. Post-save background refreshes no
longer replace the app shell; general refresh and debounce ordering still need step 5.

The HTML tracker preserves historical baseline counts separately from current results.
The next planned work is step 4; deferred live authorization stays visible in step 2.
