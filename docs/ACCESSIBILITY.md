# Accessibility and review repairs — step 10

Step 10 source published to main at `7afd9c5` on 2026-10-11 by request;
origin/main verified. No deployment verification or live SQL.

## Core controls

- Idea capture/edit uses a native form, explicit labels and required-field error
  associations. Enter submits from text inputs. Whitespace errors announce once;
  shared save failures retain their existing live alert and retry behavior.
  Closing is disabled during a form save.
- Card opening, checkbox selection, score disclosure and advancement are separate
  controls. Space on a checkbox selects without opening. Native open buttons work
  in Kanban, feature cards, matrix, Groups and Strategy; sprint backlog buttons
  expose expanded state. Priority/settings/filter buttons expose pressed state.
- Detail and portfolio tabs have roving focus, arrows/Home/End and labelled panel
  relationships. Page navigation retains aria-current; view choices use pressed
  state rather than implying incomplete tabs.
- Dialogs make background branches inert, contain focus, lock background scroll
  and restore the opener. Stable Kanban DOM avoids losing focused controls on
  rerenders; scope cleanup runs before paint. Removed opener nodes fall back to
  a current control with the same accessible name, when present. If an opener has
  been deleted and no equivalent exists, no obsolete node is focused.
- Score explanation is a keyboard/touch disclosure with full breakdown, Escape
  dismissal and viewport-clamped positioning. Scroll/resize closes stale popups.
  Notes have an explicit name and live save status.
- Visible focus rings, minimum 24px controls/checkboxes, 44px close controls and
  reduced-motion overrides are added. Theme normal/muted text tokens are checked
  at a 4.5 contrast floor against their surfaces, including alpha composition.
  Core muted labels and inactive view choices are darkened for light surfaces.
  Dialogs are opaque so labels do not lose contrast over a dimmed background;
  actual form-label foreground/background pairs are also measured in every theme.

## Preserved review documents

Original HTML, screenshots and untracked review builders remain untouched.
Tracked builders now create separately named `-accessible.html` copies through
`ui-review/accessible-review.mjs`. Generate the three reproducible builder copies:

```
node ui-review/build-audit-2026.mjs
node ui-review/build-mobile-ux-innovation.mjs
node ui-review/build-next-mobile-ux-ideas.mjs
```

For the three existing local review documents (which are ignored source artifacts):

```
node ui-review/build-accessible-copies.mjs
```

That command requires the existing field-system, five-directions and light-systems
HTML files. It does not recreate missing source assets. Generated HTML stays
ignored; generator code and tests are committed. All six copies were checked
locally. The historical content/images are preserved; repairs do not update the
old reviews' product claims.

Repairs assign unique DOM IDs (including navigation/section collisions), correct
section links and scoped SVG references, use decoded getElementById lookup for
hashes, and track slides by headings rather than intersection percentage.
Lightboxes isolate background, trap focus, restore their image opener and consume
slide keys while open. Reduced motion disables transitions/smooth scrolling;
blocked localStorage does not disable theme controls. Complex light-system labs
retain their original functionality, with duplicate IDs repaired after construction.

## Evidence and limits

201 strict regression checks include ten additional application/review tests:
keyboard selection and open/close, form validation/submission, tab semantics,
score disclosure, advance isolation, theme contrast, duplicate IDs, hostile hashes,
tall slides, lightbox focus/keys and blocked review storage.

Core pages/form passed 1440/768/390/320px at normal and doubled root text size with
reduced motion, without document overflow/runtime errors. Six generated copies
passed navigation checks in Chromium. Production build passes. These are local
fixture/DOM checks: real VoiceOver/NVDA reading order, browser toolbar zoom and
release Chrome/Edge acceptance remain release-gate checks. Theme text-token
measurement is not certification of every gradient, disabled state or image.
