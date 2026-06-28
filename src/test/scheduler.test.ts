import { describe, it, expect } from 'vitest'
import { mergeMonitoredSymbols } from '../../worker/scheduler'

const DEFAULTS = ['BTCUSDT', 'ETHUSDT']

describe('mergeMonitoredSymbols', () => {
  it('returns the defaults when no user symbols are supplied', () => {
    expect(mergeMonitoredSymbols(DEFAULTS, [])).toEqual(['BTCUSDT', 'ETHUSDT'])
  })

  it('adds user-opted symbols on top of the defaults', () => {
    const out = mergeMonitoredSymbols(DEFAULTS, [['SOLUSDT'], ['ADAUSDT']])
    expect(out).toContain('SOLUSDT')
    expect(out).toContain('ADAUSDT')
    expect(out).toContain('BTCUSDT')
  })

  it('normalises case and trims whitespace', () => {
    const out = mergeMonitoredSymbols([], [[' solusdt ']])
    expect(out).toEqual(['SOLUSDT'])
  })

  it('deduplicates symbols across users and defaults', () => {
    const out = mergeMonitoredSymbols(DEFAULTS, [['BTCUSDT'], ['btcusdt']])
    expect(out.filter((s) => s === 'BTCUSDT')).toHaveLength(1)
  })

  it('drops malformed symbols', () => {
    const out = mergeMonitoredSymbols([], [['BTC-USD', 'BTC/USDT', '', 'x', 'SOLUSDT']])
    expect(out).toEqual(['SOLUSDT'])
  })

  it('caps the total number of symbols, keeping defaults first', () => {
    const many = Array.from({ length: 50 }, (_, i) => `SYM${i}USDT`)
    const out = mergeMonitoredSymbols(DEFAULTS, [many], 25)
    expect(out).toHaveLength(25)
    expect(out[0]).toBe('BTCUSDT')
    expect(out[1]).toBe('ETHUSDT')
  })
})
