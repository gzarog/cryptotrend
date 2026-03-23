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

// ─── Bollinger Bands ─────────────────────────────────────────────────────────

export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): {
  upper: Array<number | null>
  middle: Array<number | null>
  lower: Array<number | null>
  bandwidth: Array<number | null>
  percentB: Array<number | null>
} {
  const middle = calculateSMA(closes, period)
  const upper: Array<number | null> = []
  const lower: Array<number | null> = []
  const bandwidth: Array<number | null> = []
  const percentB: Array<number | null> = []

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || middle[i] === null) {
      upper.push(null)
      lower.push(null)
      bandwidth.push(null)
      percentB.push(null)
      continue
    }
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = middle[i]!
    const variance = slice.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period
    const stdDev = Math.sqrt(variance)
    const u = mean + stdDevMultiplier * stdDev
    const l = mean - stdDevMultiplier * stdDev
    upper.push(u)
    lower.push(l)
    bandwidth.push(mean > 0 ? (u - l) / mean : null)
    percentB.push(u !== l ? (closes[i] - l) / (u - l) : 0.5)
  }

  return { upper, middle, lower, bandwidth, percentB }
}

// ─── Supertrend ──────────────────────────────────────────────────────────────

export function calculateSupertrend(
  candles: Candle[],
  period: number = 10,
  multiplier: number = 3
): {
  supertrend: Array<number | null>
  direction: Array<1 | -1 | null>
} {
  const atr = calculateATR(candles, period)
  const supertrendArr: Array<number | null> = []
  const directionArr: Array<1 | -1 | null> = []

  let prevUpperBand = 0
  let prevLowerBand = 0
  let prevSupertrend = 0
  let prevDirection: 1 | -1 = 1

  for (let i = 0; i < candles.length; i++) {
    if (i < period || atr[i] === null) {
      supertrendArr.push(null)
      directionArr.push(null)
      continue
    }

    const hl2 = (candles[i].high + candles[i].low) / 2
    let upperBand = hl2 + multiplier * atr[i]!
    let lowerBand = hl2 - multiplier * atr[i]!

    // Adjust bands based on previous values
    if (i > period) {
      if (lowerBand > prevLowerBand || candles[i - 1].close < prevLowerBand) {
        // keep lowerBand
      } else {
        lowerBand = prevLowerBand
      }

      if (upperBand < prevUpperBand || candles[i - 1].close > prevUpperBand) {
        // keep upperBand
      } else {
        upperBand = prevUpperBand
      }
    }

    let dir: 1 | -1
    if (i === period) {
      dir = candles[i].close > upperBand ? 1 : -1
    } else {
      if (prevDirection === 1) {
        dir = candles[i].close < lowerBand ? -1 : 1
      } else {
        dir = candles[i].close > upperBand ? 1 : -1
      }
    }

    const st = dir === 1 ? lowerBand : upperBand
    supertrendArr.push(st)
    directionArr.push(dir)

    prevUpperBand = upperBand
    prevLowerBand = lowerBand
    prevSupertrend = st
    prevDirection = dir
  }

  return { supertrend: supertrendArr, direction: directionArr }
}

// ─── OBV (On-Balance Volume) ─────────────────────────────────────────────────

export function calculateOBV(candles: Candle[]): number[] {
  if (candles.length === 0) return []
  const obv: number[] = [0]
  for (let i = 1; i < candles.length; i++) {
    if (candles[i].close > candles[i - 1].close) {
      obv.push(obv[i - 1] + candles[i].volume)
    } else if (candles[i].close < candles[i - 1].close) {
      obv.push(obv[i - 1] - candles[i].volume)
    } else {
      obv.push(obv[i - 1])
    }
  }
  return obv
}

// ─── VWAP (Volume-Weighted Average Price) ────────────────────────────────────

export function calculateVWAP(candles: Candle[]): Array<number | null> {
  let cumulativeTPV = 0
  let cumulativeVolume = 0
  return candles.map(c => {
    const typicalPrice = (c.high + c.low + c.close) / 3
    cumulativeTPV += typicalPrice * c.volume
    cumulativeVolume += c.volume
    return cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : null
  })
}

// ─── Volatility Percentile ───────────────────────────────────────────────────

export function calculateVolatilityPercentile(
  atrValues: Array<number | null>,
  lookback: number = 100
): number | null {
  const recent = atrValues.filter((v): v is number => v !== null).slice(-lookback)
  if (recent.length < 20) return null
  const current = recent[recent.length - 1]
  const belowCount = recent.filter(v => v <= current).length
  return (belowCount / recent.length) * 100
}

// ─── Hurst Exponent (Rescaled Range) ─────────────────────────────────────────

export function calculateHurstExponent(closes: number[], maxWindow: number = 64): number | null {
  if (closes.length < maxWindow + 1) return null

  const returns: number[] = []
  for (let i = 1; i < closes.length; i++) {
    returns.push(Math.log(closes[i] / closes[i - 1]))
  }

  const windowSizes = [8, 16, 32, 64].filter(w => w <= maxWindow && w < returns.length)
  if (windowSizes.length < 2) return null

  const logN: number[] = []
  const logRS: number[] = []

  for (const n of windowSizes) {
    const rsValues: number[] = []
    const numSegments = Math.floor(returns.length / n)
    if (numSegments < 1) continue

    for (let seg = 0; seg < numSegments; seg++) {
      const segment = returns.slice(seg * n, (seg + 1) * n)
      const mean = segment.reduce((a, b) => a + b, 0) / n
      const deviations = segment.map(r => r - mean)

      // Cumulative deviations
      let cumSum = 0
      let maxCum = -Infinity
      let minCum = Infinity
      for (const d of deviations) {
        cumSum += d
        if (cumSum > maxCum) maxCum = cumSum
        if (cumSum < minCum) minCum = cumSum
      }

      const range = maxCum - minCum
      const stdDev = Math.sqrt(segment.reduce((s, r) => s + (r - mean) ** 2, 0) / n)

      if (stdDev > 0) rsValues.push(range / stdDev)
    }

    if (rsValues.length > 0) {
      const avgRS = rsValues.reduce((a, b) => a + b, 0) / rsValues.length
      logN.push(Math.log(n))
      logRS.push(Math.log(avgRS))
    }
  }

  if (logN.length < 2) return null

  // Linear regression: slope = Hurst exponent
  const n = logN.length
  const sumX = logN.reduce((a, b) => a + b, 0)
  const sumY = logRS.reduce((a, b) => a + b, 0)
  const sumXY = logN.reduce((s, x, i) => s + x * logRS[i], 0)
  const sumX2 = logN.reduce((s, x) => s + x * x, 0)

  const hurst = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
  return Math.max(0, Math.min(1, hurst))
}

// ─── Z-Score ─────────────────────────────────────────────────────────────────

export function calculateZScore(closes: number[], period: number = 20): Array<number | null> {
  return closes.map((close, i) => {
    if (i < period - 1) return null
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period
    const stdDev = Math.sqrt(variance)
    return stdDev > 0 ? (close - mean) / stdDev : 0
  })
}

// ─── Linear Regression + R-Squared ───────────────────────────────────────────

export function calculateLinearRegression(
  closes: number[],
  period: number = 20
): {
  slope: Array<number | null>
  rSquared: Array<number | null>
  upperChannel: Array<number | null>
  lowerChannel: Array<number | null>
} {
  const slopeArr: Array<number | null> = []
  const r2Arr: Array<number | null> = []
  const upperArr: Array<number | null> = []
  const lowerArr: Array<number | null> = []

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      slopeArr.push(null); r2Arr.push(null); upperArr.push(null); lowerArr.push(null)
      continue
    }

    const y = closes.slice(i - period + 1, i + 1)
    const n = y.length
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0
    for (let j = 0; j < n; j++) {
      sumX += j; sumY += y[j]; sumXY += j * y[j]; sumX2 += j * j; sumY2 += y[j] * y[j]
    }

    const denom = n * sumX2 - sumX * sumX
    if (denom === 0) {
      slopeArr.push(0); r2Arr.push(0); upperArr.push(closes[i]); lowerArr.push(closes[i])
      continue
    }

    const slope = (n * sumXY - sumX * sumY) / denom
    const intercept = (sumY - slope * sumX) / n

    // R-squared
    const ssRes = y.reduce((s, val, j) => s + (val - (intercept + slope * j)) ** 2, 0)
    const meanY = sumY / n
    const ssTot = y.reduce((s, val) => s + (val - meanY) ** 2, 0)
    const rSq = ssTot > 0 ? 1 - ssRes / ssTot : 0

    // Channel: regression line +/- stdDev of residuals
    const residualStdDev = Math.sqrt(ssRes / n)
    const regEnd = intercept + slope * (n - 1)

    slopeArr.push(slope / closes[i]) // Normalize slope as % per bar
    r2Arr.push(Math.max(0, Math.min(1, rSq)))
    upperArr.push(regEnd + 2 * residualStdDev)
    lowerArr.push(regEnd - 2 * residualStdDev)
  }

  return { slope: slopeArr, rSquared: r2Arr, upperChannel: upperArr, lowerChannel: lowerArr }
}

// ─── KAMA (Kaufman Adaptive Moving Average) ──────────────────────────────────

export function calculateKAMA(
  closes: number[],
  erPeriod: number = 10,
  fastSC: number = 2,
  slowSC: number = 30
): Array<number | null> {
  if (closes.length < erPeriod + 1) return closes.map(() => null)

  const fastConst = 2 / (fastSC + 1)
  const slowConst = 2 / (slowSC + 1)
  const kama: Array<number | null> = []

  for (let i = 0; i < erPeriod; i++) kama.push(null)
  kama.push(closes[erPeriod])

  for (let i = erPeriod + 1; i < closes.length; i++) {
    const change = Math.abs(closes[i] - closes[i - erPeriod])
    let volatility = 0
    for (let j = i - erPeriod + 1; j <= i; j++) {
      volatility += Math.abs(closes[j] - closes[j - 1])
    }

    const er = volatility > 0 ? change / volatility : 0
    const sc = (er * (fastConst - slowConst) + slowConst) ** 2
    const prevKama = kama[i - 1]!
    kama.push(prevKama + sc * (closes[i] - prevKama))
  }

  return kama
}

// ─── Autocorrelation of Returns ──────────────────────────────────────────────

export function calculateAutocorrelation(closes: number[], lag: number = 1, window: number = 50): number | null {
  if (closes.length < window + lag + 1) return null

  const returns: number[] = []
  for (let i = closes.length - window; i < closes.length; i++) {
    returns.push((closes[i] - closes[i - 1]) / closes[i - 1])
  }

  const mean = returns.reduce((a, b) => a + b, 0) / returns.length
  let numerator = 0
  let denominator = 0

  for (let i = lag; i < returns.length; i++) {
    numerator += (returns[i] - mean) * (returns[i - lag] - mean)
  }
  for (let i = 0; i < returns.length; i++) {
    denominator += (returns[i] - mean) ** 2
  }

  return denominator > 0 ? numerator / denominator : 0
}

// ─── Volume Spike Detection ──────────────────────────────────────────────────

export type VolumeSpike = {
  index: number
  ratio: number // volume / average
  direction: 'up' | 'down' // candle direction
}

export function detectVolumeSpikes(
  candles: Candle[],
  threshold: number = 3.0,
  lookback: number = 20
): VolumeSpike[] {
  const spikes: VolumeSpike[] = []

  for (let i = lookback; i < candles.length; i++) {
    const avgVol = candles.slice(i - lookback, i).reduce((s, c) => s + c.volume, 0) / lookback
    if (avgVol <= 0) continue

    const ratio = candles[i].volume / avgVol
    if (ratio >= threshold) {
      spikes.push({
        index: i,
        ratio,
        direction: candles[i].close >= candles[i].open ? 'up' : 'down',
      })
    }
  }

  return spikes
}

// ─── OI Divergence ───────────────────────────────────────────────────────────

export function calculateOIDivergence(
  closes: number[],
  openInterest: number[],
  lookback: number = 10
): number | null {
  if (closes.length < lookback || openInterest.length < lookback) return null

  const priceChange = (closes[closes.length - 1] - closes[closes.length - lookback]) / closes[closes.length - lookback]
  const oiChange = (openInterest[openInterest.length - 1] - openInterest[openInterest.length - lookback]) / (openInterest[openInterest.length - lookback] || 1)

  // Positive = bullish alignment, Negative = divergence
  // Price up + OI up = bullish (+), Price up + OI down = bearish (-)
  // Price down + OI down = bullish (+, capitulation), Price down + OI up = bearish (-, new shorts)
  if (priceChange > 0 && oiChange > 0) return 1 * Math.min(Math.abs(oiChange) * 10, 1)
  if (priceChange > 0 && oiChange < 0) return -1 * Math.min(Math.abs(oiChange) * 10, 1)
  if (priceChange < 0 && oiChange < 0) return 0.5 * Math.min(Math.abs(oiChange) * 10, 1)
  if (priceChange < 0 && oiChange > 0) return -1 * Math.min(Math.abs(oiChange) * 10, 1)
  return 0
}

// ─── Liquidation Level Estimation ────────────────────────────────────────────

export type LiquidationLevel = {
  price: number
  leverage: number
  side: 'long' | 'short'
}

export function estimateLiquidationLevels(
  recentSwingHighs: number[],
  recentSwingLows: number[],
  maintenanceMarginRate: number = 0.005
): LiquidationLevel[] {
  const leverages = [5, 10, 25, 50, 100]
  const levels: LiquidationLevel[] = []

  for (const entryPrice of recentSwingLows.slice(-3)) {
    for (const lev of leverages) {
      const liqPrice = entryPrice * (1 - 1 / lev + maintenanceMarginRate)
      if (liqPrice > 0) levels.push({ price: liqPrice, leverage: lev, side: 'long' })
    }
  }

  for (const entryPrice of recentSwingHighs.slice(-3)) {
    for (const lev of leverages) {
      const liqPrice = entryPrice * (1 + 1 / lev - maintenanceMarginRate)
      levels.push({ price: liqPrice, leverage: lev, side: 'short' })
    }
  }

  return levels.sort((a, b) => a.price - b.price)
}

// ─── Ichimoku Cloud ──────────────────────────────────────────────────────────

export type IchimokuResult = {
  tenkan: Array<number | null>
  kijun: Array<number | null>
  senkouA: Array<number | null>
  senkouB: Array<number | null>
  chikou: Array<number | null>
}

function periodHighLow(candles: Candle[], end: number, period: number): { high: number; low: number } | null {
  if (end < period - 1) return null
  let high = -Infinity
  let low = Infinity
  for (let i = end - period + 1; i <= end; i++) {
    if (candles[i].high > high) high = candles[i].high
    if (candles[i].low < low) low = candles[i].low
  }
  return { high, low }
}

export function calculateIchimoku(
  candles: Candle[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52,
  displacement: number = 26
): IchimokuResult {
  const len = candles.length
  const tenkan: Array<number | null> = new Array(len).fill(null)
  const kijun: Array<number | null> = new Array(len).fill(null)
  const senkouA: Array<number | null> = new Array(len + displacement).fill(null)
  const senkouB: Array<number | null> = new Array(len + displacement).fill(null)
  const chikou: Array<number | null> = new Array(len).fill(null)

  for (let i = 0; i < len; i++) {
    const tHL = periodHighLow(candles, i, tenkanPeriod)
    if (tHL) tenkan[i] = (tHL.high + tHL.low) / 2

    const kHL = periodHighLow(candles, i, kijunPeriod)
    if (kHL) kijun[i] = (kHL.high + kHL.low) / 2

    // Senkou A = (tenkan + kijun) / 2, shifted forward
    if (tenkan[i] !== null && kijun[i] !== null) {
      senkouA[i + displacement] = (tenkan[i]! + kijun[i]!) / 2
    }

    // Senkou B = (52-period high + low) / 2, shifted forward
    const bHL = periodHighLow(candles, i, senkouBPeriod)
    if (bHL) senkouB[i + displacement] = (bHL.high + bHL.low) / 2

    // Chikou = close shifted back
    if (i >= displacement) {
      chikou[i - displacement] = candles[i].close
    }
  }

  // Trim to original length for consistency with other indicator arrays
  return {
    tenkan,
    kijun,
    senkouA: senkouA.slice(0, len),
    senkouB: senkouB.slice(0, len),
    chikou,
  }
}

// ─── Fibonacci Levels ────────────────────────────────────────────────────────

export type FibLevel = {
  ratio: number
  price: number
  label: string
}

export type FibonacciResult = {
  levels: FibLevel[]
  swingHigh: number
  swingLow: number
  direction: 'up' | 'down'
}

const FIB_RATIOS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]

export function calculateFibonacciLevels(candles: Candle[], lookback: number = 100): FibonacciResult | null {
  if (candles.length < 10) return null

  const recent = candles.slice(-Math.min(lookback, candles.length))
  let swingHigh = -Infinity
  let swingLow = Infinity

  for (const c of recent) {
    if (c.high > swingHigh) swingHigh = c.high
    if (c.low < swingLow) swingLow = c.low
  }

  if (swingHigh === swingLow) return null

  const lastClose = candles[candles.length - 1].close
  const midpoint = (swingHigh + swingLow) / 2
  const direction: 'up' | 'down' = lastClose >= midpoint ? 'up' : 'down'
  const range = swingHigh - swingLow

  const levels: FibLevel[] = FIB_RATIOS.map(ratio => {
    const price = direction === 'up'
      ? swingHigh - ratio * range  // retracement from high
      : swingLow + ratio * range   // retracement from low
    return { ratio, price, label: `${(ratio * 100).toFixed(1)}%` }
  })

  return { levels, swingHigh, swingLow, direction }
}

// ─── CVD (Cumulative Volume Delta) ──────────────────────────────────────────

export type CVDResult = {
  cvd: number[]
  cvdEma: Array<number | null>
}

export function calculateCVD(candles: Candle[], emaPeriod: number = 20): CVDResult {
  const cvd: number[] = []
  let cumulative = 0

  for (const c of candles) {
    const range = c.high - c.low
    const delta = range > 0 ? c.volume * (2 * c.close - c.high - c.low) / range : 0
    cumulative += delta
    cvd.push(cumulative)
  }

  const cvdEma = calculateEMA(cvd, emaPeriod)
  return { cvd, cvdEma }
}

// ─── Cross-Asset Correlation ────────────────────────────────────────────────

export function calculateCorrelation(
  seriesA: number[],
  seriesB: number[],
  window: number = 50
): Array<number | null> {
  const len = Math.min(seriesA.length, seriesB.length)
  const result: Array<number | null> = []

  for (let i = 0; i < len; i++) {
    if (i < window - 1) { result.push(null); continue }

    const a = seriesA.slice(i - window + 1, i + 1)
    const b = seriesB.slice(i - window + 1, i + 1)

    const meanA = a.reduce((s, v) => s + v, 0) / window
    const meanB = b.reduce((s, v) => s + v, 0) / window

    let cov = 0, varA = 0, varB = 0
    for (let j = 0; j < window; j++) {
      const da = a[j] - meanA
      const db = b[j] - meanB
      cov += da * db
      varA += da * da
      varB += db * db
    }

    const denom = Math.sqrt(varA * varB)
    result.push(denom > 0 ? cov / denom : 0)
  }

  return result
}
