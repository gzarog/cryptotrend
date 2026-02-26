type Props = {
  value: number // 0–100
  color?: string
  bgColor?: string
  height?: number
  label?: string
}

export function PercentageBar({ value, color = 'hsl(var(--primary))', bgColor = 'hsl(var(--muted))', height = 6, label }: Props) {
  const clampedValue = Math.max(0, Math.min(100, value))

  return (
    <div className="w-full">
      {label && <span className="text-xs text-muted-foreground mb-1 block">{label}</span>}
      <div className="w-full rounded-full overflow-hidden" style={{ height, backgroundColor: bgColor }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${clampedValue}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
