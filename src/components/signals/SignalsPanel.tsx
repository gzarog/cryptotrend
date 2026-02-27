import type { TimeframeSignalSnapshot, QualifiedSignal } from '../../types/signals'
import { TrendBiasBreakdown } from './TrendBiasBreakdown'
import { SignalHighlights } from './SignalHighlights'
import { TIMEFRAME_ORDER } from './constants'

type Props = {
  snapshots: TimeframeSignalSnapshot[]
  qualifiedSignals: QualifiedSignal[]
}

export function SignalsPanel({ snapshots, qualifiedSignals }: Props) {
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => TIMEFRAME_ORDER.indexOf(a.timeframe) - TIMEFRAME_ORDER.indexOf(b.timeframe)
  )

  return (
    <div className="space-y-6">
      {/* Trend Bias Breakdown */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Trend Bias</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedSnapshots.map((snap) => (
            <TrendBiasBreakdown key={snap.timeframe} bias={snap.trendBias} timeframeLabel={snap.timeframeLabel} />
          ))}
        </div>
      </div>

      {/* Qualified Signal Highlights */}
      <SignalHighlights signals={qualifiedSignals} />
    </div>
  )
}
