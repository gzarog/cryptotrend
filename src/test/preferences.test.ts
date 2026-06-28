import { describe, it, expect } from 'vitest'
import { getAlertType, shouldSendAlert, getDefaultCriteria } from '../../worker/preferences'

describe('getAlertType', () => {
  it('maps tag prefixes to criteria keys', () => {
    expect(getAlertType('momentum-BTCUSDT-60-long')).toBe('momentum')
    expect(getAlertType('macross-BTCUSDT-60-golden')).toBe('crossover')
    expect(getAlertType('funding-BTCUSDT')).toBe('fundingRate')
    expect(getAlertType('confluence-ETHUSDT')).toBe('confluence')
    expect(getAlertType('divergence-ETHUSDT-240-long')).toBe('divergence')
  })

  it('returns null for unknown tags', () => {
    expect(getAlertType('totally-unknown')).toBeNull()
  })
})

describe('shouldSendAlert', () => {
  it('passes enabled "both"-channel alerts on either channel', () => {
    const c = getDefaultCriteria()
    expect(shouldSendAlert('momentum-BTCUSDT-60-long', c, 'push')).toBe(true)
    expect(shouldSendAlert('momentum-BTCUSDT-60-long', c, 'email')).toBe(true)
  })

  it('respects the per-type channel restriction', () => {
    const c = getDefaultCriteria() // divergence defaults to email-only
    expect(shouldSendAlert('divergence-BTCUSDT-60-long', c, 'email')).toBe(true)
    expect(shouldSendAlert('divergence-BTCUSDT-60-long', c, 'push')).toBe(false)
  })

  it('suppresses disabled alert types', () => {
    const c = getDefaultCriteria()
    c.momentum.enabled = false
    expect(shouldSendAlert('momentum-BTCUSDT-60-long', c, 'push')).toBe(false)
  })

  it('filters by the user symbol allowlist when set', () => {
    const c = getDefaultCriteria()
    c.symbols = ['ETHUSDT']
    expect(shouldSendAlert('momentum-ETHUSDT-60-long', c, 'push')).toBe(true)
    expect(shouldSendAlert('momentum-BTCUSDT-60-long', c, 'push')).toBe(false)
  })

  it('filters by the timeframe allowlist when set', () => {
    const c = getDefaultCriteria()
    c.timeframesAllowed = ['240']
    expect(shouldSendAlert('momentum-BTCUSDT-240-long', c, 'push')).toBe(true)
    expect(shouldSendAlert('momentum-BTCUSDT-60-long', c, 'push')).toBe(false)
  })

  it('lets unknown tag types pass through', () => {
    expect(shouldSendAlert('mystery-event', getDefaultCriteria(), 'push')).toBe(true)
  })
})
