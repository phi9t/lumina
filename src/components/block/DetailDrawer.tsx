/**
 * DetailDrawer — center panel: formulas, shapes, pseudocode, and RoPE workbench.
 */
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { RopeStateProps } from '@/components/rope/ropeTypes'
import { RopeWorkbench, type RopeWorkbenchTab } from '@/components/rope/RopeWorkbench'
import { MATH_NOTES_URL } from '@/lib/mathSources'
import type { LayerModel, Lens, ModuleAccounting } from '@/lib/layerModel'
import { formatBytes, formatCount } from '@/lib/layerModel'
import { selectionKey, type SelectedModule } from '@/types/blockSelection'

interface DetailDrawerProps {
  selected: SelectedModule
  ropeState: RopeStateProps
  lens: Lens
  layerModel: LayerModel
  onClose: () => void
  onSelectModule: (sel: SelectedModule) => void
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
    shapes: 'x: [B, T, d_model] → Q: [B, T, n_heads, d_head] · K,V: [B, T, num_kv_heads, d_head]',
    code: 'qkv = F.linear(x, qkv_weight)\nq_width = num_heads * d_head\nkv_width = num_kv_heads * d_head\nq, k, v = torch.split(qkv, [q_width, kv_width, kv_width], dim=-1)\nq = q.view(B, T, num_heads, d_head)\nk = k.view(B, T, num_kv_heads, d_head)\nv = v.view(B, T, num_kv_heads, d_head)',
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

const IDLE_SUGGESTIONS: Array<{ label: string; selection: SelectedModule }> = [
  { label: 'Attention → RoPE', selection: { branch: 'attention', submodule: 'rope' } },
  { label: 'Attention → softmax', selection: { branch: 'attention', submodule: 'softmax' } },
  { label: 'FFN → up proj', selection: { branch: 'ffn', submodule: 'up' } },
]

const LENS_LABELS: Record<Lens, string> = {
  flow: 'Flow',
  shapes: 'Shapes',
  compute: 'Compute',
  memory: 'Memory',
  parallelism: 'Parallelism',
}

function defaultWorkbenchTab(key: string): RopeWorkbenchTab {
  if (key === 'attention:softmax' || key === 'attention:qkv') return 'cache'
  if (key === 'attention:rope') return 'identity'
  return 'identity'
}

function showsRopeWorkbench(key: string): boolean {
  return key === 'attention:rope' || key === 'attention:softmax' || key === 'attention:qkv'
}

function accountingFor(key: string, model: LayerModel): ModuleAccounting | null {
  const lookup: Record<string, ModuleAccounting> = {
    'attention:ln': model.modules.attentionLn,
    'attention:qkv': model.modules.qkv,
    'attention:rope': model.modules.rope,
    'attention:softmax': model.modules.attention,
    'attention:oproj': model.modules.oproj,
    'ffn:ln': model.modules.ffnLn,
    'ffn:up': model.modules.ffnUp,
    'ffn:act': model.modules.ffnAct,
    'ffn:down': model.modules.ffnDown,
    'mainline:junction1': model.modules.residualAdd1,
    'mainline:junction2': model.modules.residualAdd2,
  }
  return lookup[key] ?? null
}

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-metric">
      <span className="detail-metric__label">{label}</span>
      <span className="detail-metric__value">{value}</span>
    </div>
  )
}

function ShapeRenderer({ shapeString }: { shapeString: string }) {
  if (!shapeString) return null
  const parts = shapeString.split(/(→|\[.*?\])/g).filter(Boolean)
  return (
    <div className="shape-row">
      {parts.map((part, i) => {
        const trimmed = part.trim()
        if (!trimmed) return null
        if (trimmed.startsWith('[')) {
          return <span key={i} className="shape-pill">{trimmed}</span>
        }
        return <span key={i}>{trimmed}</span>
      })}
    </div>
  )
}

function DetailExplorer({
  meta,
  accounting,
  lens,
  cacheChip,
}: {
  meta: DetailMeta
  accounting: ModuleAccounting | null
  lens: Lens
  cacheChip?: ReactNode
}) {
  return (
    <div className="detail-explorer">
      <div className="detail-section">
        <div className="detail-section__label">What it does</div>
        <p className="detail-body">{accounting?.summary ?? meta.subtitle}</p>
      </div>

      <div className="detail-grid">
        <div className="detail-section">
          <div className="detail-section__label">Tensor path</div>
          <div className="detail-shapes">
            <ShapeRenderer shapeString={accounting ? `${accounting.inputShape} → ${accounting.outputShape}` : meta.shapes || ''} />
          </div>
        </div>
        <div className="detail-section">
          <div className="detail-section__label">Source cue</div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="detail-source-cue"
          >
            {accounting?.sourceCue ?? 'one-layer transformer block'}
          </motion.div>
        </div>
      </div>

      {meta.formula && <div className="detail-formula">{meta.formula}</div>}

      {accounting && (
        <div className={`detail-accounting detail-accounting--${lens}`}>
          <MetricPill label="params" value={formatCount(accounting.params)} />
          <MetricPill label="FLOPs" value={formatCount(accounting.flops)} />
          <MetricPill label="activation / scores" value={formatBytes(accounting.memoryBytes)} />
          <MetricPill label="parallelism" value={accounting.parallelism.join(' / ')} />
        </div>
      )}

      {meta.code && <div className="detail-code-block">{meta.code}</div>}
      {cacheChip}
      <p className="detail-hint">
        Estimates are per layer unless a metric explicitly includes all layers.{' '}
        <a className="detail-source-link" href={MATH_NOTES_URL} target="_blank" rel="noreferrer">
          Math notes
        </a>
      </p>
    </div>
  )
}

function DetailIdleState({
  ropeState,
  lens,
  layerModel,
  onSelectModule,
}: {
  ropeState: RopeStateProps
  lens: Lens
  layerModel: LayerModel
  onSelectModule: (sel: SelectedModule) => void
}) {
  const { config } = layerModel
  return (
    <motion.div
      key="idle"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="detail-drawer detail-drawer--idle"
    >
      <div className="detail-placeholder detail-placeholder--idle">
        <span className="detail-placeholder__corner detail-placeholder__corner--tl" aria-hidden />
        <span className="detail-placeholder__corner detail-placeholder__corner--tr" aria-hidden />
        <span className="detail-placeholder__corner detail-placeholder__corner--bl" aria-hidden />
        <span className="detail-placeholder__corner detail-placeholder__corner--br" aria-hidden />
        <div className="detail-placeholder__scanline" aria-hidden />

        <div className="detail-placeholder__header">
          <span className="detail-placeholder__eyebrow">Mathematical detail drawer</span>
          <h2 className="detail-placeholder__title">Select a module on the left</h2>
          <p className="detail-placeholder__copy">
            Formulas, tensor shapes, accounting, and RoPE drilldowns appear here. Esc closes an open module.
          </p>
        </div>

        <div className="detail-placeholder__readout" aria-label="Live layer readout">
          <span>B={config.batch}</span>
          <span>T={config.seqLen.toLocaleString()}</span>
          <span>D={config.dModel.toLocaleString()}</span>
          <span>i={ropeState.posI}</span>
          <span>j={ropeState.posJ}</span>
          <span>lens={LENS_LABELS[lens]}</span>
          <span>KV={formatBytes(layerModel.kvCache.bytes)}</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="detail-placeholder__suggestions"
        >
          <span className="detail-placeholder__suggestions-label">Suggested entry points</span>
          <div className="detail-placeholder__chips">
            {IDLE_SUGGESTIONS.map((item) => (
              <button
                key={item.label}
                type="button"
                className="detail-placeholder__chip"
                onClick={() => onSelectModule(item.selection)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export function DetailDrawer({
  selected,
  ropeState,
  lens,
  layerModel,
  onClose,
  onSelectModule,
}: DetailDrawerProps) {
  return (
    <AnimatePresence mode="wait">
      {selected ? (
        <motion.div
          key={selectionKey(selected)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="detail-drawer"
        >
          <DetailHeader selected={selected} onClose={onClose} />
          <DetailBody selected={selected} ropeState={ropeState} lens={lens} layerModel={layerModel} />
        </motion.div>
      ) : (
        <DetailIdleState
          ropeState={ropeState}
          lens={lens}
          layerModel={layerModel}
          onSelectModule={onSelectModule}
        />
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

function DetailBody({
  selected,
  ropeState,
  lens,
  layerModel,
}: {
  selected: NonNullable<SelectedModule>
  ropeState: RopeStateProps
  lens: Lens
  layerModel: LayerModel
}) {
  const key = selectionKey(selected)
  const meta = DETAILS[key] ?? { title: key, subtitle: '' }
  const accounting = accountingFor(key, layerModel)

  if (showsRopeWorkbench(key)) {
    return (
      <RopeWorkbenchSection
        meta={meta}
        accounting={accounting}
        lens={lens}
        ropeState={ropeState}
        layerModel={layerModel}
        moduleKey={key}
      />
    )
  }

  return (
    <div className="detail-drawer__body">
      <DetailExplorer meta={meta} accounting={accounting} lens={lens} />
    </div>
  )
}

function RopeWorkbenchSection({
  meta,
  accounting,
  lens,
  ropeState,
  layerModel,
  moduleKey,
}: {
  meta: DetailMeta
  accounting: ModuleAccounting | null
  lens: Lens
  ropeState: RopeStateProps
  layerModel: LayerModel
  moduleKey: string
}) {
  return (
    <RopeWorkbench
      key={moduleKey}
      ropeState={ropeState}
      layerModel={layerModel}
      defaultTab={defaultWorkbenchTab(moduleKey)}
      header={(setTab) => (
        <DetailExplorer
          meta={meta}
          accounting={accounting}
          lens={lens}
          cacheChip={
            moduleKey === 'attention:softmax' ? (
              <button type="button" className="detail-cache-chip" onClick={() => setTab('cache')}>
                Open KV cache timeline →
              </button>
            ) : undefined
          }
        />
      )}
    />
  )
}
