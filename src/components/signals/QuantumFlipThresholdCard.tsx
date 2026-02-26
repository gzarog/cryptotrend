import type { QuantumCompositeSignal } from '../../types/signals'
import { PercentageBar } from './PercentageBar'

type Props = {
  signal: QuantumCompositeSignal
}

const PHASE_COLORS: Record<string, string> = {
  accumulation: 'hsl(45 93% 47%)',
  markup: 'hsl(142 71% 45%)',
  distribution: 'hsl(0 84% 60%)',
  markdown: 'hsl(280 60% 55%)',
}

export function QuantumFlipThresholdCard({ signal }: Props) {
  const phaseColor = PHASE_COLORS[signal.phase] ?? 'hsl(var(--muted-foreground))'

  return (
    <div className="glass-panel p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Quantum Flip Threshold</h4>
        <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ color: phaseColor, backgroundColor: `${phaseColor}20` }}>
          {signal.phaseLabel}
        </span>
      </div>

      <PercentageBar
        value={signal.flipThreshold * 100}
        color={phaseColor}
        label={`Flip threshold: ${(signal.flipThreshold * 100).toFixed(1)}%`}
      />

      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>Amplitude: <span className="text-foreground">{signal.amplitude.toFixed(3)}</span></div>
        <div>Phase ∠: <span className="text-foreground">{((signal.phaseAngle * 180) / Math.PI).toFixed(1)}°</span></div>
        <div>Composite: <span className="text-foreground">{signal.compositeScore.toFixed(3)}</span></div>
        <div>Markov: <span className="text-foreground">{signal.markovState}</span></div>
      </div>
    </div>
  )
}
