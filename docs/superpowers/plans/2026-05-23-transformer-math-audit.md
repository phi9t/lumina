# Transformer Math Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit Lumina's transformer math against the JAX Scaling Book and Nanotron Ultra-Scale Playbook, then attach the reviewed formulas to tests, docs, and light in-app source links.

**Architecture:** Keep `deriveLayerModel(layerConfig)` as the single runtime source of transformer accounting. Add explicit forward-vs-training FLOP fields while preserving existing display fields, add batch-wise KV-cache and activation-memory estimates, and document the formulas in a new markdown note. The UI receives only a small math-notes link; the left SVG remains a compact navigation diagram.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Vitest, ESLint, Tailwind CSS 4.

---

## File Structure

- Modify `src/lib/layerModel.ts`: audited accounting formulas, richer return shape, source-backed warnings.
- Modify `src/lib/layerModel.test.ts`: formula invariants and warning tests.
- Keep `src/lib/ropeMath.ts` behavior stable unless a boundary note requires a tiny test-only clarification.
- Create `docs/transformer-math-notes.md`: paraphrased formula guide with source links and code map.
- Create `src/lib/mathSources.ts`: static links used by UI copy.
- Modify `src/components/block/DetailDrawer.tsx`: add a restrained math-notes link in the center drawer.
- Modify `src/index.css`: style the drawer link with existing industrial tokens.
- Optionally modify `README.md`: add the math notes to the supporting docs list.

The worktree currently has unrelated uncommitted changes. Before each commit, run `git status --short` and stage only files owned by the current task. Do not stage unrelated dirty files.

---

### Task 1: Write Failing Layer Accounting Tests

**Files:**
- Modify: `src/lib/layerModel.test.ts`
- Read: `docs/superpowers/specs/2026-05-23-transformer-math-audit-design.md`

- [ ] **Step 1: Replace the layer model tests with source-derived invariants**

Use `apply_patch` to replace `src/lib/layerModel.test.ts` with:

```ts
import { describe, expect, test } from 'vitest'
import { DEFAULT_LAYER_CONFIG, deriveLayerModel } from './layerModel'

describe('deriveLayerModel', () => {
  test('derives GQA-aware params and batch-wise KV cache bytes', () => {
    const model = deriveLayerModel(DEFAULT_LAYER_CONFIG)

    expect(model.modules.qkv.inputShape).toBe('B,T,D')
    expect(model.modules.qkv.outputShape).toBe('Q: B,T,N,H · K,V: B,T,K,H')
    expect(model.modules.qkv.params).toBe(25_165_824)
    expect(model.modules.oproj.params).toBe(16_777_216)
    expect(model.modules.ffnUp.params + model.modules.ffnDown.params).toBe(176_160_768)
    expect(model.kvCache.bytes).toBe(536_870_912)
    expect(model.kvCache.perTokenBytes).toBe(131_072)
    expect(model.kvCache.perSequenceBytes).toBe(536_870_912)
    expect(model.kvCache.formula).toBe('B * 2 * T * L * K * H * bytes')
  })

  test('distinguishes forward FLOPs from training FLOPs', () => {
    const model = deriveLayerModel(DEFAULT_LAYER_CONFIG)

    expect(model.modules.qkv.forwardFlops).toBe(206_158_430_208)
    expect(model.modules.qkv.trainingFlops).toBe(618_475_290_624)
    expect(model.modules.qkv.flops).toBe(model.modules.qkv.forwardFlops)
    expect(model.totals.forwardFlops).toBe(model.totals.flops)
    expect(model.totals.trainingFlops).toBeGreaterThan(model.totals.forwardFlops)
  })

  test('shows attention dot-product compute growing faster than FFN compute as context grows', () => {
    const shortContext = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, seqLen: 128 })
    const longContext = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, seqLen: 32768 })

    expect(shortContext.totals.attentionToFfnRatio).toBeLessThan(1)
    expect(longContext.totals.attentionToFfnRatio).toBeGreaterThan(1)
    expect(longContext.totals.attentionDotFlops).toBeGreaterThan(shortContext.totals.attentionDotFlops * 1000)
  })

  test('scales KV cache memory across batch size', () => {
    const oneRequest = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, batch: 1 })
    const threeRequests = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, batch: 3 })

    expect(threeRequests.kvCache.bytes).toBe(oneRequest.kvCache.bytes * 3)
    expect(threeRequests.kvCache.perSequenceBytes).toBe(oneRequest.kvCache.perSequenceBytes)
    expect(threeRequests.kvCache.perTokenBytes).toBe(oneRequest.kvCache.perTokenBytes)
  })

  test('estimates training activation memory with batch and sequence sensitivity', () => {
    const base = deriveLayerModel(DEFAULT_LAYER_CONFIG)
    const doubleBatch = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, batch: DEFAULT_LAYER_CONFIG.batch * 2 })
    const doubleSequence = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, seqLen: DEFAULT_LAYER_CONFIG.seqLen * 2 })

    expect(base.activationMemory.bytes).toBe(104_152_956_928)
    expect(doubleBatch.activationMemory.bytes).toBe(base.activationMemory.bytes * 2)
    expect(doubleSequence.activationMemory.bytes).toBeGreaterThan(base.activationMemory.bytes * 2)
    expect(base.activationMemory.formula).toBe('L * T * B * D * (34 + 5 * N * T / D)')
  })

  test('reports approximation warnings for invalid head geometry', () => {
    const mismatchedHeadDim = deriveLayerModel({ ...DEFAULT_LAYER_CONFIG, dModel: 4097 })
    const nonDivisibleGroups = deriveLayerModel({
      ...DEFAULT_LAYER_CONFIG,
      dModel: 1024,
      numHeads: 8,
      numKvHeads: 3,
      headDim: 128,
    })
    const tooManyKvHeads = deriveLayerModel({
      ...DEFAULT_LAYER_CONFIG,
      dModel: 1024,
      numHeads: 8,
      numKvHeads: 12,
      headDim: 128,
    })

    expect(mismatchedHeadDim.warnings).toContain('D is not divisible by N; H and accounting are approximate.')
    expect(nonDivisibleGroups.warnings).toContain('N is not divisible by K; GQA grouping is approximate.')
    expect(tooManyKvHeads.warnings).toContain('K exceeds N; KV-head accounting is outside standard GQA/MQA assumptions.')
  })
})
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run:

```bash
npm run test -- src/lib/layerModel.test.ts
```

Expected: FAIL because `forwardFlops`, `trainingFlops`, `activationMemory`, `perTokenBytes`, `perSequenceBytes`, and the new warnings do not exist yet.

---

### Task 2: Implement Audited Layer Accounting

**Files:**
- Modify: `src/lib/layerModel.ts`
- Test: `src/lib/layerModel.test.ts`

- [ ] **Step 1: Replace `src/lib/layerModel.ts` with the audited model**

Use `apply_patch` to replace the file with:

```ts
export type Lens = 'flow' | 'shapes' | 'compute' | 'memory' | 'parallelism'

export interface LayerConfig {
  batch: number
  seqLen: number
  dModel: number
  numHeads: number
  numKvHeads: number
  headDim: number
  ffnDim: number
  layers: number
  precisionBytes: 1 | 2 | 4
  mode: 'training' | 'prefill' | 'decode'
}

export interface ModuleAccounting {
  id: string
  inputShape: string
  outputShape: string
  params: number
  flops: number
  forwardFlops: number
  trainingFlops: number
  memoryBytes: number
  summary: string
  sourceCue: string
  parallelism: string[]
}

export interface LayerModel {
  config: LayerConfig
  modules: {
    attentionLn: ModuleAccounting
    qkv: ModuleAccounting
    rope: ModuleAccounting
    attention: ModuleAccounting
    oproj: ModuleAccounting
    ffnLn: ModuleAccounting
    ffnUp: ModuleAccounting
    ffnAct: ModuleAccounting
    ffnDown: ModuleAccounting
    residualAdd1: ModuleAccounting
    residualAdd2: ModuleAccounting
  }
  totals: {
    params: number
    flops: number
    forwardFlops: number
    trainingFlops: number
    attentionFlops: number
    attentionDotFlops: number
    ffnFlops: number
    attentionToFfnRatio: number
  }
  kvCache: {
    bytes: number
    perTokenBytes: number
    perSequenceBytes: number
    formula: string
  }
  activationMemory: {
    bytes: number
    formula: string
    note: string
  }
  warnings: string[]
}

export const DEFAULT_LAYER_CONFIG: LayerConfig = {
  batch: 1,
  seqLen: 4096,
  dModel: 4096,
  numHeads: 32,
  numKvHeads: 8,
  headDim: 128,
  ffnDim: 14336,
  layers: 32,
  precisionBytes: 2,
  mode: 'decode',
}

export const LENS_EXPLANATIONS: Record<Lens, string> = {
  flow: 'Follow the residual stream: pre-norm branches read from it, compute corrections, then add back through + junctions.',
  shapes: 'Track exact matrix sizes with B,T,D,N,K,H,F so MHA, GQA, and FFN width stay concrete.',
  compute: 'Compare per-layer matmul cost: FFN dominates many normal contexts, while attention grows quadratically with T.',
  memory: 'Separate temporary activations from persistent decode state; KV cache scales with B, T, L, K, H, and precision.',
  parallelism: 'Map layer-local pressure points: TP splits matmuls, SP/CP touch sequence and attention, EP appears when FFN becomes MoE.',
}

const TRAINING_MATMUL_FACTOR = 6
const FORWARD_MATMUL_FACTOR = 2

function forwardMatmulFlops(config: LayerConfig, params: number) {
  return FORWARD_MATMUL_FACTOR * config.batch * config.seqLen * params
}

function trainingMatmulFlops(config: LayerConfig, params: number) {
  return TRAINING_MATMUL_FACTOR * config.batch * config.seqLen * params
}

function activationBytes(config: LayerConfig, width: number) {
  return config.batch * config.seqLen * width * config.precisionBytes
}

function makeAccounting(input: Omit<ModuleAccounting, 'flops'>): ModuleAccounting {
  return {
    ...input,
    flops: input.forwardFlops,
  }
}

function safeRatio(numerator: number, denominator: number) {
  if (denominator === 0) return 0
  return numerator / denominator
}

export function formatCount(value: number): string {
  if (value >= 1e12) return `${(value / 1e12).toFixed(2)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`
  return value.toLocaleString()
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 ** 4) return `${(bytes / 1024 ** 4).toFixed(2)} TiB`
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(2)} MiB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KiB`
  return `${bytes.toLocaleString()} B`
}

export function deriveLayerModel(config: LayerConfig): LayerModel {
  const warnings: string[] = []
  if (config.dModel % config.numHeads !== 0 || config.dModel / config.numHeads !== config.headDim) {
    warnings.push('D is not divisible by N; H and accounting are approximate.')
  }
  if (config.numHeads % config.numKvHeads !== 0) {
    warnings.push('N is not divisible by K; GQA grouping is approximate.')
  }
  if (config.numKvHeads > config.numHeads) {
    warnings.push('K exceeds N; KV-head accounting is outside standard GQA/MQA assumptions.')
  }

  const qWidth = config.numHeads * config.headDim
  const kvWidth = config.numKvHeads * config.headDim
  const qParams = config.dModel * qWidth
  const kParams = config.dModel * kvWidth
  const vParams = config.dModel * kvWidth
  const qkvParams = qParams + kParams + vParams
  const oprojParams = qWidth * config.dModel
  const ffnUpParams = config.dModel * config.ffnDim * 2
  const ffnDownParams = config.ffnDim * config.dModel
  const attentionScoreForwardFlops =
    FORWARD_MATMUL_FACTOR * config.batch * config.numHeads * config.seqLen * config.seqLen * config.headDim
  const attentionValueForwardFlops = attentionScoreForwardFlops
  const attentionDotForwardFlops = attentionScoreForwardFlops + attentionValueForwardFlops
  const attentionDotTrainingFlops = TRAINING_MATMUL_FACTOR * config.batch * config.seqLen * config.seqLen * config.numHeads * config.headDim
  const qkvForwardFlops = forwardMatmulFlops(config, qkvParams)
  const qkvTrainingFlops = trainingMatmulFlops(config, qkvParams)
  const oprojForwardFlops = forwardMatmulFlops(config, oprojParams)
  const oprojTrainingFlops = trainingMatmulFlops(config, oprojParams)
  const ffnUpForwardFlops = forwardMatmulFlops(config, ffnUpParams)
  const ffnUpTrainingFlops = trainingMatmulFlops(config, ffnUpParams)
  const ffnDownForwardFlops = forwardMatmulFlops(config, ffnDownParams)
  const ffnDownTrainingFlops = trainingMatmulFlops(config, ffnDownParams)
  const kvCachePerTokenBytes = 2 * config.layers * config.numKvHeads * config.headDim * config.precisionBytes
  const kvCachePerSequenceBytes = config.seqLen * kvCachePerTokenBytes
  const kvCacheBytes = config.batch * kvCachePerSequenceBytes
  const activationMemoryBytes =
    config.layers *
    config.seqLen *
    config.batch *
    config.dModel *
    (34 + (5 * config.numHeads * config.seqLen) / config.dModel)

  const modules = {
    attentionLn: makeAccounting({
      id: 'attention:ln',
      inputShape: 'B,T,D',
      outputShape: 'B,T,D',
      params: 2 * config.dModel,
      forwardFlops: 5 * config.batch * config.seqLen * config.dModel,
      trainingFlops: 15 * config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Pre-normalizes the residual stream before attention reads it.',
      sourceCue: 'pre-norm residual block',
      parallelism: ['SP'],
    }),
    qkv: makeAccounting({
      id: 'attention:qkv',
      inputShape: 'B,T,D',
      outputShape: 'Q: B,T,N,H · K,V: B,T,K,H',
      params: qkvParams,
      forwardFlops: qkvForwardFlops,
      trainingFlops: qkvTrainingFlops,
      memoryBytes: activationBytes(config, qWidth + 2 * kvWidth),
      summary: 'Projects residual features into query heads and grouped key/value heads.',
      sourceCue: 'GQA projections: D*(N+2K)*H params',
      parallelism: ['TP'],
    }),
    rope: makeAccounting({
      id: 'attention:rope',
      inputShape: 'Q: B,T,N,H · K: B,T,K,H',
      outputShape: 'rotated Q,K with unchanged shape',
      params: 0,
      forwardFlops: 4 * config.batch * config.seqLen * (qWidth + kvWidth),
      trainingFlops: 8 * config.batch * config.seqLen * (qWidth + kvWidth),
      memoryBytes: activationBytes(config, qWidth + kvWidth),
      summary: 'Applies position-dependent rotations to 2D pairs inside Q and K.',
      sourceCue: 'relative position through rotary embeddings',
      parallelism: ['SP'],
    }),
    attention: makeAccounting({
      id: 'attention:softmax',
      inputShape: 'Q: B,T,N,H · K,V: B,T,K,H',
      outputShape: 'B,T,N,H',
      params: 0,
      forwardFlops: attentionDotForwardFlops,
      trainingFlops: attentionDotTrainingFlops,
      memoryBytes: config.batch * config.numHeads * config.seqLen * config.seqLen * config.precisionBytes,
      summary: 'Scores every query against visible keys, softmaxes over positions, then mixes values.',
      sourceCue: 'dot attention: forward 4*B*T^2*N*H, train 12*B*T^2*N*H',
      parallelism: ['TP', 'CP'],
    }),
    oproj: makeAccounting({
      id: 'attention:oproj',
      inputShape: 'B,T,N,H',
      outputShape: 'B,T,D',
      params: oprojParams,
      forwardFlops: oprojForwardFlops,
      trainingFlops: oprojTrainingFlops,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Mixes attention heads back into the residual width.',
      sourceCue: 'attention output projection',
      parallelism: ['TP'],
    }),
    ffnLn: makeAccounting({
      id: 'ffn:ln',
      inputShape: 'B,T,D',
      outputShape: 'B,T,D',
      params: 2 * config.dModel,
      forwardFlops: 5 * config.batch * config.seqLen * config.dModel,
      trainingFlops: 15 * config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Pre-normalizes the post-attention residual before the dense FFN.',
      sourceCue: 'pre-norm residual block',
      parallelism: ['SP'],
    }),
    ffnUp: makeAccounting({
      id: 'ffn:up',
      inputShape: 'B,T,D',
      outputShape: 'gate/up: B,T,F',
      params: ffnUpParams,
      forwardFlops: ffnUpForwardFlops,
      trainingFlops: ffnUpTrainingFlops,
      memoryBytes: activationBytes(config, config.ffnDim * 2),
      summary: 'Expands residual features into SwiGLU gate and value streams.',
      sourceCue: 'SwiGLU input projections: 2*D*F params',
      parallelism: ['TP'],
    }),
    ffnAct: makeAccounting({
      id: 'ffn:act',
      inputShape: 'gate/up: B,T,F',
      outputShape: 'B,T,F',
      params: 0,
      forwardFlops: 8 * config.batch * config.seqLen * config.ffnDim,
      trainingFlops: 16 * config.batch * config.seqLen * config.ffnDim,
      memoryBytes: activationBytes(config, config.ffnDim),
      summary: 'Applies the SwiGLU non-linearity before projecting back down.',
      sourceCue: 'elementwise activation cost is lower order than matmuls',
      parallelism: ['SP'],
    }),
    ffnDown: makeAccounting({
      id: 'ffn:down',
      inputShape: 'B,T,F',
      outputShape: 'B,T,D',
      params: ffnDownParams,
      forwardFlops: ffnDownForwardFlops,
      trainingFlops: ffnDownTrainingFlops,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Projects the expanded FFN representation back to the residual width.',
      sourceCue: 'SwiGLU output projection: D*F params',
      parallelism: ['TP'],
    }),
    residualAdd1: makeAccounting({
      id: 'mainline:junction1',
      inputShape: 'B,T,D + B,T,D',
      outputShape: 'B,T,D',
      params: 0,
      forwardFlops: config.batch * config.seqLen * config.dModel,
      trainingFlops: 2 * config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Adds the attention branch correction into the residual stream.',
      sourceCue: 'residual addition',
      parallelism: ['SP'],
    }),
    residualAdd2: makeAccounting({
      id: 'mainline:junction2',
      inputShape: 'B,T,D + B,T,D',
      outputShape: 'B,T,D',
      params: 0,
      forwardFlops: config.batch * config.seqLen * config.dModel,
      trainingFlops: 2 * config.batch * config.seqLen * config.dModel,
      memoryBytes: activationBytes(config, config.dModel),
      summary: 'Adds the FFN branch correction into the residual stream.',
      sourceCue: 'residual addition',
      parallelism: ['SP'],
    }),
  }

  const moduleList = Object.values(modules)
  const params = moduleList.reduce((sum, module) => sum + module.params, 0)
  const forwardFlops = moduleList.reduce((sum, module) => sum + module.forwardFlops, 0)
  const trainingFlops = moduleList.reduce((sum, module) => sum + module.trainingFlops, 0)
  const ffnForwardFlops = modules.ffnUp.forwardFlops + modules.ffnAct.forwardFlops + modules.ffnDown.forwardFlops

  return {
    config,
    modules,
    totals: {
      params,
      flops: forwardFlops,
      forwardFlops,
      trainingFlops,
      attentionFlops: attentionDotForwardFlops,
      attentionDotFlops: attentionDotForwardFlops,
      ffnFlops: ffnForwardFlops,
      attentionToFfnRatio: safeRatio(attentionDotForwardFlops, ffnForwardFlops),
    },
    kvCache: {
      bytes: kvCacheBytes,
      perTokenBytes: kvCachePerTokenBytes,
      perSequenceBytes: kvCachePerSequenceBytes,
      formula: 'B * 2 * T * L * K * H * bytes',
    },
    activationMemory: {
      bytes: activationMemoryBytes,
      formula: 'L * T * B * D * (34 + 5 * N * T / D)',
      note: 'Training activation memory estimate; runtime peak depends on kernels, allocator behavior, sharding, and recomputation policy.',
    },
    warnings,
  }
}
```

- [ ] **Step 2: Run the focused test**

Run:

```bash
npm run test -- src/lib/layerModel.test.ts
```

Expected: PASS for all `deriveLayerModel` tests.

- [ ] **Step 3: Run typecheck for consumer compatibility**

Run:

```bash
npm run typecheck
```

Expected: PASS. If TypeScript reports a UI consumer expecting old fields, keep the old field as an alias rather than removing the consumer path.

- [ ] **Step 4: Commit the audited math model**

Run:

```bash
git status --short
git add src/lib/layerModel.ts src/lib/layerModel.test.ts
git commit -m "feat: audit transformer layer accounting"
```

Expected: commit includes only `src/lib/layerModel.ts` and `src/lib/layerModel.test.ts`.

---

### Task 3: Add Transformer Math Notes

**Files:**
- Create: `docs/transformer-math-notes.md`
- Optionally modify: `README.md`

- [ ] **Step 1: Create the markdown notes**

Use `apply_patch` to create `docs/transformer-math-notes.md`:

```md
# Transformer Math Notes

These notes map Lumina's interactive transformer-layer model to the source material used for the math audit. They paraphrase the references and use this repo's notation so code, tests, and UI copy stay aligned.

## Sources

- JAX Scaling Book, "All the Transformer Math You Need to Know": https://jax-ml.github.io/scaling-book/transformers/
- JAX Scaling Book, "All About Transformer Inference": https://jax-ml.github.io/scaling-book/inference/
- Hugging Face Nanotron Ultra-Scale Playbook: https://huggingface.co/spaces/nanotron/ultrascale-playbook

## Notation

| Symbol | Meaning in Lumina |
|---|---|
| `B` | Batch size |
| `T` | Sequence length in the app controls |
| `S` | Cached context length when it differs from `T` |
| `D` | Model width, `d_model` |
| `N` | Query attention heads |
| `K` | Key/value heads |
| `G` | Query heads per KV group, `N / K` when divisible |
| `H` | Per-head dimension |
| `F` | FFN hidden width |
| `L` | Layer count |

## Residual Stream And Pre-Norm

Lumina shows a modern pre-norm decoder block:

```text
x1 = x0 + Attention(LN(x0))
x2 = x1 + FFN(LN(x1))
```

The left SVG emphasizes the residual stream as the main vertical rail. LayerNorm plates sit outside the Attention and FFN shells because each branch reads a normalized view of the residual stream, computes a correction, and merges through a residual add.

## QKV And GQA Shapes

For grouped-query attention:

```text
x: [B, T, D]
Q: [B, T, N, H]
K: [B, T, K, H]
V: [B, T, K, H]
```

The QKV projection parameter count is:

```text
D * (N + 2K) * H
```

The output projection maps `[B, T, N, H]` back to `[B, T, D]` and has:

```text
D * N * H
```

When `K = N`, this is standard multi-head attention. When `K = 1`, it is multi-query attention. When `1 < K < N` and `N` is divisible by `K`, each KV head serves `G = N / K` query heads.

## RoPE

RoPE rotates each two-channel pair in Q and K by a position-dependent angle. Lumina's helper uses:

```text
theta(pair) = 1 / base^(2 * pair / H)
```

For one 2D pair, the useful identity is:

```text
(R_i q)^T (R_j k) = q^T R_(j - i) k
```

The RoPE views clamp future key positions during decode so the highlighted key is never to the right of the current query token. Odd `H` values have `floor(H / 2)` complete RoPE pairs and one unpaired channel.

## Scaled Dot-Product Attention

The attention branch computes scores, normalizes over visible key positions, and mixes values:

```text
scores = Q @ K^T / sqrt(H)
P = softmax(scores + causal_mask)
out = P @ V
```

For full self-attention with `S = T`, forward dot-product attention is modeled as:

```text
4 * B * T^2 * N * H
```

The corresponding training estimate is:

```text
12 * B * T^2 * N * H
```

Causal kernels can avoid work for masked positions, but Lumina keeps the full-shape estimate visible because it matches the conceptual `[T, T]` attention matrix and keeps the scaling legible.

## SwiGLU FFN

Lumina models a gated FFN:

```text
gate = x @ W_gate
up = x @ W_up
a = silu(gate) * up
out = a @ W_down
```

With `W_gate: [D, F]`, `W_up: [D, F]`, and `W_down: [F, D]`, the FFN parameter count is:

```text
3 * D * F
```

Forward matmul FLOPs use `2 * B * T * params`. Training matmul FLOPs use `6 * B * T * params`, accounting for forward plus backward matrix multiplications.

## KV Cache

For one cached sequence, the common inference formula is:

```text
2 * S * L * K * H * bytes
```

The leading `2` stores both keys and values. Lumina's dashboard is batch-aware, so its displayed cache estimate is:

```text
B * 2 * T * L * K * H * bytes
```

This is why reducing `K` through GQA or MQA reduces decode memory without changing the number of query heads `N`.

## Activation Memory

Lumina exposes a Nanotron-style mixed-precision training activation estimate:

```text
L * T * B * D * (34 + 5 * N * T / D)
```

This is a teaching estimate, not an exact HBM peak. Real memory depends on kernel fusion, allocator behavior, framework internals, sharding, and recomputation policy. It is still useful because it shows the important scaling: activations grow with batch size and layer count, and the attention term grows with sequence length.

## Parallelism Cues

Lumina's lens labels are intentionally local to one layer:

- `TP`: tensor parallelism for large QKV, output, and FFN matmuls.
- `SP`: sequence-parallel or sequence-local work such as norms, elementwise activation, residual adds, and RoPE.
- `CP`: context-parallel pressure around long-context attention.
- `EP`: expert parallelism appears when the dense FFN is replaced by MoE; Lumina only hints at it.

## Code Map

| Concept | Code |
|---|---|
| Layer config and accounting | `src/lib/layerModel.ts` |
| Formula invariants | `src/lib/layerModel.test.ts` |
| RoPE identity and frequencies | `src/lib/ropeMath.ts` |
| RoPE unit tests | `src/lib/ropeMath.test.ts` |
| Center drawer formulas and pseudocode | `src/components/block/DetailDrawer.tsx` |
| Dashboard controls and summary metrics | `src/components/dashboard/LayerDashboard.tsx` |
| Left transformer map invariant | `src/TransformerBlockView.test.tsx` |
```

- [ ] **Step 2: Link the notes from README supporting docs**

If `README.md` still has the supporting docs list shown in the current worktree, add this bullet in that list:

```md
- `docs/transformer-math-notes.md` maps source-backed transformer formulas to the implementation.
```

Stage only this README hunk if the file has unrelated local changes.

- [ ] **Step 3: Verify the notes have no draft markers**

Run:

```bash
rg -n "T[B]D|T[O]DO|F[I]XME|place-holder" docs/transformer-math-notes.md
```

Expected: no output and exit code `1`.

- [ ] **Step 4: Commit the math notes**

Run:

```bash
git status --short
git add docs/transformer-math-notes.md
git add -p README.md
git commit -m "docs: add transformer math notes"
```

Expected: commit includes `docs/transformer-math-notes.md` and only the README hunk that links it, if that hunk was added.

---

### Task 4: Add Light In-App Source Links

**Files:**
- Create: `src/lib/mathSources.ts`
- Modify: `src/components/block/DetailDrawer.tsx`
- Modify: `src/index.css`
- Test: `src/TransformerBlockView.test.tsx`

- [ ] **Step 1: Add shared source URLs**

Use `apply_patch` to create `src/lib/mathSources.ts`:

```ts
export const MATH_NOTES_URL =
  'https://github.com/phi9t/lumina/blob/main/docs/transformer-math-notes.md'

export const TRANSFORMER_MATH_SOURCE_URLS = {
  jaxTransformers: 'https://jax-ml.github.io/scaling-book/transformers/',
  jaxInference: 'https://jax-ml.github.io/scaling-book/inference/',
  nanotronPlaybook: 'https://huggingface.co/spaces/nanotron/ultrascale-playbook',
} as const
```

- [ ] **Step 2: Add the drawer link**

In `src/components/block/DetailDrawer.tsx`, add this import with the existing imports:

```ts
import { MATH_NOTES_URL } from '@/lib/mathSources'
```

Then replace the existing hint line:

```tsx
<p className="detail-hint">Estimates are per layer unless a metric explicitly includes all layers.</p>
```

with:

```tsx
<p className="detail-hint">
  Estimates are per layer unless a metric explicitly includes all layers.{' '}
  <a className="detail-source-link" href={MATH_NOTES_URL} target="_blank" rel="noreferrer">
    Math notes
  </a>
</p>
```

- [ ] **Step 3: Style the drawer link**

In `src/index.css`, add this block immediately after `.detail-hint`:

```css
.detail-source-link {
  color: rgba(165, 243, 252, 0.9);
  text-decoration: none;
  border-bottom: 1px solid rgba(165, 243, 252, 0.45);
}

.detail-source-link:hover {
  color: rgba(236, 254, 255, 0.98);
  border-bottom-color: rgba(236, 254, 255, 0.72);
}
```

- [ ] **Step 4: Verify the left SVG invariant still passes**

Run:

```bash
npm run test -- src/TransformerBlockView.test.tsx
```

Expected: PASS. This confirms source-link work did not add dense math copy to the left navigation SVG.

- [ ] **Step 5: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit the UI source link**

Run:

```bash
git status --short
git add src/lib/mathSources.ts src/components/block/DetailDrawer.tsx src/index.css
git commit -m "feat: link transformer math notes from drawer"
```

Expected: commit includes only `src/lib/mathSources.ts`, `src/components/block/DetailDrawer.tsx`, and `src/index.css`.

---

### Task 5: Full Verification

**Files:**
- Read: all changed files

- [ ] **Step 1: Run the full project check**

Run:

```bash
npm run check
```

Expected: PASS for Vitest, ESLint, and TypeScript.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: PASS and Vite writes `dist/`. Do not commit `dist/`.

- [ ] **Step 3: Inspect final status**

Run:

```bash
git status --short
```

Expected: task-owned files are committed. Pre-existing unrelated dirty files may still appear; do not modify or stage them.

- [ ] **Step 4: Summarize changed behavior**

Report these points:

```text
- Layer accounting now separates forward FLOPs from training FLOPs.
- KV cache estimates are batch-wise: B * 2 * T * L * K * H * bytes.
- Activation memory is exposed as a training estimate with caveats.
- docs/transformer-math-notes.md maps source-backed formulas to code.
- The center drawer links to the math notes; the left SVG remains formula-free.
```

---

## Self-Review

- Spec coverage: Tasks 1 and 2 cover audited formulas, batch-wise KV cache, activation memory, warnings, and tests. Task 3 covers the source-backed markdown notes. Task 4 covers light in-app links without changing the left SVG. Task 5 covers required verification.
- Draft-marker scan: this plan contains no incomplete sections.
- Type consistency: `ModuleAccounting.flops` remains a forward-pass alias for existing UI consumers; new explicit fields are `forwardFlops` and `trainingFlops`. `LayerModel.totals.flops` remains a forward-pass alias for the dashboard, with new explicit `forwardFlops` and `trainingFlops` fields.
