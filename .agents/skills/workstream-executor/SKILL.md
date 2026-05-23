---
name: workstream-executor
description: Use when asked to execute, continue, review, or plan tracked repo-local workstreams under .workstreams/<slug>/ with design.md and tracker.org files.
---

# Workstream Executor

Use this skill for repo-local workstreams stored at `.workstreams/<slug>/`.

## Expected Structure

Each workstream contains:

- `design.md`: approved design, scope, constraints, and acceptance criteria.
- `tracker.org`: Emacs Org task tracker with TODO states and task properties.

## Workflow

1. Identify the workstream slug from the user request or list `.workstreams/`.
2. Read `.workstreams/<slug>/design.md` first.
3. Read `.workstreams/<slug>/tracker.org` and choose the first `TODO` or `NEXT` task unless the user names a task.
4. Mark exactly one task `IN-PROGRESS` before editing code.
5. Implement only that task's scope. Do not bundle unrelated tracker tasks.
6. Run the task's `:VERIFY:` command, then run broader checks if the touched code warrants it.
7. Mark the task `DONE` only after verification passes. If blocked, mark it `BLOCKED` and add a short reason under the task.
8. Summarize changed files, verification, and the next remaining task.

## Editing Rules

- Keep `design.md` stable unless the user changes scope.
- Update `tracker.org` as the source of progress truth.
- Preserve Org syntax and task properties.
- Respect existing user changes; do not reset or revert unrelated files.
- If a task needs decomposition, add child TODOs under that task rather than inventing a second tracker.

## Verification

Prefer the task's `:VERIFY:` property. If missing, use repo-standard checks such as:

- `npm test`
- `npm run lint`
- `npm run build`

When UI/canvas behavior changes, run browser verification where available and report what was checked.
