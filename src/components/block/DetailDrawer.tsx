import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { RopeDetailPanel, type RopeStateProps } from '@/RopeThreeJSVisualizer'
import { selectionKey, type SelectedModule } from '@/types/blockSelection'

interface DetailDrawerProps {
  selected: SelectedModule
  ropeState: RopeStateProps
  onClose: () => void
}

interface DetailMeta {
  title: string
  subtitle: string
  formula?: string
  shapes?: string
  code?: string
  body?: string
}

const DETAILS: Record<string, DetailMeta> = {
  'attention:rope': {
    title: 'RoPE · rotary position embedding',
    subtitle: 'Position changes the coordinate frame of every (d2k, d2k+1) pair',
    formula: '(R_i q)ᵀ (R_j k) = qᵀ R_{j−i} k',
    shapes: 'q, k: [B, T, n_heads, d_head] → [B, T, n_heads, d_head]',
    code: 'q_rotated = apply_rotary_emb(q, freqs_cis)\nk_rotated = apply_rotary_emb(k, freqs_cis)',
    body: 'Each disk is one 2D pair; the magenta edge is the attention score between current token i and a cached key j.',
  },
  'attention:ln': {
    title: 'LayerNorm (pre-attention)',
    subtitle: 'Normalize residual before computing Q, K, V',
    formula: 'x̂ = (x − μ) / σ',
    shapes: 'x: [B, T, d_model] → [B, T, d_model]',
    code: 'x_norm = F.layer_norm(x, x.shape[-1:], weight, bias, eps)',
  },
  'attention:qkv': {
    title: 'QKV projection',
    subtitle: 'Linear map from d_model to three heads worth of features',
    formula: 'Q,K,V = x̂ Wq, x̂ Wk, x̂ Wv',
    shapes: 'x: [B, T, d_model] → Q,K,V: [B, T, n_heads, d_head]',
    code: 'qkv = F.linear(x, qkv_weight)\nq, k, v = qkv.chunk(3, dim=-1)\nq = q.view(B, T, n_heads, d_head)',
  },
  'attention:softmax': {
    title: 'Scaled dot-product attention',
    subtitle: 'Softmax over keys 0…i; values are mixed accordingly',
    formula: 'A = softmax(QKᵀ / √d) · V',
    shapes: 'Q,K,V: [B, T, n_heads, d_head] → [B, T, n_heads, d_head]',
    code: 'scores = torch.matmul(q, k.transpose(-2, -1)) / math.sqrt(d_head)\nattn = F.softmax(scores, dim=-1)\nout = torch.matmul(attn, v)',
  },
  'attention:oproj': {
    title: 'Output projection',
    subtitle: 'Mix heads back to d_model before adding to residual',
    formula: 'attn_out = concat(heads) · Wo',
    shapes: 'out: [B, T, n_heads, d_head] → [B, T, d_model]',
    code: 'out = out.transpose(1, 2).contiguous().view(B, T, d_model)\nres = F.linear(out, o_weight)',
  },
  'ffn:ln': {
    title: 'LayerNorm (pre-FFN)',
    subtitle: 'Second pre-norm before the feed-forward branch',
    formula: 'x̂ = (x − μ) / σ',
    shapes: 'x: [B, T, d_model] → [B, T, d_model]',
    code: 'x_norm = F.layer_norm(x, x.shape[-1:], weight, bias, eps)',
  },
  'ffn:up': {
    title: 'Up projection',
    subtitle: 'Expand to a higher inner dimension (typically 4·d)',
    formula: 'h = x̂ · W_up',
    shapes: 'x: [B, T, d_model] → [B, T, d_ffn]',
    code: 'gate = F.linear(x, gate_proj)\nup = F.linear(x, up_proj)',
  },
  'ffn:act': {
    title: 'Activation (SwiGLU / GELU)',
    subtitle: 'Pointwise non-linearity introduces the only non-linearity in the block',
    formula: 'a = σ(h₁) ⊙ h₂',
    shapes: 'gate, up: [B, T, d_ffn] → [B, T, d_ffn]',
    code: 'a = F.silu(gate) * up',
  },
  'ffn:down': {
    title: 'Down projection',
    subtitle: 'Map back to d_model so the branch can add into the residual',
    formula: 'ffn_out = a · W_down',
    shapes: 'a: [B, T, d_ffn] → [B, T, d_model]',
    code: 'out = F.linear(a, down_proj)',
  },
  'mainline:in': {
    title: 'Residual stream — x_in',
    subtitle: 'The protagonist. Every branch reads from and writes back to this stream.',
    formula: 'x ∈ ℝ^{T × d}',
    shapes: 'x: [B, T, d_model]',
  },
  'mainline:out': {
    title: 'Residual stream — x_out',
    subtitle: 'After both branches add their corrections',
    formula: 'x_out = x + Attn(LN(x)) + FFN(LN(x + Attn(LN(x))))',
    shapes: 'x_out: [B, T, d_model]',
  },
  'mainline:junction1': {
    title: 'Residual addition · attention',
    subtitle: 'The attention branch is a correction term added to the residual',
    formula: "x' = x + Attn(LN(x))",
    shapes: 'x, attn_out: [B, T, d_model] → [B, T, d_model]',
    code: 'x = x + attn_out',
  },
  'mainline:junction2': {
    title: 'Residual addition · FFN',
    subtitle: 'The FFN branch is another correction; matches the residual-modeling principle',
    formula: "x'' = x' + FFN(LN(x'))",
    shapes: 'x, ffn_out: [B, T, d_model] → [B, T, d_model]',
    code: 'x = x + ffn_out',
  },
}

function DetailPlaceholder({ meta }: { meta: DetailMeta }) {
  return (
    <div className="detail-placeholder">
      {meta.formula && <div className="detail-formula">{meta.formula}</div>}
      {meta.shapes && <div className="detail-shapes">{meta.shapes}</div>}
      {meta.code && <div className="detail-code-block">{meta.code}</div>}
      {meta.body && <p className="detail-body">{meta.body}</p>}
      <p className="detail-hint">Drill-down for this module is not yet implemented. Click another module or press Esc to return.</p>
    </div>
  )
}

export function DetailDrawer({ selected, ropeState, onClose }: DetailDrawerProps) {
  return (
    <AnimatePresence mode="wait">
      {selected && (
        <motion.div
          key={selectionKey(selected)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="detail-drawer"
        >
          <DetailHeader selected={selected} onClose={onClose} />
          <DetailBody selected={selected} ropeState={ropeState} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function DetailHeader({ selected, onClose }: { selected: NonNullable<SelectedModule>; onClose: () => void }) {
  const key = selectionKey(selected)
  const meta = DETAILS[key] ?? { title: key, subtitle: '' }
  return (
    <div className="detail-drawer__header">
      <div className="detail-drawer__crumbs">
        <span className="detail-drawer__crumb">{selected.branch}</span>
        <span className="detail-drawer__sep">›</span>
        <span className="detail-drawer__crumb detail-drawer__crumb--current">{selected.submodule}</span>
      </div>
      <div className="detail-drawer__titles">
        <div className="detail-drawer__title">{meta.title}</div>
        <div className="detail-drawer__subtitle">{meta.subtitle}</div>
      </div>
      <button className="detail-drawer__close" onClick={onClose} aria-label="Close detail">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

function DetailBody({ selected, ropeState }: { selected: NonNullable<SelectedModule>; ropeState: RopeStateProps }) {
  const key = selectionKey(selected)
  const meta = DETAILS[key] ?? { title: key, subtitle: '' }

  if (key === 'attention:rope') {
    return (
      <div className="detail-drawer__body detail-drawer__body--rope">
        <RopeDetailPanel {...ropeState} />
      </div>
    )
  }

  return (
    <div className="detail-drawer__body">
      <DetailPlaceholder meta={meta} />
    </div>
  )
}
