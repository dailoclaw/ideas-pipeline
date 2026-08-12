# Ideas Pipeline Web App — Changelog

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
