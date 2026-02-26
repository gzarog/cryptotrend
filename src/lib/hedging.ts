import type { Candle } from '../types/app'
import { calculateATR } from './indicators'

// ─── Hedge Decision Types ───────────────────────────────────────────────────

export type HedgeDirection = 'long-hedge' | 'short-hedge' | 'no-hedge'
export type HedgeUrgency = 'immediate' | 'consider' | 'monitor' | 'none'

export type HedgeResult = {
  direction: HedgeDirection
  urgency: HedgeUrgency
  hedgeRatio: number
  atrValue: number | null
  atrPercent: number | null
  stopDistance: number | null
  takeProfitDistance: number | null
  riskRewardRatio: number | null
  positionSizePercent: number
  reasoning: string[]
}

// ─── ATR-Driven Hedge Calculator ────────────────────────────────────────────

export function calculateHedge(
  candles: Candle[],
  currentPrice: number,
  positionDirection: 'long' | 'short' | 'none',
  rsi: number | null,
  macdHistogram: number | null,
  adx: number | null,
  stochK: number | null,
  atrPeriod: number = 14,
  atrMultiplierStop: number = 2,
  atrMultiplierTP: number = 3,
  maxRiskPercent: number = 2
): HedgeResult {
  const defaultResult: HedgeResult = {
    direction: 'no-hedge',
    urgency: 'none',
    hedgeRatio: 0,
    atrValue: null,
    atrPercent: null,
    stopDistance: null,
    takeProfitDistance: null,
    riskRewardRatio: null,
    positionSizePercent: 0,
    reasoning: ['Insufficient data for hedge calculation'],
  }

  if (candles.length < atrPeriod + 2 || currentPrice <= 0) return defaultResult

  const atrValues = calculateATR(candles, atrPeriod)
  const latestATR = atrValues[atrValues.length - 1]

  if (latestATR === null || latestATR <= 0) return defaultResult

  const atrPercent = (latestATR / currentPrice) * 100
  const stopDistance = latestATR * atrMultiplierStop
  const takeProfitDistance = latestATR * atrMultiplierTP
  const riskRewardRatio = takeProfitDistance / stopDistance

  const reasoning: string[] = []
  let hedgeScore = 0

  // RSI extremes
  if (rsi !== null) {
    if (positionDirection === 'long' && rsi >= 75) {
      hedgeScore += 0.3
      reasoning.push(`RSI overbought (${rsi.toFixed(1)}) — consider hedging long`)
    } else if (positionDirection === 'short' && rsi <= 25) {
      hedgeScore += 0.3
      reasoning.push(`RSI oversold (${rsi.toFixed(1)}) — consider hedging short`)
    }
  }

  // MACD divergence from position
  if (macdHistogram !== null) {
    if (positionDirection === 'long' && macdHistogram < 0) {
      hedgeScore += 0.25
      reasoning.push('MACD histogram negative — bearish momentum')
    } else if (positionDirection === 'short' && macdHistogram > 0) {
      hedgeScore += 0.25
      reasoning.push('MACD histogram positive — bullish momentum')
    }
  }

  // ADX trend strength
  if (adx !== null) {
    if (adx < 20) {
      hedgeScore += 0.15
      reasoning.push(`ADX weak (${adx.toFixed(1)}) — choppy market, hedge advisable`)
    } else if (adx >= 40) {
      hedgeScore -= 0.1
      reasoning.push(`ADX strong (${adx.toFixed(1)}) — strong trend, less hedge needed`)
    }
  }

  // Stochastic extreme
  if (stochK !== null) {
    if (positionDirection === 'long' && stochK >= 85) {
      hedgeScore += 0.2
      reasoning.push(`Stochastic overbought (${stochK.toFixed(1)})`)
    } else if (positionDirection === 'short' && stochK <= 15) {
      hedgeScore += 0.2
      reasoning.push(`Stochastic oversold (${stochK.toFixed(1)})`)
    }
  }

  // High volatility warning
  if (atrPercent > 5) {
    hedgeScore += 0.15
    reasoning.push(`High ATR% (${atrPercent.toFixed(2)}%) — elevated volatility`)
  }

  // Determine hedge direction and urgency
  let direction: HedgeDirection = 'no-hedge'
  let urgency: HedgeUrgency = 'none'

  if (positionDirection === 'none') {
    direction = 'no-hedge'
    urgency = 'none'
    reasoning.push('No active position — hedge not applicable')
  } else if (hedgeScore >= 0.6) {
    direction = positionDirection === 'long' ? 'short-hedge' : 'long-hedge'
    urgency = 'immediate'
  } else if (hedgeScore >= 0.35) {
    direction = positionDirection === 'long' ? 'short-hedge' : 'long-hedge'
    urgency = 'consider'
  } else if (hedgeScore >= 0.15) {
    direction = 'no-hedge'
    urgency = 'monitor'
  }

  const hedgeRatio = Math.min(hedgeScore, 1)

  // Position sizing based on ATR and max risk
  const riskPerUnit = stopDistance
  const positionSizePercent = riskPerUnit > 0 ? Math.min((maxRiskPercent / (riskPerUnit / currentPrice * 100)) * 100, 100) : 0

  if (reasoning.length === 0) {
    reasoning.push('No significant hedge signals detected')
  }

  return {
    direction,
    urgency,
    hedgeRatio,
    atrValue: latestATR,
    atrPercent,
    stopDistance,
    takeProfitDistance,
    riskRewardRatio,
    positionSizePercent: Math.min(positionSizePercent, 100),
    reasoning,
  }
}
