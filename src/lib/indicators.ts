import type { Candle } from '../types/app'

// ─── SMA ────────────────────────────────────────────────────────────────────

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

// ─── EMA ────────────────────────────────────────────────────────────────────

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

// ─── RSI ────────────────────────────────────────────────────────────────────

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

// ─── Stochastic RSI ─────────────────────────────────────────────────────────

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

  const kValues: Array<number | null> = []
  for (let i = 0; i < stochRsi.length; i++) {
    if (i < rsiLength + stochLength + kSmoothing - 2) {
      kValues.push(null)
      continue
    }
    const window = stochRsi.slice(i - kSmoothing + 1, i + 1).filter((v): v is number => v !== null)
    kValues.push(window.length === kSmoothing ? window.reduce((a, b) => a + b, 0) / kSmoothing : null)
  }

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

// ─── MACD ───────────────────────────────────────────────────────────────────

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

// ─── ATR (Average True Range) ───────────────────────────────────────────────

export function calculateATR(candles: Candle[], period: number): Array<number | null> {
  if (candles.length < 2) return candles.map(() => null)

  const trueRanges: number[] = []
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      trueRanges.push(candles[i].high - candles[i].low)
    } else {
      const high = candles[i].high
      const low = candles[i].low
      const prevClose = candles[i - 1].close
      trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)))
    }
  }

  const result: Array<number | null> = []
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      result.push(null)
    } else if (i === period - 1) {
      result.push(trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period)
    } else {
      const prev = result[i - 1]
      if (prev === null) {
        result.push(null)
      } else {
        result.push((prev * (period - 1) + trueRanges[i]) / period)
      }
    }
  }

  return result
}

// ─── ADX (Average Directional Index) ────────────────────────────────────────

export function calculateADX(
  candles: Candle[],
  period: number
): {
  adx: Array<number | null>
  diPlus: Array<number | null>
  diMinus: Array<number | null>
} {
  if (candles.length < period + 1) {
    const empty = candles.map(() => null)
    return { adx: empty, diPlus: empty, diMinus: empty }
  }

  const dmPlus: number[] = []
  const dmMinus: number[] = []
  const trueRanges: number[] = []

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      dmPlus.push(0)
      dmMinus.push(0)
      trueRanges.push(candles[i].high - candles[i].low)
      continue
    }

    const high = candles[i].high
    const low = candles[i].low
    const prevHigh = candles[i - 1].high
    const prevLow = candles[i - 1].low
    const prevClose = candles[i - 1].close

    const upMove = high - prevHigh
    const downMove = prevLow - low

    dmPlus.push(upMove > downMove && upMove > 0 ? upMove : 0)
    dmMinus.push(downMove > upMove && downMove > 0 ? downMove : 0)
    trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)))
  }

  // Smoothed values using Wilder's smoothing
  const smoothedTR: number[] = []
  const smoothedDMPlus: number[] = []
  const smoothedDMMinus: number[] = []

  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      smoothedTR.push(0)
      smoothedDMPlus.push(0)
      smoothedDMMinus.push(0)
    } else if (i === period) {
      smoothedTR.push(trueRanges.slice(1, period + 1).reduce((a, b) => a + b, 0))
      smoothedDMPlus.push(dmPlus.slice(1, period + 1).reduce((a, b) => a + b, 0))
      smoothedDMMinus.push(dmMinus.slice(1, period + 1).reduce((a, b) => a + b, 0))
    } else {
      const prevTR = smoothedTR[i - 1]
      const prevDMP = smoothedDMPlus[i - 1]
      const prevDMM = smoothedDMMinus[i - 1]
      smoothedTR.push(prevTR - prevTR / period + trueRanges[i])
      smoothedDMPlus.push(prevDMP - prevDMP / period + dmPlus[i])
      smoothedDMMinus.push(prevDMM - prevDMM / period + dmMinus[i])
    }
  }

  const diPlusArr: Array<number | null> = []
  const diMinusArr: Array<number | null> = []
  const dx: Array<number | null> = []

  for (let i = 0; i < candles.length; i++) {
    if (i < period) {
      diPlusArr.push(null)
      diMinusArr.push(null)
      dx.push(null)
    } else {
      const tr = smoothedTR[i]
      const dp = tr === 0 ? 0 : (smoothedDMPlus[i] / tr) * 100
      const dm = tr === 0 ? 0 : (smoothedDMMinus[i] / tr) * 100
      diPlusArr.push(dp)
      diMinusArr.push(dm)
      const sum = dp + dm
      dx.push(sum === 0 ? 0 : (Math.abs(dp - dm) / sum) * 100)
    }
  }

  // Smooth DX to get ADX
  const adxArr: Array<number | null> = []
  let adxSum = 0
  let adxCount = 0

  for (let i = 0; i < candles.length; i++) {
    if (i < period * 2) {
      if (dx[i] !== null) {
        adxSum += dx[i]!
        adxCount++
      }
      if (i === period * 2 - 1 && adxCount > 0) {
        adxArr.push(adxSum / adxCount)
      } else {
        adxArr.push(null)
      }
    } else {
      const prev = adxArr[i - 1]
      const currDx = dx[i]
      if (prev !== null && currDx !== null) {
        adxArr.push((prev * (period - 1) + currDx) / period)
      } else {
        adxArr.push(null)
      }
    }
  }

  return { adx: adxArr, diPlus: diPlusArr, diMinus: diMinusArr }
}
