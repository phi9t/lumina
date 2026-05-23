import { motion } from 'framer-motion'

interface ModuleNodeProps {
  x: number
  y: number
  width?: number
  height?: number
  label: string
  sub?: string
  micro?: string[]
  badge?: string
  active: boolean
  dimmed?: boolean
  showDetails?: boolean
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
  badge,
  active,
  dimmed = false,
  showDetails = true,
  variant = 'card',
  onSelect,
}: ModuleNodeProps) {
  const rx = variant === 'pill' ? height / 2 : 10
  const opacity = dimmed ? 0.45 : 1
  const hasMicro = showDetails && micro != null && micro.length > 0
  const hasBadge = showDetails && badge != null && badge.length > 0
  const hasSub = showDetails && sub != null && sub.length > 0
  const showMicro = hasMicro && !hasBadge
  const stacked = showMicro || hasBadge
  const rectH = height
  const labelY = hasBadge ? y - 21 : stacked ? y - 23 : hasSub ? y - 9 : y
  const subY = hasBadge ? y : stacked ? y - 4 : y + 14
  const microY = y + 22
  const badgeY = y + 25

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
        y={labelY}
        textAnchor="middle"
        dominantBaseline="middle"
        className={`module-label${active ? ' module-label--active' : ''}`}
      >
        {label}
      </text>
      {hasSub && (
        <text
          x={x}
          y={subY}
          textAnchor="middle"
          dominantBaseline="middle"
          className="module-sub"
        >
          {sub}
        </text>
      )}
      {showMicro && (
        <text x={x} y={microY} textAnchor="middle" className="step-micro-label">
          {micro.join(' · ')}
        </text>
      )}
      {hasBadge && (
        <text x={x} y={badgeY} textAnchor="middle" className="module-badge">
          {badge}
        </text>
      )}
    </motion.g>
  )
}
