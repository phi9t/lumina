# RoPE Workbench and Transformer Layer Legibility Design

## Goal

Upgrade the current one-layer transformer explorer so concepts from the Scaling Book and Ultra-Scale Playbook are easier to explore interactively, with special focus on readable left-hand transformer modules and a deeper RoPE drilldown covering relative-position math, KV cache mechanics, and frequency spectrum behavior.

## Current State

The app already has a residual-first transformer layer view, lens selector, layer accounting model, structured module drilldowns, and a RoPE detail panel. The main gaps are visual legibility and RoPE explanatory depth.

Key current issues:

- Left-hand SVG module labels and lens badges are too small at normal desktop width.
- Badge text can become dense enough to compete with module labels.
- The RoPE detail is still primarily a 3D scene, which is visually interesting but does not make the core identity or frequency-spectrum behavior obvious.
- `RopeThreeJSVisualizer.tsx` mixes dashboard controls, math helpers, and the 3D scene, making further RoPE expansion risky.

## Source Concepts To Preserve

The Scaling Book emphasizes exact transformer matrix sizes, parameters, FLOPs, KV-cache size, and when attention matters relative to FFN. The Ultra-Scale Playbook emphasizes memory usage, compute efficiency, communication overhead, and local relevance of TP/SP/CP/EP/ZeRO-style concepts.

This project should keep these concepts explorable through one transformer layer rather than adding a broad multi-GPU simulator.

## Design

### 1. Left Transformer Layer Legibility

Increase readability by resizing and simplifying rather than only increasing CSS font-size.

- Increase internal module plate width and height enough for larger text.
- Use approximate SVG font sizes:
  - module labels: 18-20
  - module subtitles: 13-14
  - micro labels and lens badges: 11-12
  - shell titles: 15-16
- Shorten SVG lens badge strings and move detailed numbers to the drawer/dashboard.
  - Shapes: `Q:B,T,N,H K/V:B,T,K,H`
  - Compute: compact count such as `41.9B ops`
  - Memory: compact byte count
  - Parallelism: `TP`, `SP`, `CP` chips only
- Keep residual mainline dominant, Attention and FFN/SwiGLU secondary, and right-angle wiring unchanged.
- Avoid overlap among module label, subtitle, micro label, and badge at all lens states.

### 2. Source Concept Discoverability

Keep the existing lens model, but improve each lens with a concise reason-it-matters sentence in the dashboard:

- Flow: residual stream and pre-norm branch corrections.
- Shapes: exact matrix sizes and GQA/MQA/MHA head structure.
- Compute: per-layer matmul FLOPs and attention-vs-FFN growth with sequence length.
- Memory: activation and KV-cache scaling.
- Parallelism: memory/compute/communication tradeoffs and where TP/SP/CP/EP applies locally.

The drawer remains the source of detailed explanations; the SVG stays compact.

### 3. RoPE Workbench

Selecting Attention -> RoPE opens a dedicated RoPE workbench with an internal segmented control:

`Identity | Cache | Spectrum`

A shared readout row stays visible above all tabs:

- `i`
- `j`
- `delta = j - i`
- selected frequency pair `n`
- `theta_n`
- selected pair score

#### Identity View

Make `(R_i q)^T(R_j k)=q^T R_{j-i}k` visually obvious.

- Show two synchronized 2D panels:
  - Absolute frame: `R_i q` and `R_j k`.
  - Relative frame: `q` and `R_delta k`.
- Display equal dot-product scores in both panels.
- Include a small equality bridge between the panels.
- Use large labels: `R_i q`, `R_j k`, `q`, `R_delta k`.
- Provide a frequency-pair selector; default to pair 0.

#### Cache View

Connect RoPE to decode-time KV cache behavior.

- Timeline runs left to right: earliest token left, current token right.
- Cache cells show K/V slots, not only points.
- Highlight selected key `j`, current query `i`, and fan edges from `i` to visible cache slots `0...i`.
- Include live KV-cache formula and result from the layer model:
  - `2 * T * L * K * H * bytes`
- Show mode hint:
  - decode: append one K/V slot and score current Q against cached K.
  - prefill/training: compute all positions together.

#### Spectrum View

Explain fast/slow pair behavior, phase wrap, and base/head-dim effects.

- Render frequency pairs from fastest to slowest.
- Each pair shows:
  - `theta_n`
  - `|delta| * theta_n`
  - wrap count or cycle progress
  - compact circular glyph or mini bar
- Highlight the pair selected in the Identity view.
- Updating `base` or `headDim` updates this view live.
- Include short copy explaining that fast pairs wrap quickly and slow pairs preserve longer-range distinctions.

### 4. RoPE Implementation Decomposition

Create focused units rather than expanding `RopeThreeJSVisualizer.tsx` further.

- `src/lib/ropeMath.ts`: pure helpers for frequencies, rotation, dot products, identity values, phase gaps, and wrap counts.
- `src/components/rope/RopeWorkbench.tsx`: owns internal tab and selected frequency-pair state.
- `src/components/rope/RopeIdentityView.tsx`: 2D SVG identity explanation.
- `src/components/rope/RopeCacheView.tsx`: SVG/HTML KV-cache timeline.
- `src/components/rope/RopeSpectrumView.tsx`: frequency-pair spectrum.
- `src/components/rope/RopeScene3D.tsx`: optional simplified retained Three.js disks.

`DetailDrawer.tsx` renders `RopeWorkbench` for `attention:rope`.

`App.tsx` continues to own selected module, lens, layer config, and RoPE controls.

### 5. Testing and Verification

Add unit tests for `ropeMath`:

- relative identity score equality
- frequency schedule response to `base` and `headDim`
- phase gap and wrap count for known values
- compatibility with the layer-model KV-cache formula

Run existing verification:

- `npm test`
- `npm run lint`
- `npm run build`

Browser/manual checks:

- left transformer labels readable at default desktop width
- SVG badges do not overlap labels in all lenses
- RoPE Identity shows equal scores in absolute and relative frames
- Cache view shows earliest-left/current-right, selected `j`, current `i`, and live KV cache bytes
- Spectrum view updates when `base` or `headDim` changes
- mobile layout stacks without text overflow

## Non-Goals

- Do not build a full distributed training simulator.
- Do not make RoPE a separate top-level page.
- Do not add long copied text from the source materials.
- Do not replace the residual-first one-layer architecture view.

## Approved Direction

Use the RoPE Workbench approach: keep the main layer explorer, improve LHS legibility, and make the RoPE drilldown a focused interactive workbench covering identity, cache, and spectrum.
