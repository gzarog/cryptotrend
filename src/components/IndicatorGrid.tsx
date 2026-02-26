interface IndicatorCardProps {
  title: string
  value: number | null
  label?: string
  color?: 'green' | 'yellow' | 'orange' | 'red' | 'neutral'
  subtitle?: string
}

const COLOR_CLASSES = {
  green: 'border-momentum-green/40 bg-momentum-green/10',
  yellow: 'border-momentum-yellow/40 bg-momentum-yellow/10',
  orange: 'border-momentum-orange/40 bg-momentum-orange/10',
  red: 'border-momentum-red/40 bg-momentum-red/10',
  neutral: 'border-white/10 bg-white/5',
}

function getColorForRSI(value: number): 'green' | 'yellow' | 'orange' | 'red' {
  if (value <= 30) return 'green' // oversold (buy signal)
  if (value >= 70) return 'red' // overbought (sell signal)
  if (value <= 40 || value >= 60) return 'yellow'
  return 'green'
}

export function IndicatorCard({ title, value, label, color, subtitle }: IndicatorCardProps) {
  const resolvedColor = color ?? (value !== null ? getColorForRSI(value) : 'neutral')

  return (
    <div className={`glass-panel p-4 border ${COLOR_CLASSES[resolvedColor]} transition-all duration-300`}>
      <div className="text-xs font-medium text-muted-foreground mb-1">{title}</div>
      <div className="text-2xl font-bold tracking-tight text-foreground">
        {value !== null ? value.toFixed(2) : '—'}
      </div>
      {label && (
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      )}
      {subtitle && (
        <div className="text-xs text-muted-foreground mt-0.5 opacity-70">{subtitle}</div>
      )}
    </div>
  )
}

interface IndicatorGridProps {
  rsi: number | null
  stochK: number | null
  stochD: number | null
  macdLine: number | null
  macdSignal: number | null
  macdHistogram: number | null
}

export function IndicatorGrid({ rsi, stochK, stochD, macdLine, macdSignal, macdHistogram }: IndicatorGridProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <IndicatorCard
        title="RSI"
        value={rsi}
        label={rsi !== null ? (rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral') : undefined}
      />
      <IndicatorCard
        title="Stoch %K"
        value={stochK}
        label={stochK !== null ? (stochK > 80 ? 'Overbought' : stochK < 20 ? 'Oversold' : 'Neutral') : undefined}
      />
      <IndicatorCard
        title="Stoch %D"
        value={stochD}
        color={stochD !== null ? (stochD > 80 ? 'red' : stochD < 20 ? 'green' : 'neutral') : 'neutral'}
      />
      <IndicatorCard
        title="MACD"
        value={macdLine}
        color={macdLine !== null ? (macdLine > 0 ? 'green' : 'red') : 'neutral'}
      />
      <IndicatorCard
        title="Signal"
        value={macdSignal}
        color="neutral"
      />
      <IndicatorCard
        title="Histogram"
        value={macdHistogram}
        color={macdHistogram !== null ? (macdHistogram > 0 ? 'green' : 'red') : 'neutral'}
      />
    </div>
  )
}
