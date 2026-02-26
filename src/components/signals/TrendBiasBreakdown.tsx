import type { TrendBias } from '../../types/signals'

type Props = {
  bias: TrendBias
  timeframeLabel: string
}

export function TrendBiasBreakdown({ bias, timeframeLabel }: Props) {
  const trendColor = (v: string) =>
    v === 'bullish' ? 'text-green-400' : v === 'bearish' ? 'text-red-400' : 'text-muted-foreground'

  const strengthColor = (v: string) =>
    v === 'strong' ? 'text-green-400' : v === 'moderate' ? 'text-yellow-400' : 'text-muted-foreground'

  return (
    <div className="glass-panel p-3 space-y-1">
      <div className="text-xs font-medium text-muted-foreground mb-1">{timeframeLabel} Trend Bias</div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <span className="text-muted-foreground">MACD:</span>{' '}
          <span className={trendColor(bias.macdTrend)}>{bias.macdTrend}</span>
        </div>
        <div>
          <span className="text-muted-foreground">EMA:</span>{' '}
          <span className={trendColor(bias.emaTrend)}>{bias.emaTrend}</span>
        </div>
        <div>
          <span className="text-muted-foreground">ADX:</span>{' '}
          <span className={strengthColor(bias.adxStrength)}>{bias.adxStrength}</span>
        </div>
      </div>
      <div className="text-xs">
        Score: <span className={bias.score > 0 ? 'text-green-400' : bias.score < 0 ? 'text-red-400' : 'text-muted-foreground'}>
          {bias.score > 0 ? '+' : ''}{bias.score}
        </span>
      </div>
    </div>
  )
}
