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
