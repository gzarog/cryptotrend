import type { TrendBias, TrendBiasCategory } from '../../types/signals'

type Props = {
  bias: TrendBias
  timeframeLabel: string
}

function scoreColor(score: number): string {
  if (score > 20) return 'text-green-400'
  if (score < -20) return 'text-red-400'
  return 'text-muted-foreground'
}

function dirColor(dir: 'bullish' | 'bearish' | 'neutral'): string {
  return dir === 'bullish' ? 'text-green-400' : dir === 'bearish' ? 'text-red-400' : 'text-muted-foreground'
}

function CategoryRow({ cat }: { cat: TrendBiasCategory }) {
  if (cat.layers.length === 0) {
    return (
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/40">
        <span>{cat.label}</span>
        <span>—</span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-2 text-[10px]">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-muted-foreground w-[60px] shrink-0">{cat.label}</span>
        <span className={`font-medium w-[32px] shrink-0 text-right ${scoreColor(cat.score)}`}>
          {cat.score > 0 ? '+' : ''}{cat.score.toFixed(0)}
        </span>
      </div>
      <div className="flex gap-1 overflow-hidden">
        {cat.layers.map((layer) => (
          <span key={layer.label} className={`${dirColor(layer.direction)} whitespace-nowrap`}>
            {layer.label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function TrendBiasBreakdown({ bias, timeframeLabel }: Props) {
  const { score, confidence, categories } = bias

  return (
    <div className="glass-panel p-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{timeframeLabel}</span>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${scoreColor(score)}`}>
            {score > 0 ? '+' : ''}{score.toFixed(1)}
          </span>
          <span className="text-[10px] text-muted-foreground">
            {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      {/* Score bar */}
      <div className="relative h-1.5 bg-muted/30 rounded-full overflow-hidden">
        <div
          className={`absolute top-0 h-full rounded-full transition-all ${score >= 0 ? 'bg-green-500/60 left-1/2' : 'bg-red-500/60 right-1/2'}`}
          style={{ width: `${Math.min(Math.abs(score), 100) / 2}%` }}
        />
        <div className="absolute left-1/2 top-0 w-px h-full bg-muted-foreground/30" />
      </div>

      {/* Category breakdown */}
      <div className="space-y-1 pt-1 border-t border-border/30">
        {categories.map((cat) => (
          <CategoryRow key={cat.label} cat={cat} />
        ))}
      </div>
    </div>
  )
}
