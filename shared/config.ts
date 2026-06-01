// Timeframe-adaptive indicator settings — shared between frontend and worker.
// Source of truth: keep in sync with any period changes.

export const RSI_SETTINGS: Record<string, { period: number; label: string }> = {
  '5':   { period: 8,  label: '7–9'   },
  '15':  { period: 11, label: '9–12'  },
  '30':  { period: 13, label: '12–14' },
  '60':  { period: 15, label: '14–16' },
  '120': { period: 17, label: '16–18' },
  '240': { period: 20, label: '18–21' },
  '360': { period: 23, label: '21–24' },
  'D':   { period: 14, label: '14'    },
  'W':   { period: 14, label: '14'    },
}
export const DEFAULT_RSI = { period: 14, label: '14' }

export const STOCH_SETTINGS: Record<string, { rsiLength: number; stochLength: number; kSmoothing: number; dSmoothing: number }> = {
  '5':   { rsiLength: 7,  stochLength: 7,  kSmoothing: 2, dSmoothing: 2 },
  '15':  { rsiLength: 9,  stochLength: 9,  kSmoothing: 2, dSmoothing: 3 },
  '30':  { rsiLength: 12, stochLength: 12, kSmoothing: 3, dSmoothing: 3 },
  '60':  { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 },
  '120': { rsiLength: 16, stochLength: 16, kSmoothing: 3, dSmoothing: 3 },
  '240': { rsiLength: 21, stochLength: 21, kSmoothing: 4, dSmoothing: 4 },
  '360': { rsiLength: 24, stochLength: 24, kSmoothing: 4, dSmoothing: 4 },
  'D':   { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 },
  'W':   { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 },
}
export const DEFAULT_STOCH = { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 }

export const MACD_SETTINGS: Record<string, { fast: number; slow: number; signal: number }> = {
  '5':   { fast: 8,  slow: 21, signal: 5  },
  '15':  { fast: 10, slow: 24, signal: 7  },
  '30':  { fast: 12, slow: 26, signal: 9  },
  '60':  { fast: 12, slow: 30, signal: 9  },
  '120': { fast: 16, slow: 36, signal: 9  },
  '240': { fast: 20, slow: 40, signal: 9  },
  '360': { fast: 22, slow: 44, signal: 10 },
  'D':   { fast: 12, slow: 26, signal: 9  },
  'W':   { fast: 12, slow: 26, signal: 9  },
}
export const DEFAULT_MACD = { fast: 12, slow: 26, signal: 9 }

export const TF_LABELS: Record<string, string> = {
  '5': '5m', '15': '15m', '30': '30m', '60': '1H',
  '120': '2H', '240': '4H', '360': '6H', 'D': '1D', 'W': '1W',
}

// Timeframes the worker cron monitors for alerts.
export const MONITORED_TIMEFRAMES = ['60', '120', '240', '360', 'D', 'W'] as const

// All 9 timeframes the worker computes signals for (cached in KV).
export const ALL_SIGNAL_TIMEFRAMES = ['5', '15', '30', '60', '120', '240', '360', 'D', 'W'] as const

// Cooldown in seconds per timeframe (matches COOLDOWN_MS in notifications.ts).
export const COOLDOWN_SECS: Record<string, number> = {
  '5': 300, '15': 900, '30': 1800,
  '60': 3600, '120': 7200, '240': 14400, '360': 21600, 'D': 86400, 'W': 604800,
}
