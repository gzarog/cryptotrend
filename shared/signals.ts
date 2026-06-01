import type { Candle, MomentumComputation } from '../src/types/app'
import type { FibonacciResult } from './indicators'
import type {
  SignalDirection,
  SignalStrength,
  TradingSignal,
  CombinedSignal,
  MultiTimeframeConfluence,
  TimeframeSignalSnapshot,
  TrendBias,
  TrendBiasLayer,
  TrendBiasCategory,
  QualifiedSignal,
} from '../src/types/signals'
import { detectDivergences } from './divergence'
import { getRecentPatterns } from './patterns'
import type { BayesianState } from '../src/lib/bayesian'
import { getBayesianWeight } from '../src/lib/bayesian'



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

  let direction: SignalDirection = 'neutral'
  let confidence = 0

  if (fundingRate > 0.001) { direction = 'short'; confidence = 0.7 }
  else if (fundingRate > 0.0005) { direction = 'short'; confidence = 0.5 }
  else if (fundingRate > 0.0003) { direction = 'short'; confidence = 0.3 }
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

// ─── Ichimoku Signal ───────────────────────────────────────────────────────

function deriveIchimokuSignal(
  close: number | null,
  tenkan: number | null,
  kijun: number | null,
  senkouA: number | null,
  senkouB: number | null
): TradingSignal {
  if (close === null || tenkan === null || kijun === null || senkouA === null || senkouB === null) {
    return { direction: 'neutral', strength: 'none', confidence: 0, label: 'Ichimoku N/A', source: 'ichimoku' }
  }

  const cloudTop = Math.max(senkouA, senkouB)
  const cloudBottom = Math.min(senkouA, senkouB)

  let direction: SignalDirection = 'neutral'
  let confidence = 0

  if (close > cloudTop) {
    direction = 'long'
    confidence = 0.6
    if (tenkan > kijun) confidence = 0.75
  } else if (close < cloudBottom) {
    direction = 'short'
    confidence = 0.6
    if (tenkan < kijun) confidence = 0.75
  } else {
    confidence = 0.1
  }

  const tkState = tenkan > kijun ? 'TK Bull' : tenkan < kijun ? 'TK Bear' : 'TK Flat'
  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Ichimoku ${tkState}`,
    source: 'ichimoku',
  }
}

// ─── Fibonacci Signal ──────────────────────────────────────────────────────

function deriveFibSignal(close: number | null, fibResult: FibonacciResult | null): TradingSignal {
  if (close === null || fibResult === null) {
    return { direction: 'neutral', strength: 'none', confidence: 0, label: 'Fib N/A', source: 'fib' }
  }

  const keyRatios = [0.382, 0.5, 0.618]
  let nearestDist = Infinity
  let nearestLabel = ''

  for (const level of fibResult.levels) {
    if (!keyRatios.includes(level.ratio)) continue
    const dist = Math.abs(close - level.price) / level.price
    if (dist < nearestDist) {
      nearestDist = dist
      nearestLabel = level.label
    }
  }

  if (nearestDist > 0.003) {
    return { direction: 'neutral', strength: 'none', confidence: 0.1, label: 'Fib away', source: 'fib' }
  }

  const direction: SignalDirection = fibResult.direction === 'up' ? 'long' : 'short'
  const confidence = nearestDist < 0.001 ? 0.5 : 0.4

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `Fib ${nearestLabel}`,
    source: 'fib',
  }
}

// ─── CVD Signal ────────────────────────────────────────────────────────────

function deriveCVDSignal(cvd: number | null, cvdEma: number | null): TradingSignal {
  if (cvd === null || cvdEma === null) {
    return { direction: 'neutral', strength: 'none', confidence: 0, label: 'CVD N/A', source: 'cvd' }
  }

  const direction: SignalDirection = cvd > cvdEma ? 'long' : cvd < cvdEma ? 'short' : 'neutral'
  const diff = cvdEma !== 0 ? Math.abs(cvd - cvdEma) / Math.abs(cvdEma) : 0
  const confidence = Math.min(diff * 3, 0.65)

  return {
    direction,
    strength: confidenceToStrength(confidence),
    confidence,
    label: `CVD ${direction === 'long' ? 'Buying' : 'Selling'}`,
    source: 'cvd',
  }
}

// ─── Regime Weights ─────────────────────────────────────────────────────────

type RegimeWeights = Record<string, number>

function calculateRegimeWeights(hurst: number | null, adx: number | null, volPct: number | null): RegimeWeights {
  const weights: RegimeWeights = {
    rsi: 1.0, stoch: 1.0, macd: 1.0, adx: 1.0, bb: 1.0, supertrend: 1.0,
    funding: 1.0, oi: 1.0, zscore: 1.0, obv: 1.0, vwap: 1.0, pattern: 1.0,
    ichimoku: 1.0, cvd: 1.0, fib: 1.0,
    'divergence-rsi': 1.0, 'divergence-macd': 1.0,
  }

  if (hurst !== null) {
    if (hurst > 0.6) {
      weights.macd *= 1.3
      weights.supertrend *= 1.3
      weights.adx *= 1.2
      weights.ichimoku *= 1.3
      weights.rsi *= 0.7
      weights.bb *= 0.7
      weights.zscore *= 0.7
    } else if (hurst < 0.4) {
      weights.rsi *= 1.3
      weights.bb *= 1.3
      weights.zscore *= 1.3
      weights.macd *= 0.7
      weights.supertrend *= 0.7
      weights.ichimoku *= 0.7
    } else {
      for (const key of Object.keys(weights)) {
        weights[key] *= 0.8
      }
    }
  }

  if (volPct !== null && volPct >= 80) {
    weights.obv *= 1.2
    weights.cvd *= 1.2
    weights.funding *= 1.3
    weights.oi *= 1.2
  }

  return weights
}

// ─── Trend Bias ─────────────────────────────────────────────────────────────

function clampScore(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

function layerDir(v: number): 'bullish' | 'bearish' | 'neutral' {
  return v > 5 ? 'bullish' : v < -5 ? 'bearish' : 'neutral'
}

function avgLayers(layers: TrendBiasLayer[]): number {
  if (layers.length === 0) return 0
  return layers.reduce((s, l) => s + l.value, 0) / layers.length
}

export function deriveTrendBias(comp: MomentumComputation): TrendBias {
  const trendLayers: TrendBiasLayer[] = []

  if (comp.supertrendDirection !== null) {
    const v = comp.supertrendDirection === 1 ? 100 : -100
    trendLayers.push({ label: 'ST', value: v, direction: v > 0 ? 'bullish' : 'bearish' })
  }

  if (comp.ema10 !== null && comp.ema50 !== null) {
    let emaScore = 0
    emaScore += comp.ema10 > comp.ema50 ? 33.3 : -33.3
    if (comp.sma200 !== null) {
      emaScore += comp.ema50 > comp.sma200 ? 33.3 : -33.3
      emaScore += comp.ema10 > comp.sma200 ? 33.3 : -33.3
    }
    const v = clampScore(emaScore, -100, 100)
    trendLayers.push({ label: 'EMA', value: v, direction: layerDir(v) })
  }

  if (comp.linearRegressionSlope !== null && comp.close !== null && comp.close > 0) {
    const v = clampScore((comp.linearRegressionSlope / comp.close) * 10000, -100, 100)
    trendLayers.push({ label: 'LR', value: v, direction: layerDir(v) })
  }

  const trendScore = avgLayers(trendLayers)

  const momentumLayers: TrendBiasLayer[] = []

  if (comp.macdHistogram !== null && comp.close !== null && comp.close > 0) {
    const sign = comp.macdHistogram > 0 ? 50 : comp.macdHistogram < 0 ? -50 : 0
    const boost = clampScore((comp.macdHistogram / comp.close) * 50000, -50, 50)
    const v = clampScore(sign + boost, -100, 100)
    momentumLayers.push({ label: 'MACD', value: v, direction: layerDir(v) })
  }

  if (comp.rsi !== null) {
    const v = clampScore((comp.rsi - 50) * 2, -100, 100)
    momentumLayers.push({ label: 'RSI', value: v, direction: layerDir(v) })
  }

  const momentumScore = avgLayers(momentumLayers)

  const volumeLayers: TrendBiasLayer[] = []

  if (comp.obv !== null && comp.obvEma !== null) {
    const v = comp.obv > comp.obvEma ? 70 : comp.obv < comp.obvEma ? -70 : 0
    volumeLayers.push({ label: 'OBV', value: v, direction: v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral' })
  }

  if (comp.cvd !== null && comp.cvdEma !== null) {
    const v = comp.cvd > comp.cvdEma ? 70 : comp.cvd < comp.cvdEma ? -70 : 0
    volumeLayers.push({ label: 'CVD', value: v, direction: v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral' })
  }

  if (comp.close !== null && comp.vwap !== null) {
    const v = comp.close > comp.vwap ? 70 : comp.close < comp.vwap ? -70 : 0
    volumeLayers.push({ label: 'VWAP', value: v, direction: v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral' })
  }

  const volumeScore = avgLayers(volumeLayers)

  const structureLayers: TrendBiasLayer[] = []

  if (comp.close !== null && comp.ichimokuSenkouA !== null && comp.ichimokuSenkouB !== null) {
    const cloudTop = Math.max(comp.ichimokuSenkouA, comp.ichimokuSenkouB)
    const cloudBottom = Math.min(comp.ichimokuSenkouA, comp.ichimokuSenkouB)
    const v = comp.close > cloudTop ? 80 : comp.close < cloudBottom ? -80 : 0
    structureLayers.push({ label: 'Cloud', value: v, direction: v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral' })
  }

  if (comp.ichimokuTenkan !== null && comp.ichimokuKijun !== null) {
    const v = comp.ichimokuTenkan > comp.ichimokuKijun ? 80 : comp.ichimokuTenkan < comp.ichimokuKijun ? -80 : 0
    structureLayers.push({ label: 'TK', value: v, direction: v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral' })
  }

  const structureScore = avgLayers(structureLayers)

  const regimeLayers: TrendBiasLayer[] = []
  let adxMultiplier = 1.0

  if (comp.adx !== null) {
    adxMultiplier = comp.adx >= 30 ? 1.2 : comp.adx >= 20 ? 1.0 : comp.adx >= 15 ? 0.85 : 0.7
    const v = comp.adx >= 25 ? 60 : comp.adx >= 20 ? 30 : comp.adx >= 15 ? -20 : -50
    regimeLayers.push({ label: 'ADX', value: v, direction: v > 0 ? 'bullish' : 'bearish' })
  }

  if (comp.hurstExponent !== null) {
    const v = comp.hurstExponent > 0.6 ? 60 : comp.hurstExponent < 0.4 ? -60 : 0
    regimeLayers.push({ label: 'Hurst', value: v, direction: v > 0 ? 'bullish' : v < 0 ? 'bearish' : 'neutral' })
  }

  const regimeScore = avgLayers(regimeLayers)

  const catWeights = [0.35, 0.25, 0.15, 0.15, 0.10]
  const catScores = [trendScore, momentumScore, volumeScore, structureScore, regimeScore]
  const catLayerArrays = [trendLayers, momentumLayers, volumeLayers, structureLayers, regimeLayers]
  const catLabels = ['Trend', 'Momentum', 'Volume', 'Structure', 'Regime']

  let rawScore = 0
  let totalWeight = 0
  const categories: TrendBiasCategory[] = []

  for (let i = 0; i < 5; i++) {
    if (catLayerArrays[i].length > 0) {
      rawScore += catScores[i] * catWeights[i]
      totalWeight += catWeights[i]
    }
    categories.push({
      label: catLabels[i],
      score: catScores[i],
      weight: catWeights[i],
      layers: catLayerArrays[i],
    })
  }

  const normalizedScore = totalWeight > 0 ? rawScore / totalWeight : 0
  const finalScore = clampScore(normalizedScore * adxMultiplier, -100, 100)

  const allLayers = categories.flatMap(c => c.layers).filter(l => l.value !== 0)
  const agreeCount = allLayers.filter(l =>
    (finalScore > 0 && l.value > 0) || (finalScore < 0 && l.value < 0)
  ).length
  const confidence = allLayers.length > 0 ? agreeCount / allLayers.length : 0

  const direction: SignalDirection = finalScore > 10 ? 'long' : finalScore < -10 ? 'short' : 'neutral'

  const macdTrend: TrendBias['macdTrend'] =
    comp.macdHistogram !== null ? (comp.macdHistogram > 0 ? 'bullish' : comp.macdHistogram < 0 ? 'bearish' : 'neutral') : 'neutral'
  const emaTrend: TrendBias['emaTrend'] =
    comp.ema10 !== null && comp.ema50 !== null ? (comp.ema10 > comp.ema50 ? 'bullish' : 'bearish') : 'neutral'
  const adxStrength: TrendBias['adxStrength'] =
    comp.adx !== null ? (comp.adx >= 30 ? 'strong' : comp.adx >= 20 ? 'moderate' : 'weak') : 'weak'

  return {
    direction,
    score: Math.round(finalScore * 10) / 10,
    confidence,
    categories,
    macdTrend,
    emaTrend,
    adxStrength,
  }
}

// ─── Combined Signal ────────────────────────────────────────────────────────

export function deriveCombinedSignal(
  comp: MomentumComputation,
  markovPrior: number = 0,
  bayesianState?: BayesianState,
  fibResult?: FibonacciResult | null
): CombinedSignal {
  const rsiSignal = deriveRSISignal(comp.rsi)
  const stochSignal = deriveStochSignal(comp.stochK, comp.stochD)
  const macdSignal = deriveMACDSignal(comp.macdLine, comp.macdSignal, comp.macdHistogram)

  const trendBias = deriveTrendBias(comp)
  const trendDirection = trendBias.direction

  const adxSignal = deriveADXSignal(comp.adx, trendDirection)
  const bbSignal = deriveBBSignal(comp.bbPercentB, comp.bbBandwidth)
  const stSignal = deriveSupertrendSignal(comp.supertrendDirection)

  const fundingSignal = deriveFundingSignal(comp.fundingRate)
  const oiSignal = deriveOIDivergenceSignal(comp.oiDivergence)
  const zScoreSignal = deriveZScoreSignal(comp.zScore)
  const obvSignal = deriveOBVSignal(comp.obv, comp.obvEma)
  const vwapSignal = deriveVWAPSignal(comp.close, comp.vwap)
  const patternSignal = derivePatternSignal(comp.candles)
  const ichimokuSignal = deriveIchimokuSignal(comp.close, comp.ichimokuTenkan, comp.ichimokuKijun, comp.ichimokuSenkouA, comp.ichimokuSenkouB)
  const cvdSignal = deriveCVDSignal(comp.cvd, comp.cvdEma)
  const fibSignal = deriveFibSignal(comp.close, fibResult ?? null)

  const signals = [
    rsiSignal, stochSignal, macdSignal, adxSignal, bbSignal, stSignal,
    fundingSignal, oiSignal, zScoreSignal, obvSignal, vwapSignal, patternSignal,
    ichimokuSignal, cvdSignal, fibSignal,
  ]

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
  bayesianState?: BayesianState,
  fibResults?: Record<string, FibonacciResult | null>
): TimeframeSignalSnapshot[] {
  return computations.map((comp) => {
    const prior = markovPriors[comp.timeframe] ?? 0
    const fibResult = fibResults?.[comp.timeframe] ?? null
    const signal = deriveCombinedSignal(comp, prior, bayesianState, fibResult)
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
      ichimokuTenkan: comp.ichimokuTenkan,
      ichimokuKijun: comp.ichimokuKijun,
      ichimokuSenkouA: comp.ichimokuSenkouA,
      ichimokuSenkouB: comp.ichimokuSenkouB,
      cvd: comp.cvd,
      cvdEma: comp.cvdEma,
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

    if (snap.ichimokuTenkan !== null && snap.ichimokuKijun !== null) {
      const tkState = snap.ichimokuTenkan > snap.ichimokuKijun ? 'TK Bull' : snap.ichimokuTenkan < snap.ichimokuKijun ? 'TK Bear' : 'TK Flat'
      details.push(`Ichimoku ${tkState}`)
    }

    if (snap.cvd !== null && snap.cvdEma !== null) {
      details.push(`CVD ${snap.cvd > snap.cvdEma ? 'buying' : 'selling'}`)
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
    const weight = i / recentCandles.length
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

// ─── Adaptive TF Weights ────────────────────────────────────────────────────

const BASE_TF_WEIGHTS: Record<string, number> = {
  '5': 1, '15': 1.5, '30': 2, '60': 3, '120': 4, '240': 5, '360': 6, 'D': 7, 'W': 8,
}

function calculateAdaptiveTFWeights(snapshots: TimeframeSignalSnapshot[]): Record<string, number> {
  let hurstSum = 0
  let hurstCount = 0
  for (const snap of snapshots) {
    if (snap.hurstExponent !== null) {
      hurstSum += snap.hurstExponent
      hurstCount++
    }
  }

  const avgHurst = hurstCount > 0 ? hurstSum / hurstCount : 0.5
  const weights = { ...BASE_TF_WEIGHTS }

  if (avgHurst > 0.6) {
    weights['5'] *= 0.8
    weights['15'] *= 0.8
    weights['30'] *= 1.0
    weights['60'] *= 1.1
    weights['120'] *= 1.3
    weights['240'] *= 1.3
    weights['360'] *= 1.3
    weights['D'] *= 1.3
    weights['W'] *= 1.3
  } else if (avgHurst < 0.4) {
    weights['5'] *= 1.2
    weights['15'] *= 1.2
    weights['30'] *= 1.1
    weights['60'] *= 1.0
    weights['120'] *= 0.9
    weights['240'] *= 0.9
    weights['360'] *= 0.9
    weights['D'] *= 0.8
    weights['W'] *= 0.8
  }

  return weights
}

// ─── Multi-Timeframe Confluence ─────────────────────────────────────────────

const TF_WEIGHTS: Record<string, number> = {
  '5': 1, '15': 1.5, '30': 2, '60': 3, '120': 4, '240': 5, '360': 6, 'D': 7, 'W': 8,
}

export function deriveMultiTimeframeConfluence(
  snapshots: TimeframeSignalSnapshot[],
  bayesianState?: BayesianState
): MultiTimeframeConfluence {
  const adaptiveWeights = calculateAdaptiveTFWeights(snapshots)
  let weightedLong = 0
  let weightedShort = 0
  let totalWeight = 0
  let longCount = 0
  let shortCount = 0
  let neutralCount = 0

  for (const snap of snapshots) {
    let weight = adaptiveWeights[snap.timeframe] ?? TF_WEIGHTS[snap.timeframe] ?? 1

    if (snap.hurstExponent !== null) {
      if (snap.hurstExponent > 0.6) weight *= 1.2
      else if (snap.hurstExponent < 0.4) weight *= 0.9
    }

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
