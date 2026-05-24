# <Workstream Title> Design

## Goal

One paragraph: what changes for the user and why it's worth doing now. State the desired end state, not the implementation path.

## Source

- RFC (if any): `docs/rfcs/<NNNN>-<slug>.md`
- Product contract: `docs/design-principles.md`, `AGENTS.md`
- Prior workstreams that this builds on: `.workstreams/<other-slug>/`

## Accepted Decisions

Numbered, terse, irreversible-feeling. One line per decision so the executor can cite them in commit messages.

- D1: <decision>
- D2: <decision>

For RFC intake, mirror the RFC's proposal IDs:

- P1: approve. <one-line clarification>
- P2: choose Option A because <reason>.
- P3: defer — owner decision needed; tracked as a BLOCKED task.

## Scope

Bullet list of the user-visible surfaces this workstream touches. Be specific about files, components, or product flows.

## Non-Goals

Bullet list of nearby work this workstream **will not** do. This is the firewall the executor uses to refuse scope creep.

## Acceptance Criteria

Checkable, testable statements. Each one should map to at least one tracker task's `:VERIFY:`.

- The workstream passes `npm run check && npm run build`.
- <user-visible criterion 1>
- <user-visible criterion 2>

## Risks / Open Questions (optional)

Anything the executor should escalate as a BLOCKED decision task rather than guess.
