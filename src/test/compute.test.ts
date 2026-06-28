import { describe, it, expect } from 'vitest'
import { buildMomentumComputation, buildMomentumComputations } from '../../shared/compute'
import type { Candle } from '../types/app'

/** Deterministic synthetic candle series so results are reproducible. */
function makeCandles(n: number): Candle[] {
  const out: Candle[] = []
  let price = 100
  for (let i = 0; i < n; i++) {
    price += Math.sin(i / 4) * 2 + (i % 5 === 0 ? 1 : -0.5)
    const close = price
    const high = close + 1.5
    const low = close - 1.5
    out.push({
      openTime: i * 60_000,
      open: close - 0.25,
      high,
      low,
      close,
      volume: 1000 + (i % 7) * 50,
      turnover: close * 1000,
      closeTime: i * 60_000 + 1,
    })
  }
  return out
}

describe('buildMomentumComputation', () => {
  const candles = makeCandles(120)
  const comp = buildMomentumComputation('60', candles, 'BTCUSDT', 0.0001)

  it('carries through identity fields', () => {
    expect(comp.symbol).toBe('BTCUSDT')
    expect(comp.timeframe).toBe('60')
    expect(comp.timeframeLabel).toBe('1H')
    expect(comp.fundingRate).toBe(0.0001)
  })

  it('reports the latest close and volume', () => {
    expect(comp.close).toBe(candles[candles.length - 1].close)
    expect(comp.volume).toBe(candles[candles.length - 1].volume)
  })

  it('populates the core indicator fields', () => {
    expect(comp.rsi).not.toBeNull()
    expect(comp.ema10).not.toBeNull()
    expect(comp.macdLine).not.toBeNull()
    expect(comp.atr).not.toBeNull()
  })

  it('is deterministic — identical input yields identical output', () => {
    const again = buildMomentumComputation('60', candles, 'BTCUSDT', 0.0001)
    // Compare everything except the by-reference candles array.
    const { candles: _a, ...a } = comp
    const { candles: _b, ...b } = again
    expect(a).toEqual(b)
  })

  it('applies timeframe-adaptive settings (different TF → different RSI)', () => {
    const fast = buildMomentumComputation('5', candles, 'BTCUSDT')
    const slow = buildMomentumComputation('240', candles, 'BTCUSDT')
    // Different RSI periods for 5m vs 4h should give different RSI readings.
    expect(fast.rsi).not.toBe(slow.rsi)
  })
})

describe('buildMomentumComputations', () => {
  it('skips frames below the minimum bar count', () => {
    const frames = [
      { timeframe: '60', candles: makeCandles(120) },
      { timeframe: '240', candles: makeCandles(10) },
    ]
    const out = buildMomentumComputations(frames, 'ETHUSDT', null, 55)
    expect(out).toHaveLength(1)
    expect(out[0].timeframe).toBe('60')
  })

  it('keeps all frames when minBars is 1', () => {
    const frames = [
      { timeframe: '60', candles: makeCandles(60) },
      { timeframe: 'D', candles: makeCandles(60) },
    ]
    expect(buildMomentumComputations(frames, 'ETHUSDT')).toHaveLength(2)
  })
})
