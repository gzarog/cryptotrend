export type MomentumIntensity = 'green' | 'yellow' | 'orange' | 'red'

export type MomentumReading = {
  timeframe: string
  timeframeLabel: string
  rsi: number
  stochasticD: number
  openTime: number
}

export type MomentumNotification = {
  id: string
  symbol: string
  direction: 'long' | 'short'
  intensity: MomentumIntensity
  label: string
  timeframeSummary: string
  rsiSummary: string
  stochasticSummary: string
  readings: MomentumReading[]
  triggeredAt: number
}

export type MovingAverageMarker = {
  index: number
  value: number
  color: string
  label: string
}

export type MovingAverageCrossNotification = {
  id: string
  symbol: string
  timeframe: string
  timeframeLabel: string
  pairLabel: string
  direction: 'golden' | 'death'
  intensity: Exclude<MomentumIntensity, 'red'>
  price: number
  triggeredAt: number
}

export type Candle = {
  openTime: number
  closeTime: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  turnover: number
}

export type BybitKlineResponse = {
  retCode: number
  retMsg: string
  result?: {
    list?: string[][]
  }
}

export type MomentumComputation = {
  symbol: string
  timeframe: string
  timeframeLabel: string
  rsi: number | null
  stochK: number | null
  stochD: number | null
  macdLine: number | null
  macdSignal: number | null
  macdHistogram: number | null
  ema10: number | null
  ema50: number | null
  sma200: number | null
  adx: number | null
  atr: number | null
  close: number | null
  volume: number | null
  candles: Candle[]
}

export type TimeframeOption = {
  value: string
  label: string
  minutes: number
}
