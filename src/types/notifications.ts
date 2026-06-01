export type NotificationChannel = 'push' | 'email' | 'both'

export interface AlertTypeConfig {
  enabled: boolean
  channel: NotificationChannel
}

export interface ConfluenceConfig extends AlertTypeConfig {
  minTFs?: number
  minConfidence?: number
}

export interface FundingRateConfig extends AlertTypeConfig {
  threshold?: number
}

export interface VolatilityConfig extends AlertTypeConfig {
  percentileThreshold?: number
}

export interface NotificationCriteria {
  momentum: AlertTypeConfig
  crossover: AlertTypeConfig
  confluence: ConfluenceConfig
  divergence: AlertTypeConfig
  fundingRate: FundingRateConfig
  regimeChange: AlertTypeConfig
  volatility: VolatilityConfig
  correlation: AlertTypeConfig
  cooldownMinutes: number
  symbols: string[]
  timeframesAllowed: string[]
}

export const DEFAULT_CRITERIA: NotificationCriteria = {
  momentum: { enabled: true, channel: 'both' },
  crossover: { enabled: true, channel: 'both' },
  confluence: { enabled: true, channel: 'both', minTFs: 3, minConfidence: 0.65 },
  divergence: { enabled: true, channel: 'email' },
  fundingRate: { enabled: true, channel: 'push', threshold: 0.0005 },
  regimeChange: { enabled: true, channel: 'email' },
  volatility: { enabled: true, channel: 'push', percentileThreshold: 80 },
  correlation: { enabled: false, channel: 'push' },
  cooldownMinutes: 15,
  symbols: [],
  timeframesAllowed: [],
}

export const ALERT_TYPE_LABELS: Record<keyof Omit<NotificationCriteria, 'cooldownMinutes' | 'symbols' | 'timeframesAllowed'>, string> = {
  momentum: 'Momentum (RSI + Stoch extremes)',
  crossover: 'MA Crossover (EMA 10/50)',
  confluence: 'Multi-TF Confluence',
  divergence: 'RSI / MACD Divergence',
  fundingRate: 'Extreme Funding Rate',
  regimeChange: 'Regime Change (Hurst)',
  volatility: 'Volatility Breakout (ATR)',
  correlation: 'Correlation Breakdown',
}
