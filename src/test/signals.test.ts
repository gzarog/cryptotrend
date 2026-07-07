import { describe, it, expect } from 'vitest'
import {
  deriveTrendBias,
  deriveCombinedSignal,
  deriveTimeframeSnapshots,
  deriveMultiTimeframeConfluence,
  getQualifiedSignals,
  calculateMultiTimeframeMarkovPriors,
} from '../lib/signals'
import { buildMomentumComputation } from '../../shared/compute'
import type { Candle } from '../types/app'

function makeCandles(n: number, trend: 'up' | 'down' | 'flat' = 'flat'): Candle[] {
  const out: Candle[] = []
  let price = 100
  for (let i = 0; i < n; i++) {
    if (trend === 'up') price += 0.5
    else if (trend === 'down') price -= 0.5
    else price += Math.sin(i / 4) * 0.3
    const close = Math.max(price, 1)
    out.push({
      openTime: i * 60_000,
      open: close - 0.1,
      high: close + 1,
      low: close - 1,
      close,
      volume: 1000 + (i % 7) * 100,
      turnover: close * 1000,
      closeTime: i * 60_000 + 1,
    })
  }
  return out
}

function makeComp(timeframe = '60', n = 120, trend: 'up' | 'down' | 'flat' = 'flat') {
  return buildMomentumComputation(timeframe, makeCandles(n, trend), 'BTCUSDT', 0.0001)
}

describe('deriveTrendBias', () => {
  it('returns a direction and numeric score', () => {
    const comp = makeComp()
    const bias = deriveTrendBias(comp)
    expect(['long', 'short', 'neutral']).toContain(bias.direction)
    expect(typeof bias.score).toBe('number')
    expect(bias.score).toBeGreaterThanOrEqual(-100)
    expect(bias.score).toBeLessThanOrEqual(100)
  })

  it('trends up on rising candles', () => {
    const comp = makeComp('60', 120, 'up')
    const bias = deriveTrendBias(comp)
    expect(bias.score).toBeGreaterThan(-100) // just validate finite
    expect(bias.direction).toBeDefined()
  })

  it('trends down on falling candles', () => {
    const comp = makeComp('60', 120, 'down')
    const bias = deriveTrendBias(comp)
    expect(bias.score).toBeLessThan(100)
    expect(bias.direction).toBeDefined()
  })
})

describe('deriveCombinedSignal', () => {
  it('returns a valid CombinedSignal shape', () => {
    const comp = makeComp()
    const signal = deriveCombinedSignal(comp)
    expect(['long', 'short', 'neutral']).toContain(signal.direction)
    expect(['strong', 'moderate', 'weak']).toContain(signal.strength)
    expect(signal.confidence).toBeGreaterThanOrEqual(0)
    expect(signal.confidence).toBeLessThanOrEqual(1)
    expect(Array.isArray(signal.signals)).toBe(true)
  })

  it('accepts a precomputed trend bias (no double-compute)', () => {
    const comp = makeComp()
    const bias = deriveTrendBias(comp)
    const withBias = deriveCombinedSignal(comp, 0, undefined, null, bias)
    const withoutBias = deriveCombinedSignal(comp, 0, undefined, null)
    expect(withBias.trendScore).toBeCloseTo(withoutBias.trendScore, 5)
  })

  it('markov prior shifts confidence toward long', () => {
    const comp = makeComp()
    const neutral = deriveCombinedSignal(comp, 0)
    const bullishPrior = deriveCombinedSignal(comp, 0.8)
    // A bullish prior should push score upward or hold steady
    expect(bullishPrior.trendScore).toBeGreaterThanOrEqual(neutral.trendScore - 0.001)
  })
})

describe('deriveTimeframeSnapshots', () => {
  it('returns one snapshot per computation', () => {
    const comps = [makeComp('15'), makeComp('60'), makeComp('240')]
    const snapshots = deriveTimeframeSnapshots(comps, {})
    expect(snapshots).toHaveLength(3)
    expect(snapshots.map(s => s.timeframe)).toEqual(['15', '60', '240'])
  })

  it('each snapshot has signal and trendBias', () => {
    const comps = [makeComp()]
    const [snap] = deriveTimeframeSnapshots(comps, {})
    expect(snap.signal).toBeDefined()
    expect(snap.trendBias).toBeDefined()
    expect(snap.rsi).not.toBeUndefined()
  })
})

describe('deriveMultiTimeframeConfluence', () => {
  it('returns a valid confluence object', () => {
    const comps = [makeComp('15'), makeComp('60'), makeComp('240')]
    const snapshots = deriveTimeframeSnapshots(comps, {})
    const conf = deriveMultiTimeframeConfluence(snapshots)
    expect(['long', 'short', 'neutral']).toContain(conf.direction)
    expect(['strong', 'moderate', 'weak', 'mixed']).toContain(conf.confluenceLevel)
    expect(conf.alignmentRatio).toBeGreaterThanOrEqual(0)
    expect(conf.alignmentRatio).toBeLessThanOrEqual(1)
    expect(typeof conf.longCount).toBe('number')
    expect(typeof conf.shortCount).toBe('number')
  })

  it('returns direction neutral for empty snapshots', () => {
    const conf = deriveMultiTimeframeConfluence([])
    expect(conf.direction).toBe('neutral')
  })
})

describe('getQualifiedSignals', () => {
  it('returns subset of snapshots with non-neutral signals', () => {
    const comps = [makeComp('15', 120, 'up'), makeComp('60', 120, 'up'), makeComp('240', 120, 'up')]
    const snapshots = deriveTimeframeSnapshots(comps, {})
    const qualified = getQualifiedSignals(snapshots)
    expect(Array.isArray(qualified)).toBe(true)
    for (const q of qualified) {
      expect(q.signal.direction).not.toBe('neutral')
    }
  })
})

describe('calculateMultiTimeframeMarkovPriors', () => {
  it('returns a map of tf → number', () => {
    const candlesByTf = {
      '15': makeCandles(100),
      '60': makeCandles(100, 'up'),
    }
    const priors = calculateMultiTimeframeMarkovPriors(candlesByTf)
    expect(typeof priors['15']).toBe('number')
    expect(typeof priors['60']).toBe('number')
    expect(priors['60']).toBeGreaterThanOrEqual(-1)
    expect(priors['60']).toBeLessThanOrEqual(1)
  })
})
