import type { Candle, MomentumComputation } from '../types/app'
import type {
  SignalDirection,
  SignalStrength,
  TradingSignal,
  CombinedSignal,
  MultiTimeframeSignal,
  TimeframeSignalSnapshot,
  TrendBias,
  QualifiedSignal,
  SignalPreset,
  SignalPresetConfig,
  ExpertSignalResult,
} from '../types/signals'


// ─── Signal Presets ─────────────────────────────────────────────────────────

export const SIGNAL_PRESETS: Record<SignalPreset, SignalPresetConfig> = {
  balanced: {
    name: 'balanced',
    label: 'Balanced',
    description: 'Equal weight across all timeframes and indicators',
    timeframeWeights: { '5': 0.1, '15': 0.15, '30': 0.15, '60': 0.2, '120': 0.15, '240': 0.15, '360': 0.1 },
    rsiWeight: 0.25,
    macdWeight: 0.25,
    stochWeight: 0.25,
    adxWeight: 0.25,
    markovWeight: 0.15,
  },
  scalper: {
    name: 'scalper',
    label: 'Scalper',
    description: 'Favors short timeframes for quick entries',
    timeframeWeights: { '5': 0.3, '15': 0.25, '30': 0.2, '60': 0.15, '120': 0.05, '240': 0.03, '360': 0.02 },
    rsiWeight: 0.3,
    macdWeight: 0.15,
    stochWeight: 0.35,
    adxWeight: 0.2,
    markovWeight: 0.1,
  },
  swing: {
    name: 'swing',
    label: 'Swing',
    description: 'Favors higher timeframes for trend-following',
    timeframeWeights: { '5': 0.02, '15': 0.05, '30': 0.08, '60': 0.15, '120': 0.2, '240': 0.25, '360': 0.25 },
    rsiWeight: 0.2,
    macdWeight: 0.3,
    stochWeight: 0.15,
    adxWeight: 0.35,
    markovWeight: 0.2,
  },
}

// ─── Direction & Strength Helpers ───────────────────────────────────────────

function scoreToDirection(score: number): SignalDirection {
  if (score > 0.15) return 'long'
  if (score < -0.15) return 'short'
  return 'neutral'
}

function confidenceToStrength(confidence: number): SignalStrength {
  if (confidence >= 0.75) return 'strong'
  if (confidence >= 0.5) return 'moderate'
  if (confidence >= 0.25) return 'weak'
  return 'none'
}

function directionLabel(direction: SignalDirection): string {
  switch (direction) {
    case 'long': return 'Bullish'
    case 'short': return 'Bearish'
    default: return 'Neutral'
  }
}

// ─── RSI Signal ─────────────────────────────────────────────────────────────

function deriveRSISignal(rsi: number | null): TradingSignal {
  if (rsi === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'RSI N/A', source: 'rsi' }

  let direction: SignalDirection = 'neutral'
  let confidence = 0

  if (rsi <= 20) { direction = 'long'; confidence = 0.9 }
  else if (rsi <= 30) { direction = 'long'; confidence = 0.7 }
  else if (rsi <= 40) { direction = 'long'; confidence = 0.4 }
  else if (rsi >= 80) { direction = 'short'; confidence = 0.9 }
  else if (rsi >= 70) { direction = 'short'; confidence = 0.7 }
  else if (rsi >= 60) { direction = 'short'; confidence = 0.4 }
  else { confidence = 0.2 }

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `RSI ${rsi.toFixed(1)}`,
    source: 'rsi',
  }
}

// ─── Stochastic Signal ──────────────────────────────────────────────────────

function deriveStochSignal(k: number | null, d: number | null): TradingSignal {
  if (k === null || d === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'Stoch N/A', source: 'stoch' }

  let direction: SignalDirection = 'neutral'
  let confidence = 0

  if (k < 20 && d < 20) { direction = 'long'; confidence = 0.8 }
  else if (k < 30) { direction = 'long'; confidence = 0.5 }
  else if (k > 80 && d > 80) { direction = 'short'; confidence = 0.8 }
  else if (k > 70) { direction = 'short'; confidence = 0.5 }
  else { confidence = 0.2 }

  // Cross bonus
  if (k > d && direction === 'long') confidence = Math.min(confidence + 0.1, 1)
  if (k < d && direction === 'short') confidence = Math.min(confidence + 0.1, 1)

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Stoch K:${k.toFixed(1)} D:${d.toFixed(1)}`,
    source: 'stoch',
  }
}

// ─── MACD Signal ────────────────────────────────────────────────────────────

function deriveMACDSignal(macdLine: number | null, signal: number | null, histogram: number | null): TradingSignal {
  if (macdLine === null || signal === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'MACD N/A', source: 'macd' }

  let direction: SignalDirection = 'neutral'
  let confidence = 0

  if (macdLine > signal && macdLine > 0) { direction = 'long'; confidence = 0.7 }
  else if (macdLine > signal) { direction = 'long'; confidence = 0.5 }
  else if (macdLine < signal && macdLine < 0) { direction = 'short'; confidence = 0.7 }
  else if (macdLine < signal) { direction = 'short'; confidence = 0.5 }

  if (histogram !== null) {
    const histAbs = Math.abs(histogram)
    if (histAbs > 0) confidence = Math.min(confidence + 0.1, 1)
  }

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `MACD ${macdLine.toFixed(2)}`,
    source: 'macd',
  }
}

// ─── ADX Signal ─────────────────────────────────────────────────────────────

function deriveADXSignal(adx: number | null, direction: SignalDirection): TradingSignal {
  if (adx === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'ADX N/A', source: 'adx' }

  let confidence = 0
  let adxDirection: SignalDirection = direction

  if (adx >= 40) confidence = 0.9
  else if (adx >= 25) confidence = 0.6
  else if (adx >= 20) confidence = 0.3
  else { confidence = 0.1; adxDirection = 'neutral' }

  return {
    direction: adxDirection,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `ADX ${adx.toFixed(1)}`,
    source: 'adx',
  }
}

// ─── Trend Bias ─────────────────────────────────────────────────────────────

export function deriveTrendBias(comp: MomentumComputation): TrendBias {
  let macdTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (comp.macdHistogram !== null) {
    macdTrend = comp.macdHistogram > 0 ? 'bullish' : comp.macdHistogram < 0 ? 'bearish' : 'neutral'
  }

  let emaTrend: 'bullish' | 'bearish' | 'neutral' = 'neutral'
  if (comp.ema10 !== null && comp.ema50 !== null) {
    emaTrend = comp.ema10 > comp.ema50 ? 'bullish' : 'bearish'
  }

  let adxStrength: 'strong' | 'moderate' | 'weak' = 'weak'
  if (comp.adx !== null) {
    adxStrength = comp.adx >= 30 ? 'strong' : comp.adx >= 20 ? 'moderate' : 'weak'
  }

  let score = 0
  if (macdTrend === 'bullish') score += 1
  if (macdTrend === 'bearish') score -= 1
  if (emaTrend === 'bullish') score += 1
  if (emaTrend === 'bearish') score -= 1

  const direction: SignalDirection = score > 0 ? 'long' : score < 0 ? 'short' : 'neutral'

  return { direction, score, macdTrend, emaTrend, adxStrength }
}

// ─── Combined Signal ────────────────────────────────────────────────────────

export function deriveCombinedSignal(comp: MomentumComputation, markovPrior: number = 0): CombinedSignal {
  const rsiSignal = deriveRSISignal(comp.rsi)
  const stochSignal = deriveStochSignal(comp.stochK, comp.stochD)
  const macdSignal = deriveMACDSignal(comp.macdLine, comp.macdSignal, comp.macdHistogram)

  const trendBias = deriveTrendBias(comp)
  const trendDirection = trendBias.direction

  const adxSignal = deriveADXSignal(comp.adx, trendDirection)

  const signals = [rsiSignal, stochSignal, macdSignal, adxSignal]

  let weightedScore = 0
  let totalWeight = 0

  for (const sig of signals) {
    const dirMultiplier = sig.direction === 'long' ? 1 : sig.direction === 'short' ? -1 : 0
    weightedScore += dirMultiplier * sig.confidence
    totalWeight += sig.confidence || 0.1
  }

  // Apply Markov prior
  weightedScore += markovPrior * 0.15
  totalWeight += Math.abs(markovPrior) * 0.15

  const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0
  const confidence = Math.min(Math.abs(normalizedScore), 1)
  const direction = scoreToDirection(normalizedScore)

  const adxConfirmation = comp.adx !== null && comp.adx >= 20

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `${directionLabel(direction)} (${(confidence * 100).toFixed(0)}%)`,
    signals,
    trendScore: trendBias.score,
    adxConfirmation,
    markovPrior,
  }
}

// ─── Timeframe Snapshots ────────────────────────────────────────────────────

export function deriveTimeframeSnapshots(
  computations: MomentumComputation[],
  markovPriors: Record<string, number> = {}
): TimeframeSignalSnapshot[] {
  return computations.map((comp) => {
    const prior = markovPriors[comp.timeframe] ?? 0
    const signal = deriveCombinedSignal(comp, prior)
    const trendBias = deriveTrendBias(comp)

    return {
      timeframe: comp.timeframe,
      timeframeLabel: comp.timeframeLabel,
      signal,
      rsi: comp.rsi,
      stochK: comp.stochK,
      stochD: comp.stochD,
      macdLine: comp.macdLine,
      macdSignal: comp.macdSignal,
      macdHistogram: comp.macdHistogram,
      adx: comp.adx,
      atr: comp.atr,
      close: comp.close,
      ema10: comp.ema10,
      ema50: comp.ema50,
      sma200: comp.sma200,
      trendBias,
    }
  })
}

// ─── Multi-Timeframe Signal ─────────────────────────────────────────────────

export function getMultiTimeframeSignal(
  snapshots: TimeframeSignalSnapshot[],
  weights: Record<string, number> = {}
): MultiTimeframeSignal {
  const defaultWeight = 1 / Math.max(snapshots.length, 1)
  let weightedScore = 0
  let totalWeight = 0
  let aligned = 0

  const timeframeSignals: Record<string, CombinedSignal> = {}
  const dominantDirection = getDominantDirection(snapshots)

  for (const snap of snapshots) {
    const w = weights[snap.timeframe] ?? defaultWeight
    const dirMultiplier = snap.signal.direction === 'long' ? 1 : snap.signal.direction === 'short' ? -1 : 0
    weightedScore += dirMultiplier * snap.signal.confidence * w
    totalWeight += w
    timeframeSignals[snap.timeframe] = snap.signal

    if (snap.signal.direction === dominantDirection) aligned++
  }

  const normalizedScore = totalWeight > 0 ? weightedScore / totalWeight : 0
  const confidence = Math.min(Math.abs(normalizedScore), 1)
  const direction = scoreToDirection(normalizedScore)
  const alignmentRatio = snapshots.length > 0 ? aligned / snapshots.length : 0

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `${directionLabel(direction)} (${(confidence * 100).toFixed(0)}% - ${(alignmentRatio * 100).toFixed(0)}% aligned)`,
    timeframeSignals,
    weightedScore: normalizedScore,
    alignmentRatio,
  }
}

function getDominantDirection(snapshots: TimeframeSignalSnapshot[]): SignalDirection {
  let longCount = 0
  let shortCount = 0
  for (const s of snapshots) {
    if (s.signal.direction === 'long') longCount++
    if (s.signal.direction === 'short') shortCount++
  }
  if (longCount > shortCount) return 'long'
  if (shortCount > longCount) return 'short'
  return 'neutral'
}

// ─── Expert Signal ──────────────────────────────────────────────────────────

export function deriveExpertSignal(
  snapshots: TimeframeSignalSnapshot[],
  preset: SignalPreset
): ExpertSignalResult {
  const config = SIGNAL_PRESETS[preset]
  let fusionScore = 0
  let totalWeight = 0

  const timeframeBreakdown: Record<string, { direction: SignalDirection; weight: number; contribution: number }> = {}

  for (const snap of snapshots) {
    const tfWeight = config.timeframeWeights[snap.timeframe] ?? 0.1

    let indicatorScore = 0
    let indicatorWeight = 0

    // RSI contribution
    const rsiSig = snap.signal.signals.find(s => s.source === 'rsi')
    if (rsiSig) {
      const dir = rsiSig.direction === 'long' ? 1 : rsiSig.direction === 'short' ? -1 : 0
      indicatorScore += dir * rsiSig.confidence * config.rsiWeight
      indicatorWeight += config.rsiWeight
    }

    // MACD contribution
    const macdSig = snap.signal.signals.find(s => s.source === 'macd')
    if (macdSig) {
      const dir = macdSig.direction === 'long' ? 1 : macdSig.direction === 'short' ? -1 : 0
      indicatorScore += dir * macdSig.confidence * config.macdWeight
      indicatorWeight += config.macdWeight
    }

    // Stoch contribution
    const stochSig = snap.signal.signals.find(s => s.source === 'stoch')
    if (stochSig) {
      const dir = stochSig.direction === 'long' ? 1 : stochSig.direction === 'short' ? -1 : 0
      indicatorScore += dir * stochSig.confidence * config.stochWeight
      indicatorWeight += config.stochWeight
    }

    // ADX contribution
    const adxSig = snap.signal.signals.find(s => s.source === 'adx')
    if (adxSig) {
      const dir = adxSig.direction === 'long' ? 1 : adxSig.direction === 'short' ? -1 : 0
      indicatorScore += dir * adxSig.confidence * config.adxWeight
      indicatorWeight += config.adxWeight
    }

    // Markov prior
    indicatorScore += snap.signal.markovPrior * config.markovWeight
    indicatorWeight += config.markovWeight

    const normalizedIndicator = indicatorWeight > 0 ? indicatorScore / indicatorWeight : 0
    const contribution = normalizedIndicator * tfWeight

    fusionScore += contribution
    totalWeight += tfWeight

    timeframeBreakdown[snap.timeframe] = {
      direction: scoreToDirection(normalizedIndicator),
      weight: tfWeight,
      contribution,
    }
  }

  const normalizedFusion = totalWeight > 0 ? fusionScore / totalWeight : 0
  const confidence = Math.min(Math.abs(normalizedFusion), 1)
  const direction = scoreToDirection(normalizedFusion)

  return {
    preset,
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `${config.label}: ${directionLabel(direction)} (${(confidence * 100).toFixed(0)}%)`,
    fusionScore: normalizedFusion,
    timeframeBreakdown,
  }
}

// ─── Qualified Signals ──────────────────────────────────────────────────────

export function getQualifiedSignals(snapshots: TimeframeSignalSnapshot[]): QualifiedSignal[] {
  const qualified: QualifiedSignal[] = []

  for (const snap of snapshots) {
    if (snap.signal.confidence < 0.5) continue
    if (snap.signal.strength === 'none' || snap.signal.strength === 'weak') continue

    const details: string[] = []

    if (snap.rsi !== null) {
      if (snap.rsi <= 30) details.push(`RSI oversold (${snap.rsi.toFixed(1)})`)
      else if (snap.rsi >= 70) details.push(`RSI overbought (${snap.rsi.toFixed(1)})`)
    }

    if (snap.macdHistogram !== null) {
      details.push(`MACD hist ${snap.macdHistogram > 0 ? '+' : ''}${snap.macdHistogram.toFixed(2)}`)
    }

    if (snap.adx !== null && snap.adx >= 25) {
      details.push(`ADX strong (${snap.adx.toFixed(1)})`)
    }

    if (snap.signal.adxConfirmation) {
      details.push('ADX confirmed')
    }

    qualified.push({
      timeframe: snap.timeframe,
      timeframeLabel: snap.timeframeLabel,
      direction: snap.signal.direction,
      strength: snap.signal.strength,
      confidence: snap.signal.confidence,
      source: 'combined',
      details: details.join(' | '),
    })
  }

  return qualified.sort((a, b) => b.confidence - a.confidence)
}


// ─── Markov Prior from Candles ───────────────────────────────────────────────

export function calculateMarkovPrior(candles: Candle[], lookback: number = 50): number {
  if (candles.length < lookback + 2) return 0

  const recentCandles = candles.slice(-lookback)
  let upCount = 0
  let downCount = 0

  for (let i = 1; i < recentCandles.length; i++) {
    if (recentCandles[i].close > recentCandles[i - 1].close) upCount++
    else if (recentCandles[i].close < recentCandles[i - 1].close) downCount++
  }

  const total = upCount + downCount
  if (total === 0) return 0

  return (upCount - downCount) / total
}

// ─── Multi-Timeframe Markov Priors ──────────────────────────────────────────

export function calculateMultiTimeframeMarkovPriors(
  candlesByTimeframe: Record<string, Candle[]>
): Record<string, number> {
  const priors: Record<string, number> = {}
  for (const [tf, candles] of Object.entries(candlesByTimeframe)) {
    priors[tf] = calculateMarkovPrior(candles)
  }
  return priors
}
