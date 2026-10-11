# Ideas Pipeline Web App — Changelog

## v1.9.30 (2026-10-11) — Live private-dataset migration
### Fixes
- Apply user-approved no-backup database rollout with six-table RLS, private membership, transactional/replay RPCs, canonical audit and nine validated compatible constraints
- Preserve existing rows and legacy classification codes; guard new/changed fields without breaking unrelated edits; add missing group FK and sprint-week CHECK
### Added
- Exact one-shot reviewed live SQL, independent read-only denial verification and eight local rollout/rollback regressions; 295 distinct checks pass (294 strict plus the subsequently added verification check)
### Changed
- Tracker v1.0.36 records actual applied migration, row preservation and zero-user login/enrollment gap; recovery and production integration acceptance remain open

## v1.9.29 (2026-10-11) — User-directed backup deferral
### Changed
- Tracker v1.0.34 marks unsuccessful live backup deferred again at user request, preserving incomplete capture/restore status
- Records password authentication failure after verified TLS fix; no further password retry requested
- Read-only inspection remains available; live migrations and production approval stay pending

## v1.9.28 (2026-10-11) — Supabase backup TLS trust fix
### Fixes
- Use official checksum-pinned Supabase database CA instead of system CA alone; retain full certificate/hostname verification
- Reject missing/altered CA before password entry; all five backup security/failure tests pass
### Changed
- Diagnosed two incomplete captures from private logs; password-free live TLS verification passes, successful backup/restore still pending
- Tracker v1.0.33 records corrected runner and local hidden-password retry; no live migration or database permission changes

## v1.9.27 (2026-10-11) — Supabase live inspection and backup preparation
### Added
- Hidden local-password CLI backup runner with verified PostgreSQL 17 clients, TLS certificate verification, private permissions, archive checksums and incomplete-capture handling
- Three backup security/failure tests and CI command; private backup/tool paths excluded from Git
### Changed
- Read-only signed-in live catalog inspection confirms five tables with disabled RLS and anonymous grants; no migrations applied
- User resumed backup/staging preparation and selected CLI; tracker v1.0.32 records password handoff pending, no captured/restored backup or staging yet

## v1.9.26 (2026-10-11) — Read-only release security inspection
### Added
- Local metadata inspection for private ledgers, effective inherited grants, RPC/helper owners/settings and absent/disabled audit triggers
- Six executable SQL regression tests; no application contents returned and no live database operation
### Changed
- Published Tailwind migration 6cb52ba to main with green 281-check CI; local inspection brings strict checks to 287
- Tracker v1.0.31 preserves live backup/staging deferral and open release gates; new candidate unpushed

## v1.9.25 (2026-10-11) — Tailwind build-chain security migration
### Fixes
- Replace Tailwind 3 with Tailwind 4.3.3/PostCSS plugin; remove reported parser/watcher chains; recorded full and production audits both zero
- Preserve original palette, rem typography, native dark inputs, Aurora radii, blur overrides and sRGB gradients; add four browser regression checks
### Changed
- Remove two invalid, browser-ignored Aurora pointer property registrations discovered by the new CSS optimizer
- Restrict CSS scanning to application sources; remove legacy Tailwind config/autoprefixer; active advisory guard accepts no findings and historical baseline remains available
- Published guard 4e2ff2b with green CI; subsequent migration verified locally with 281 strict checks, 66 installed Chrome checks, lint/build/budgets and compiled fixture smoke
- Tracker v1.0.30 records progress and visual evidence; migration unpushed, live backup/staging deferred and production gate NOT APPROVED

## v1.9.24 (2026-10-11) — Full dependency audit guard
### Added
- Full-audit CI check rejects unreviewed/worsened findings, advisory range/chain changes, failed feeds and production-path exposure
- Explicit reviewed seven-package baseline expires 2026-11-10 UTC; 23 guard tests and fresh full/production evidence
### Changed
- Published audit candidate 05b4968 to main and verified its green 253-check CI
- Tracker v1.0.29 records publication and local continuation; all 276 strict tests, lint/build/budgets, compiled smoke and live guard pass; existing seven build findings remain unresolved
- No dependency/CSS rewrite, live SQL or production approval; backup/staging remains deferred

## v1.9.23 (2026-10-11) — Local canonical mutation audit
### Added
- One-time private audit trigger candidate for actual idea/status/assignment edits and retained deletion metadata; server timestamps and atomic rollback
- 22 ordinary SQL tests for security, no-ops/upserts, replay, privacy, deletion/account retention and rollback; 253 strict tests pass
### Changed
- Tracker v1.0.28 records local evidence and verified published main CI at 2d05076
- Caller-reported UI activity remains separate; no live installation, push or production approval; backup/staging remains deferred

## v1.9.22 (2026-10-11) — Authorization continuation main publication
### Changed
- Tracker v1.0.27 records publication of a345f57 and verified origin/main
- All 231 local strict checks and build checks passed; new remote CI result remains unverified
- No Supabase SQL or deployment acceptance; production gate and live backup/staging deferral remain open

## v1.9.21 (2026-10-11) — Local private-dataset authorization continuation
### Added
- Reviewed-installation candidate for six-table membership policies, column grants, private metadata/sequence isolation and inherited-privilege rollback guards
- 26 real local SQL role checks; full strict suite now passes all 231 checks
### Fixed
- Historical schema/activity bootstraps enable RLS instead of reopening anonymous access; guard regression explicitly disables a fixture table
### Changed
- Tracker v1.0.25 records local policy evidence and verified main CI at be4c868; live backup/staging/Supabase remain deferred
- Production stays NOT APPROVED: supporting-mutation audit trust and real JWT/API/concurrency, Edge/manual accessibility and rollout gates remain open

## v1.9.20 (2026-10-11) — Step 12 main publication
### Changed
- Tracker v1.0.23 records requested publication and verified origin/main at 0b9c0a9
- Published release verdict, acceptance plan and Chrome/Edge/compiled-fixture smoke tooling; new remote CI result remains unverified
- Production stays NOT APPROVED with real database, Edge, manual accessibility and safe rollout evidence open

## v1.9.19 (2026-10-11) — Step 12 release gate assessment
### Added
- Explicit installed Chrome/Edge test channels with no silent fallback and a disposable optimized fixture smoke for navigation, drafts, CSV and anonymous gating
- Main CI success verified at ab86823; new compiled-smoke CI step verified locally, pending publication
- Release verdict/evidence and ordered database authorization, staging, browser/accessibility and recovery acceptance plan
### Changed
- Tracker v1.0.22 records 205 strict and 62 installed Chrome passes, seven assessed build findings and zero production audit findings
- Production release remains NOT APPROVED; step 12 stays in progress with deferred live work, unavailable Edge and manual acceptance gates explicit

## v1.9.18 (2026-10-11) — Step 11 main publication
### Changed
- Tracker v1.0.21 records requested step 11 publication and verified origin/main at 6c09b37
- Preserves 205 passing local checks, assessed remaining build-tool advisories and open remote CI/database/manual release checks; step 12 remains next

## v1.9.17 (2026-10-11) — Step 11 cleanup and performance
### Changed
- Deferred inactive pages/dialogs, bounded concurrent dataset reads and shallow store selectors; stable matrix focus and before-paint hidden selection pruning
- Consolidated canonical status metadata, removed confirmed unused code and split CSS without changing compiled cascade
- Updated Vite/dependency lockfile, added maintained ESLint 10, Node 24 CI, explicit Chrome/Edge build targets and bundle budgets
- Tracker v1.0.20 records 205 passing strict checks, measured payload reduction and seven assessed remaining development advisories; step 12 remains the release gate

## v1.9.16 (2026-10-11) — Step 10 main publication
### Changed
- Tracker v1.0.19 records requested step 10 publication and verified origin/main at 7afd9c5
- Retains passing local evidence and open database/manual release checks; step 11 remains next

## v1.9.15 (2026-10-11) — Accessible workflows and review navigation
### Fixed
- Native labelled forms and separate card/checkbox/advance controls, linked keyboard tabs and pressed/expanded states
- Modal background isolation, focus restoration and Kanban remount/scope timing bugs affecting keyboard focus
- Keyboard/touch score disclosure, narrow-screen positioning, theme muted-text contrast and reduced-motion behavior
### Added
- Review repair controller and separate accessible-copy generators preserve historical HTML/assets while fixing IDs, hashes, lightbox keys/focus and tall-slide tracking
- Ten additional regressions; all 201 strict checks pass, build and four-width doubled-text QA pass
- Tracker v1.0.18 records local step 10 completion and manual release acceptance limits; step 11 next

## v1.9.14 (2026-10-11) — Step 9 main publication
### Changed
- Tracker v1.0.17 records requested step 9 publication and verified origin/main at c6f7df6
- Preserves recorded passing local evidence and deferred constraint/database rollout; step 10 remains next

## v1.9.13 (2026-10-10) — Validation and explicit planning rules
### Fixed
- Trimmed required/descriptive inputs, removed blank MVP steps and rejected unsupported fields/types/ranges before writes
- Retained unknown classifications and invalid sprint assignments in visible repair sections
- Reconciled score range (1–204), breakdown and deterministic priority ties; replaced seed-ID matrix pins with an explicit attribute heuristic
### Added
- Local SQL 004 constraint candidate and rollout/legacy repair instructions; no live SQL executed
- 11 regression checks; all 191 pass in strict mode, production build and four-width planning QA pass
- Tracker v1.0.16 records local step 9 work and deferred constraint rollout; step 10 next

## v1.9.12 (2026-10-10) — Step 8 main publication
### Changed
- Tracker v1.0.15 records the requested step 8 push and verified origin/main at ff1c366
- Retains deferred RPC/database rollout and passing local evidence; no live SQL or deployment verification claimed

## v1.9.11 (2026-10-10) — Honest history and complete exports
### Fixed
- Removed fabricated activity; corrected legacy predecessors, repeated transitions, counts and local decision-date boundaries
- Paginated all six reads and refreshed CSV/Markdown exports; incomplete loads block downloads explicitly
- Stable account-scoped activity outbox tokens, visible full/unavailable states and pending JSON export replace silent truncation
### Added
- Local migration 003 for idempotent activity replay and validated server actor/timestamps/payloads; Supabase rollout remains deferred
- 23 history/paging/store/PostgreSQL/browser checks; all 180 tests pass
- Tracker v1.0.14 records local step 8 work and open database acceptance; step 9 next

## v1.9.10 (2026-10-10) — Step 7 main publication
### Changed
- Tracker v1.0.13 records the requested step 7 push and verified origin/main at ba5f915
- Retains passing regression evidence and deferred database rollout; no deployment verification claimed

## v1.9.9 (2026-10-10) — Synchronized summaries and workflow feedback
### Fixed
- Assignment/status map changes invalidate summary and console rankings immediately
- Shared workspace scope and priority ordering; Groups/Spaces include unassigned ideas and honor filters
- Hidden Kanban selections and stale batch retries cleared; triage decisions separated from deferrals with accurate completion feedback
### Added
- Ten scope/order/browser checks; all 157 regressions now pass without known failures
- Tracker v1.0.12 records step 7 completion locally and step 8 next; production release gates remain open

## v1.9.8 (2026-10-10) — Step 6 main publication
### Changed
- Tracker v1.0.11 records the requested step 6 push and verified origin/main at d50ea20
- Retains two known summary failures and deferred database rollout; no deployment verification claimed

## v1.9.7 (2026-10-10) — Guarded account-scoped storage
### Fixed
- Blocked storage and quota failures retain a usable app and memory preferences; malformed caches fall back safely
- Account-scoped cache keys, type-specific activity validation, bounded preferences and deleted-idea/logout cleanup
- Drafts share the guarded adapter while retaining explicit durable-storage warnings
### Added
- 16 storage/store/browser checks; three C6 regressions promoted to passing tests
- Tracker v1.0.10 records 145 passes and two remaining summary failures; step 6 complete locally, step 7 next
- No live database changes, deployment or main publication performed

## v1.9.6 (2026-10-10) — Step 5 main publication
### Changed
- Tracker v1.0.9 records the requested step 5 push and verified origin/main at 7c0cd76
- Retains five known failures and deferred database rollout; no production deployment verification claimed

## v1.9.5 (2026-10-10) — Safe detail autosave and draft recovery
### Fixed
- Store-owned note/score drafts flush before dialog close, Escape, backdrop and Edit; failed flushes retain visible drafts and Retry
- Ordered per-idea workers preserve newer edits, wait for other writes, cancel deleted drafts and enforce score bounds
- Background refresh preserves the shell/drafts and refuses stale snapshots overtaken by saves
### Added
- Guarded account-scoped reload recovery with explicit review; logout/access loss clears current-account drafts and queued workers
- 23 draft/store/browser checks; immediate-close notes promoted to a passing regression
- Tracker v1.0.8 records 126 passes and five known failures; step 5 verified locally, step 6 next

## v1.9.4 (2026-10-10) — Steps 3 and 4 main publication
### Changed
- Tracker v1.0.7 records the requested main push and verified origin/main at 56f08d6
- Database rollout stays deferred; published source still requires coordinated migration/security before create/status workflows can run on Supabase

## v1.9.3 (2026-10-10) — Local IDs and transaction integrity
### Fixed
- Create/status client paths use transactional RPCs, returned database IDs, stable request tokens and read-only conflict recovery
- Removed automatic empty-dataset reseeding and browser ID allocation; initial seeds remain available through an explicit guarded administrator SQL export
### Added
- Local-only migration for identity IDs, atomic create/status/history/activity and a private account-scoped retry ledger
- 20 PostgreSQL, 10 store and 4 Chromium checks for migration guards, rollback, replay, deletion, conflicts and visible recovery
- Tracker v1.0.6 records 102 passing checks and six known failures; step 4 stays open for deferred security/database rollout and separate-session acceptance
### Rollout prerequisites
- Frontend requires migration 002 and step 2 authorization; no main push, Supabase changes or production deployment performed

## v1.9.2 (2026-10-10) — Confirmed saves and recoverable failures
### Fixed
- Status, priority, score, group and other primary writes require confirmed returned records before changing client state or success activity
- Missing records and failed/zero-row writes now produce recoverable errors; pending controls prevent duplicate submissions
- Partial batches wait for every result and retry only failed ideas
- Committed changes survive history/activity or background-refresh failures with distinct warnings
- Functional override merging, parent-first cascading deletion, triage failure recovery and StrictMode action reuse repair adjacent defects
### Added
- 28 isolated store/browser failure and retry checks; seven expected failures promoted to passing regressions
- Tracker v1.0.5 records current verification separately from the original baseline and points to step 4; live database work remains deferred

## v1.9.1 (2026-10-10) — Main publication recorded
### Changed
- Tracker v1.0.3 records the user-requested step 2 main push and verified local checks
- Deployment prerequisites remain explicit: membership RPC, account enrollment, RLS/audit and staging verification are still open

## v1.9.0 (2026-10-10) — Private dataset email/password gate
### Added
- Email/password sign-in and fail-closed server membership verification before loading the data app
- Admin-only allowlist/RPC SQL draft for coordinated staging rollout; no deployed policy changes
- 28 auth, configuration and browser regressions covering failure, retry, race, session-loss and sign-out paths
### Changed
- Memory-only sessions; refresh requires login; missing/insecure connection settings render a setup error
- Sign out in appearance settings clears the application realm; tracker v1.0.2 records local progress and outstanding RLS/audit work

## v1.8.3 (2026-10-10) — Database authorization preparation
### Added
- Read-only SQL inventory for six-table RLS, grants, constraints, public RPC permissions and triggers
- Coordinated authentication, membership, trusted audit and staging acceptance plan; live inspection and rollout remain deferred
### Changed
- Tracker v1.0.1 records step 1 published on main and step 2 in progress; application behavior is unchanged

## v1.8.2 (2026-10-10) — Repair plan review tracker
### Added
- Self-contained HTML tracker preserving the initial 12-step repair plan, verification criteria, evidence links and completion history
- Canonical plan data and renderer with immutable versioned snapshots; Step 1 is marked complete locally with live backup/staging explicitly deferred
- Project instructions to update the tracker after verified repair work
### Changed
- Added Expand/Collapse, light/dark and Print/PDF controls to the review document; production application behavior is unchanged

## v1.8.1 (2026-10-10) — Isolated regression baseline
### Added
- Fictional in-memory database fixtures and browser/store regression checks for audit findings
- Expected-failure baseline mode and strict mode for tracking subsequent repairs
- Test-only Vite configuration that replaces Supabase, skips production environment files, and blocks browser requests outside localhost
- Baseline setup, preservation, deferred database backup/staging, and verification instructions
### Changed
- Added pinned Playwright development dependency and npm test commands; application behavior is unchanged

## v1.8.0 (2026-09-03) — Full-page More navigation
### Changed
- The Console mobile More tab and header ellipsis now open a dedicated full page instead of a popup sheet
- Workspace filtering, secondary views and app actions remain available in the new scrollable More page

## v1.7.2 (2026-09-03) — Cleaner Ideas score rings
### Changed
- Removed the grade label beneath each Ideas page score, leaving only the centred numeric score inside the ring

## v1.7.1 (2026-09-03) — Ideas score alignment
### Fixed
- Vertically centred the strategic score inside each Ideas page score ring while keeping the grade anchored below it

## v1.7.0 (2026-08-23) — Layout and theme, decoupled
### Changed
- Layout and visual system are now independent choices: any of the four themes works on either shell
- The Console shell no longer carries its own palette — its 830 lines of CSS resolved 388 hard-coded colours, and every one now reads through a design token
- Obsidian became a selectable visual system rather than a side effect of the Console layout, keeping Blueprint by day and Obsidian at night
- Aurora Mist works on the Console, replacing the blueprint grid with its own mesh
- Layouts renamed to describe their structure instead of a colour scheme: "Original" is now "Tabbed", "Obsidian Console" is now "Console"
- Settings replaces the note explaining which themes applied where with two independent sections, since the caveat no longer exists
- Surface, text, accent, status and radius tokens extended so a square theme stays square and a round one stays round on the same shell

### Added
- Theme preferences migrate on upgrade: anyone using the Console keeps the Obsidian palette they had rather than dropping into Glass

## v1.6.0 (2026-08-22) — Aurora Mist
### Added
- Aurora Mist, a third selectable visual system alongside Calm Command and Luminous Glass, with light and dark both derived from one azure→mint ramp
- Grade donuts replacing the flat score pill, with the ring hue following the A–D band and sweeping in on first paint
- Five-segment status rails on cards and ranked rows, so pipeline stage reads by position rather than by hue
- Rank rows where the row itself is the score bar, normalised against the visible score range, with an inline advance action on hover
- A triage deck: the decided card throws out while the next two peek behind it
- Progress-ledge primary buttons that fill and draw a checkmark in place of a spinner, with no size change
- Morphing pill selection on both view switchers, counting figures on portfolio metrics, and a self-drawing momentum sparkline
- Pointer-tracked spotlight borders, and corner-bracket focus states that reveal each row's keyboard shortcuts

### Changed
- Idea cards and ranked rows are keyboard-focusable in every theme, with Enter to open, X to select, and Right Arrow to advance
- The header theme control now cycles all three visual systems instead of toggling two
- Appearance settings drive the visual-system list from the theme registry rather than a hard-coded array

## v1.5.0 (2026-08-13) — Activity & Decision Timeline
### Added
- Mobile-first Activity tab inside every idea detail view
- Chronological audit trail for status, priority, score, group, notes, edits, and sprint scheduling
- “Decisions only” filtering and expandable before/after explanations
- Cross-device activity persistence through the new `idea_activity` Supabase table
- Device-local fallback while the database migration is pending or the app is offline
- Legacy status-history merging so existing decisions remain visible

## v1.4.0 (2026-08-12) — Native mobile shell
### Changed
- Rebuilt the mobile header to match the original Calm Command and Luminous Glass concepts
- Simplified the top row to the app identity, one primary add action, and one overflow control
- Moved workspace, triage, theme switching, and appearance settings into an iOS-style action sheet
- Reworked the bottom navigation into a borderless, edge-to-edge iOS tab bar with simple tinted active states
- Added a new faceted IdeaFlow app mark, SVG favicon, and iOS home-screen icon

## v1.3.3 (2026-08-12) — Compact iOS tab bar
### Fixed
- Removed the duplicated iOS safe-area spacing below the bottom navigation
- Capped the home-indicator allowance so tab buttons stay close to the bottom edge while remaining usable

## v1.3.2 (2026-08-12) — iOS mobile usability
### Changed
- Rebalanced the mobile header into separate brand, utility, workspace, and primary-action zones
- Increased header, view, recommendation, navigation, and modal controls to iOS-friendly touch targets
- Increased mobile form controls to 16px to prevent Safari focus zoom
- Added notch, status-bar, home-indicator, and dynamic viewport safe-area handling
- Improved responsive spacing from 320px through 430px phone widths

## v1.3.1 (2026-08-12) — Theme redesign correction
### Changed
- Reworked the mobile app shell with a branded two-row header and one-tap theme switch
- Replaced emoji navigation with a floating icon dock and clearer active states
- Changed phone Kanban cards to a readable single-column layout with stronger hierarchy
- Increased the visual distinction between Calm Command and Luminous Glass across cards, controls, backgrounds, navigation, and modal surfaces
- Made Luminous Glass the default visual system for new and upgraded sessions

## v1.3.0 (2026-08-12) — Luminous Glass & Calm Command
### Added
- Switchable Calm Command and Luminous Glass visual systems, persisted between sessions
- Theme-aware styling across dashboard surfaces, navigation, cards, controls, inputs, modals, drawers, hover, and focus states
- Responsive visual refinement for mobile and desktop layouts

## v1.2.0 (2026-06-03) — Universal status editor
### Added
- Status dropdown in every idea modal — works for all ideas (seed and user-added), all statuses in all directions
- Can now move any idea from shelved back to idea/researching/ready/building/done
- Replaces the scattered quick-action buttons with a single consistent status selector
- Loading state while status saves to Supabase

### Removed
- Separate Shelve/Unshelve/Unmark-done buttons (replaced by dropdown)

## v1.1.2 (2026-06-03) — Fix add idea error
### Fixed
- "null value in column id" error when adding a new idea — ID is now generated client-side as `max(existing ids) + 1` (schema has no auto-increment)

## v1.1.1 (2026-06-03) — Notes dark mode fix
### Fixed
- Notes textarea now respects dark mode (dark bg, light text, correct border and placeholder colour)

## v1.1.0 (2026-06-03) — Editable notes
### Added
- Inline editable notes textarea in the idea modal for ALL ideas (seed and user-added)
- Debounced autosave to Supabase (800ms) with "Saving…" / "✓ Saved" indicator
- `updateNotes` action added to Zustand store

## v1.0.0 (2026-06-02) — Initial build
### Stack
- React + Vite + Tailwind CSS + Supabase + Zustand
- Deployed to Vercel

### Features
- **Kanban view** — responsive 3-column grid (Quick / Medium / Project / Done), multi-column cards, per-column sort (Score / Name / ID)
- **Effort × Impact Matrix** — 4-quadrant view with auto-placement of new ideas
- **Feature Cards** — full-detail card grid, responsive columns
- **Build This Next** — auto-recommendation banner, one-click "Start Building"
- **Score badges** — hover tooltip showing full score breakdown (Effort / Platform / MVP / Novelty / Pain)
- **Staleness flags** — 🟠 badge for locally-added ideas >30 days in backlog
- **Batch status update** — checkboxes on cards, floating action bar for bulk status changes
- **Triage Mode** — one-idea-at-a-time review queue, sorted by score, with Skip/Build/Ready/Shelve
- **Summary tab** — searchable table with status filter pills, sort, Markdown export
- **Status timeline** — per-idea history of status changes with dates, shown in modal
- **Full idea modal** — all fields, quick status actions, edit/delete for user-added ideas
- **Add / Edit idea** — full form modal, works on mobile
- **Supabase backend** — ideas, status overrides, and status history persisted cross-device
- **Mobile-first** — bottom tab nav, slide-up modals, single-column layout on small screens
