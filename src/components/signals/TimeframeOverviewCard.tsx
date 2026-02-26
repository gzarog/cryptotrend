import type { TimeframeSignalSnapshot } from '../../types/signals'
import { SignalBadge } from './Badge'
import { PercentageBar } from './PercentageBar'
import { directionIcon, formatConfidence } from './utils'
import { DIRECTION_COLORS } from './constants'

type Props = {
  snapshot: TimeframeSignalSnapshot
}

export function TimeframeOverviewCard({ snapshot }: Props) {
  const { signal, timeframeLabel, rsi, stochK, stochD, adx } = snapshot

  return (
    <div className="glass-panel p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{timeframeLabel}</span>
        <SignalBadge direction={signal.direction} strength={signal.strength} />
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg" style={{ color: DIRECTION_COLORS[signal.direction] }}>
          {directionIcon(signal.direction)}
        </span>
        <span className="text-sm text-muted-foreground">
          {formatConfidence(signal.confidence)} confidence
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span>RSI: {rsi !== null ? rsi.toFixed(1) : '—'}</span>
        <span>ADX: {adx !== null ? adx.toFixed(1) : '—'}</span>
        <span>Stoch K: {stochK !== null ? stochK.toFixed(1) : '—'}</span>
        <span>Stoch D: {stochD !== null ? stochD.toFixed(1) : '—'}</span>
      </div>

      <PercentageBar
        value={signal.confidence * 100}
        color={DIRECTION_COLORS[signal.direction]}
      />
    </div>
  )
}
