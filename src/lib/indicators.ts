// Technical indicator calculations

export function calculateSMA(data: number[], period: number): Array<number | null> {
  const result: Array<number | null> = []
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else {
      const slice = data.slice(i - period + 1, i + 1)
      result.push(slice.reduce((a, b) => a + b, 0) / period)
    }
  }
  return result
}

export function calculateEMA(data: number[], period: number): Array<number | null> {
  const result: Array<number | null> = []
  const multiplier = 2 / (period + 1)

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else if (i === period - 1) {
      const sma = data.slice(0, period).reduce((a, b) => a + b, 0) / period
      result.push(sma)
    } else {
      const prev = result[i - 1]
      if (prev === null) {
        result.push(null)
      } else {
        result.push((data[i] - prev) * multiplier + prev)
      }
    }
  }
  return result
}

export function calculateRSI(closes: number[], period: number): Array<number | null> {
  const result: Array<number | null> = []
  if (closes.length < period + 1) return closes.map(() => null)

  let avgGain = 0
  let avgLoss = 0

  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1]
    if (change > 0) avgGain += change
    else avgLoss += Math.abs(change)
  }

  avgGain /= period
  avgLoss /= period

  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      result.push(null)
    } else if (i === period) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      result.push(100 - 100 / (1 + rs))
    } else {
      const change = closes[i] - closes[i - 1]
      const gain = change > 0 ? change : 0
      const loss = change < 0 ? Math.abs(change) : 0
      avgGain = (avgGain * (period - 1) + gain) / period
      avgLoss = (avgLoss * (period - 1) + loss) / period
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      result.push(100 - 100 / (1 + rs))
    }
  }

  return result
}

export function calculateStochasticRSI(
  closes: number[],
  rsiLength: number,
  stochLength: number,
  kSmoothing: number,
  dSmoothing: number
): { kValues: Array<number | null>; dValues: Array<number | null> } {
  const rsiValues = calculateRSI(closes, rsiLength)

  const stochRsi: Array<number | null> = []
  for (let i = 0; i < rsiValues.length; i++) {
    if (i < rsiLength + stochLength - 1) {
      stochRsi.push(null)
      continue
    }
    const window = rsiValues.slice(i - stochLength + 1, i + 1).filter((v): v is number => v !== null)
    if (window.length < stochLength) {
      stochRsi.push(null)
      continue
    }
    const min = Math.min(...window)
    const max = Math.max(...window)
    const current = rsiValues[i]!
    stochRsi.push(max === min ? 50 : ((current - min) / (max - min)) * 100)
  }

  // Apply K smoothing (SMA)
  const kValues: Array<number | null> = []
  for (let i = 0; i < stochRsi.length; i++) {
    if (i < rsiLength + stochLength + kSmoothing - 2) {
      kValues.push(null)
      continue
    }
    const window = stochRsi.slice(i - kSmoothing + 1, i + 1).filter((v): v is number => v !== null)
    kValues.push(window.length === kSmoothing ? window.reduce((a, b) => a + b, 0) / kSmoothing : null)
  }

  // Apply D smoothing (SMA of K)
  const dValues: Array<number | null> = []
  for (let i = 0; i < kValues.length; i++) {
    if (i < rsiLength + stochLength + kSmoothing + dSmoothing - 3) {
      dValues.push(null)
      continue
    }
    const window = kValues.slice(i - dSmoothing + 1, i + 1).filter((v): v is number => v !== null)
    dValues.push(window.length === dSmoothing ? window.reduce((a, b) => a + b, 0) / dSmoothing : null)
  }

  return { kValues, dValues }
}

export function calculateMACD(
  closes: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): {
  macdLine: Array<number | null>
  signalLine: Array<number | null>
  histogram: Array<number | null>
} {
  const fastEma = calculateEMA(closes, fastPeriod)
  const slowEma = calculateEMA(closes, slowPeriod)

  const macdLine: Array<number | null> = fastEma.map((f, i) => {
    const s = slowEma[i]
    return f !== null && s !== null ? f - s : null
  })

  const macdValues = macdLine.filter((v): v is number => v !== null)
  const signalEma = calculateEMA(macdValues, signalPeriod)

  const signalLine: Array<number | null> = []
  let signalIdx = 0
  for (let i = 0; i < macdLine.length; i++) {
    if (macdLine[i] === null) {
      signalLine.push(null)
    } else {
      signalLine.push(signalIdx < signalEma.length ? signalEma[signalIdx] : null)
      signalIdx++
    }
  }

  const histogram: Array<number | null> = macdLine.map((m, i) => {
    const s = signalLine[i]
    return m !== null && s !== null ? m - s : null
  })

  return { macdLine, signalLine, histogram }
}
