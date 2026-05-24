# Post-readiness correctness, accessibility, and cleanup design

## Goal

Convert `docs/rfcs/0001-post-readiness-correctness-and-a11y.md` into executable repo-local work that closes the remaining correctness, accessibility, and cleanup gaps after the production-readiness pass.

The desired end state is a cleaner transformer-layer explorer that keeps the same visual/product direction while making the SVG block keyboard-accessible, removing misleading or dead surfaces, and consolidating duplicated RoPE state/math helpers.

## Source

- RFC: `docs/rfcs/0001-post-readiness-correctness-and-a11y.md`
- Existing product contract: `docs/design-principles.md`
- Prior workstream: `.workstreams/rope-workbench-legibility/`

## Accepted decisions

- P1: approve. Add a clarifying comment around the slowest RoPE pair convention.
- P2: approve. Restore keyboard access for selectable SVG block elements.
- P3: approve. Clamp branch step spacing to a positive minimum and warn in dev if the branch span is too tight.
- P4: choose Option B. Cut unused badge plumbing instead of projecting lens badges into the left SVG.
- P5: approve. Prune dead component/API/CSS surfaces as a cleanup task.
- P6: approve. Rename `RopeThreeJSVisualizer.tsx` to a dashboard-focused name.
- P7: approve with the RFC caveat: centralize demo Q/K bases for runtime code while tests may keep local fixtures.
- P8: choose Option A. Use read-side clamping through a derived effective `j`.
- P9: approve. Add a tiny `relativeDelta` helper.
- P10: approve. Add a focused design-invariant smoke test for the left SVG.

## Scope

This workstream is scoped to the ten RFC proposals. It should not change the visual direction, add new RoPE views, add a multi-layer transformer view, or rewrite the large CSS file beyond the dead-surface removals needed by the RFC.

## Implementation approach

Work should proceed as small tracker tasks in RFC order, with each task marked `IN-PROGRESS` before edits and `DONE` only after its `:VERIFY:` command passes.

The tasks are intentionally grouped by review concern:

- Accessibility and correctness first.
- Latent layout safety second.
- Cleanup and rename work after behavior is stable.
- Small math/state consolidations after the rename to avoid import churn.
- Test invariant last, because it adds test dependencies.

## Acceptance criteria

- `docs/rfcs/0001-post-readiness-correctness-and-a11y.md` is tracked and linked from this workstream.
- `.agents/skills/workstream-executor/SKILL.md` explains how to execute RFC-derived workstreams.
- Each RFC proposal P1-P10 has a corresponding tracker task or an explicit task grouping.
- For completed implementation tasks, the tracker records `DONE` only after the task verification command passes.
- The final workstream passes `npm run check && npm run build`.
