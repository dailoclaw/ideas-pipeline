# IdeaFlow repair tracking

When performing work from the functional audit repair plan:

- Read `docs/repair-plan.json` and `docs/REPAIR_PLAN.md` before starting.
- Update the plan after verified work in each step, including partial progress, evidence, unresolved blockers and user-directed deferrals. Never mark a task complete based only on code being present or a TODO test outcome.
- Keep the original 12-step scope and acceptance criteria unless the user changes them. Distinguish local-only completion from a live database backup or remote staging setup.
- Regenerate `docs/repair-plan.html` with `npm run plan:render` before reporting progress. Increment the plan version for each delivered update and create an immutable versioned snapshot with `npm run plan:render -- --snapshot`.
- Show the latest HTML tracker to the user with the step result. Do not alter past snapshots or existing review assets.
- Production application fixes are separate from tracker changes; follow inherited versioning and verification instructions for both.
