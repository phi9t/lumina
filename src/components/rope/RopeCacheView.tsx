import type { RopeStateProps } from './ropeTypes'
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
const OUT_Y = 196

function xForPosition(position: number, current: number): number {
  if (current <= 0) return X2
  return X1 + (position / current) * (X2 - X1)
}

function fanTargetsFor(current: number, selected: number): number[] {
  const fanStep = current > 72 ? 3 : current > 36 ? 2 : 1
  const targets = new Set<number>()
  for (let p = 0; p <= current; p += fanStep) targets.add(p)
  targets.add(selected)
  targets.add(current)
  return [...targets].sort((a, b) => a - b)
}

export function RopeCacheView({ ropeState, layerModel }: RopeCacheViewProps) {
  const current = Math.max(0, ropeState.posI)
  const selected = Math.min(ropeState.posJ, current)
  const positions = Array.from({ length: current + 1 }, (_, p) => p)
  const cellW = Math.max(3, Math.min(18, (X2 - X1) / Math.max(1, current + 1) - 2))
  const fanTargets = fanTargetsFor(current, selected)
  const selectedX = xForPosition(selected, current)
  const currentX = xForPosition(current, current)
  const modeHint =
    layerModel.config.mode === 'decode'
      ? 'decode: append one K/V slot and score the current Q against cached K'
      : 'prefill/training: compute all visible positions together'

  return (
    <div className="rope-cache">
      <svg viewBox="0 0 760 250" className="rope-cache__svg" role="img" aria-label="RoPE KV cache timeline">
        <defs>
          <marker id="rope-cache-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" className="rope-cache__arrow-head" />
          </marker>
        </defs>

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
              <rect
                x={x - cellW / 2}
                y={V_Y - 12}
                width={cellW}
                height="24"
                rx="3"
                className={`${className} rope-cache__cell--v`}
              />
            </g>
          )
        })}

        <line
          x1={selectedX}
          y1={V_Y + 14}
          x2={currentX}
          y2={OUT_Y - 8}
          className="rope-cache__weighted"
          markerEnd="url(#rope-cache-arrow)"
        />
        <text x={(selectedX + currentX) / 2} y={OUT_Y - 14} textAnchor="middle" className="rope-cache__weighted-label">
          Σ attn · V → out
        </text>

        <line x1={X1} y1="220" x2={X2} y2="220" className="rope-cache__timeline" />
        <circle cx={selectedX} cy="220" r="6" className="rope-cache__selected-dot" />
        <circle cx={currentX} cy="220" r="7" className="rope-cache__current-dot" />
        <text x={selectedX} y="240" textAnchor="middle" className="rope-cache__marker-label">
          j={selected}
        </text>
        <text x={currentX} y="240" textAnchor="middle" className="rope-cache__marker-label">
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
