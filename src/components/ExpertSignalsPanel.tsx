import { useState, useMemo } from 'react'
import type { TimeframeSignalSnapshot, ExpertSignalResult, SignalPreset } from '../types/signals'
import { SIGNAL_PRESETS, deriveExpertSignal } from '../lib/signals'
import { SignalBadge } from './signals/Badge'
import { PercentageBar } from './signals/PercentageBar'
import { DIRECTION_COLORS } from './signals/constants'
import { directionIcon, formatConfidence } from './signals/utils'

type Props = {
  snapshots: TimeframeSignalSnapshot[]
}

export function ExpertSignalsPanel({ snapshots }: Props) {
  const [activePreset, setActivePreset] = useState<SignalPreset>('balanced')

  const results = useMemo<Record<SignalPreset, ExpertSignalResult>>(() => ({
    balanced: deriveExpertSignal(snapshots, 'balanced'),
    scalper: deriveExpertSignal(snapshots, 'scalper'),
    swing: deriveExpertSignal(snapshots, 'swing'),
  }), [snapshots])

  const active = results[activePreset]

  if (snapshots.length === 0) {
    return (
      <div className="glass-panel p-4 text-center text-sm text-muted-foreground">
        Expert signals require multi-timeframe data
      </div>
    )
  }

  return (
    <div className="glass-panel p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Expert Signals</h3>
        <div className="flex gap-1">
          {(Object.keys(SIGNAL_PRESETS) as SignalPreset[]).map((preset) => (
            <button
              key={preset}
              onClick={() => setActivePreset(preset)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                activePreset === preset
                  ? 'bg-primary/20 text-primary border border-primary/30'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              {SIGNAL_PRESETS[preset].label}
            </button>
          ))}
        </div>
      </div>

      {/* Active result */}
      <div className="flex items-center gap-3">
        <span className="text-2xl" style={{ color: DIRECTION_COLORS[active.direction] }}>
          {directionIcon(active.direction)}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{active.label}</span>
            <SignalBadge direction={active.direction} strength={active.strength} />
          </div>
          <span className="text-xs text-muted-foreground">
            Fusion score: {active.fusionScore.toFixed(3)}
          </span>
        </div>
      </div>

      <PercentageBar
        value={active.confidence * 100}
        color={DIRECTION_COLORS[active.direction]}
        label={`Confidence: ${formatConfidence(active.confidence)}`}
      />

      {/* Timeframe breakdown */}
      <div className="space-y-1">
        <span className="text-xs text-muted-foreground">Timeframe Contributions</span>
        {Object.entries(active.timeframeBreakdown).map(([tf, data]) => (
          <div key={tf} className="flex items-center gap-2 text-xs">
            <span className="w-8 text-muted-foreground">{tf}</span>
            <div className="flex-1">
              <PercentageBar
                value={Math.abs(data.contribution) * 100 * 10}
                color={DIRECTION_COLORS[data.direction]}
                height={4}
              />
            </div>
            <span className="w-12 text-right font-mono text-muted-foreground">
              {data.contribution > 0 ? '+' : ''}{data.contribution.toFixed(3)}
            </span>
          </div>
        ))}
      </div>

      {/* All presets summary */}
      <div className="border-t border-border/30 pt-3">
        <span className="text-xs text-muted-foreground block mb-2">All Presets</span>
        <div className="grid grid-cols-3 gap-2">
          {(Object.entries(results) as [SignalPreset, ExpertSignalResult][]).map(([preset, result]) => (
            <div key={preset} className="text-center">
              <span className="text-[10px] text-muted-foreground block">{SIGNAL_PRESETS[preset].label}</span>
              <span className="text-sm" style={{ color: DIRECTION_COLORS[result.direction] }}>
                {directionIcon(result.direction)}
              </span>
              <span className="text-[10px] text-muted-foreground block">
                {formatConfidence(result.confidence)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
