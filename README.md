# RoPE Visualizer

Interactive transformer-layer and rotary-position-embedding workbench for exploring one pre-norm decoder layer.

The app is built as a technical inspection surface rather than a landing page. It keeps the transformer block compact, puts detailed math in the center drawer, and preserves a persistent right-hand control dashboard for live layer/accounting changes.

## Current Experience

- **Left:** compact SVG transformer block map with residual mainline, Attention branch, FFN/SwiGLU branch, and residual `+` merges.
- **Center:** selected-module detail drawer with tensor path, source cue, formula, accounting metrics, and implementation-style pseudocode.
- **RoPE drilldown:** Identity, Cache, and Spectrum views for interactively exploring rotary position behavior.
- **Right:** transformer layer controls, source-concept lenses, KV cache estimates, and live compute/memory/shape readouts.
- **Optional 3D:** a lazily loaded `3D reference` scene for RoPE, kept secondary to the 2D workbench.

## Stack

- React 19
- Vite 8
- TypeScript 6
- Tailwind CSS 4
- Framer Motion
- Radix Slider
- React Three Fiber / Drei / Three.js for the optional 3D reference
- Vitest and ESLint for local verification

## Requirements

- Node.js 22 or newer
- npm 10 or newer

## Development

```bash
npm ci
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

## Scripts

```bash
npm run test       # Run Vitest unit tests
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript project checks
npm run check      # Run test + lint + typecheck
npm run build      # Run typecheck + production Vite build
npm run preview    # Serve the production build locally
```

## Project Structure

```text
src/
  App.tsx                         # Three-column app layout and shared state
  TransformerBlockView.tsx        # Compact SVG transformer block selector
  RopeThreeJSVisualizer.tsx       # Right-hand layer dashboard and controls
  components/block/               # SVG block primitives and detail drawer
  components/rope/                # RoPE workbench, 2D views, lazy 3D scene
  components/ui/                  # Small local UI primitives
  lib/layerModel.ts               # Layer accounting, lenses, KV cache estimates
  lib/ropeMath.ts                 # Pure RoPE math helpers
  types/blockSelection.ts         # Shared selected-module types
```

Supporting docs:

- `docs/design-principles.md` captures the product/design constraints.
- `.workstreams/rope-workbench-legibility/` contains the completed workstream design and tracker.
- `docs/superpowers/plans/2026-05-23-production-readiness.md` records the production-hardening plan.

## Architecture Notes

- The left transformer block is intentionally a compact navigation map. It avoids inline formulas, tensor badges, and accounting text.
- Detailed explanations live in `DetailDrawer`, backed by `layerModel`.
- RoPE 2D workbench views are primary:
  - `RopeIdentityView` shows absolute vs relative dot-product identity.
  - `RopeCacheView` shows left-to-right KV cache behavior.
  - `RopeSpectrumView` shows fast-to-slow RoPE frequency pairs.
- `RopeScene3D` is code-split with `React.lazy` and only loads when the user opens `3D reference`.
- `ropeTypes.ts` holds shared RoPE state types without importing Three.js.

## Verification

Before committing changes, run:

```bash
npm run check
npm run build
```

CI runs the same checks on pushes and pull requests to `main` via `.github/workflows/ci.yml`.

## Production Build

```bash
npm ci
npm run build
```

The static output is written to `dist/` and can be deployed to any static host.

The primary app bundle is separated from the optional WebGL reference scene. Vite's chunk warning limit is set to allow the lazy Three.js chunk while keeping the main app path smaller.

## Design Direction

The UI should remain a strict industrial technical workbench:

- Matte carbon/slate surfaces
- Sharp borders and squared circuit wiring
- FiraCode Nerd Font labels
- Compact left-side navigation diagram
- Center-first math/detail explanations
- Right-side persistent controls

See [docs/design-principles.md](docs/design-principles.md) for the full design contract.
