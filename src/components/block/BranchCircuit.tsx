import type { BranchDef } from './circuitTypes'
import { ModuleNode } from './ModuleNode'
import { VerticalStepChain } from './VerticalStepChain'

export type { BranchDef, CircuitModuleDef } from './circuitTypes'

interface BranchCircuitProps {
  mainlineX: number
  teeY: number
  junctionY: number
  branch: BranchDef
  branchKind: 'attention' | 'ffn'
  title: string
  formula: string
  selectedSub: string | null
  onSelect: (sub: string) => void
}

const SPINE_OFFSET = 24
const PRENORM_OFFSET = 72
const SHELL_LEFT_OFFSET = 150
const SHELL_WIDTH = 280
const PRENORM_W = 140
const HEADER_H = 72
const CARD_W = 200
const CARD_H = 52
const SHELL_PAD_BOTTOM = 16
const MAX_STEP_GAP = 84

export function BranchCircuit({
  mainlineX,
  teeY,
  junctionY,
  branch,
  branchKind,
  title,
  formula,
  selectedSub,
  onSelect,
}: BranchCircuitProps) {
  const { preNorm, steps } = branch
  const spineX = mainlineX + SPINE_OFFSET
  const preNormX = mainlineX + PRENORM_OFFSET
  const shellLeft = mainlineX + SHELL_LEFT_OFFSET
  const shellCenterX = shellLeft + SHELL_WIDTH / 2
  const span = junctionY - teeY
  const shellTop = teeY + Math.min(64, span * 0.24)
  const innerH = span - (shellTop - teeY) - SHELL_PAD_BOTTOM - 16
  const stepGap =
    steps.length > 1
      ? Math.min(MAX_STEP_GAP, (innerH - HEADER_H - CARD_H) / (steps.length - 1))
      : MAX_STEP_GAP
  const chainTop = shellTop + HEADER_H
  const chainBottom = chainTop + Math.max(0, steps.length - 1) * stepGap
  const shellBottom = Math.min(junctionY - 12, chainBottom + CARD_H / 2 + SHELL_PAD_BOTTOM)
  const preNormY = teeY + (shellTop - teeY) * 0.45
  const top = Math.min(teeY, junctionY)
  const bottom = Math.max(teeY, junctionY, shellBottom + 12)
  const arrowId = `step-arrow-${branchKind}`
  const preNormRight = preNormX + PRENORM_W / 2

  /** Sideline: tee → spine column; return merges on spine before junction */
  const entryPath = `M ${mainlineX} ${teeY} H ${spineX} V ${preNormY}`
  const toShellPath = `M ${preNormRight} ${preNormY} H ${shellCenterX} V ${shellTop}`
  const returnPath = `M ${shellCenterX} ${shellBottom} H ${spineX} V ${junctionY} H ${mainlineX}`

  const preNormSelected = selectedSub === preNorm.id
  const preNormDimmed = selectedSub != null && !preNormSelected

  return (
    <g className={`branch-circuit branch-circuit--${branchKind}`}>
      <defs>
        <marker
          id={arrowId}
          markerWidth="8"
          markerHeight="8"
          refX="4"
          refY="4"
          orient="auto"
        >
          <path d="M0,0 L8,4 L0,8 Z" className="step-chain-arrow-head" />
        </marker>
      </defs>

      <rect
        x={spineX - 10}
        y={top + 6}
        width={shellLeft + SHELL_WIDTH - spineX + 16}
        height={bottom - top - 6}
        className="branch-corridor"
        rx={12}
      />

      <line x1={spineX} y1={teeY} x2={spineX} y2={junctionY} className="branch-spine-rail" />

      <rect
        x={shellLeft}
        y={shellTop}
        width={SHELL_WIDTH}
        height={shellBottom - shellTop}
        className="module-shell"
        rx={10}
      />
      <text x={shellCenterX} y={shellTop + 18} textAnchor="middle" className="module-shell-title">
        {title}
      </text>
      <text x={shellCenterX} y={shellTop + 32} textAnchor="middle" className="module-shell-formula">
        {formula}
      </text>

      <path d={entryPath} className="branch-wire-halo" fill="none" />
      <path d={entryPath} className="branch-wire" fill="none" />
      <path d={toShellPath} className="branch-wire-halo" fill="none" />
      <path d={toShellPath} className="branch-wire" fill="none" />
      <path d={returnPath} className="branch-wire-halo" fill="none" />
      <path d={returnPath} className="branch-wire" fill="none" />

      <line
        x1={spineX}
        y1={preNormY}
        x2={preNormX - PRENORM_W / 2}
        y2={preNormY}
        className="branch-tap"
      />

      <circle cx={mainlineX} cy={teeY} r={4} className="branch-tee" />
      <rect x={spineX - 3} y={teeY - 3} width={6} height={6} className="branch-corner" />
      <rect x={spineX - 3} y={junctionY - 3} width={6} height={6} className="branch-corner" />
      <rect x={shellCenterX - 3} y={shellTop - 3} width={6} height={6} className="branch-corner" />
      <rect x={shellCenterX - 3} y={shellBottom - 3} width={6} height={6} className="branch-corner" />

      <VerticalStepChain
        centerX={shellCenterX}
        topY={chainTop}
        bottomY={chainBottom}
        steps={steps}
        cardW={CARD_W}
        cardH={CARD_H}
        selectedSub={selectedSub}
        onSelect={onSelect}
        arrowMarkerId={arrowId}
      />

      <g className="prenorm-plate">
        <ModuleNode
          x={preNormX}
          y={preNormY}
          width={PRENORM_W}
          height={40}
          label={preNorm.label}
          sub={preNorm.sub}
          active={preNormSelected}
          dimmed={preNormDimmed}
          onSelect={() => onSelect(preNorm.id)}
        />
      </g>
    </g>
  )
}
