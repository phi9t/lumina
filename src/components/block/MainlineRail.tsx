interface MainlineRailVerticalProps {
  x: number
  y1: number
  y2: number
  emphasis?: 'boost' | 'normal' | 'dim'
}

export function MainlineRailVertical({
  x,
  y1,
  y2,
  emphasis = 'normal',
}: MainlineRailVerticalProps) {
  return (
    <g className={`mainline-rail-group mainline-rail-group--${emphasis}`}>
      <line x1={x} y1={y1} x2={x} y2={y2} className="mainline-rail" />
      <g className="mainline-flow" aria-hidden>
        {Array.from({ length: 5 }).map((_, i) => {
          const cy = y1 + ((y2 - y1) * (i + 0.5)) / 5
          return <circle key={i} cx={x} cy={cy} r={2.2} className="mainline-tick" style={{ animationDelay: `${i * 0.12}s` }} />
        })}
      </g>
    </g>
  )
}
