import type { QualifiedSignal } from '../../types/signals'
import { SignalBadge } from './Badge'
import { directionIcon, formatConfidence } from './utils'
import { DIRECTION_COLORS } from './constants'

type Props = {
  signals: QualifiedSignal[]
}

export function SignalHighlights({ signals }: Props) {
  if (signals.length === 0) {
    return (
      <div className="glass-panel p-4 text-center text-sm text-muted-foreground">
        No qualified signals detected
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Signal Highlights</h3>
      {signals.slice(0, 5).map((sig, i) => (
        <div key={i} className="glass-panel p-3 flex items-start gap-3">
          <span className="text-lg mt-0.5" style={{ color: DIRECTION_COLORS[sig.direction] }}>
            {directionIcon(sig.direction)}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium">{sig.timeframeLabel}</span>
              <SignalBadge direction={sig.direction} strength={sig.strength} />
              <span className="text-xs text-muted-foreground">{formatConfidence(sig.confidence)}</span>
            </div>
            {sig.details && (
              <p className="text-xs text-muted-foreground truncate">{sig.details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
