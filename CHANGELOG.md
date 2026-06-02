# Ideas Pipeline Web App — Changelog

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
