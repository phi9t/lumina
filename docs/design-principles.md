# RoPE Visualizer Design Principles

> **New to the codebase?** Read [learning-guide.md](./learning-guide.md) for a tour of React patterns, SVG layout, and why the three-column structure exists.

## Product Role

This app is an interactive technical workbench, not a landing page. The interface should help users inspect one transformer layer, select modules, and explore RoPE mechanics without competing visual systems.

## Information Hierarchy

- Left: compact transformer block map for orientation and selection.
- Center: detailed explanation, tensor shapes, formulas, pseudocode, and RoPE workbench views.
- Right: persistent controls, lens selection, and live numeric readouts.

The left block should not carry the full explanation. If text is explanatory rather than orienting, move it to the center drawer.

## Visual System

- Use a strict industrial technical style: matte panels, carbon/slate backgrounds, 1px borders, squared wiring, and restrained shadows.
- Avoid glow-heavy, floaty, pastel, or generic SaaS-dashboard decoration.
- Keep typography consistent with FiraCode Nerd Font and the existing dashboard scale.
- Use compact module plates on the left; reserve larger text blocks for the center drawer.

## Transformer Block Rules

- Show the residual stream prominently as the main vertical rail.
- Show Attention and FFN/SwiGLU as secondary branch circuits that merge through explicit `+` junctions.
- Keep the left SVG labels short: module names only where possible.
- Do not place tensor-shape badges, formulas, compute numbers, memory numbers, or pseudocode in the left SVG.
- Preserve orthogonal right-angle wiring and avoid decorative branch curves.

## RoPE Workbench Rules

- RoPE exploration belongs in the Attention drilldown.
- Prefer 2D explanatory views first: Identity, Cache, Spectrum.
- Keep the 3D view optional and supporting.
- KV cache timelines run left to right: earliest token on the left, current token on the right.

## Codex UI Iteration Rule

Codex should execute against concrete constraints: screenshots, component scale, token values, spacing targets, and local design patterns. Avoid broad aesthetic rewrites unless the user provides a new visual direction.

## Production Constraints

- Keep the first-load path focused on the 2D workbench and dashboard.
- Lazy-load optional WebGL/Three.js surfaces.
- Do not commit local agent state, generated screenshots, coverage, or build output.
- Changes should pass `npm run check` and `npm run build` before commit.
