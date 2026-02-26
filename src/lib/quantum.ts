import type { Candle } from '../types/app'
import type { QuantumCompositeSignal } from '../types/signals'
import { calculateRSI, calculateMACD, calculateEMA, calculateADX } from './indicators'

// ─── Markov Transition Matrix ───────────────────────────────────────────────

type MarkovState = 0 | 1 | 2 | 3 // accumulation, markup, distribution, markdown

const PHASE_LABELS: Record<MarkovState, QuantumCompositeSignal['phase']> = {
  0: 'accumulation',
  1: 'markup',
  2: 'distribution',
  3: 'markdown',
}

const PHASE_DISPLAY_LABELS: Record<MarkovState, string> = {
  0: 'Accumulation',
  1: 'Markup',
  2: 'Distribution',
  3: 'Markdown',
}

function classifyCandle(
  rsi: number | null,
  macdHist: number | null,
  adx: number | null,
  priceVsEma: number
): MarkovState {
  const bullish = (rsi !== null && rsi > 50) || macdHist !== null && macdHist > 0
  const strong = adx !== null && adx >= 25
  const aboveEma = priceVsEma > 0

  if (bullish && strong && aboveEma) return 1   // markup
  if (bullish && !strong) return 0               // accumulation
  if (!bullish && strong && !aboveEma) return 3  // markdown
  return 2                                       // distribution
}

function buildTransitionMatrix(states: MarkovState[]): number[][] {
  const matrix = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ]

  for (let i = 0; i < states.length - 1; i++) {
    matrix[states[i]][states[i + 1]]++
  }

  // Normalize rows to probabilities
  for (let i = 0; i < 4; i++) {
    const rowSum = matrix[i].reduce((a, b) => a + b, 0)
    if (rowSum > 0) {
      for (let j = 0; j < 4; j++) {
        matrix[i][j] /= rowSum
      }
    } else {
      // Uniform distribution if no data
      for (let j = 0; j < 4; j++) {
        matrix[i][j] = 0.25
      }
    }
  }

  return matrix
}

// ─── Quantum Amplitude Calculation ──────────────────────────────────────────

function calculateQuantumAmplitude(
  rsi: number | null,
  stochK: number | null,
  macdHist: number | null,
  adx: number | null,
  volumeRatio: number
): number {
  let amplitude = 0
  let components = 0

  if (rsi !== null) {
    // RSI contribution: distance from 50 normalized
    amplitude += Math.abs(rsi - 50) / 50
    components++
  }

  if (stochK !== null) {
    amplitude += Math.abs(stochK - 50) / 50
    components++
  }

  if (macdHist !== null) {
    // Normalize MACD histogram (use sigmoid-like scaling)
    amplitude += Math.tanh(Math.abs(macdHist) * 10)
    components++
  }

  if (adx !== null) {
    amplitude += Math.min(adx / 50, 1)
    components++
  }

  // Volume ratio contribution
  amplitude += Math.min(volumeRatio, 2) / 2
  components++

  return components > 0 ? amplitude / components : 0
}

// ─── Phase Angle Calculation ────────────────────────────────────────────────

function calculatePhaseAngle(
  rsi: number | null,
  macdLine: number | null,
  macdSignal: number | null,
  stochK: number | null,
  stochD: number | null
): number {
  let angle = 0
  let components = 0

  if (rsi !== null) {
    // Map RSI to radians (0-100 → 0-2π)
    angle += (rsi / 100) * 2 * Math.PI
    components++
  }

  if (macdLine !== null && macdSignal !== null) {
    // MACD crossover angle
    const diff = macdLine - macdSignal
    angle += Math.atan2(diff, 1) + Math.PI
    components++
  }

  if (stochK !== null && stochD !== null) {
    const diff = stochK - stochD
    angle += Math.atan2(diff, 1) + Math.PI
    components++
  }

  return components > 0 ? (angle / components) % (2 * Math.PI) : 0
}

// ─── Flip Threshold Synthesis ───────────────────────────────────────────────

function synthesizeFlipThreshold(
  currentState: MarkovState,
  transitionMatrix: number[][],
  amplitude: number,
  phaseAngle: number
): number {
  const currentRow = transitionMatrix[currentState]

  // Find the probability of transitioning to an opposing phase
  let opposingProb: number
  if (currentState <= 1) {
    // Bullish states → probability of moving to bearish
    opposingProb = currentRow[2] + currentRow[3]
  } else {
    // Bearish states → probability of moving to bullish
    opposingProb = currentRow[0] + currentRow[1]
  }

  // Modulate by amplitude and phase
  const phaseModulation = Math.cos(phaseAngle) * 0.2 + 0.8
  const threshold = opposingProb * amplitude * phaseModulation

  return Math.max(0, Math.min(1, threshold))
}

// ─── Composite Score ────────────────────────────────────────────────────────

function calculateCompositeScore(
  amplitude: number,
  phaseAngle: number,
  transitionProbs: number[],
  currentState: MarkovState
): number {
  // Bullish vs bearish probability
  const bullishProb = transitionProbs[0] + transitionProbs[1]
  const bearishProb = transitionProbs[2] + transitionProbs[3]

  const bias = bullishProb - bearishProb // -1 to 1

  // Phase contribution
  const phaseFactor = Math.cos(phaseAngle - Math.PI / 2) // peak at π/2 (markup phase)

  // Combine
  const score = (bias * 0.5 + amplitude * phaseFactor * 0.3 + (currentState <= 1 ? 0.2 : -0.2))

  return Math.max(-1, Math.min(1, score))
}

// ─── Main Quantum Composite Signal ──────────────────────────────────────────

export function deriveQuantumCompositeSignal(
  candles: Candle[],
  rsiPeriod: number = 14,
  macdFast: number = 12,
  macdSlow: number = 26,
  macdSignalPeriod: number = 9,
  adxPeriod: number = 14,
  emaPeriod: number = 50
): QuantumCompositeSignal {
  const defaultResult: QuantumCompositeSignal = {
    phase: 'accumulation',
    phaseLabel: 'Accumulation',
    confidence: 0,
    compositeScore: 0,
    flipThreshold: 0.5,
    direction: 'neutral',
    phaseAngle: 0,
    amplitude: 0,
    markovState: 0,
    transitionProbabilities: [[0.25, 0.25, 0.25, 0.25], [0.25, 0.25, 0.25, 0.25], [0.25, 0.25, 0.25, 0.25], [0.25, 0.25, 0.25, 0.25]],
  }

  if (candles.length < Math.max(rsiPeriod, macdSlow, adxPeriod, emaPeriod) + 10) {
    return defaultResult
  }

  const closes = candles.map(c => c.close)
  const volumes = candles.map(c => c.volume)

  // Calculate indicators
  const rsiValues = calculateRSI(closes, rsiPeriod)
  const macd = calculateMACD(closes, macdFast, macdSlow, macdSignalPeriod)
  const emaValues = calculateEMA(closes, emaPeriod)
  const { adx: adxValues } = calculateADX(candles, adxPeriod)

  // Classify each candle into a Markov state
  const states: MarkovState[] = []
  for (let i = 0; i < candles.length; i++) {
    const rsi = rsiValues[i]
    const hist = macd.histogram[i]
    const adx = adxValues[i]
    const ema = emaValues[i]
    const priceVsEma = ema !== null ? closes[i] - ema : 0

    states.push(classifyCandle(rsi, hist, adx, priceVsEma))
  }

  // Build transition matrix
  const transitionMatrix = buildTransitionMatrix(states)

  // Current state (last candle)
  const currentState = states[states.length - 1]
  const currentRow = transitionMatrix[currentState]

  // Latest indicator values
  const latestRSI = rsiValues[rsiValues.length - 1]
  const latestMACDLine = macd.macdLine[macd.macdLine.length - 1]
  const latestMACDSignal = macd.signalLine[macd.signalLine.length - 1]
  const latestMACDHist = macd.histogram[macd.histogram.length - 1]
  const latestADX = adxValues[adxValues.length - 1]

  // Stochastic K approximation from RSI for amplitude
  const latestStochK = latestRSI // simplified

  // Volume ratio (current vs average)
  const avgVolume = volumes.length > 20
    ? volumes.slice(-20).reduce((a, b) => a + b, 0) / 20
    : volumes.reduce((a, b) => a + b, 0) / Math.max(volumes.length, 1)
  const volumeRatio = avgVolume > 0 ? volumes[volumes.length - 1] / avgVolume : 1

  // Calculate quantum properties
  const amplitude = calculateQuantumAmplitude(latestRSI, latestStochK, latestMACDHist, latestADX, volumeRatio)
  const phaseAngle = calculatePhaseAngle(latestRSI, latestMACDLine, latestMACDSignal, latestStochK, null)
  const flipThreshold = synthesizeFlipThreshold(currentState, transitionMatrix, amplitude, phaseAngle)
  const compositeScore = calculateCompositeScore(amplitude, phaseAngle, currentRow, currentState)

  // Determine direction from composite score
  const direction: 'bullish' | 'bearish' | 'neutral' =
    compositeScore > 0.15 ? 'bullish' : compositeScore < -0.15 ? 'bearish' : 'neutral'

  // Confidence based on amplitude and transition probability stability
  const maxTransitionProb = Math.max(...currentRow)
  const confidence = Math.min((amplitude * 0.6 + maxTransitionProb * 0.4), 1)

  return {
    phase: PHASE_LABELS[currentState],
    phaseLabel: PHASE_DISPLAY_LABELS[currentState],
    confidence,
    compositeScore,
    flipThreshold,
    direction,
    phaseAngle,
    amplitude,
    markovState: currentState,
    transitionProbabilities: transitionMatrix,
  }
}

// ─── Markov Prior from Candles ───────────────────────────────────────────────

export function calculateMarkovPrior(candles: Candle[], lookback: number = 50): number {
  if (candles.length < lookback + 2) return 0

  const recentCandles = candles.slice(-lookback)
  let upCount = 0
  let downCount = 0

  for (let i = 1; i < recentCandles.length; i++) {
    if (recentCandles[i].close > recentCandles[i - 1].close) upCount++
    else if (recentCandles[i].close < recentCandles[i - 1].close) downCount++
  }

  const total = upCount + downCount
  if (total === 0) return 0

  // Returns -1 to 1 scale
  return (upCount - downCount) / total
}

// ─── Multi-Timeframe Markov Priors ──────────────────────────────────────────

export function calculateMultiTimeframeMarkovPriors(
  candlesByTimeframe: Record<string, Candle[]>
): Record<string, number> {
  const priors: Record<string, number> = {}
  for (const [tf, candles] of Object.entries(candlesByTimeframe)) {
    priors[tf] = calculateMarkovPrior(candles)
  }
  return priors
}
