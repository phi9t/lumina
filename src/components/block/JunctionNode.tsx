import { motion } from 'framer-motion'

interface JunctionNodeProps {
  x: number
  y: number
  label?: string
  active: boolean
  onSelect: () => void
}

export function JunctionNode({ x, y, label, active, onSelect }: JunctionNodeProps) {
  return (
    <motion.g
      style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
      onClick={onSelect}
      whileHover={{ scale: 1.12 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
    >
      <circle cx={x} cy={y} r={18} className="junction-halo" />
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
