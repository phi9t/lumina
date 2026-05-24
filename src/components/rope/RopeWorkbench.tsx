import { useMemo, useState, type ReactNode } from 'react'
import { RopeCacheView } from '@/components/rope/RopeCacheView'
import { RopeIdentityView } from '@/components/rope/RopeIdentityView'
import { RopeSpectrumView } from '@/components/rope/RopeSpectrumView'
import type { LayerModel } from '@/lib/layerModel'
import { formatBytes } from '@/lib/layerModel'
import { K_DEMO_BASE, Q_DEMO_BASE, selectedPairValues } from '@/lib/ropeMath'
import type { RopeStateProps } from './ropeTypes'

export type RopeWorkbenchTab = 'identity' | 'cache' | 'spectrum'

interface RopeWorkbenchProps {
  ropeState: RopeStateProps
  layerModel: LayerModel
  defaultTab?: RopeWorkbenchTab
  header?: (setTab: (tab: RopeWorkbenchTab) => void) => ReactNode
}

const TABS: Array<{ id: RopeWorkbenchTab; label: string }> = [
  { id: 'identity', label: 'Identity' },
  { id: 'cache', label: 'Cache' },
  { id: 'spectrum', label: 'Spectrum' },
]

export function RopeWorkbench({
  ropeState,
  layerModel,
  defaultTab = 'identity',
  header,
}: RopeWorkbenchProps) {
  const [activeTab, setActiveTab] = useState<RopeWorkbenchTab>(defaultTab)
  const [selectedPair, setSelectedPair] = useState(0)
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
        qBase: Q_DEMO_BASE,
        kBase: K_DEMO_BASE,
      }),
    [pairIndex, ropeState.base, ropeState.headDim, ropeState.posI, ropeState.posJ],
  )

  return (
    <div className="detail-drawer__body detail-drawer__body--rope">
      {header?.(setActiveTab)}
      <div className="rope-workbench">
        <div className="rope-workbench__tabs" role="tablist" aria-label="RoPE workbench view">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
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
          {activeTab === 'identity' && <RopeIdentityView values={pair} qBase={Q_DEMO_BASE} />}
          {activeTab === 'cache' && <RopeCacheView ropeState={ropeState} layerModel={layerModel} />}
          {activeTab === 'spectrum' && (
            <RopeSpectrumView
              ropeState={ropeState}
              selectedPair={pairIndex}
              onSelectPair={(index) => {
                setSelectedPair(index)
                setActiveTab('identity')
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
