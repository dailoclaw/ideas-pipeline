# Step 11 — focused cleanup and performance

Version 1.9.17 · 2026-10-11 · local verification only.

## Implemented

- All previously unrestricted React store subscriptions now select only the values they render, using Zustand's shallow comparison. Selectors include status override maps and preference revisions wherever stable getter functions read those values; status changes and saved sort preferences still trigger updates.
- Six independent dataset reads start together. Each table still paginates sequentially, with the existing page limit and cursor checks. All six outcomes settle before handling failure. Required-table failure blocks publication; activity-history failure retains the incomplete-history warning. Existing load tickets and revision guards remain in place. This reduces round-trip waiting for a refresh; it does not provide a database snapshot across tables.
- Pages, alternate console and dialogs are loaded when selected. Loading status and a local error boundary prevent a failed chunk from blanking the shell. Failed dialogs support Close/Escape; failed pages offer Reload, with the existing unsaved-draft browser guard. Production deployment must retain old hashed chunks or reload stale clients safely. Seeds were already excluded from the application graph and remain available for fixtures/exports.
- Shared status labels/options replace duplicate canonical maps in scoring, CSV, validation, pills and the detail modal. Console “Discovery” terminology and different export time/platform labels remain intentional. Existing shared scoring, scope and history helpers are retained.
- Matrix quadrants have stable component identities, preserving focused idea buttons on dataset updates. Hidden batch selection pruning now runs before paint so a quick workspace reassignment cannot restore an obsolete selection.
- Removed the unused `today` helper, unused `FeaturesView.getStatus` parameter and corresponding prop, unused App subscriptions and a comment describing a nonexistent CSS change. No speculative CSS or seed deletion.
- Styles are five ordered files: base, themes, console, aurora and accessibility, imported by `src/index.css`. Before/after split production CSS was identical: SHA-1 `da7707ff978ca2c5723d642ea32099ad3abf570f`. Subsequent metadata/build-target changes are separate from this comparison.
- ESLint 10 checks JavaScript/JSX references, undefined/unused variables, core syntax/scope rules and Hook call placement. Test globals are supported; generated documents and review assets are excluded. Immutable snapshot errors retain their original cause.
- CI now defines clean Node 24 install, Chromium setup, lint, strict regressions, build, bundle budgets and a production dependency audit. The workflow has not run remotely yet; local equivalent checks passed. CI is not branch protection or release approval.

## Measurements

See [exact bundle measurements](performance-evidence-v1.9.17.json). Build manifest traversal includes every static import needed for the default authenticated Layout view, deduplicated; inactive dynamic imports are excluded. Counts are generated assets, not timings on a user's network.

| JavaScript | Before | After |
|---|---:|---:|
| Login entry, raw | 359,949 bytes | 373,243 bytes |
| Authenticated Layout, raw | 520,551 bytes | 453,400 bytes |
| Authenticated Layout, gzip | 147,477 bytes | 134,415 bytes |

The authenticated initial payload decreases about 13% raw / 9% gzip. The login entry increases 3.7% raw after dependency updates. Five JS chunks now serve the initial authenticated Layout, versus two before; caching and deferred inactive code are the tradeoff. CSS remains eager to preserve themes/cascade. This does not claim the total application bundle decreased or measure runtime speed on real datasets.

`npm run check:bundle` requires initial authenticated JS below the recorded 520,551-byte baseline and login entry within 10% of its baseline. CI runs the same check. Change budgets only with new measurements and a reviewed reason.

## Verification and support

Declared runtime is Node 24 (`.nvmrc`, package engines and CI); verified locally with Node 24.21.0. Explicit build targets are Chrome/Edge 120+, with release acceptance intended on current managed Chrome and Edge. Local Playwright Chromium verifies behavior; separately installed Chrome/Edge and assistive technology remain step 12 checks. Vite's [migration requirements](https://v7.vite.dev/guide/migration) informed the tooling upgrade. ESLint 10's [native JSX scope analysis](https://eslint.org/docs/latest/use/migrate-to-10.0.0) avoids an incompatible legacy React lint plugin.

205 strict checks pass, including new concurrent-read, deferred-module reuse, failed-dialog dismissal and matrix-focus checks. Existing scoring, status override, workspace, draft, failure and history checks remain passing. Four-width UI and doubled-root-text QA and the updated tracker are checked separately before delivery.

## Remaining work

See [dependency review](DEPENDENCY_REVIEW.md). Seven development findings remain assessed; no production dependency findings were reported by the recorded audit. A separately tested Tailwind migration remains planned. Live database backup, staging, migrations, real-browser acceptance, screen-reader acceptance, deployment and rollback evidence are still release gates. No live operations or deployment occurred in this step.
