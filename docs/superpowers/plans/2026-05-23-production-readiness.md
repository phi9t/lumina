# Production Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden the RoPE visualizer repository for production-style development, CI verification, deployment, and maintainable iteration.

**Architecture:** Keep the app as a static Vite React app. Move heavyweight optional 3D code behind `React.lazy`, keep the left transformer map and center workbench as the primary path, and add repository-level quality gates.

**Tech Stack:** React 19, Vite 8, TypeScript, Vitest, ESLint, GitHub Actions, Three.js via React Three Fiber.

---

### Task 1: Repo Hygiene

**Files:**
- Modify: `.gitignore`
- Remove from git: `.antigravitycli/e531e4e1-8253-4e3d-ab3a-c2df784d22ea.json`
- Remove from git: `.cursor/hooks/state/continual-learning.json`
- Remove unused assets if unreferenced: `src/assets/react.svg`, `src/assets/vite.svg`, `src/assets/hero.png`

- [ ] Remove tracked local metadata with `git rm`.
- [ ] Ignore `.cursor/`, `.antigravitycli/`, screenshots, coverage, and Vite env files.
- [ ] Confirm `rg` finds no references to stale assets before removal.

### Task 2: Quality Scripts and CI

**Files:**
- Modify: `package.json`
- Create: `.github/workflows/ci.yml`

- [ ] Add `typecheck` and `check` scripts.
- [ ] Add CI that runs `npm ci`, `npm run check`, and uploads no artifacts.

### Task 3: Optional 3D Code Split

**Files:**
- Modify: `src/components/rope/RopeWorkbench.tsx`
- Modify: `src/components/rope/RopeScene3D.tsx`
- Create: `src/components/rope/ropeTypes.ts`
- Modify type-only imports from `RopeThreeJSVisualizer`.

- [ ] Move `RopeStateProps` into a type-only module with no Three.js imports.
- [ ] Lazy-load `RopeScene3D` only when the details disclosure opens.
- [ ] Keep the 3D panel optional and non-primary.

### Task 4: Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/design-principles.md`

- [ ] Document install, development, verification, build/preview, architecture, and deployment notes.
- [ ] Add production checklist and design hierarchy notes.

### Task 5: Verification and Commit

**Files:**
- All modified files.

- [ ] Run `npm run check`.
- [ ] Run `npm run build`.
- [ ] Confirm `git status --short`.
- [ ] Commit with `chore: harden production readiness`.

## Self-Review

- Scope coverage: repo hygiene, scripts, bundle split, CI, docs, verification are all covered.
- Placeholder scan: no TBD/TODO placeholders are present.
- Type consistency: `RopeStateProps` moves to `src/components/rope/ropeTypes.ts` and all imports should reference that type-only module.
