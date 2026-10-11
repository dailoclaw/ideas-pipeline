# Dependency review — step 11

Current version 1.9.25 · audit date 2026-10-11. The local [Tailwind security migration](TAILWIND_MIGRATION.md) removes the remaining affected chains. Current [full audit](dependency-audit-v1.9.25.json): **0 findings**; [production audit](dependency-production-audit-v1.9.25.json): **0 findings**. The active guard allows no findings. Installed Edge and live acceptance remain open.

## Historical assessment — v1.9.17

The following assessment and seven findings describe the earlier lockfile, not the current migration candidate. Counts can change with the advisory feed.

Historical first-step baseline: 13 findings (10 high, 3 moderate). Then-current full audit: **7 findings (5 high, 2 moderate)**. Production-only audit: **0 findings**. These are affected-package counts, not seven independent exploitable browser vulnerabilities. Zero findings is not proof of a secure application.

Recorded [full audit](dependency-audit-v1.9.17.json), [production audit](dependency-production-audit-v1.9.17.json) and `package-lock.json` make the results reviewable.

## Baseline assessment

| Baseline package | Result / exposure |
|---|---|
| Vite | Updated 5.4.21 → 7.3.7 with React plugin 5.2.0. Recorded dev-server traversal / Windows path issues no longer reported. Local fixtures, build and explicit browser targets verified. |
| esbuild | Resolved through Vite upgrade; recorded development-server cross-origin finding no longer reported. |
| baseline-browser-mapping | Compatible lockfile update; recorded input denial-of-service finding no longer reported. |
| browserslist | Compatible lockfile update; cache/statistics denial-of-service findings no longer reported. |
| nanoid | Compatible lockfile update; recorded findings no longer reported. |
| postcss | Compatible lockfile update; recorded parser findings no longer reported. |
| source-map-js | Compatible lockfile update; recorded finding no longer reported. |
| braces | High finding remains: deeply nested glob input can exhaust the stack. Installed through the Tailwind build chain. |
| chokidar | High inherited finding from braces remains. |
| micromatch | High inherited finding from braces remains. |
| fast-glob | High inherited finding from micromatch remains. |
| postcss-selector-parser | Moderate finding remains: pathological selectors can exhaust CPU. Tailwind 3 / postcss-nested require the affected parser line. |
| tailwindcss | High inherited build-chain findings remain. npm proposes a major upgrade; this requires a CSS migration and regression review. |

`postcss-nested` is additionally reported as moderately affected through selector-parser in the current dependency graph. The two underlying current advisory families are [braces stack exhaustion](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [selector parsing complexity](https://github.com/advisories/GHSA-rj75-hqrm-r3gf).

## Exposure and controls

Affected packages are development dependencies used to process repository CSS and filesystem patterns. The shipped browser does not execute this parser/watcher chain. App data is neither a Tailwind configuration nor build input. Untrusted CSS/glob configuration supplied to these tools could still cause denial of service in builds, dev servers or CI. Treat the original high advisory severity seriously; keep development servers local and build only reviewed source/configuration. CI has read-only repository permissions and no application/database secrets. Production-only audit fails CI on high findings; the seven full-audit findings remain visible here, rather than being represented as repaired.

ESLint 9 was initially evaluated but is [out of maintenance](https://eslint.org/version-support/). The final configuration uses maintained ESLint 10 with native JSX analysis and the compatible Hooks plugin; no unsupported peer dependency override is used. React 18, Zustand 4 and Tailwind 3 major versions are preserved. Vite 8's bundler migration was not combined with this change; Vite 7 removed the recorded advisories with less build churn.

## Planned remediation of remaining build findings

1. Create an isolated Tailwind 4 migration after this behavior baseline is accepted. Keep the current stylesheet/compiled output and screenshots as comparison evidence.
2. Follow the official [Tailwind upgrade guide](https://tailwindcss.com/docs/upgrade-guide). Update CSS entry/plugin/configuration and review defaults, borders, preflight, color/opacity and theme behavior. Do not use `npm audit fix --force` on the working application.
3. Build every view/dialog in all four themes, both modes, 320/390/768/1440 widths and doubled text; verify contrast and keyboard focus. Run lint, all strict checks and bundle budgets.
4. Re-run full and production audits. Confirm the actual affected chains disappeared and assess any new findings; do not substitute an arbitrary parser version under incompatible major requirements merely to silence the audit.
5. Publish only after reviewed CSS differences and supported Chrome/Edge acceptance. If a compatible upstream patch arrives first, test that smaller change against the same evidence.

This assessment completes the step's advisory review, not the outstanding dependency remediation or production release gate.

## Full-audit regression guard — v1.9.24 (2026-10-11)

Fresh [full audit](dependency-audit-v1.9.24.json) still reports seven affected development packages: five high and two moderate. [Production-only audit](dependency-production-audit-v1.9.24.json) remains zero. No dependency versions, CSS defaults or application behavior changed in this continuation. The audit trigger candidate was published to main at `05b4968`; [its remote checks passed](https://github.com/dailoclaw/ideas-pipeline/actions/runs/38104180153), including all 253 checks and compiled fixture smoke. This new guard is local and has not run remotely.

There is no published compatible patch: [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) has no patched release, and the available fixed selector-parser line is outside Tailwind 3/postcss-nested 6's declared major ranges. The reviewed Tailwind 4 migration remains necessary. Overriding incompatible parsers or force-fixing the audit would not establish compatibility.

`npm run check:dependencies` now checks the complete live npm audit against [the explicitly reviewed baseline](dependency-review-baseline.json). The CI workflow runs it alongside the existing separate production audit. It fails on a new affected package, new/changed advisory range or URL, increased severity, changed transitive advisory chain, malformed/failed feed, inconsistent counts, missing installed paths, or any reviewed finding moving outside development-only lockfile nodes. Timeout/network failures are failed checks, not evidence of zero findings. Known findings are printed as unresolved; successful comparison does not remove their severity or approve production.

The review is time-limited through **2026-11-10 UTC**; builds after that date fail until a human re-examines the current feed, package exposure and compatible remediation. Do not simply extend the date, copy new findings into the baseline, remove the CI command or disable the production audit to make a build pass. Resolved findings may disappear without failure; update evidence and remove obsolete baseline entries after confirming the fix. Review baseline changes as security decisions, including direct and transitive chains. Advisory wording-only changes do not require renewal; URL, affected range, severity and dependency changes do.

23 ordinary tests exercise accepted/removal cases and each failure class, including malformed responses, invalid dates/severities, expiry boundaries and production-path exposure. These verify the guard, not patched vulnerable packages. Real Edge/manual accessibility, live database acceptance and production rollout remain open. The planned Tailwind migration and its visual/keyboard acceptance criteria above are unchanged.
