# Ideas Pipeline Web App — Changelog

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
