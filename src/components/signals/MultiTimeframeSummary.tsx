import type { MultiTimeframeSignal } from '../../types/signals'
import { SignalBadge } from './Badge'
import { PercentageBar } from './PercentageBar'
import { DIRECTION_COLORS } from './constants'

type Props = {
  signal: MultiTimeframeSignal | null
}

export function MultiTimeframeSummary({ signal }: Props) {
  if (!signal) {
    return (
      <div className="glass-panel p-4 text-center text-sm text-muted-foreground">
        Multi-timeframe analysis pending…
      </div>
    )
  }

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Multi-Timeframe Summary</h3>
        <SignalBadge direction={signal.direction} strength={signal.strength} />
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Alignment</span>
          <span>{(signal.alignmentRatio * 100).toFixed(0)}%</span>
        </div>
        <PercentageBar
          value={signal.alignmentRatio * 100}
          color={DIRECTION_COLORS[signal.direction]}
        />
      </div>

      <div className="text-xs text-muted-foreground space-y-1">
        <div className="flex justify-between">
          <span>Confidence</span>
          <span>{(signal.confidence * 100).toFixed(0)}%</span>
        </div>
        <PercentageBar
          value={signal.confidence * 100}
          color={DIRECTION_COLORS[signal.direction]}
        />
      </div>

      <div className="text-xs text-muted-foreground">
        Weighted Score: <span className="text-foreground font-mono">{signal.weightedScore.toFixed(3)}</span>
      </div>
    </div>
  )
}
