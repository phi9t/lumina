import type { RopeStateProps } from './ropeTypes'
import { cycleProgress, phaseGap, ropeFrequencies, wrapCount } from '@/lib/ropeMath'

interface RopeSpectrumViewProps {
  ropeState: RopeStateProps
  selectedPair: number
  onSelectPair: (pair: number) => void
}

export function RopeSpectrumView({ ropeState, selectedPair, onSelectPair }: RopeSpectrumViewProps) {
  const delta = ropeState.posJ - ropeState.posI
  const pairs = ropeFrequencies({ headDim: ropeState.headDim, base: ropeState.base })
  const maxGap = Math.max(...pairs.map((pair) => phaseGap(delta, pair.theta)), 1)

  return (
    <div className="rope-spectrum">
      <div className="rope-spectrum__copy">
        Fast pairs rotate quickly and wrap often, making nearby position changes visible. Slow pairs move gradually and
        preserve distinctions across longer context spans.
      </div>

      <div className="rope-spectrum__strip" aria-label="RoPE frequency pairs from fastest to slowest">
        {pairs.map((pair) => {
          const gap = phaseGap(delta, pair.theta)
          const wraps = wrapCount(delta, pair.theta)
          const progress = cycleProgress(delta, pair.theta)
          const width = `${Math.max(6, (gap / maxGap) * 100)}%`
          const selected = pair.index === selectedPair
          return (
            <button
              key={pair.index}
              type="button"
              className={`rope-spectrum__pair${selected ? ' rope-spectrum__pair--selected' : ''}`}
              onClick={() => onSelectPair(pair.index)}
            >
              <span className="rope-spectrum__pair-head">
                <span>{pair.label}</span>
                <span>θ={pair.theta.toFixed(5)}</span>
              </span>
              <span className="rope-spectrum__bar">
                <span className="rope-spectrum__bar-fill" style={{ width }} />
                <span className="rope-spectrum__cycle" style={{ left: `${progress * 100}%` }} />
              </span>
              <span className="rope-spectrum__pair-foot">
                <span>|Δ|θ={gap.toFixed(2)}</span>
                <span>{wraps.toFixed(2)} wraps</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
