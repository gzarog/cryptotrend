export type SignalDirection = 'long' | 'short' | 'neutral'
export type SignalStrength = 'strong' | 'moderate' | 'weak' | 'none'

export type TradingSignal = {
  direction: SignalDirection
  strength: SignalStrength
  confidence: number
  label: string
  source: string
}

export type CombinedSignal = {
  direction: SignalDirection
  strength: SignalStrength
  confidence: number
  label: string
  signals: TradingSignal[]
  trendScore: number
  adxConfirmation: boolean
  markovPrior: number
}

export type MultiTimeframeSignal = {
  direction: SignalDirection
  strength: SignalStrength
  confidence: number
  label: string
  timeframeSignals: Record<string, CombinedSignal>
  weightedScore: number
  alignmentRatio: number
}

export type MultiTimeframeConfluence = {
  direction: SignalDirection
  score: number
  alignmentRatio: number
  confluenceLevel: 'strong' | 'moderate' | 'weak' | 'mixed'
  longCount: number
  shortCount: number
  neutralCount: number
}

export type TimeframeSignalSnapshot = {
  timeframe: string
  timeframeLabel: string
  signal: CombinedSignal
  rsi: number | null
  stochK: number | null
  stochD: number | null
  macdLine: number | null
  macdSignal: number | null
  macdHistogram: number | null
  adx: number | null
  atr: number | null
  close: number | null
  ema10: number | null
  ema50: number | null
  sma200: number | null
  trendBias: TrendBias

  // New indicator fields
  bbPercentB: number | null
  bbBandwidth: number | null
  supertrendDirection: 1 | -1 | null
  obv: number | null
  vwap: number | null
  volatilityPercentile: number | null

  // Advanced indicator fields
  hurstExponent: number | null
  zScore: number | null
  rSquared: number | null
  linearRegressionSlope: number | null
  kama: number | null
  autocorrelation: number | null
  oiDivergence: number | null
  volumeSpikeRatio: number | null

  // Ichimoku
  ichimokuTenkan: number | null
  ichimokuKijun: number | null
  ichimokuSenkouA: number | null
  ichimokuSenkouB: number | null

  // CVD
  cvd: number | null
  cvdEma: number | null
}

export type TrendBias = {
  direction: SignalDirection
  score: number
  macdTrend: 'bullish' | 'bearish' | 'neutral'
  emaTrend: 'bullish' | 'bearish' | 'neutral'
  adxStrength: 'strong' | 'moderate' | 'weak'
}


export type QualifiedSignal = {
  timeframe: string
  timeframeLabel: string
  direction: SignalDirection
  strength: SignalStrength
  confidence: number
  source: string
  details: string
}

