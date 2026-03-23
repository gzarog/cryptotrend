import type { TradingSignal } from '../types/signals'

// ─── Bayesian Confidence Updates ─────────────────────────────────────────────
// Track rolling accuracy of each indicator and adjust weights accordingly.

export type IndicatorAccuracy = {
  source: string
  correctCount: number
  totalCount: number
  accuracy: number
  bayesWeight: number // multiplier derived from accuracy
}

export type BayesianState = {
  accuracies: Record<string, IndicatorAccuracy>
  lastUpdatedBar: number
}

export function createInitialBayesianState(): BayesianState {
  return { accuracies: {}, lastUpdatedBar: -1 }
}

/**
 * Update accuracy tracking: for each signal source, check if it predicted
 * the correct direction over the last `horizon` bars.
 */
export function updateBayesianAccuracy(
  state: BayesianState,
  signals: TradingSignal[],
  actualReturn: number, // positive = price went up, negative = down
  barIndex: number,
  maxHistory: number = 50
): BayesianState {
  if (barIndex <= state.lastUpdatedBar) return state

  const newAccuracies = { ...state.accuracies }

  for (const sig of signals) {
    if (sig.direction === 'neutral') continue

    const predicted = sig.direction === 'long' ? 1 : -1
    const actual = actualReturn > 0 ? 1 : actualReturn < 0 ? -1 : 0
    const correct = predicted === actual

    const prev = newAccuracies[sig.source] ?? {
      source: sig.source,
      correctCount: 0,
      totalCount: 0,
      accuracy: 0.5,
      bayesWeight: 1.0,
    }

    const newTotal = Math.min(prev.totalCount + 1, maxHistory)
    const decay = newTotal < maxHistory ? 1 : (maxHistory - 1) / maxHistory
    const newCorrect = prev.correctCount * decay + (correct ? 1 : 0)

    const accuracy = newTotal > 0 ? newCorrect / newTotal : 0.5
    // Bayes factor: accuracy / (1 - accuracy), capped at [0.5, 2.0]
    const rawWeight = accuracy > 0 && accuracy < 1 ? accuracy / (1 - accuracy) : 1.0
    const bayesWeight = Math.max(0.5, Math.min(2.0, rawWeight))

    newAccuracies[sig.source] = {
      source: sig.source,
      correctCount: newCorrect,
      totalCount: newTotal,
      accuracy,
      bayesWeight,
    }
  }

  return { accuracies: newAccuracies, lastUpdatedBar: barIndex }
}

/**
 * Get the Bayesian weight for a signal source.
 * Returns 1.0 if no accuracy data available (neutral prior).
 */
export function getBayesianWeight(state: BayesianState, source: string): number {
  return state.accuracies[source]?.bayesWeight ?? 1.0
}

/**
 * Apply Bayesian weights to a set of trading signals.
 * Returns a map of source -> weight multiplier.
 */
export function getBayesianWeights(state: BayesianState, signals: TradingSignal[]): Record<string, number> {
  const weights: Record<string, number> = {}
  for (const sig of signals) {
    weights[sig.source] = getBayesianWeight(state, sig.source)
  }
  return weights
}
