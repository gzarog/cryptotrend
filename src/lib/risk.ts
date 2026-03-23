// ─── ATR-Based Risk Levels ───────────────────────────────────────────────────

export type RiskLevel = {
  entryPrice: number
  stopLoss: number
  takeProfit1: number  // 1:1 risk/reward
  takeProfit2: number  // 2:1 risk/reward
  takeProfit3: number  // 3:1 risk/reward
  atrDistance: number
  riskPercent: number  // stop distance as % of entry
}

export function calculateRiskLevels(
  close: number,
  atr: number,
  direction: 'long' | 'short',
  atrMultiplier: number = 1.5
): RiskLevel {
  const stopDistance = atr * atrMultiplier

  if (direction === 'long') {
    return {
      entryPrice: close,
      stopLoss: close - stopDistance,
      takeProfit1: close + stopDistance,
      takeProfit2: close + stopDistance * 2,
      takeProfit3: close + stopDistance * 3,
      atrDistance: stopDistance,
      riskPercent: (stopDistance / close) * 100,
    }
  }

  return {
    entryPrice: close,
    stopLoss: close + stopDistance,
    takeProfit1: close - stopDistance,
    takeProfit2: close - stopDistance * 2,
    takeProfit3: close - stopDistance * 3,
    atrDistance: stopDistance,
    riskPercent: (stopDistance / close) * 100,
  }
}
