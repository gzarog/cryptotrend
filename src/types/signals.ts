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
}

export type TrendBias = {
  direction: SignalDirection
  score: number
  macdTrend: 'bullish' | 'bearish' | 'neutral'
  emaTrend: 'bullish' | 'bearish' | 'neutral'
  adxStrength: 'strong' | 'moderate' | 'weak'
}

export type SignalPreset = 'balanced' | 'scalper' | 'swing'

export type SignalPresetConfig = {
  name: string
  label: string
  description: string
  timeframeWeights: Record<string, number>
  rsiWeight: number
  macdWeight: number
  stochWeight: number
  adxWeight: number
  markovWeight: number
}

export type ExpertSignalResult = {
  preset: SignalPreset
  direction: SignalDirection
  strength: SignalStrength
  confidence: number
  label: string
  fusionScore: number
  timeframeBreakdown: Record<string, {
    direction: SignalDirection
    weight: number
    contribution: number
  }>
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

