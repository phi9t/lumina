import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
import { Card, CardContent } from '@/components/ui/card'
import type { LayerConfig, LayerModel, Lens } from '@/lib/layerModel'
import { LENS_EXPLANATIONS, formatBytes, formatCount } from '@/lib/layerModel'
import type { RopeStateProps } from '@/components/rope/ropeTypes'
import { relativeDelta } from '@/lib/ropeMath'
import { VISUAL_TOKENS } from '@/lib/visualTokens'

export type { RopeStateProps } from '@/components/rope/ropeTypes'

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-slate-400">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </div>
  )
}

function ControlRow({
  label,
  value,
  children,
}: {
  label: string
  value: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex justify-between items-baseline text-sm">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="stat-value text-slate-100 text-base">{value}</span>
      </div>
      {children}
    </div>
  )
}

export interface LayerDashboardProps extends RopeStateProps {
  setPosI: (v: number) => void
  setPosJ: (v: number) => void
  setBase: (v: number) => void
  lens: Lens
  setLens: (v: Lens) => void
  layerConfig: LayerConfig
  setLayerConfig: Dispatch<SetStateAction<LayerConfig>>
  layerModel: LayerModel
}

const LENSES: Array<{ id: Lens; label: string; short: string }> = [
  { id: 'flow', label: 'Flow', short: 'Flw' },
  { id: 'shapes', label: 'Shapes', short: 'Shp' },
  { id: 'compute', label: 'Compute', short: 'Cmp' },
  { id: 'memory', label: 'Memory', short: 'Mem' },
  { id: 'parallelism', label: 'Parallelism', short: 'Par' },
]

const FORWARD_FLOPS_LABEL: Record<LayerConfig['mode'], string> = {
  decode: 'Per-layer forward FLOPs · decode step (1 query token)',
  prefill: 'Per-layer forward FLOPs · prefill (T tokens)',
  training: 'Per-layer forward FLOPs · per step (T tokens)',
}

const SOURCE_CONCEPTS: Record<Lens, string[]> = {
  flow: ['pre-norm', 'residual stream', 'branch corrections'],
  shapes: ['B,T,D', 'N query heads', 'K KV heads', 'GQA'],
  compute: ['matmul FLOPs', 'T² attention', 'FFN dominance'],
  memory: ['KV cache', 'activation memory', 'decode state'],
  parallelism: ['TP matmuls', 'SP sequence shards', 'CP attention', 'EP note'],
}

function LensSelector({ lens, setLens }: { lens: Lens; setLens: (v: Lens) => void }) {
  return (
    <div className="lens-selector lens-selector--scroll" role="tablist" aria-label="Transformer layer lens">
      {LENSES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`lens-selector__button${lens === item.id ? ' lens-selector__button--active' : ''}`}
          onClick={() => setLens(item.id)}
        >
          <span className="lens-selector__label-full">{item.label}</span>
          <span className="lens-selector__label-short">{item.short}</span>
        </button>
      ))}
    </div>
  )
}

function OptionToggle<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
}) {
  return (
    <div className="option-toggle">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={`option-toggle__button${value === option.value ? ' option-toggle__button--active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function DashboardSection({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="dashboard-section" open={defaultOpen}>
      <summary className="dashboard-section__summary">{title}</summary>
      <div className="dashboard-section__body space-y-5">{children}</div>
    </details>
  )
}

export function LayerDashboard({
  posI,
  posJ,
  headDim,
  base,
  setPosI,
  setPosJ,
  setBase,
  lens,
  setLens,
  layerConfig,
  setLayerConfig,
  layerModel,
}: LayerDashboardProps) {
  const effectiveJ = Math.min(posJ, posI)
  const delta = relativeDelta(posI, posJ)
  const slowestTheta = 1 / Math.pow(base, (2 * Math.max(0, Math.floor(headDim / 2) - 1)) / headDim)
  const relativePhase = Math.abs(delta) * slowestTheta
  const setConfig = (patch: Partial<LayerConfig>) => {
    setLayerConfig((prev) => {
      const next = { ...prev, ...patch }
      if (patch.dModel != null || patch.numHeads != null) {
        const derivedH = next.dModel / next.numHeads
        if (Number.isInteger(derivedH)) next.headDim = derivedH
      }
      if (next.numKvHeads > next.numHeads) next.numKvHeads = next.numHeads
      return next
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
    >
      <Card className="glass-panel rounded-3xl border-0 text-slate-100">
        <CardContent className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-500">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Transformer layer explorer</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-100 leading-tight">One-layer lenses</h1>
            <p className="text-sm text-slate-400 leading-relaxed">
              Explore a pre-norm decoder layer through source-backed lenses: residual flow, tensor shapes, compute, memory,
              and layer-local parallelism cues.
            </p>
          </div>

          <LensSelector lens={lens} setLens={setLens} />

          <div className="source-concepts">
            {SOURCE_CONCEPTS[lens].map((concept) => (
              <span key={concept} className="source-concepts__chip">
                {concept}
              </span>
            ))}
          </div>

          <p className="lens-explanation">{LENS_EXPLANATIONS[lens]}</p>

          <div className="grid grid-cols-2 gap-3 py-1">
            <LegendItem color={VISUAL_TOKENS.query} label="Q heads N" />
            <LegendItem color={VISUAL_TOKENS.key} label="KV heads K" />
            <LegendItem color={VISUAL_TOKENS.edge} label="Attention score" />
            <LegendItem color={VISUAL_TOKENS.relative} label="RoPE rotation" />
          </div>

          <DashboardSection title="Sequence & RoPE">
            <ControlRow label="Batch B" value={layerConfig.batch}>
              <Slider accent="cyan" value={[layerConfig.batch]} min={1} max={8} step={1} onValueChange={(v) => setConfig({ batch: v[0] })} />
            </ControlRow>
            <ControlRow label="Sequence T" value={layerConfig.seqLen.toLocaleString()}>
              <Slider accent="cyan" value={[layerConfig.seqLen]} min={128} max={32768} step={128} onValueChange={(v) => setConfig({ seqLen: v[0] })} />
            </ControlRow>
            <ControlRow label="Current token position i (right)" value={posI}>
              <Slider accent="cyan" value={[posI]} min={0} max={96} step={1} onValueChange={(v) => setPosI(v[0])} />
            </ControlRow>
            <ControlRow label="Highlight cache key j (left)" value={effectiveJ}>
              <Slider
                accent="rose"
                value={[effectiveJ]}
                min={0}
                max={Math.max(posI, 1)}
                step={1}
                onValueChange={(v) => setPosJ(v[0])}
              />
            </ControlRow>
            <ControlRow label="Head dimension" value={headDim}>
              <div className="readonly-track">derived from D / N when divisible</div>
            </ControlRow>
            <ControlRow label="RoPE base" value={base.toLocaleString()}>
              <Slider accent="violet" value={[base]} min={1000} max={50000} step={1000} onValueChange={(v) => setBase(v[0])} />
            </ControlRow>
          </DashboardSection>

          <DashboardSection title="Architecture">
            <ControlRow label="Model width D" value={layerConfig.dModel.toLocaleString()}>
              <Slider accent="amber" value={[layerConfig.dModel]} min={512} max={8192} step={512} onValueChange={(v) => setConfig({ dModel: v[0] })} />
            </ControlRow>
            <ControlRow label="Query heads N" value={layerConfig.numHeads}>
              <Slider accent="amber" value={[layerConfig.numHeads]} min={1} max={64} step={1} onValueChange={(v) => setConfig({ numHeads: v[0] })} />
            </ControlRow>
            <ControlRow label="KV heads K" value={layerConfig.numKvHeads}>
              <Slider accent="rose" value={[layerConfig.numKvHeads]} min={1} max={layerConfig.numHeads} step={1} onValueChange={(v) => setConfig({ numKvHeads: v[0] })} />
            </ControlRow>
            <ControlRow label="FFN width F" value={layerConfig.ffnDim.toLocaleString()}>
              <Slider accent="violet" value={[layerConfig.ffnDim]} min={1024} max={32768} step={1024} onValueChange={(v) => setConfig({ ffnDim: v[0] })} />
            </ControlRow>
            <ControlRow label="Layers L" value={layerConfig.layers}>
              <Slider accent="violet" value={[layerConfig.layers]} min={1} max={128} step={1} onValueChange={(v) => setConfig({ layers: v[0] })} />
            </ControlRow>
            <ControlRow label="Precision" value={`${layerConfig.precisionBytes} byte${layerConfig.precisionBytes === 1 ? '' : 's'}`}>
              <OptionToggle
                value={layerConfig.precisionBytes}
                options={[
                  { value: 1, label: 'int8' },
                  { value: 2, label: 'bf16' },
                  { value: 4, label: 'fp32' },
                ]}
                onChange={(precisionBytes) => setConfig({ precisionBytes })}
              />
            </ControlRow>
            <ControlRow label="Mode" value={layerConfig.mode}>
              <OptionToggle
                value={layerConfig.mode}
                options={[
                  { value: 'decode', label: 'decode' },
                  { value: 'prefill', label: 'prefill' },
                  { value: 'training', label: 'train' },
                ]}
                onChange={(mode) => setConfig({ mode })}
              />
            </ControlRow>
          </DashboardSection>

          <DashboardSection title="Stats">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Per-layer params</span>
                <span className="stat-value text-lg text-slate-200">{formatCount(layerModel.totals.params)}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-500">{FORWARD_FLOPS_LABEL[layerConfig.mode]}</span>
                <span className="stat-value text-lg text-slate-200">{formatCount(layerModel.totals.forwardFlops)}</span>
              </div>
              <div className="flex justify-between items-center gap-3">
                <span className="text-slate-500">Per-layer training FLOPs · fwd+bwd, T tokens</span>
                <span className="stat-value text-lg text-slate-200">{formatCount(layerModel.totals.trainingFlops)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Attn / FFN FLOPs</span>
                <span className="stat-value text-lg text-slate-200">{layerModel.totals.attentionToFfnRatio.toFixed(2)}x</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">KV cache</span>
                <span className="stat-value text-lg text-slate-200">{formatBytes(layerModel.kvCache.bytes)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Δ = j - i</span>
                <span className="stat-value text-lg text-slate-200">{delta}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Slowest phase gap</span>
                <span className="stat-value text-lg text-slate-200">{relativePhase.toFixed(2)} rad</span>
              </div>
              <p className="text-slate-500 leading-relaxed text-xs border-t border-slate-800 pt-3">
                KV cache uses {layerModel.kvCache.formula}. At decode step i, softmax uses the current query against cached
                keys 0...i; RoPE depends only on j-i for each pair.
              </p>
              {layerModel.warnings.map((warning) => (
                <p key={warning} className="text-amber-300 text-xs leading-relaxed">
                  {warning}
                </p>
              ))}
            </div>
          </DashboardSection>
        </CardContent>
      </Card>
    </motion.div>
  )
}
