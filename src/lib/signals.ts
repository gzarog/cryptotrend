import type { Candle, MomentumComputation } from '../types/app'
import type {
  SignalDirection,
  SignalStrength,
  TradingSignal,
  CombinedSignal,
  MultiTimeframeConfluence,
  TimeframeSignalSnapshot,
  TrendBias,
  QualifiedSignal,
} from '../types/signals'
import { detectDivergences } from './divergence'
import { getRecentPatterns } from './patterns'
import type { BayesianState } from './bayesian'
import { getBayesianWeight } from './bayesian'



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

// ─── Bollinger Bands Signal ─────────────────────────────────────────────────

function deriveBBSignal(percentB: number | null, bandwidth: number | null): TradingSignal {
  if (percentB === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'BB N/A', source: 'bb' }

  let direction: SignalDirection = 'neutral'
  let confidence = 0

  if (percentB <= 0) { direction = 'long'; confidence = 0.8 }
  else if (percentB <= 0.1) { direction = 'long'; confidence = 0.6 }
  else if (percentB <= 0.2) { direction = 'long'; confidence = 0.4 }
  else if (percentB >= 1) { direction = 'short'; confidence = 0.8 }
  else if (percentB >= 0.9) { direction = 'short'; confidence = 0.6 }
  else if (percentB >= 0.8) { direction = 'short'; confidence = 0.4 }
  else { confidence = 0.1 }

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `BB %B ${(percentB * 100).toFixed(0)}%`,
    source: 'bb',
  }
}

// ─── Supertrend Signal ──────────────────────────────────────────────────────

function deriveSupertrendSignal(stDir: 1 | -1 | null): TradingSignal {
  if (stDir === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'ST N/A', source: 'supertrend' }

  const direction: SignalDirection = stDir === 1 ? 'long' : 'short'
  return {
    direction,
    strength: 'moderate',
    confidence: 0.65,
    label: `Supertrend ${direction === 'long' ? 'Bullish' : 'Bearish'}`,
    source: 'supertrend',
  }
}

// ─── Divergence Signal ──────────────────────────────────────────────────────

export function deriveDivergenceSignals(
  closes: number[],
  rsi: Array<number | null>,
  macdHistogram: Array<number | null>
): TradingSignal[] {
  const signals: TradingSignal[] = []

  const rsiDivs = detectDivergences(closes, rsi, 100, 5)
  for (const div of rsiDivs) {
    const isRecent = div.endIndex >= closes.length - 10
    if (!isRecent) continue
    signals.push({
      direction: div.type === 'bullish' ? 'long' : 'short',
      strength: div.variant === 'regular' ? 'strong' : 'moderate',
      confidence: div.variant === 'regular' ? 0.75 : 0.5,
      label: `RSI ${div.variant} ${div.type} divergence`,
      source: 'divergence-rsi',
    })
  }

  const macdDivs = detectDivergences(closes, macdHistogram, 100, 5)
  for (const div of macdDivs) {
    const isRecent = div.endIndex >= closes.length - 10
    if (!isRecent) continue
    signals.push({
      direction: div.type === 'bullish' ? 'long' : 'short',
      strength: div.variant === 'regular' ? 'strong' : 'moderate',
      confidence: div.variant === 'regular' ? 0.7 : 0.45,
      label: `MACD ${div.variant} ${div.type} divergence`,
      source: 'divergence-macd',
    })
  }

  return signals
}

// ─── Funding Rate Signal ────────────────────────────────────────────────────

function deriveFundingSignal(fundingRate: number | null): TradingSignal {
  if (fundingRate === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'Funding N/A', source: 'funding' }

  const absRate = Math.abs(fundingRate)
  let direction: SignalDirection = 'neutral'
  let confidence = 0

  // Contrarian: high positive funding = longs overleveraged = bearish
  if (fundingRate > 0.001) { direction = 'short'; confidence = 0.7 }
  else if (fundingRate > 0.0005) { direction = 'short'; confidence = 0.5 }
  else if (fundingRate > 0.0003) { direction = 'short'; confidence = 0.3 }
  // High negative funding = shorts overleveraged = bullish
  else if (fundingRate < -0.0005) { direction = 'long'; confidence = 0.6 }
  else if (fundingRate < -0.0003) { direction = 'long'; confidence = 0.4 }
  else { confidence = 0.1 }

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Funding ${(fundingRate * 100).toFixed(4)}%`,
    source: 'funding',
  }
}

// ─── OI Divergence Signal ───────────────────────────────────────────────────

function deriveOIDivergenceSignal(oiDivergence: number | null): TradingSignal {
  if (oiDivergence === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'OI N/A', source: 'oi' }

  const abs = Math.abs(oiDivergence)
  const direction: SignalDirection = oiDivergence > 0.1 ? 'long' : oiDivergence < -0.1 ? 'short' : 'neutral'
  const confidence = Math.min(abs, 0.8)

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `OI div ${oiDivergence.toFixed(2)}`,
    source: 'oi',
  }
}

// ─── Z-Score Signal ─────────────────────────────────────────────────────────

function deriveZScoreSignal(zScore: number | null): TradingSignal {
  if (zScore === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'Z N/A', source: 'zscore' }

  let direction: SignalDirection = 'neutral'
  let confidence = 0

  if (zScore <= -2.5) { direction = 'long'; confidence = 0.85 }
  else if (zScore <= -2.0) { direction = 'long'; confidence = 0.7 }
  else if (zScore <= -1.5) { direction = 'long'; confidence = 0.45 }
  else if (zScore >= 2.5) { direction = 'short'; confidence = 0.85 }
  else if (zScore >= 2.0) { direction = 'short'; confidence = 0.7 }
  else if (zScore >= 1.5) { direction = 'short'; confidence = 0.45 }
  else { confidence = 0.1 }

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Z-Score ${zScore.toFixed(2)}`,
    source: 'zscore',
  }
}

// ─── OBV Signal ─────────────────────────────────────────────────────────────

function deriveOBVSignal(obv: number | null, obvEma: number | null): TradingSignal {
  if (obv === null || obvEma === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'OBV N/A', source: 'obv' }

  const direction: SignalDirection = obv > obvEma ? 'long' : obv < obvEma ? 'short' : 'neutral'
  const diff = obvEma !== 0 ? Math.abs(obv - obvEma) / Math.abs(obvEma) : 0
  const confidence = Math.min(diff * 5, 0.6)

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `OBV ${direction === 'long' ? '>' : '<'} EMA`,
    source: 'obv',
  }
}

// ─── VWAP Signal ────────────────────────────────────────────────────────────

function deriveVWAPSignal(close: number | null, vwap: number | null): TradingSignal {
  if (close === null || vwap === null) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'VWAP N/A', source: 'vwap' }

  const direction: SignalDirection = close > vwap ? 'long' : close < vwap ? 'short' : 'neutral'
  const deviation = Math.abs(close - vwap) / vwap
  const confidence = Math.min(deviation * 20, 0.55)

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Price ${direction === 'long' ? '>' : '<'} VWAP`,
    source: 'vwap',
  }
}

// ─── Candlestick Pattern Signal ─────────────────────────────────────────────

function derivePatternSignal(candles: Candle[]): TradingSignal {
  if (candles.length < 5) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'Pattern N/A', source: 'pattern' }

  const recent = getRecentPatterns(candles, 3)
  if (recent.length === 0) return { direction: 'neutral', strength: 'none', confidence: 0, label: 'No pattern', source: 'pattern' }

  // Use the strongest recent pattern
  const strongest = recent.reduce((best, p) => p.strength > best.strength ? p : best, recent[0])
  const direction: SignalDirection = strongest.type === 'bullish' ? 'long' : 'short'

  return {
    direction,
    strength: confidenceToStrength(strongest.strength),
    confidence: strongest.strength,
    label: strongest.name,
    source: 'pattern',
  }
}

// ─── Regime Weights ─────────────────────────────────────────────────────────

type RegimeWeights = Record<string, number>

function calculateRegimeWeights(hurst: number | null, adx: number | null, volPct: number | null): RegimeWeights {
  // Default weights (neutral regime)
  const weights: RegimeWeights = {
    rsi: 1.0, stoch: 1.0, macd: 1.0, adx: 1.0, bb: 1.0, supertrend: 1.0,
    funding: 1.0, oi: 1.0, zscore: 1.0, obv: 1.0, vwap: 1.0, pattern: 1.0,
    'divergence-rsi': 1.0, 'divergence-macd': 1.0,
  }

  if (hurst !== null) {
    if (hurst > 0.6) {
      // Trending: boost trend-following, reduce mean-reversion
      weights.macd *= 1.3
      weights.supertrend *= 1.3
      weights.adx *= 1.2
      weights.rsi *= 0.7
      weights.bb *= 0.7
      weights.zscore *= 0.7
    } else if (hurst < 0.4) {
      // Mean-reverting: boost mean-reversion, reduce trend-following
      weights.rsi *= 1.3
      weights.bb *= 1.3
      weights.zscore *= 1.3
      weights.macd *= 0.7
      weights.supertrend *= 0.7
    } else {
      // Random walk: reduce all confidence
      for (const key of Object.keys(weights)) {
        weights[key] *= 0.8
      }
    }
  }

  // High volatility: boost volume and funding signals
  if (volPct !== null && volPct >= 80) {
    weights.obv *= 1.2
    weights.funding *= 1.3
    weights.oi *= 1.2
  }

  return weights
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

export function deriveCombinedSignal(
  comp: MomentumComputation,
  markovPrior: number = 0,
  bayesianState?: BayesianState
): CombinedSignal {
  const rsiSignal = deriveRSISignal(comp.rsi)
  const stochSignal = deriveStochSignal(comp.stochK, comp.stochD)
  const macdSignal = deriveMACDSignal(comp.macdLine, comp.macdSignal, comp.macdHistogram)

  const trendBias = deriveTrendBias(comp)
  const trendDirection = trendBias.direction

  const adxSignal = deriveADXSignal(comp.adx, trendDirection)
  const bbSignal = deriveBBSignal(comp.bbPercentB, comp.bbBandwidth)
  const stSignal = deriveSupertrendSignal(comp.supertrendDirection)

  // New advanced signals
  const fundingSignal = deriveFundingSignal(comp.fundingRate)
  const oiSignal = deriveOIDivergenceSignal(comp.oiDivergence)
  const zScoreSignal = deriveZScoreSignal(comp.zScore)
  const obvSignal = deriveOBVSignal(comp.obv, comp.obvEma)
  const vwapSignal = deriveVWAPSignal(comp.close, comp.vwap)
  const patternSignal = derivePatternSignal(comp.candles)

  const signals = [
    rsiSignal, stochSignal, macdSignal, adxSignal, bbSignal, stSignal,
    fundingSignal, oiSignal, zScoreSignal, obvSignal, vwapSignal, patternSignal,
  ]

  // Regime-adaptive weights
  const regimeWeights = calculateRegimeWeights(comp.hurstExponent, comp.adx, comp.volatilityPercentile)

  let weightedScore = 0
  let totalWeight = 0

  for (const sig of signals) {
    const regimeW = regimeWeights[sig.source] ?? 1.0
    const bayesW = bayesianState ? getBayesianWeight(bayesianState, sig.source) : 1.0
    const combinedWeight = regimeW * bayesW

    const dirMultiplier = sig.direction === 'long' ? 1 : sig.direction === 'short' ? -1 : 0
    weightedScore += dirMultiplier * sig.confidence * combinedWeight
    totalWeight += (sig.confidence || 0.1) * combinedWeight
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
  markovPriors: Record<string, number> = {},
  bayesianState?: BayesianState
): TimeframeSignalSnapshot[] {
  return computations.map((comp) => {
    const prior = markovPriors[comp.timeframe] ?? 0
    const signal = deriveCombinedSignal(comp, prior, bayesianState)
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
      bbPercentB: comp.bbPercentB,
      bbBandwidth: comp.bbBandwidth,
      supertrendDirection: comp.supertrendDirection,
      obv: comp.obv,
      vwap: comp.vwap,
      volatilityPercentile: comp.volatilityPercentile,
      hurstExponent: comp.hurstExponent,
      zScore: comp.zScore,
      rSquared: comp.rSquared,
      linearRegressionSlope: comp.linearRegressionSlope,
      kama: comp.kama,
      autocorrelation: comp.autocorrelation,
      oiDivergence: comp.oiDivergence,
      volumeSpikeRatio: comp.volumeSpikeRatio,
    }
  })
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

    if (snap.bbPercentB !== null) {
      if (snap.bbPercentB <= 0.1) details.push(`BB oversold (%B ${(snap.bbPercentB * 100).toFixed(0)}%)`)
      else if (snap.bbPercentB >= 0.9) details.push(`BB overbought (%B ${(snap.bbPercentB * 100).toFixed(0)}%)`)
    }

    if (snap.supertrendDirection !== null) {
      details.push(`ST ${snap.supertrendDirection === 1 ? 'bullish' : 'bearish'}`)
    }

    if (snap.volatilityPercentile !== null) {
      if (snap.volatilityPercentile >= 80) details.push(`High vol (${snap.volatilityPercentile.toFixed(0)}%ile)`)
      else if (snap.volatilityPercentile <= 20) details.push(`Low vol squeeze (${snap.volatilityPercentile.toFixed(0)}%ile)`)
    }

    if (snap.hurstExponent !== null) {
      if (snap.hurstExponent > 0.6) details.push(`Trending (H=${snap.hurstExponent.toFixed(2)})`)
      else if (snap.hurstExponent < 0.4) details.push(`Mean-reverting (H=${snap.hurstExponent.toFixed(2)})`)
    }

    if (snap.zScore !== null && Math.abs(snap.zScore) >= 1.5) {
      details.push(`Z-Score ${snap.zScore.toFixed(2)}`)
    }

    if (snap.rSquared !== null && snap.rSquared > 0.7) {
      details.push(`Strong trend (R²=${snap.rSquared.toFixed(2)})`)
    }

    if (snap.oiDivergence !== null && Math.abs(snap.oiDivergence) > 0.1) {
      details.push(`OI div ${snap.oiDivergence.toFixed(2)}`)
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
  let weightedUp = 0
  let weightedDown = 0
  let totalWeight = 0

  for (let i = 1; i < recentCandles.length; i++) {
    const weight = i / recentCandles.length // more recent = higher weight
    const change = (recentCandles[i].close - recentCandles[i - 1].close) / recentCandles[i - 1].close
    if (change > 0) weightedUp += weight * change
    else weightedDown += weight * Math.abs(change)
    totalWeight += weight
  }

  if (totalWeight === 0) return 0
  return ((weightedUp - weightedDown) / totalWeight) * 100
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

// ─── Multi-Timeframe Confluence ─────────────────────────────────────────────

const TF_WEIGHTS: Record<string, number> = {
  '5': 1, '15': 1.5, '30': 2, '60': 3, '120': 4, '240': 5, '360': 6,
}

export function deriveMultiTimeframeConfluence(
  snapshots: TimeframeSignalSnapshot[],
  bayesianState?: BayesianState
): MultiTimeframeConfluence {
  let weightedLong = 0
  let weightedShort = 0
  let totalWeight = 0
  let longCount = 0
  let shortCount = 0
  let neutralCount = 0

  for (const snap of snapshots) {
    let weight = TF_WEIGHTS[snap.timeframe] ?? 1

    // Hurst boost: trending markets get higher TF weight boost
    if (snap.hurstExponent !== null) {
      if (snap.hurstExponent > 0.6) weight *= 1.2
      else if (snap.hurstExponent < 0.4) weight *= 0.9
    }

    // Bayesian accuracy: boost weight if signals from this TF have been accurate
    if (bayesianState) {
      const avgBayes = snap.signal.signals.reduce((sum, sig) =>
        sum + getBayesianWeight(bayesianState, sig.source), 0
      ) / Math.max(snap.signal.signals.length, 1)
      weight *= Math.min(avgBayes, 1.5)
    }

    if (snap.signal.direction === 'long') {
      weightedLong += weight * snap.signal.confidence
      longCount++
    } else if (snap.signal.direction === 'short') {
      weightedShort += weight * snap.signal.confidence
      shortCount++
    } else {
      neutralCount++
    }
    totalWeight += weight
  }

  const score = totalWeight > 0 ? (weightedLong - weightedShort) / totalWeight : 0
  const direction: SignalDirection = score > 0.1 ? 'long' : score < -0.1 ? 'short' : 'neutral'
  const dominant = Math.max(longCount, shortCount)
  const alignmentRatio = snapshots.length > 0 ? dominant / snapshots.length : 0

  let confluenceLevel: 'strong' | 'moderate' | 'weak' | 'mixed'
  if (alignmentRatio >= 0.7 && dominant >= 4) confluenceLevel = 'strong'
  else if (alignmentRatio >= 0.5 && dominant >= 3) confluenceLevel = 'moderate'
  else if (dominant >= 2) confluenceLevel = 'weak'
  else confluenceLevel = 'mixed'

  return {
    direction,
    score,
    alignmentRatio,
    confluenceLevel,
    longCount,
    shortCount,
    neutralCount,
  }
}
