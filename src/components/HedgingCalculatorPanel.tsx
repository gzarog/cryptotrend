import { useState, useMemo } from 'react'
import type { Candle } from '../types/app'
import { calculateHedge, type HedgeResult } from '../lib/hedging'
import { PercentageBar } from './signals/PercentageBar'

type Props = {
  candles: Candle[]
  currentPrice: number
  rsi: number | null
  macdHistogram: number | null
  adx: number | null
  stochK: number | null
}

const URGENCY_COLORS: Record<string, string> = {
  immediate: 'text-red-400 bg-red-500/20',
  consider: 'text-yellow-400 bg-yellow-500/20',
  monitor: 'text-blue-400 bg-blue-500/20',
  none: 'text-muted-foreground bg-muted/30',
}

export function HedgingCalculatorPanel({ candles, currentPrice, rsi, macdHistogram, adx, stochK }: Props) {
  const [positionDirection, setPositionDirection] = useState<'long' | 'short' | 'none'>('none')
  const [atrMultiplierStop, setAtrMultiplierStop] = useState(2)
  const [atrMultiplierTP, setAtrMultiplierTP] = useState(3)
  const [maxRisk, setMaxRisk] = useState(2)

  const hedge = useMemo<HedgeResult>(() =>
    calculateHedge(candles, currentPrice, positionDirection, rsi, macdHistogram, adx, stochK, 14, atrMultiplierStop, atrMultiplierTP, maxRisk),
    [candles, currentPrice, positionDirection, rsi, macdHistogram, adx, stochK, atrMultiplierStop, atrMultiplierTP, maxRisk]
  )

  return (
    <div className="glass-panel p-4 space-y-4">
      <h3 className="text-sm font-semibold">Hedging Calculator</h3>

      {/* Position selector */}
      <div className="flex gap-2">
        {(['none', 'long', 'short'] as const).map((dir) => (
          <button
            key={dir}
            onClick={() => setPositionDirection(dir)}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              positionDirection === dir
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
            }`}
          >
            {dir === 'none' ? 'No Position' : dir.charAt(0).toUpperCase() + dir.slice(1)}
          </button>
        ))}
      </div>

      {/* ATR settings */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div>
          <label className="text-muted-foreground block mb-1">Stop ATR×</label>
          <input
            type="number"
            value={atrMultiplierStop}
            onChange={(e) => setAtrMultiplierStop(Number(e.target.value))}
            className="w-full bg-muted/30 border border-border/30 rounded px-2 py-1 text-foreground"
            min={0.5}
            max={5}
            step={0.5}
          />
        </div>
        <div>
          <label className="text-muted-foreground block mb-1">TP ATR×</label>
          <input
            type="number"
            value={atrMultiplierTP}
            onChange={(e) => setAtrMultiplierTP(Number(e.target.value))}
            className="w-full bg-muted/30 border border-border/30 rounded px-2 py-1 text-foreground"
            min={0.5}
            max={10}
            step={0.5}
          />
        </div>
        <div>
          <label className="text-muted-foreground block mb-1">Max Risk %</label>
          <input
            type="number"
            value={maxRisk}
            onChange={(e) => setMaxRisk(Number(e.target.value))}
            className="w-full bg-muted/30 border border-border/30 rounded px-2 py-1 text-foreground"
            min={0.5}
            max={10}
            step={0.5}
          />
        </div>
      </div>

      {/* Result */}
      <div className="border-t border-border/30 pt-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {hedge.direction === 'no-hedge' ? 'No Hedge Needed' : hedge.direction.replace('-', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded ${URGENCY_COLORS[hedge.urgency]}`}>
            {hedge.urgency}
          </span>
        </div>

        <PercentageBar
          value={hedge.hedgeRatio * 100}
          color={hedge.urgency === 'immediate' ? 'hsl(0 84% 60%)' : hedge.urgency === 'consider' ? 'hsl(45 93% 47%)' : 'hsl(var(--muted-foreground))'}
          label={`Hedge ratio: ${(hedge.hedgeRatio * 100).toFixed(0)}%`}
        />

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <div>ATR: <span className="text-foreground">{hedge.atrValue?.toFixed(2) ?? '—'}</span></div>
          <div>ATR%: <span className="text-foreground">{hedge.atrPercent?.toFixed(2) ?? '—'}%</span></div>
          <div>Stop: <span className="text-foreground">{hedge.stopDistance?.toFixed(2) ?? '—'}</span></div>
          <div>TP: <span className="text-foreground">{hedge.takeProfitDistance?.toFixed(2) ?? '—'}</span></div>
          <div>R:R: <span className="text-foreground">{hedge.riskRewardRatio?.toFixed(2) ?? '—'}</span></div>
          <div>Size: <span className="text-foreground">{hedge.positionSizePercent.toFixed(1)}%</span></div>
        </div>

        {/* Reasoning */}
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Reasoning</span>
          {hedge.reasoning.map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground/80">• {r}</p>
          ))}
        </div>
      </div>
    </div>
  )
}
