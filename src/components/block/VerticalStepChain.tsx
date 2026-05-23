import type { CircuitModuleDef } from './circuitTypes'
import { ModuleNode } from './ModuleNode'

interface VerticalStepChainProps {
  centerX: number
  topY: number
  bottomY: number
  steps: CircuitModuleDef[]
  cardW?: number
  cardH?: number
  selectedSub: string | null
  onSelect: (id: string) => void
  arrowMarkerId: string
}

function stepYs(topY: number, bottomY: number, count: number): number[] {
  if (count <= 0) return []
  if (count === 1) return [(topY + bottomY) / 2]
  return Array.from({ length: count }, (_, i) => topY + ((bottomY - topY) * i) / (count - 1))
}

export function VerticalStepChain({
  centerX,
  topY,
  bottomY,
  steps,
  cardW = 120,
  cardH = 44,
  selectedSub,
  onSelect,
  arrowMarkerId,
}: VerticalStepChainProps) {
  const ys = stepYs(topY, bottomY, steps.length)
  const busX = centerX - cardW / 2 - 14

  return (
    <g className="step-chain">
      <line x1={busX} y1={topY} x2={busX} y2={bottomY} className="step-chain-bus" />

      {ys.map((y, i) => {
        const m = steps[i]
        const nextY = ys[i + 1]
        const plateLeft = centerX - cardW / 2
        const tapX = plateLeft

        return (
          <g key={m.id}>
            <line x1={busX} y1={y} x2={tapX} y2={y} className="step-chain-tap" />
            {i < steps.length - 1 && nextY != null && (
              <line
                x1={busX}
                y1={y + cardH / 2 + 4}
                x2={busX}
                y2={nextY - cardH / 2 - 4}
                className="step-chain-segment"
                markerEnd={`url(#${arrowMarkerId})`}
              />
            )}
            {i > 0 && (
              <rect x={busX - 3} y={y - 3} width={6} height={6} className="branch-corner" />
            )}
            <ModuleNode
              x={centerX}
              y={y}
              width={cardW}
              height={cardH}
              label={m.label}
              sub={m.sub}
              micro={m.micro}
              active={selectedSub === m.id}
              dimmed={selectedSub != null && selectedSub !== m.id}
              onSelect={() => onSelect(m.id)}
            />
          </g>
        )
      })}
    </g>
  )
}
