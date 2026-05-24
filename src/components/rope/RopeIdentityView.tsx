/**
 * RopeIdentityView — 2D SVG proof that absolute and relative RoPE frames match.
 */
import type { ReactNode } from 'react'
import type { SelectedPairValues, Vec2 } from '@/lib/ropeMath'

interface RopeIdentityViewProps {
  values: SelectedPairValues
  qBase: Vec2
}

const CENTER_Y = 118
const RADIUS = 72
const VECTOR_SCALE = 58

function vectorPoint(centerX: number, centerY: number, [x, y]: Vec2): [number, number] {
  return [centerX + x * VECTOR_SCALE, centerY - y * VECTOR_SCALE]
}

function VectorArrow({
  centerX,
  centerY,
  vector,
  label,
  className,
  animKey,
}: {
  centerX: number
  centerY: number
  vector: Vec2
  label: string
  className: string
  animKey: string
}) {
  const [x2, y2] = vectorPoint(centerX, centerY, vector)
  const labelX = x2 + (x2 >= centerX ? 10 : -10)
  return (
    <g className={`${className} rope-identity__vector-group`} key={animKey}>
      <line x1={centerX} y1={centerY} x2={x2} y2={y2} className="rope-identity__vector" markerEnd="url(#rope-vector-arrow)" />
      <circle cx={x2} cy={y2} r="4.5" className="rope-identity__tip" />
      <text x={labelX} y={y2 - 8} textAnchor={x2 >= centerX ? 'start' : 'end'} className="rope-identity__label">
        {label}
      </text>
    </g>
  )
}

function Frame({ x, title, children }: { x: number; title: string; children: ReactNode }) {
  const centerX = x + 125
  return (
    <g>
      <rect x={x} y="0" width="250" height="250" rx="14" className="rope-identity__frame" />
      <text x={centerX} y="28" textAnchor="middle" className="rope-identity__frame-title">
        {title}
      </text>
      <circle cx={centerX} cy={CENTER_Y} r={RADIUS} className="rope-identity__circle" />
      <line x1={centerX - RADIUS} y1={CENTER_Y} x2={centerX + RADIUS} y2={CENTER_Y} className="rope-identity__axis" />
      <line x1={centerX} y1={CENTER_Y - RADIUS} x2={centerX} y2={CENTER_Y + RADIUS} className="rope-identity__axis" />
      {children}
    </g>
  )
}

export function RopeIdentityView({ values, qBase }: RopeIdentityViewProps) {
  const animKey = `${values.delta}-${values.theta.toFixed(4)}`
  const leftCenter = 149
  const rightCenter = 611

  return (
    <div className="rope-identity">
      <svg viewBox="0 0 760 300" className="rope-identity__svg" role="img" aria-label="RoPE absolute and relative identity">
        <defs>
          <marker id="rope-vector-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
            <path d="M0,0 L8,4 L0,8 Z" className="rope-identity__arrow-head" />
          </marker>
        </defs>

        <Frame x={24} title="absolute frame">
          <VectorArrow
            centerX={leftCenter}
            centerY={CENTER_Y}
            vector={values.qAbsolute}
            label="R_i q"
            className="rope-identity__query"
            animKey={`q-${animKey}`}
          />
          <VectorArrow
            centerX={leftCenter}
            centerY={CENTER_Y}
            vector={values.kAbsolute}
            label="R_j k"
            className="rope-identity__key"
            animKey={`k-${animKey}`}
          />
          <text x={leftCenter} y="226" textAnchor="middle" className="rope-identity__score">
            score={values.absoluteScore.toFixed(4)}
          </text>
        </Frame>

        <path
          d={`M 274 ${CENTER_Y - 20} Q 380 ${CENTER_Y - 52} 486 ${CENTER_Y - 20}`}
          className="rope-identity__score-arc"
          fill="none"
        />
        <text x="380" y={CENTER_Y - 58} textAnchor="middle" className="rope-identity__score-arc-label">
          dot={values.absoluteScore.toFixed(3)}
        </text>

        <text x="380" y="104" textAnchor="middle" className="rope-identity__equals">
          =
        </text>
        <text x="380" y="134" textAnchor="middle" className="rope-identity__formula">
          same dot product
        </text>

        <Frame x={486} title="relative frame">
          <VectorArrow
            centerX={rightCenter}
            centerY={CENTER_Y}
            vector={qBase}
            label="q"
            className="rope-identity__query"
            animKey={`qb-${animKey}`}
          />
          <VectorArrow
            centerX={rightCenter}
            centerY={CENTER_Y}
            vector={values.kRelative}
            label="R_delta k"
            className="rope-identity__relative"
            animKey={`kr-${animKey}`}
          />
          <text x={rightCenter} y="226" textAnchor="middle" className="rope-identity__score">
            score={values.relativeScore.toFixed(4)}
          </text>
        </Frame>

        <text x="380" y="274" textAnchor="middle" className="rope-identity__footer">
          (R_i q)^T(R_j k) = q^T R_(j-i) k · Δ={values.delta} · θ={values.theta.toFixed(5)}
        </text>
      </svg>
    </div>
  )
}
