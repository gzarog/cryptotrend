import { useState } from 'react'
import { TIMEFRAMES, REFRESH_OPTIONS, SYMBOLS } from '../constants/market'

interface ControlBarProps {
  symbol: string
  onSymbolChange: (s: string) => void
  timeframe: string
  onTimeframeChange: (t: string) => void
  refreshSelection: string
  onRefreshSelectionChange: (r: string) => void
  barLimit: number
  onBarLimitChange: (b: number) => void
  isFetching: boolean
  onManualRefresh: () => void
  lastUpdated: string
}

export function ControlBar({
  symbol,
  onSymbolChange,
  timeframe,
  onTimeframeChange,
  refreshSelection,
  onRefreshSelectionChange,
  barLimit,
  onBarLimitChange,
  isFetching,
  onManualRefresh,
  lastUpdated,
}: ControlBarProps) {
  const [showSymbolDropdown, setShowSymbolDropdown] = useState(false)

  return (
    <div className="glass-panel p-4 mb-6 relative z-[100]">
      <div className="flex flex-wrap items-center gap-3">
        {/* Symbol Selector */}
        <div className="relative">
          <button
            className="glass-input flex items-center gap-2 font-semibold min-w-[140px]"
            onClick={() => setShowSymbolDropdown(!showSymbolDropdown)}
          >
            <span className="text-primary">⬡</span>
            {symbol}
            <svg className="w-4 h-4 text-muted-foreground ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showSymbolDropdown && (
            <div className="absolute top-full left-0 mt-1 z-[100] bg-card border border-white/10 shadow-2xl shadow-black/50 rounded-2xl p-2 min-w-[160px] max-h-64 overflow-y-auto">
              {SYMBOLS.map((s) => (
                <button
                  key={s}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    s === symbol ? 'bg-primary/20 text-primary' : 'hover:bg-white/5 text-foreground'
                  }`}
                  onClick={() => { onSymbolChange(s); setShowSymbolDropdown(false) }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Timeframe Pills */}
        <div className="flex gap-1 bg-black/20 rounded-lg p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.value}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tf.value === timeframe
                  ? 'bg-primary/20 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
              onClick={() => onTimeframeChange(tf.value)}
            >
              {tf.label}
            </button>
          ))}
        </div>

        {/* Refresh Interval */}
        <div className="flex items-center gap-2 ml-auto">
          <select
            className="glass-input text-xs py-1.5"
            value={refreshSelection}
            onChange={(e) => onRefreshSelectionChange(e.target.value)}
          >
            {REFRESH_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>

          <button
            className="glass-button glass-button-primary text-xs px-3 py-1.5 flex items-center gap-1.5"
            onClick={onManualRefresh}
            disabled={isFetching}
          >
            <svg
              className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>

          {lastUpdated && (
            <span className="text-xs text-muted-foreground hidden sm:block">
              Updated {lastUpdated}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
