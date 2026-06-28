import { describe, it, expect } from 'vitest'
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateATR,
} from '../lib/indicators'
import type { Candle } from '../types/app'

function makeCandle(close: number, high = close + 1, low = close - 1): Candle {
  return {
    openTime: 0,
    open: close,
    high,
    low,
    close,
    volume: 1,
    turnover: close,
    closeTime: 1,
  }
}

describe('calculateSMA', () => {
  it('returns nulls until the window fills, then the rolling mean', () => {
    expect(calculateSMA([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })

  it('produces one value per input element', () => {
    const out = calculateSMA([10, 20, 30, 40], 2)
    expect(out).toHaveLength(4)
    expect(out[1]).toBe(15)
  })
})

describe('calculateEMA', () => {
  it('seeds with an SMA then applies the smoothing multiplier', () => {
    // period 3 → multiplier 0.5; seed = mean(1,2,3) = 2
    expect(calculateEMA([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4])
  })

  it('matches the input length', () => {
    expect(calculateEMA([1, 2, 3, 4, 5, 6], 2)).toHaveLength(6)
  })
})

describe('calculateRSI', () => {
  it('returns all nulls when there is not enough data', () => {
    expect(calculateRSI([1, 2, 3], 14)).toEqual([null, null, null])
  })

  it('approaches 100 for a monotonically rising series', () => {
    // RS is capped at 100 when there are no losses, so RSI tops out near 99.01.
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i)
    const rsi = calculateRSI(closes, 14)
    expect(rsi[rsi.length - 1]!).toBeGreaterThan(99)
    expect(rsi[rsi.length - 1]!).toBeLessThanOrEqual(100)
  })

  it('saturates at 0 for a monotonically falling series', () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 - i)
    const rsi = calculateRSI(closes, 14)
    expect(rsi[rsi.length - 1]).toBe(0)
  })

  it('keeps every value within [0, 100]', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i / 3) * 10)
    for (const v of calculateRSI(closes, 14)) {
      if (v !== null) {
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThanOrEqual(100)
      }
    }
  })
})

describe('calculateMACD', () => {
  it('keeps histogram === macdLine - signalLine where both are defined', () => {
    const closes = Array.from({ length: 100 }, (_, i) => 100 + Math.sin(i / 5) * 5)
    const { macdLine, signalLine, histogram } = calculateMACD(closes, 12, 26, 9)
    expect(macdLine).toHaveLength(closes.length)
    for (let i = 0; i < closes.length; i++) {
      if (macdLine[i] !== null && signalLine[i] !== null) {
        expect(histogram[i]!).toBeCloseTo(macdLine[i]! - signalLine[i]!, 9)
      }
    }
  })
})

describe('calculateATR', () => {
  it('returns all nulls for fewer than two candles', () => {
    expect(calculateATR([makeCandle(100)], 14)).toEqual([null])
  })

  it('produces a positive range for a volatile series', () => {
    const candles = Array.from({ length: 40 }, (_, i) => makeCandle(100 + i, 100 + i + 2, 100 + i - 2))
    const atr = calculateATR(candles, 14)
    const last = atr[atr.length - 1]
    expect(last).not.toBeNull()
    expect(last!).toBeGreaterThan(0)
  })
})
