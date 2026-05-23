import type { RopeStateProps } from '@/RopeThreeJSVisualizer'
import type { LayerModel } from '@/lib/layerModel'
import { formatBytes } from '@/lib/layerModel'

interface RopeCacheViewProps {
  ropeState: RopeStateProps
  layerModel: LayerModel
}

const X1 = 44
const X2 = 716
const QUERY_Y = 48
const K_Y = 124
const V_Y = 170

function xForPosition(position: number, current: number): number {
  if (current <= 0) return X2
  return X1 + (position / current) * (X2 - X1)
}

export function RopeCacheView({ ropeState, layerModel }: RopeCacheViewProps) {
  const current = Math.max(0, ropeState.posI)
  const selected = Math.min(ropeState.posJ, current)
  const positions = Array.from({ length: current + 1 }, (_, p) => p)
  const cellW = Math.max(3, Math.min(18, (X2 - X1) / Math.max(1, current + 1) - 2))
  const fanStep = current > 72 ? 3 : current > 36 ? 2 : 1
  const fanTargets = positions.filter((p) => p % fanStep === 0 || p === selected)
  const selectedX = xForPosition(selected, current)
  const currentX = xForPosition(current, current)
  const modeHint =
    layerModel.config.mode === 'decode'
      ? 'decode: append one K/V slot and score the current Q against cached K'
      : 'prefill/training: compute all visible positions together'

  return (
    <div className="rope-cache">
      <svg viewBox="0 0 760 230" className="rope-cache__svg" role="img" aria-label="RoPE KV cache timeline">
        <text x={X1} y="24" className="rope-cache__axis-label">
          earliest token
        </text>
        <text x={X2} y="24" textAnchor="end" className="rope-cache__axis-label">
          current token i={current}
        </text>

        {fanTargets.map((p) => {
          const x = xForPosition(p, current)
          const isSelected = p === selected
          return (
            <line
              key={`fan-${p}`}
              x1={currentX}
              y1={QUERY_Y}
              x2={x}
              y2={K_Y}
              className={`rope-cache__fan${isSelected ? ' rope-cache__fan--selected' : ''}`}
            />
          )
        })}

        <circle cx={currentX} cy={QUERY_Y} r="11" className="rope-cache__query" />
        <text x={currentX} y={QUERY_Y - 18} textAnchor="middle" className="rope-cache__query-label">
          Q_i
        </text>

        <text x="18" y={K_Y + 4} className="rope-cache__row-label">
          K
        </text>
        <text x="18" y={V_Y + 4} className="rope-cache__row-label">
          V
        </text>

        {positions.map((p) => {
          const x = xForPosition(p, current)
          const isSelected = p === selected
          const isCurrent = p === current
          const className = `rope-cache__cell${isSelected ? ' rope-cache__cell--selected' : ''}${
            isCurrent ? ' rope-cache__cell--current' : ''
          }`
          return (
            <g key={p}>
              <rect x={x - cellW / 2} y={K_Y - 12} width={cellW} height="24" rx="3" className={className} />
              <rect x={x - cellW / 2} y={V_Y - 12} width={cellW} height="24" rx="3" className={className} />
            </g>
          )
        })}

        <line x1={X1} y1="200" x2={X2} y2="200" className="rope-cache__timeline" />
        <circle cx={selectedX} cy="200" r="6" className="rope-cache__selected-dot" />
        <circle cx={currentX} cy="200" r="7" className="rope-cache__current-dot" />
        <text x={selectedX} y="220" textAnchor="middle" className="rope-cache__marker-label">
          j={selected}
        </text>
        <text x={currentX} y="220" textAnchor="middle" className="rope-cache__marker-label">
          i={current}
        </text>
      </svg>

      <div className="rope-cache__cards">
        <div className="rope-cache__card">
          <span className="rope-cache__card-label">KV cache</span>
          <span className="rope-cache__card-value">{formatBytes(layerModel.kvCache.bytes)}</span>
          <span className="rope-cache__card-note">{layerModel.kvCache.formula}</span>
        </div>
        <div className="rope-cache__card">
          <span className="rope-cache__card-label">mode</span>
          <span className="rope-cache__card-value">{layerModel.config.mode}</span>
          <span className="rope-cache__card-note">{modeHint}</span>
        </div>
      </div>
    </div>
  )
}
