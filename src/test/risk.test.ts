import { describe, it, expect } from 'vitest'
import { calculateRiskLevels } from '../lib/risk'

describe('calculateRiskLevels', () => {
  it('long: stopLoss < entry < takeProfit1 < takeProfit2 < takeProfit3', () => {
    const r = calculateRiskLevels(50000, 1000, 'long')
    expect(r.stopLoss).toBeLessThan(r.entryPrice)
    expect(r.takeProfit1).toBeGreaterThan(r.entryPrice)
    expect(r.takeProfit2).toBeGreaterThan(r.takeProfit1)
    expect(r.takeProfit3).toBeGreaterThan(r.takeProfit2)
  })

  it('short: stopLoss > entry > takeProfit1 > takeProfit2 > takeProfit3', () => {
    const r = calculateRiskLevels(50000, 1000, 'short')
    expect(r.stopLoss).toBeGreaterThan(r.entryPrice)
    expect(r.takeProfit1).toBeLessThan(r.entryPrice)
    expect(r.takeProfit2).toBeLessThan(r.takeProfit1)
    expect(r.takeProfit3).toBeLessThan(r.takeProfit2)
  })

  it('riskPercent is positive and proportional', () => {
    const r = calculateRiskLevels(100, 5, 'long')
    expect(r.riskPercent).toBeGreaterThan(0)
    expect(r.riskPercent).toBeCloseTo((5 * 1.5 / 100) * 100, 5)
  })

  it('atrMultiplier scales stop distance', () => {
    const r1 = calculateRiskLevels(100, 10, 'long', 1.0)
    const r2 = calculateRiskLevels(100, 10, 'long', 2.0)
    expect(r2.atrDistance).toBeCloseTo(r1.atrDistance * 2, 5)
  })

  it('entryPrice matches input close', () => {
    const close = 42000
    const r = calculateRiskLevels(close, 500, 'long')
    expect(r.entryPrice).toBe(close)
  })
})
