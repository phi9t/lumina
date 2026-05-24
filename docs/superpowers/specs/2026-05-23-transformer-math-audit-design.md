# Transformer Math Audit Design

## Context

Lumina is a three-column transformer-layer workbench. The left SVG is a compact structural navigation diagram, the center drawer explains the selected module, and the right dashboard owns persistent RoPE and layer controls. The current implementation already has pure math helpers in `src/lib/ropeMath.ts`, layer accounting in `src/lib/layerModel.ts`, and selection-keyed detail copy in `src/components/block/DetailDrawer.tsx`.

The requested work is a deep review of the transformer math using two external references, then attaching the reviewed content to code and docs:

- JAX Scaling Book, "All the Transformer Math You Need to Know": https://jax-ml.github.io/scaling-book/transformers/
- JAX Scaling Book, "All About Transformer Inference": https://jax-ml.github.io/scaling-book/inference/
- Hugging Face Nanotron Ultra-Scale Playbook: https://huggingface.co/spaces/nanotron/ultrascale-playbook

The approved scope is:

1. Source-backed math audit of code formulas and tests.
2. Educational markdown notes that map source concepts to this repo's code.
3. Light in-app links or source cues only.

The UI must remain compact. The left transformer block must not gain formulas, tensor badges, accounting numbers, or textbook text.

## Goals

- Make `src/lib/layerModel.ts` the audited source of transformer accounting for parameters, forward FLOPs, training FLOPs, batch-wise KV cache bytes, activation-memory estimates, and approximation warnings.
- Keep `src/lib/ropeMath.ts` focused on RoPE frequency schedules and the relative-position dot-product identity.
- Add source-backed tests for the audited formulas.
- Add `docs/transformer-math-notes.md` as a paraphrased, cited guide from source concepts to Lumina implementation symbols.
- Add restrained UI references from the center drawer or dashboard to the markdown notes.

## Non-Goals

- No large in-app textbook panel.
- No formulas, tensor-shape badges, compute numbers, memory numbers, or pseudocode on the left SVG.
- No broad visual redesign.
- No full distributed-training simulator.
- No exact runtime memory predictor. Activation memory will be labeled as an estimate because kernels, framework internals, allocator behavior, recomputation policy, and sharding choices change real usage.

## Architecture

The implementation should enrich the existing math model instead of adding a parallel source of truth.

`App.tsx` remains the owner of `layerConfig`, `lens`, selected module, and RoPE state. It continues to call `deriveLayerModel(layerConfig)` and pass the result to the dashboard and detail drawer.

`deriveLayerModel` becomes more explicit:

- Named intermediate terms mirror the equations: Q params, K/V params, output-projection params, SwiGLU params, QK score FLOPs, attention-value FLOPs, forward matmul FLOPs, training matmul FLOPs, KV-cache bytes, and activation-memory estimate.
- FLOP fields distinguish forward estimates from training estimates. The JAX Scaling Book uses a `2x` matmul factor for forward and `6x` for forward plus backward training accounting, so the implementation must not blur these factors.
- Batch-wise KV cache accounting uses `B * 2 * T * L * K * H * bytes`. Docs should also mention the common per-cache formula `2 * S * L * K * H * bytes`, where `S` is cached context length and batch is omitted.
- Activation memory uses a Nanotron-style training estimate and is surfaced as approximate metadata, not as a precise allocation forecast.

`src/lib/ropeMath.ts` remains a pure RoPE helper module:

- `ropeTheta(pairIndex, headDim, base)` and `ropeFrequencies` describe the pairwise frequency schedule.
- `relativeIdentity` preserves the identity `(R_i q)^T (R_j k) = q^T R_{j-i} k`, with decode-facing clamping of future keys to the current token.
- Odd head dimensions should be documented as having `floor(H / 2)` RoPE pairs, leaving one unpaired channel.

## Components

### Layer Model Audit

Update `LayerModel` so consumers can read the distinction between module-local accounting and aggregate model accounting.

Expected high-level shape:

- `modules`: existing per-module accounting, with corrected formulas and clearer source cues.
- `totals`: params, forward FLOPs, training FLOPs, attention dot-product FLOPs, FFN FLOPs, and ratios.
- `kvCache`: batch-wise bytes, per-token bytes, per-sequence bytes, and formula string including `B`.
- `activationMemory`: approximate training bytes plus source note and recomputation caveat.
- `warnings`: invalid or approximate configuration warnings.

Exact TypeScript field names can follow the current code style, but the public structure should be stable enough for tests and docs to reference.

### Tests

Extend `src/lib/layerModel.test.ts` with source-derived invariants:

- GQA QKV params: `D * (N + 2K) * H`.
- Attention output projection params: `D * N * H`.
- SwiGLU FFN params: `3 * D * F`.
- Forward matmul FLOPs use `2 * B * T * params`.
- Training matmul FLOPs use `6 * B * T * params`.
- Attention score/value FLOPs scale with `T^2`.
- Batch-wise KV cache bytes use `B * 2 * T * L * K * H * precisionBytes`.
- Activation-memory estimate grows linearly with `B`, `L`, and `D`, and quadratically with `T`.
- Warning cases include mismatched `D / N` vs `H` and `N % K !== 0`.

Keep `src/lib/ropeMath.test.ts` focused on RoPE identity and frequency behavior. Add only minimal boundary tests if RoPE implementation changes require them.

### Documentation

Add `docs/transformer-math-notes.md`.

The document should use Lumina notation consistently:

- `B`: batch size
- `T`: query/current sequence length in the app controls
- `S`: cached context length when distinct from `T`
- `D`: model width
- `N`: query heads
- `K`: KV heads
- `G`: query heads per KV group, when useful for GQA explanation
- `H`: per-head dimension
- `F`: FFN hidden width
- `L`: layer count

Required sections:

- Notation and source links
- Residual stream and pre-norm block equation
- QKV projection and GQA shape accounting
- RoPE frequency pairs and relative-position identity
- Scaled dot-product attention and causal/decode interpretation
- SwiGLU FFN params and FLOPs
- Forward vs training FLOP factors
- KV cache memory, including batch-wise app formula and per-cache source formula
- Activation memory and recomputation caveats
- Parallelism cues used by the app lens labels
- Code map from formulas to files/functions

The doc must paraphrase source material and cite links. It must not paste long book sections.

### Light UI References

Keep UI changes restrained:

- Add a short "Math notes" link or source cue in the center drawer or dashboard.
- Keep detail drawer formulas concise.
- Do not add a new top-level page.
- Do not change the left transformer SVG information density.

## Data Flow

The flow remains:

```text
LayerDashboard controls -> App layerConfig -> deriveLayerModel(layerConfig)
                         -> DetailDrawer module accounting
                         -> LayerDashboard totals, KV cache, warnings
```

`docs/transformer-math-notes.md` references the code symbols, but the docs do not become a runtime dependency.

UI copy references the markdown notes through static links/source cues. Runtime math still comes from `deriveLayerModel`.

## Error Handling and Constraints

The math layer should warn, not crash, for slider-reachable approximate configurations:

- `D` not divisible by `N`.
- `D / N !== H`.
- `N % K !== 0` for GQA grouping.
- `K > N`, if ever passed to `deriveLayerModel` directly.

Ratios must guard against zero denominators even though the dashboard sliders avoid zero.

The dashboard setter should continue enforcing `K <= N` and deriving `H = D / N` when divisible.

Activation memory must be labeled as a training estimate. It should not imply exact peak HBM usage.

## Verification

Run:

```bash
npm run check
npm run build
```

The expected test coverage is mostly unit-level because this work changes formulas and copy more than interaction behavior. Existing component tests should continue to cover the left SVG invariant that formulas stay out of the navigation diagram.

## Acceptance Criteria

- `deriveLayerModel` exposes source-backed, test-covered accounting for params, forward FLOPs, training FLOPs, batch-wise KV cache memory, activation memory, and warnings.
- Existing dashboard/detail consumers still render without adding new app state.
- `docs/transformer-math-notes.md` exists, is cited, and maps formulas to implementation symbols.
- UI changes are limited to lightweight links/source cues.
- `npm run check` and `npm run build` pass.
