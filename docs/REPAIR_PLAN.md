# Repair tracker maintenance

Canonical data: `docs/repair-plan.json`. Current standalone HTML: `docs/repair-plan.html`.

Update action statuses (`pending`, `in-progress`, `complete`, `deferred`) and their notes after verified work. Update step status (`pending`, `in-progress`, `complete`, `local-complete`), evidence links, readiness, date, baseline results, scope/deferral/progress notes and completion history where appropriate. Do not mark the whole plan production-ready until the release gate passes.

For every delivered tracker update:

1. Increment `planVersion` in the data file and set the actual update date in Australia/Adelaide.
2. Preserve the initial plan's actions/acceptance criteria; append factual history entries.
3. Run `npm run plan:render` to preview the current HTML.
4. Verify layout and controls at desktop/mobile widths, light/dark, with no console errors.
5. Run `npm run plan:render -- --snapshot` to create `docs/repair-plan-v<version>.html`. Past snapshots cannot be overwritten with different contents.
6. Update package/changelog as required by repository versioning and link the current HTML in the progress response.

The tracker is updated through project work; it does not poll, start tasks, write to a database, or claim automatic completion. UI controls affect presentation only. Local evidence links are useful in the repository copy; a standalone copy can still be read without neighboring files, but those links need the repository files to open.

Step 1 is complete within the user-approved local scope. Live schema/data backup and remote staging remain deferred and must be revisited before database-changing work. The five passing checks and thirteen known failures are a baseline, not thirteen repaired defects.
