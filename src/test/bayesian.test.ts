import { describe, it, expect } from 'vitest'
import {
  createInitialBayesianState,
  updateBayesianAccuracy,
  getBayesianWeight,
  getBayesianWeights,
} from '../lib/bayesian'
import type { TradingSignal } from '../types/signals'

function makeSignal(source: string, direction: 'long' | 'short' | 'neutral' = 'long'): TradingSignal {
  return { source, direction, strength: 'moderate', confidence: 0.8, label: source }
}

describe('createInitialBayesianState', () => {
  it('starts with empty accuracies and lastUpdatedBar -1', () => {
    const state = createInitialBayesianState()
    expect(state.accuracies).toEqual({})
    expect(state.lastUpdatedBar).toBe(-1)
  })
})

describe('updateBayesianAccuracy', () => {
  it('ignores update if barIndex <= lastUpdatedBar', () => {
    const s0 = createInitialBayesianState()
    const s1 = updateBayesianAccuracy(s0, [makeSignal('rsi')], 1, 5)
    const s2 = updateBayesianAccuracy(s1, [makeSignal('rsi')], 1, 5) // same bar
    expect(s2.lastUpdatedBar).toBe(5)
    // state should be unchanged since bar 5 already processed
    expect(s2.accuracies['rsi'].totalCount).toBe(s1.accuracies['rsi'].totalCount)
  })

  it('increases correctCount when prediction matches actual return', () => {
    const s0 = createInitialBayesianState()
    const s1 = updateBayesianAccuracy(s0, [makeSignal('rsi', 'long')], 100, 1) // positive return
    expect(s1.accuracies['rsi'].correctCount).toBeGreaterThan(0)
  })

  it('does not increase correctCount when prediction is wrong', () => {
    const s0 = createInitialBayesianState()
    // Signal: long, but price went down
    const s1 = updateBayesianAccuracy(s0, [makeSignal('rsi', 'long')], -100, 1)
    expect(s1.accuracies['rsi'].correctCount).toBe(0)
  })

  it('bayesWeight stays in [0.5, 2.0]', () => {
    let state = createInitialBayesianState()
    for (let i = 0; i < 60; i++) {
      state = updateBayesianAccuracy(state, [makeSignal('rsi', 'long')], 1, i)
    }
    const w = state.accuracies['rsi'].bayesWeight
    expect(w).toBeGreaterThanOrEqual(0.5)
    expect(w).toBeLessThanOrEqual(2.0)
  })

  it('skips neutral signals', () => {
    const s0 = createInitialBayesianState()
    const s1 = updateBayesianAccuracy(s0, [makeSignal('rsi', 'neutral')], 100, 1)
    expect(s1.accuracies['rsi']).toBeUndefined()
  })
})

describe('getBayesianWeight', () => {
  it('returns 1.0 for unknown source', () => {
    const state = createInitialBayesianState()
    expect(getBayesianWeight(state, 'unknown')).toBe(1.0)
  })

  it('returns stored weight after update', () => {
    let state = createInitialBayesianState()
    for (let i = 0; i < 20; i++) {
      state = updateBayesianAccuracy(state, [makeSignal('macd', 'long')], 1, i)
    }
    const w = getBayesianWeight(state, 'macd')
    // After 20 consistent correct predictions, weight should be at max (2.0)
    expect(w).toBeGreaterThanOrEqual(1.0)
    expect(w).toBeLessThanOrEqual(2.0)
    // Accuracy should have improved beyond default 1.0
    expect(state.accuracies['macd'].accuracy).toBeGreaterThan(0.5)
  })
})

describe('getBayesianWeights', () => {
  it('returns weights for each signal source', () => {
    const state = createInitialBayesianState()
    const signals = [makeSignal('rsi'), makeSignal('macd')]
    const weights = getBayesianWeights(state, signals)
    expect(weights['rsi']).toBe(1.0)
    expect(weights['macd']).toBe(1.0)
  })
})
