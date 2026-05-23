import { Suspense, lazy, useMemo, useState } from 'react'
import { RopeCacheView } from '@/components/rope/RopeCacheView'
import { RopeIdentityView } from '@/components/rope/RopeIdentityView'
import { RopeSpectrumView } from '@/components/rope/RopeSpectrumView'
import type { LayerModel } from '@/lib/layerModel'
import { formatBytes } from '@/lib/layerModel'
import { selectedPairValues, type Vec2 } from '@/lib/ropeMath'
import type { RopeStateProps } from './ropeTypes'

type RopeWorkbenchTab = 'identity' | 'cache' | 'spectrum'

interface RopeWorkbenchProps {
  ropeState: RopeStateProps
  layerModel: LayerModel
}

const TABS: Array<{ id: RopeWorkbenchTab; label: string }> = [
  { id: 'identity', label: 'Identity' },
  { id: 'cache', label: 'Cache' },
  { id: 'spectrum', label: 'Spectrum' },
]
const RopeDetailPanel = lazy(() =>
  import('@/components/rope/RopeScene3D').then((module) => ({ default: module.RopeDetailPanel })),
)
const Q_BASE: Vec2 = [0.9, 0.35]
const K_BASE: Vec2 = [0.55, 0.85]

export function RopeWorkbench({ ropeState, layerModel }: RopeWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<RopeWorkbenchTab>('identity')
  const [selectedPair, setSelectedPair] = useState(0)
  const [showScene, setShowScene] = useState(false)
  const maxPair = Math.max(0, Math.floor(ropeState.headDim / 2) - 1)
  const pairIndex = Math.min(selectedPair, maxPair)
  const pair = useMemo(
    () =>
      selectedPairValues({
        pairIndex,
        posI: ropeState.posI,
        posJ: ropeState.posJ,
        headDim: ropeState.headDim,
        base: ropeState.base,
        qBase: Q_BASE,
        kBase: K_BASE,
      }),
    [pairIndex, ropeState.base, ropeState.headDim, ropeState.posI, ropeState.posJ],
  )

  return (
    <div className="rope-workbench">
      <div className="rope-workbench__tabs" role="tablist" aria-label="RoPE workbench view">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`rope-workbench__tab${activeTab === tab.id ? ' rope-workbench__tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rope-workbench__readout">
        <span>i={ropeState.posI}</span>
        <span>j={ropeState.posJ}</span>
        <span>Δ={pair.delta}</span>
        <span className="rope-workbench__pair-stepper">
          <button type="button" onClick={() => setSelectedPair((n) => Math.max(0, n - 1))} aria-label="Previous RoPE pair">
            -
          </button>
          pair={pairIndex}
          <button type="button" onClick={() => setSelectedPair((n) => Math.min(maxPair, n + 1))} aria-label="Next RoPE pair">
            +
          </button>
        </span>
        <span>θ={pair.pair.theta.toFixed(5)}</span>
        <span>score={pair.absoluteScore.toFixed(3)}</span>
        <span>KV={formatBytes(layerModel.kvCache.bytes)}</span>
      </div>

      <div className="rope-workbench__placeholder">
        {activeTab === 'identity' && (
          <RopeIdentityView values={pair} qBase={Q_BASE} />
        )}
        {activeTab === 'cache' && (
          <RopeCacheView ropeState={ropeState} layerModel={layerModel} />
        )}
        {activeTab === 'spectrum' && (
          <RopeSpectrumView ropeState={ropeState} selectedPair={pairIndex} onSelectPair={setSelectedPair} />
        )}
      </div>

      <details className="rope-workbench__scene" onToggle={(event) => setShowScene(event.currentTarget.open)}>
        <summary>3D reference</summary>
        {showScene && (
          <Suspense fallback={<div className="rope-workbench__scene-loading">Loading 3D reference...</div>}>
            <RopeDetailPanel {...ropeState} />
          </Suspense>
        )}
      </details>
    </div>
  )
}
