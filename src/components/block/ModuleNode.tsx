import { motion } from 'framer-motion'

interface ModuleNodeProps {
  x: number
  y: number
  width?: number
  height?: number
  label: string
  sub?: string
  micro?: string[]
  active: boolean
  dimmed?: boolean
  variant?: 'card' | 'pill'
  onSelect: () => void
}

export function ModuleNode({
  x,
  y,
  width = 96,
  height = 42,
  label,
  sub,
  micro,
  active,
  dimmed = false,
  variant = 'card',
  onSelect,
}: ModuleNodeProps) {
  const rx = variant === 'pill' ? height / 2 : 10
  const opacity = dimmed ? 0.45 : 1
  const hasMicro = micro != null && micro.length > 0
  const extraH = hasMicro ? 10 : 0
  const rectH = height + extraH

  return (
    <motion.g
      style={{ cursor: 'pointer', transformOrigin: `${x}px ${y}px` }}
      onClick={onSelect}
      whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
      animate={{ opacity }}
    >
      <rect
        x={x - width / 2}
        y={y - rectH / 2}
        width={width}
        height={rectH}
        rx={rx}
        ry={rx}
        className={`module-rect${active ? ' module-rect--active' : ''}`}
      />
      <text
        x={x}
        y={hasMicro ? y - 10 : sub ? y - 4 : y}
        textAnchor="middle"
        dominantBaseline="middle"
        className={`module-label${active ? ' module-label--active' : ''}`}
      >
        {label}
      </text>
      {sub && (
        <text
          x={x}
          y={hasMicro ? y + 2 : y + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          className="module-sub"
        >
          {sub}
        </text>
      )}
      {hasMicro && (
        <text x={x} y={y + 16} textAnchor="middle" className="step-micro-label">
          {micro.join(' · ')}
        </text>
      )}
    </motion.g>
  )
}
