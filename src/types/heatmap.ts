export type HeatmapCoinData = {
  symbol: string
  name: string
  price: number
  change1h: number
  change24h: number
  change7d: number
  marketCap: number
  volume24h: number
  dominance: number
}

export type HeatmapSnapshot = {
  timestamp: number
  coins: HeatmapCoinData[]
  totalMarketCap: number
  totalVolume24h: number
  btcDominance: number
  ethDominance: number
  fearGreedIndex: number | null
  fearGreedLabel: string | null
}

export type HeatmapResult = {
  current: HeatmapSnapshot | null
  previous: HeatmapSnapshot | null
  delta: HeatmapDelta | null
  fetchedAt: number
  isStale: boolean
}

export type HeatmapDelta = {
  marketCapChange: number
  volumeChange: number
  btcDominanceChange: number
  topGainers: HeatmapCoinDelta[]
  topLosers: HeatmapCoinDelta[]
  avgChange1h: number
  avgChange24h: number
  sentimentShift: 'improving' | 'deteriorating' | 'stable'
}

export type HeatmapCoinDelta = {
  symbol: string
  name: string
  priceChange: number
  change24hDelta: number
  volumeChange: number
}

export type HeatmapSignalDerivation = {
  marketSentiment: 'bullish' | 'bearish' | 'neutral'
  sentimentScore: number
  volumeProfile: 'increasing' | 'decreasing' | 'stable'
  dominanceShift: 'btc-leading' | 'alt-leading' | 'balanced'
  fearGreedBias: 'extreme-fear' | 'fear' | 'neutral' | 'greed' | 'extreme-greed' | null
  correlationStrength: number
  signalConfidence: number
}
