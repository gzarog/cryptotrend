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

export interface UserPreference {
  email: string
  criteria: NotificationCriteria
  updatedAt: number
}
