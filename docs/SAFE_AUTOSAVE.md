# Step 5 — safe detail autosave (v1.9.5)

**Verified locally.** Notes and score drafts now belong to the store/controller rather
than the detail modal. No database migration is needed for these paths, but the
published step 4 create/status functions still require their deferred backend rollout.
Step 5 is committed locally on `codex/safe-autosave`; it is not pushed or deployed.

## Behavior

- Typing updates an account-scoped draft immediately and stores its dirty value in
  guarded browser storage. Notes debounce for 800ms and score for 600ms. The controller
  survives modal unmount; timers no longer capture component state or vanish on close.
- One worker per idea serializes notes and score saves. It waits for other pending
  same-idea mutations rather than rejecting an autosave because a priority/status save
  is in progress. Edits made during an older save stay visible and save after it finishes.
  An old response cannot mark newer text as saved. Repeated flush calls share the worker.
- Close, Escape, backdrop dismissal and Edit await a flush. On failure, the modal stays
  open with the exact draft, **Not saved** and retry controls. Edit opens with the newly
  confirmed notes. Delete also flushes before removing the parent; confirmed deletion
  cancels scheduled drafts and removes the account's draft entry.
- Score display and persistence use the same -99 to +99 bounds. The input remains
  editable while a save is running so the next value can queue, without overlapping writes.
- Subsequent `load()` calls refresh in the background. Successful refresh reconciles
  confirmed fields without replacing dirty drafts; rejected reads retain the shell.
  Load tickets discard superseded responses, while a mutation revision forces one retry
  if a read snapshot predates a save. A second competing change reports a refresh warning
  instead of repeatedly loading or overwriting newer client state.
- Page reload requires login as before. After the same account is authorized, recovered
  drafts are offered for review and explicit **Retry draft**. They are never silently
  written over a newer server value. Matching already-persisted values reconcile away.
  The app-level draft notice provides review links and remains bounded on small screens.
- Logout, access loss and account changes synchronously clear current-account drafts
  before destroying the application realm. Account-generation guards stop old workers
  from publishing or processing another account's queue. Already-sent requests can still
  commit on the server. No auth tokens/passwords are added to local storage.

## Verification

- Full suite: **131 checks, 126 pass, 5 original known failures remain**; zero unexpected
  failures. Immediate-close notes loss (C3) is now an ordinary passing regression.
- Nine controller checks test coalescing, delayed older responses, shared workers,
  failed-write/latest-value recovery, reload/account isolation, malformed/denied storage,
  draft reconciliation, cancellation and account-change guards.
- Six store checks cover serial note/score flushes, failures/retry, refresh shell/draft
  retention, stale refresh versus status, deletion cleanup and waiting for another save.
- Eight added Chromium checks cover Escape/backdrop, Edit, bounded score, failed close,
  refresh, recovered draft review and logout cleanup. Existing failure/retry checks pass.
- JavaScript syntax checks, production build and standalone tracker desktop/mobile QA
  pass. Fixtures block external browser requests and do not read production settings.

## Limits and remaining work

The remaining five baseline failures are malformed activity/Kanban storage, denied
preference storage and two stale summary membership checks; those remain steps 6/7.
Draft storage is guarded separately; this does not claim all legacy storage is repaired.

Dirty notes are stored as plain text in this origin's local storage, scoped by the
verified account ID. Storage denial/quota failures retain in-memory drafts and visibly
explain that reload recovery is unavailable. Successful saves clear dirty values;
logout removal is best effort if the browser denies storage access. Abrupt process/OS
failure and browser data deletion cannot guarantee recovery. Before-unload prompts are
an additional browser-dependent safeguard, not the persistence mechanism.

Recovered drafts for records absent from a partial read are retained rather than erased.
Their review controls are disabled until the record is available. Complete pagination and
missing-record recovery need step 8. Confirmed local deletion does remove those drafts.

This scope protects detail notes/score; create/edit form drafts and create/status request
UUIDs remain scoped to the current form/store action. Durable request recovery across
sessions is not claimed. Notes/score order is guaranteed within this application realm;
independent browser/device edits are not a conflict-resolving collaboration system.
Staging network/JWT/database and supported Chrome/Edge release checks remain step 12.
