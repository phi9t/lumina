# Learning Guide — Frontend & Visualization Design

This repo is built to be read. If you are new to React, SVG diagrams, or technical UI design, start here before diving into `src/`.

**Related docs**

- [design-principles.md](./design-principles.md) — product constraints (what the UI must *not* do)
- [README.md](../README.md) — stack, scripts, folder map

---

## What you can learn here

| Topic | Where it shows up |
|---|---|
| React state & props | `App.tsx`, selection flow into `DetailDrawer` |
| Responsive layout | `App.tsx` (Tailwind flex), three-column → stacked |
| SVG as UI | `TransformerBlockView.tsx`, `BranchCircuit.tsx`, RoPE views |
| Information architecture | Left = navigate, center = explain, right = control |
| Progressive disclosure | Click a module → drawer opens; Esc closes |
| Pure logic vs UI | `lib/ropeMath.ts`, `lib/layerModel.ts` |
| Accessible interactive SVG | `ModuleNode.tsx`, `JunctionNode.tsx` |
| Motion without distraction | Framer Motion in `App.tsx`, `DetailDrawer.tsx` |
| 2D-first RoPE workbench | `RopeWorkbench.tsx` — Identity / Cache / Spectrum SVG tabs |

---

## Mental model: three panels, one state owner

```text
┌─────────────────┬──────────────────────────┬─────────────────┐
│  LEFT           │  CENTER                  │  RIGHT          │
│  Navigation     │  Explanation             │  Controls       │
│  (compact SVG)  │  (DetailDrawer + RoPE)   │  (LayerDashboard)│
└─────────────────┴──────────────────────────┴─────────────────┘
         ▲                    ▲                        ▲
         └────────────────────┴────────────────────────┘
                         App.tsx
                    (single source of truth)
```

**Rule of thumb:** if changing a slider should update RoPE *and* the drawer, that value lives in `App.tsx` and is passed down as props. This is called **lifting state up** — a core React pattern.

Open `src/App.tsx` and find:

- `useState` — UI memory (what is selected, lens, layer config, RoPE positions)
- `useMemo` — derived data (`layerModel`) recomputed only when inputs change
- `useEffect` — side effects (global Esc listener)

---

## Suggested reading order

Read in this order the first time through. Each file builds on the previous one.

1. **`src/main.tsx`** — app bootstrap (10 lines)
2. **`src/types/blockSelection.ts`** — how “what is selected” is typed
3. **`src/App.tsx`** — layout + shared state
4. **`src/TransformerBlockView.tsx`** — SVG scene graph for the transformer block
5. **`src/components/block/BranchCircuit.tsx`** — one branch (Attention or FFN) wired to the mainline
6. **`src/components/block/ModuleNode.tsx`** — clickable SVG “button” module plate
7. **`src/components/block/DetailDrawer.tsx`** — center panel content keyed by selection
8. **`src/lib/layerModel.ts`** — numbers/formulas behind the dashboard
9. **`src/components/rope/RopeIdentityView.tsx`** — small, self-contained SVG visualization
10. **`src/lib/ropeMath.ts`** — pure math with unit tests (good template for testable UI logic)

After that, explore `RopeCacheView.tsx`, `RopeSpectrumView.tsx`, and `LayerDashboard.tsx` in any order.

---

## React patterns used in this project

### 1. Props down, events up

Parent owns state; children receive values and callbacks.

```tsx
// Parent (App.tsx)
const [selected, setSelected] = useState<SelectedModule>(null)
<TransformerBlockView selected={selected} onSelect={setSelected} />

// Child calls onSelect({ branch: 'attention', submodule: 'rope' })
// Parent re-renders; drawer receives new selected
```

### 2. Discriminated unions for selection

`SelectedModule` is either `null` or `{ branch, submodule }`. TypeScript narrows inside `if (selected?.branch === 'attention')` — safer than stringly-typed IDs alone.

### 3. Derived state with `useMemo`

`deriveLayerModel(layerConfig)` is expensive enough to memoize. Do **not** store derived values in separate `useState` unless the user can edit them independently.

### 4. Colocated content maps

`DetailDrawer.tsx` keeps a `DETAILS` record: selection key → title, formula, pseudocode. This keeps JSX readable and makes copy edits localized.

### 5. Always-on center panel

When nothing is selected, `DetailDrawer` still renders an **idle placeholder** (live readout + suggested entry points). The center column never collapses to empty space on wide layouts.

### 6. 2D-first RoPE (no Three.js)

RoPE visuals are SVG/HTML inside `RopeWorkbench` — Identity, Cache, and Spectrum tabs. Math stays in `lib/ropeMath.ts`; components map results to coordinates only.

---

## SVG visualization — how this app draws circuits

### Coordinates & `viewBox`

SVG uses a **fixed coordinate system**, not pixels on screen. `TransformerBlockView` sets:

```tsx
<svg viewBox="0 0 430 990" ...>
```

- `(0,0)` is top-left; `y` increases downward (like CSS, unlike math class).
- The browser scales the whole diagram to fit the container — layout stays crisp at any size.

Constants like `MAINLINE_X`, `Y_J1` in `TransformerBlockView.tsx` are **layout anchors**. Tweaking them moves entire regions; branch components receive them as props.

### Orthogonal wiring (right angles only)

Branch paths are explicit SVG path strings — horizontal (`H`) and vertical (`V`) segments only:

```tsx
const entryPath = `M ${mainlineX} ${teeY} H ${spineX} V ${preNormY}`
```

**Why:** circuit diagrams read as “signal flow.” Diagonal or Bezier curves look decorative and obscure merge points. See `BranchCircuit.tsx`.

### Components = reusable SVG groups

Each `<ModuleNode>` is an `<g>` (group) with:

- `<rect>` — plate background
- `<text>` — label / subtitle
- `role="button"`, `tabIndex={0}`, keyboard handler — because SVG has no native `<button>`

### Styling: CSS classes on SVG elements

Colors and strokes for the block diagram live in `index.css` under tokens like `--module-stroke-active`. SVG elements use `className="module-label"` — same idea as HTML, different elements.

### Separation: layout vs drawing vs interaction

| Layer | File | Responsibility |
|---|---|---|
| Scene layout | `TransformerBlockView.tsx` | Y positions, branch definitions |
| Branch geometry | `BranchCircuit.tsx` | Shell size, step gap, wire paths |
| Plate UI | `ModuleNode.tsx` | Hit target, focus ring, label stack |
| Explanation | `DetailDrawer.tsx` | Formulas, code — **not** on the left SVG |

This is the main **visualization design** lesson: *the diagram orients; the drawer teaches.*

---

## Information architecture & visual design

### Progressive disclosure

Users see a **small map** first. When nothing is selected, the center drawer shows an idle state with live dashboard readouts and suggested entry points. Details appear after selection; RoPE goes one level deeper (Identity / Cache / Spectrum tabs inside the drawer).

Avoid putting formulas on the navigation map — it violates [design-principles.md](./design-principles.md) and hurts legibility.

### Visual hierarchy

1. **Residual mainline** — thickest stroke, vertical center of attention
2. **Branch circuits** — secondary; tee off, return via `+` junction
3. **Module plates** — compact labels; micro-labels only when they fit
4. **Active selection** — cyan stroke with a subtle halo; inactive branches dim (see CSS tokens and `BranchCircuit` focus props)

### Industrial aesthetic (why it looks like this)

- Matte dark panels, 1px borders — reads as instrumentation, not marketing
- Monospace FiraCode — aligns numbers and tensor shapes
- Snappy motion (Framer `duration: ~0.3–0.5`) — feedback without slow orbit or heavy bloom
- Subtle accent glows on focus/selection are OK; avoid loud multi-hue gradients
- Squared wiring — matches schematic / EDA tools users may know from hardware

When iterating UI, change **tokens and spacing constants** before inventing new visual language.

### Responsive behavior

`App.tsx` uses Tailwind breakpoints (`xl:flex-row`). On narrow screens, columns stack: block → drawer → dashboard. Test at ~1280px and mobile widths when changing layout.

---

## CSS architecture (beginner map)

- **`@import 'tailwindcss'`** — utility classes in JSX (`className="flex-1 min-w-[320px]"`)
- **`@theme { ... }`** — design tokens (colors, block-diagram variables)
- **Component sections** — `.block-view-svg`, `.rope-identity__*`, dashboard panels

Prefer adding a token in `@theme` over hard-coding hex in a component.

---

## Testing & verification

- **Unit tests** — `src/lib/ropeMath.test.ts`, `layerModel.test.ts` (pure functions)
- **Smoke test** — `TransformerBlockView.test.tsx` (design invariant: no formulas in left SVG)
- **Full check** — `npm run check && npm run build`

When you add visualization logic, extract pure helpers to `lib/` and test there first.

---

## Try-it-yourself exercises

Small, safe edits to build intuition:

1. **Rename a module label** — `ATTENTION_BRANCH.steps` in `TransformerBlockView.tsx`; reload dev server.
2. **Shift a junction** — change `Y_J1` by ±20; watch branch spacing and read the dev warning in `BranchCircuit` if too tight.
3. **Add a drawer detail** — extend `DETAILS` in `DetailDrawer.tsx` for an existing selection key.
4. **New RoPE readout** — pass an extra derived value from `ropeMath.ts` into `RopeIdentityView` props.
5. **Theme tweak** — adjust `--module-stroke-active` in `index.css` and observe selection contrast.

---

## Glossary

| Term | In this repo |
|---|---|
| **Lens** | Dashboard mode: flow, shapes, compute, memory, parallelism |
| **Mainline** | Vertical residual stream (`x → x + …`) |
| **Branch** | Attention or FFN sideline that merges back with `+` |
| **Pre-norm** | LayerNorm before branch compute (plate on branch spine) |
| **Selection** | `{ branch, submodule }` or `null` |
| **Workbench** | RoPE tabbed views inside the Attention → RoPE drilldown |
| **viewBox** | SVG internal coordinate rectangle |
| **Lifted state** | Shared data stored in ancestor, passed via props |

---

## Getting help while reading code

- Search for `LEARNING NOTE` in `src/` — file headers point back to this guide.
- Run `npm run dev` and click each module while reading `DetailDrawer.tsx` side by side.
- Use browser DevTools → inspect SVG groups to see class names and structure.

If you improve this guide while learning, update the doc — that is a welcome contribution.
