import { useId, useMemo, useRef, useState, useCallback, useEffect } from 'react'

type GuideLine = {
  value: number
  label: string
  color: string
}

type LineSeries = {
  name: string
  data: Array<number | null>
  color: string
}

type Marker = {
  index: number
  value: number
  color?: string
  label?: string
}

type LineChartProps = {
  title: string
  labels: string[]
  data?: Array<number | null>
  series?: LineSeries[]
  color?: string
  yDomain?: { min?: number; max?: number }
  guideLines?: GuideLine[]
  markers?: Marker[]
  isLoading?: boolean
}

const DEFAULT_WIDTH = 640
const DEFAULT_HEIGHT = 260
const PADDING = 24
const DEFAULT_COLOR = '#818cf8'

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function buildPath(points: Array<{ x: number; y: number } | null>): string {
  let path = ''
  let open = false
  points.forEach((p) => {
    if (!p) { open = false; return }
    path += open ? ` L ${p.x.toFixed(2)} ${p.y.toFixed(2)}` : `M ${p.x.toFixed(2)} ${p.y.toFixed(2)}`
    open = true
  })
  return path
}

function formatValue(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  if (Math.abs(value) >= 100) return value.toFixed(0)
  if (Math.abs(value) >= 1) return value.toFixed(2)
  return value.toFixed(4)
}

export function LineChart({
  title,
  labels,
  data,
  series,
  color = DEFAULT_COLOR,
  yDomain,
  guideLines,
  markers,
  isLoading,
}: LineChartProps) {
  const chartId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width } = entry.contentRect
      setDimensions({ width: Math.max(width, 200), height: DEFAULT_HEIGHT })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const allSeries = useMemo(() => {
    if (series && series.length > 0) return series
    if (data) return [{ name: title, data, color }]
    return []
  }, [series, data, title, color])

  const { yMin, yMax, xScale, yScale } = useMemo(() => {
    const allValues = allSeries.flatMap((s) => s.data).filter((v): v is number => v !== null)
    const guideValues = (guideLines ?? []).map((g) => g.value)
    const combined = [...allValues, ...guideValues]
    if (combined.length === 0) return { yMin: 0, yMax: 100, xScale: () => 0, yScale: () => 0 }

    const rawMin = yDomain?.min ?? Math.min(...combined)
    const rawMax = yDomain?.max ?? Math.max(...combined)
    const padding = (rawMax - rawMin) * 0.08 || 1
    const yMin = yDomain?.min ?? rawMin - padding
    const yMax = yDomain?.max ?? rawMax + padding

    const { width, height } = dimensions
    const chartW = width - PADDING * 2
    const chartH = height - PADDING * 2
    const len = labels.length || 1

    return {
      yMin,
      yMax,
      xScale: (i: number) => PADDING + (i / (len - 1)) * chartW,
      yScale: (v: number) => PADDING + (1 - (v - yMin) / (yMax - yMin)) * chartH,
    }
  }, [allSeries, guideLines, yDomain, dimensions, labels.length])

  const paths = useMemo(() => {
    return allSeries.map((s) => {
      const points = s.data.map((v, i) => (v !== null ? { x: xScale(i), y: yScale(v) } : null))
      return { path: buildPath(points), color: s.color, name: s.name }
    })
  }, [allSeries, xScale, yScale])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const x = e.clientX - rect.left
      const chartW = dimensions.width - PADDING * 2
      const idx = Math.round(((x - PADDING) / chartW) * (labels.length - 1))
      setHoverIndex(clamp(idx, 0, labels.length - 1))
    },
    [dimensions.width, labels.length]
  )

  if (isLoading) {
    return (
      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h3>
        <div className="h-[260px] flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (allSeries.length === 0 || labels.length === 0) {
    return (
      <div className="glass-panel p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h3>
        <div className="h-[260px] flex items-center justify-center text-muted-foreground text-sm">
          No data available
        </div>
      </div>
    )
  }

  const { width, height } = dimensions
  const gradientId = `grad-${chartId}`

  return (
    <div className="glass-panel p-4" ref={containerRef}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        {hoverIndex !== null && (
          <div className="flex gap-3 text-xs text-muted-foreground">
            {allSeries.map((s) => {
              const v = s.data[hoverIndex]
              return v !== null ? (
                <span key={s.name} style={{ color: s.color }}>
                  {s.name}: {formatValue(v)}
                </span>
              ) : null
            })}
          </div>
        )}
      </div>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={allSeries[0]?.color ?? color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={allSeries[0]?.color ?? color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Guide lines */}
        {guideLines?.map((gl) => {
          const y = yScale(gl.value)
          return (
            <g key={gl.label}>
              <line x1={PADDING} y1={y} x2={width - PADDING} y2={y} stroke={gl.color} strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
              <text x={width - PADDING + 4} y={y + 4} fill={gl.color} fontSize={10} opacity={0.7}>
                {gl.label}
              </text>
            </g>
          )
        })}

        {/* Y axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const value = yMin + frac * (yMax - yMin)
          const y = yScale(value)
          return (
            <g key={frac}>
              <line x1={PADDING} y1={y} x2={width - PADDING} y2={y} stroke="currentColor" strokeWidth={0.5} opacity={0.1} />
              <text x={PADDING - 4} y={y + 3} fill="currentColor" fontSize={9} textAnchor="end" opacity={0.4}>
                {formatValue(value)}
              </text>
            </g>
          )
        })}

        {/* Area fill for first series */}
        {allSeries.length === 1 && paths[0] && (
          <path
            d={`${paths[0].path} L ${xScale(labels.length - 1).toFixed(2)} ${(height - PADDING).toFixed(2)} L ${PADDING.toFixed(2)} ${(height - PADDING).toFixed(2)} Z`}
            fill={`url(#${gradientId})`}
          />
        )}

        {/* Line paths */}
        {paths.map((p) => (
          <path key={p.name} d={p.path} stroke={p.color} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        ))}

        {/* Latest value labels at right edge */}
        {allSeries.map((s) => {
          const lastVal = [...s.data].reverse().find((v): v is number => v !== null)
          if (lastVal === undefined) return null
          const y = yScale(lastVal)
          return (
            <g key={`latest-${s.name}`}>
              <circle cx={width - PADDING} cy={y} r={3} fill={s.color} />
              <text x={width - PADDING + 6} y={y + 4} fill={s.color} fontSize={10} fontWeight={600}>
                {formatValue(lastVal)}
              </text>
            </g>
          )
        })}

        {/* Markers */}
        {markers?.map((m, i) => {
          const x = xScale(m.index)
          const y = yScale(m.value)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={4} fill={m.color ?? color} stroke="hsl(var(--background))" strokeWidth={2} />
              {m.label && (
                <text x={x} y={y - 8} fill={m.color ?? color} fontSize={9} textAnchor="middle">
                  {m.label}
                </text>
              )}
            </g>
          )
        })}

        {/* Hover crosshair */}
        {hoverIndex !== null && (
          <line
            x1={xScale(hoverIndex)}
            y1={PADDING}
            x2={xScale(hoverIndex)}
            y2={height - PADDING}
            stroke="currentColor"
            strokeWidth={1}
            opacity={0.2}
            strokeDasharray="2 2"
          />
        )}
      </svg>
    </div>
  )
}
