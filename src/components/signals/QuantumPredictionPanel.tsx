import type { QuantumCompositeSignal } from '../../types/signals'
import { QuantumFlipThresholdCard } from './QuantumFlipThresholdCard'

type Props = {
  signal: QuantumCompositeSignal | null
}

export function QuantumPredictionPanel({ signal }: Props) {
  if (!signal || signal.confidence === 0) {
    return (
      <div className="glass-panel p-4 text-center text-sm text-muted-foreground">
        Quantum analysis requires sufficient data
      </div>
    )
  }

  const dirColor = signal.direction === 'bullish' ? 'text-green-400' : signal.direction === 'bearish' ? 'text-red-400' : 'text-muted-foreground'

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Quantum Prediction</h3>

      <div className="glass-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium">Market Phase</span>
          <span className={`text-sm font-semibold ${dirColor}`}>
            {signal.direction.charAt(0).toUpperCase() + signal.direction.slice(1)}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mb-2">
          Confidence: {(signal.confidence * 100).toFixed(1)}%
        </div>

        {/* Transition matrix visualization */}
        <div className="mt-3">
          <span className="text-xs text-muted-foreground block mb-1">Transition Probabilities</span>
          <div className="grid grid-cols-4 gap-1 text-[10px] font-mono">
            {['Acc', 'Mkp', 'Dst', 'Mkd'].map((label, i) => (
              <div key={i} className="text-center text-muted-foreground">{label}</div>
            ))}
            {signal.transitionProbabilities[signal.markovState]?.map((prob, i) => (
              <div key={i} className="text-center text-foreground bg-muted/30 rounded px-1 py-0.5">
                {(prob * 100).toFixed(0)}%
              </div>
            ))}
          </div>
        </div>
      </div>

      <QuantumFlipThresholdCard signal={signal} />
    </div>
  )
}
