# Ideas Pipeline Web App — Changelog

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
