# Step 7 — summaries and workflow feedback

Implemented locally in v1.9.9. Source pushed to main at ba5f915 by request; remote verified. No live database changes or deployment verification.

## Changes

- Summary scope, status totals, attention rows and workspace metrics explicitly invalidate on the assignment/status maps. Console Command ranking also observes status overrides. Seed status changes no longer leave stale totals or ranked rows.
- Shared `scopeIdeas` defines all ideas, one assigned workspace and `__none__` (unassigned). Layout, Strategy, Sprint, Summary, Console Command/Activity and Groups/Spaces use that definition. Workspace comparison respects the current scope. Groups/Spaces now include unassigned ideas and honor the global filter.
- Shared score/name/ID ordering puts priority items first. Strategy, Sprint, Summary lists/drill-down/top ideas and Console ranking use it. Groups keeps status order, then priority/score within each status; researching has an explicit rank. Build Next retains its existing effort bonus and priority policy. CSV Export remains explicitly all ideas; Markdown remains workspace-scoped. Those different purposes are preserved.
- Kanban batch actions use only visible selected cards. Workspace/view changes clear selection and stale batch retry feedback; assignment/status changes prune hidden selections. Leaving the page invalidates a late failed batch retry. A visible note explains the selection policy. Already-started database requests cannot be cancelled by changing a filter; their confirmed results remain authoritative.
- Triage captures the current workspace's initial candidate IDs, ordered by priority/score. New arrivals enter the next session. Successful decisions and unchanged deferred/skipped items have separate counts. A fully skipped session says Review paused and offers Review deferred ideas. The final success heading waits for the decision animation/save to finish. Failures do not increment decisions and release busy state in finally; retry preserves the requested status. Buttons are keyed per idea so completion feedback does not carry into the next card.
- The existing StrictMode action-button mounted-ref repair remains covered by its passing regression.

## Verification

**157 ordinary passing checks, zero known/TODO failures.** The last two original C7 tests now pass normally. Ten new checks cover scope/ordering, immediate status totals and workspace completion, Groups/Spaces scope, hidden selection safety, view-change retry invalidation, triage skips/review, priority ordering and console status invalidation. The existing failed-triage regression also checks counters before/after retry. Production build passes.

Chromium uses fictional local fixtures and blocks external requests. Groups/triage and the tracker are checked at 1440/768/390/320 pixels; tracker themes and controls are checked in light/dark modes. Installed Chrome/Edge and real database acceptance remain at the release gate.

## Verify again

1. Run `npm test` and `npm run test:strict`; neither should report expected failures.
2. Run `npm run build`.
3. With Summary open, assign/unassign an idea and change a seed status; scope totals, completion and workspace rows should update immediately. Repeat in Console Command.
4. Compare Groups and Console Spaces under a specific workspace and No group yet.
5. Select a Kanban card, change workspace/view or move its assignment out of scope; its batch selection/retry should disappear and not return when it becomes visible again.
6. Deny a triage write: verify zero decisions and usable controls. Retry successfully: verify one decision. Skip instead: verify one deferral, unchanged status and Review paused; review deferred items and decide them.

## Limits

All original baseline regressions now pass, but this is not production approval or a claim that every audit issue is fixed. Steps 8–12 still cover history/export retention, validation/business rules, accessibility, cleanup/dependencies and the release gate. Live backup/staging, six-table authorization and transaction migration/real API acceptance remain deferred from steps 2/4. Summary/export completeness still depends on the current loaded dataset; pagination is step 8.
