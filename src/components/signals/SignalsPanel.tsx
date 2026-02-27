import type { TimeframeSignalSnapshot, QualifiedSignal, MultiTimeframeSignal } from '../../types/signals'
import { TimeframeOverviewCard } from './TimeframeOverviewCard'
import { TrendBiasBreakdown } from './TrendBiasBreakdown'
import { SignalHighlights } from './SignalHighlights'
import { MultiTimeframeSummary } from './MultiTimeframeSummary'
import { TIMEFRAME_ORDER } from './constants'

type Props = {
  snapshots: TimeframeSignalSnapshot[]
  qualifiedSignals: QualifiedSignal[]
  multiTfSignal: MultiTimeframeSignal | null
}

export function SignalsPanel({ snapshots, qualifiedSignals, multiTfSignal }: Props) {
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => TIMEFRAME_ORDER.indexOf(a.timeframe) - TIMEFRAME_ORDER.indexOf(b.timeframe)
  )

  return (
    <div className="space-y-6">
      {/* Multi-TF Summary */}
      <MultiTimeframeSummary signal={multiTfSignal} />

      {/* Timeframe Overview Cards */}
      <div>
        <h3 className="text-sm font-medium text-muted-foreground mb-2">Timeframe Signals</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedSnapshots.map((snap) => (
            <TimeframeOverviewCard key={snap.timeframe} snapshot={snap} />
          ))}
        </div>
      </div>

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
