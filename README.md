# RoPE Visualizer

Interactive transformer-layer and rotary-position-embedding workbench built with React, Vite, TypeScript, and Tailwind CSS.

The app focuses on one pre-norm decoder layer:

- Left: compact transformer block map for selection.
- Center: module explanations, tensor paths, formulas, pseudocode, and RoPE workbench views.
- Right: persistent layer controls, source-concept lenses, and live accounting readouts.

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
npm run test       # Vitest unit tests
npm run lint       # ESLint
npm run typecheck  # TypeScript project build check
npm run check      # test + lint + typecheck
npm run build      # typecheck + production Vite build
npm run preview    # serve the production build locally
```

## Architecture

- `src/TransformerBlockView.tsx` renders the compact SVG transformer block map.
- `src/components/block/DetailDrawer.tsx` owns module detail explanations and routes the RoPE drilldown.
- `src/components/rope/RopeWorkbench.tsx` provides the RoPE Identity, Cache, and Spectrum tabs.
- `src/components/rope/RopeScene3D.tsx` contains the optional 3D reference scene and is lazy-loaded.
- `src/RopeThreeJSVisualizer.tsx` contains the right-hand transformer layer dashboard.
- `src/lib/layerModel.ts` derives layer accounting, lens copy, and KV cache estimates.
- `src/lib/ropeMath.ts` contains pure RoPE math helpers covered by unit tests.

## Production Notes

- The project builds to static assets in `dist/`.
- The optional Three.js scene is code-split behind the `3D reference` disclosure.
- Vite's chunk warning limit is set to account for that optional WebGL reference chunk; the primary app bundle remains separate.
- CI runs `npm ci`, `npm run check`, and `npm run build` on pushes and pull requests to `main`.
- Local agent/editor state is intentionally ignored by git.

## Deployment

Any static host that can serve Vite output works:

```bash
npm ci
npm run build
```

Deploy the generated `dist/` directory.

## Design Principles

See [docs/design-principles.md](docs/design-principles.md).
