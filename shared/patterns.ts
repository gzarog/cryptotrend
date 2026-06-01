import type { Candle } from '../src/types/app'

// ─── Candlestick Pattern Recognition ────────────────────────────────────────

export type CandlestickPattern = {
  name: string
  type: 'bullish' | 'bearish'
  strength: number // 0-1
  index: number
}

function bodySize(c: Candle): number {
  return Math.abs(c.close - c.open)
}

function totalRange(c: Candle): number {
  return c.high - c.low
}

function upperWick(c: Candle): number {
  return c.high - Math.max(c.open, c.close)
}

function lowerWick(c: Candle): number {
  return Math.min(c.open, c.close) - c.low
}

function isBullish(c: Candle): boolean {
  return c.close > c.open
}

export function detectCandlestickPatterns(candles: Candle[]): CandlestickPattern[] {
  const patterns: CandlestickPattern[] = []
  if (candles.length < 3) return patterns

  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i]
    const prev = candles[i - 1]
    const range = totalRange(curr)
    if (range === 0) continue
    const body = bodySize(curr)
    const uWick = upperWick(curr)
    const lWick = lowerWick(curr)

    if (body < range * 0.1) {
      patterns.push({ name: 'Doji', type: isBullish(prev) ? 'bearish' : 'bullish', strength: 0.4, index: i })
    }

    if (lWick > body * 2 && uWick < body * 0.5 && !isBullish(prev)) {
      patterns.push({ name: 'Hammer', type: 'bullish', strength: 0.65, index: i })
    }

    if (uWick > body * 2 && lWick < body * 0.5 && isBullish(prev)) {
      patterns.push({ name: 'Shooting Star', type: 'bearish', strength: 0.65, index: i })
    }

    if (i >= 1) {
      const prevBody = bodySize(prev)
      if (isBullish(curr) && !isBullish(prev) && body > prevBody &&
          curr.open <= prev.close && curr.close >= prev.open) {
        patterns.push({ name: 'Bullish Engulfing', type: 'bullish', strength: 0.75, index: i })
      }

      if (!isBullish(curr) && isBullish(prev) && body > prevBody &&
          curr.open >= prev.close && curr.close <= prev.open) {
        patterns.push({ name: 'Bearish Engulfing', type: 'bearish', strength: 0.75, index: i })
      }
    }

    if (i >= 2) {
      const prev2 = candles[i - 2]
      const midBody = bodySize(prev)
      const prev2Body = bodySize(prev2)
      if (!isBullish(prev2) && prev2Body > range * 0.3 &&
          midBody < Math.min(prev2Body, body) * 0.3 &&
          isBullish(curr) && curr.close > (prev2.open + prev2.close) / 2) {
        patterns.push({ name: 'Morning Star', type: 'bullish', strength: 0.8, index: i })
      }

      if (isBullish(prev2) && prev2Body > range * 0.3 &&
          midBody < Math.min(prev2Body, body) * 0.3 &&
          !isBullish(curr) && curr.close < (prev2.open + prev2.close) / 2) {
        patterns.push({ name: 'Evening Star', type: 'bearish', strength: 0.8, index: i })
      }
    }
  }

  return patterns
}

export function getRecentPatterns(candles: Candle[], lookback: number = 5): CandlestickPattern[] {
  const allPatterns = detectCandlestickPatterns(candles)
  const threshold = candles.length - lookback
  return allPatterns.filter(p => p.index >= threshold)
}
