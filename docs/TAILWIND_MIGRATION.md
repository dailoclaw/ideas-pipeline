# Tailwind security migration

Version 1.9.25 · 2026-10-11 · local candidate, not production approval.

Published dependency guard `4e2ff2b39e4561c2d9245e30a9790bcb187ae667` to main and verified origin/main. Its [CI run](https://github.com/dailoclaw/ideas-pipeline/actions/runs/38104501593) passed. This subsequent migration is local on `codex/tailwind-security-migration`.

## Change and rationale

Tailwind 3.4.19 is replaced with 4.3.3 and its dedicated PostCSS plugin. The obsolete autoprefixer/configuration and vulnerable Tailwind 3 parser/watcher chains are removed. React 18, Zustand 4 and Vite 7 remain. No dependency overrides or forced audit fixes were used. The recorded full and production audits each report zero affected packages; advisory-feed results are point-in-time evidence, not proof of application security.

The [official upgrade guide](https://tailwindcss.com/docs/upgrade-guide) guided the PostCSS, source discovery, utility-name and preflight migration. Its migration tool ran on an isolated source copy; generated changes were reviewed before applying. Explicit source scanning includes application source and index.html, excluding documentation, historical snapshots and review assets. The old JavaScript Tailwind configuration had no custom plugins.

## Preserved behavior

A compatibility stylesheet preserves the old hexadecimal palette, rem line heights, ring defaults, placeholder colors and native form backgrounds. Custom utilities retain their existing component behavior. Renamed gradient/blur utilities are paired with theme selectors; gradients explicitly retain sRGB interpolation. Aurora inputs keep their original fixed 14px radius. Native dark number fields retain their browser background rather than becoming white. Two pre-existing invalid pointer-property registrations (length syntax with a percentage initial value) were removed; browsers already ignored them, so the existing inherited values and gradient fallbacks remain. Fully rounded utilities use Tailwind 4's equivalent infinite-radius representation.

New regression checks cover mobile rem line heights under doubled root text, transparent native checkboxes, Aurora radii, paired gradient/blur overrides and dark score input backgrounds. Line-height assertions await the existing CSS transition's final state.

## Verification and boundaries

See [structured evidence](tailwind-evidence-v1.9.25.json) and recorded [full](dependency-audit-v1.9.25.json)/[production](dependency-production-audit-v1.9.25.json) audit reports. The active dependency guard now allows no advisories; the previous seven-package review is retained separately as historical test evidence. Recurrence is an ordinary CI failure.

The local visual comparison uses fictional records with all external requests blocked: four themes, both modes, widths 320/390/768/1440, normal and doubled root text, five pages and four dialogs (576 states). Original compiled CSS is retained in `tailwind-v3-baseline-v1.9.24.css` solely as review evidence, never imported by the application. Differences in fully rounded CSS serialization and equivalent alpha color serialization were reviewed; pointer-hover differences are separately recorded rather than described as pixel equality. A neutral-pointer Console comparison covers another 64 contexts with normalized colors and reports zero differences. Screenshots and raw metrics live in the local evidence directory recorded in the JSON.

Build targets remain Chrome/Edge 120+. Installed Chrome checks are local evidence. Edge, browser-toolbar zoom and manual screen-reader acceptance remain open. This change does not install Supabase candidates, back up live data, create staging or deploy. The production gate remains NOT APPROVED.

## Review and next actions

1. Review the local source and compatibility CSS; run `npm ci` under Node 24, then lint, strict tests, build, bundle checks, compiled fixture smoke and dependency guard.
2. Publish only on user instruction; verify CI for the exact resulting commit.
3. Run installed Edge and manual accessibility/browser zoom acceptance on an available machine.
4. Resume the database acceptance sequence only when the user changes the live backup/staging deferral. Follow `RELEASE_GATE.md` for real JWT, concurrency, migration, retention and recovery requirements.
