# Validation and planning rules — step 9

Step 9 source published to main at `c6f7df6` on 2026-10-11 by request;
origin/main verified. No live database changes or deployment verification.

## Write boundary

Create and edit allow only name, pitch, target, pain, win, notes, time, plat and
MVP. Required name/pitch reject whitespace; other descriptive fields trim;
notes preserve formatting. Empty MVP steps are removed. Unknown fields, wrong
types and unsupported choices reject before the request and retain confirmed
state. Editing legacy unknown time/platform requires choosing supported values.

Limits: name 200; pitch/target/pain/win 10,000; notes 100,000 characters;
MVP at most 100 steps of at most 2,000 characters. Client limits count UTF-16
units; PostgreSQL counts characters, so client limits are conservatively stricter
for supplementary Unicode. Notes may be empty. Score adjustments are integer
−99..99, priority is boolean, start week is integer 1..8 or null (remove),
workspace is one of the seven existing keys or empty (unassign). Status must be
one of the six existing stages; null resets a seed override only.

## Score and placement

Existing valid score values are preserved: effort ≤40 + platform ≤25 + MVP ≤20
+ novelty ≤15 + pain ≤5, rounded once (base ≤105), then manual −99..99,
with minimum 1. Range is **1–204**, not a percentage. Strategy bars use /204;
the tooltip explains each term, rounded base, adjustment and any minimum
correction. Invalid legacy numeric values use safe defaults. Priority sorts
first; equal score/name values use ascending ID. Build Next retains its effort
bonus (20/8/0) and priority preference, with ID ties.

Matrix no longer pins seed IDs. It is an explicit heuristic, not measured impact:
high impact means platform + MVP + novelty + pain ≥40 of 65; low effort means
1w or 1–2w, high effort means 2–4w. Manual adjustment affects rank, not impact.
Unknown time/platform appears in an unclassified section. Kanban retains unknown
time in its own column. Groups/Console Spaces retain unknown workspace assignments
in a repair section; CSV labels them explicitly. Editing attributes updates placement.

Sprint retains existing buffered default effort **2/3/5 weeks** for the three
build-time buckets; unknown uses 2. Valid account-local duration overrides win.
Assignments denote start weeks, not occupied capacity or completion dates.
Overlaps and work beyond week 8 are permitted. Invalid legacy start weeks appear
in backlog with a repair notice instead of disappearing. Effort total sums
scheduled estimates; it is not elapsed calendar duration.

## Deferred database rollout

`database/validation/004-input-constraints.sql` is a local candidate tested in
PGlite after 001/002/003. It checks required text, enums, bounds, MVP and workspace/
override values. Native boolean/integer columns and existing sprint check enforce
those storage types. It does not grant authorization or deploy policies.

Before live rollout: complete the deferred backup/staging work and real JWT/RLS
acceptance; inventory each proposed constraint against real rows; agree limits
and heuristic rules; repair invalid legacy rows explicitly without dropping them.
NOT VALID preserves existing reads but checks **all later inserts and updates**:
even a notes-only update of an invalid old row will fail until its invalid fields
are repaired together. Do not install this candidate without that repair plan.
Validate each constraint in staging, then live, only after rows pass. PostgreSQL
checks bound values and whitespace-required fields; the app performs trimming.
Existing history is preserved and is not retroactively reclassified.

## Verification

The strict regression suite covers client boundaries, score reconciliation,
prototype names, deterministic ties, attribute placement, unknown visibility,
invalid sprint recovery, and local SQL rejection/preservation. Chromium fixture
checks make no external requests. Real Supabase, independent-session contention
and Chrome/Edge release acceptance remain part of the deferred release gate.
