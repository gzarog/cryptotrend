type Props = {
  value: number // -1 to 1
  size?: number
  label?: string
}

export function MarkovPriorGauge({ value, size = 80, label = 'Markov Prior' }: Props) {
  const clamped = Math.max(-1, Math.min(1, value))
  const angle = clamped * 90 // -90 to +90
  const radius = (size / 2) - 6
  const cx = size / 2
  const cy = size / 2

  // Arc path
  const startAngle = -90
  const endAngle = 90
  const startRad = (startAngle * Math.PI) / 180
  const endRad = (endAngle * Math.PI) / 180
  const needleRad = (angle * Math.PI) / 180 - Math.PI / 2

  const arcStartX = cx + radius * Math.cos(startRad - Math.PI / 2)
  const arcStartY = cy + radius * Math.sin(startRad - Math.PI / 2)
  const arcEndX = cx + radius * Math.cos(endRad - Math.PI / 2)
  const arcEndY = cy + radius * Math.sin(endRad - Math.PI / 2)

  const needleX = cx + (radius - 8) * Math.cos(needleRad)
  const needleY = cy + (radius - 8) * Math.sin(needleRad)

  const color = clamped > 0.15 ? 'hsl(142 71% 45%)' : clamped < -0.15 ? 'hsl(0 84% 60%)' : 'hsl(45 93% 47%)'

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size / 2 + 10} viewBox={`0 0 ${size} ${size / 2 + 10}`}>
        {/* Background arc */}
        <path
          d={`M ${arcStartX} ${arcStartY} A ${radius} ${radius} 0 0 1 ${arcEndX} ${arcEndY}`}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="4"
          strokeLinecap="round"
        />
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="3" fill={color} />
      </svg>
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-mono" style={{ color }}>{clamped > 0 ? '+' : ''}{clamped.toFixed(2)}</span>
    </div>
  )
}
