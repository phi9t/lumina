import type { KeyboardEvent } from 'react'
import { motion } from 'framer-motion'

interface JunctionNodeProps {
  x: number
  y: number
  label?: string
  active: boolean
  onSelect: () => void
}

export function JunctionNode({ x, y, label, active, onSelect }: JunctionNodeProps) {
  const accessibleLabel = label != null && label.length > 0 ? `Residual merge, ${label}` : 'Residual merge'

  function handleKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect()
  }

  return (
    <motion.g
      className="junction-node"
      role="button"
      tabIndex={0}
      aria-label={accessibleLabel}
      aria-pressed={active}
      style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      whileHover={{ scale: 1.12 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
    >
      <circle cx={x} cy={y} r={13} className={`junction-ring${active ? ' junction-ring--active' : ''}`} />
      <line x1={x - 6} y1={y} x2={x + 6} y2={y} className="junction-cross" />
      <line x1={x} y1={y - 6} x2={x} y2={y + 6} className="junction-cross" />
      {label && (
        <text x={x} y={y + 36} textAnchor="middle" className="junction-label">
          {label}
        </text>
      )}
    </motion.g>
  )
}
