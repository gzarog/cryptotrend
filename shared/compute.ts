/**
 * Single source of truth for turning raw OHLCV candles into a
 * `MomentumComputation` for one timeframe.
 *
 * Both the frontend (src/pages/Index.tsx) and the worker cron
 * (worker/compute.ts) call this so the dashboard and the push/email
 * pipeline can never derive signals from divergent logic.
 */

import {
  calculateRSI, calculateEMA, calculateSMA, calculateStochasticRSI,
  calculateMACD, calculateADX, calculateATR,
  calculateBollingerBands, calculateSupertrend, calculateOBV, calculateVWAP,
  calculateVolatilityPercentile, calculateHurstExponent, calculateZScore,
  calculateLinearRegression, calculateKAMA, calculateAutocorrelation, detectVolumeSpikes,
  calculateIchimoku, calculateCVD,
} from '../src/lib/indicators'
import type { Candle, MomentumComputation } from '../src/types/app'
import {
  RSI_SETTINGS, DEFAULT_RSI,
  STOCH_SETTINGS, DEFAULT_STOCH,
  MACD_SETTINGS, DEFAULT_MACD,
  TF_LABELS,
} from './config'

const last = <T>(arr: T[]): T | null => (arr.length ? arr[arr.length - 1] ?? null : null)

/**
 * Build a `MomentumComputation` for a single timeframe from its candles.
 * Returns `null` when there are not enough candles to compute indicators.
 */
export function buildMomentumComputation(
  timeframe: string,
  candles: Candle[],
  symbol: string,
  fundingRate: number | null = null,
): MomentumComputation {
  const c = candles.map((x) => x.close)
  const rsiSetting = RSI_SETTINGS[timeframe] ?? DEFAULT_RSI
  const stochSetting = STOCH_SETTINGS[timeframe] ?? DEFAULT_STOCH
  const macdSetting = MACD_SETTINGS[timeframe] ?? DEFAULT_MACD

  const rsi = calculateRSI(c, rsiSetting.period)
  const stoch = calculateStochasticRSI(c, stochSetting.rsiLength, stochSetting.stochLength, stochSetting.kSmoothing, stochSetting.dSmoothing)
  const macd = calculateMACD(c, macdSetting.fast, macdSetting.slow, macdSetting.signal)
  const ema10 = calculateEMA(c, 10)
  const ema50 = calculateEMA(c, 50)
  const sma200 = calculateSMA(c, 200)
  const adx = calculateADX(candles, 14)
  const atr = calculateATR(candles, 14)
  const bb = calculateBollingerBands(c, 20, 2)
  const st = calculateSupertrend(candles, 10, 3)
  const obv = calculateOBV(candles)
  const obvEma = calculateEMA(obv, 20)
  const vwap = calculateVWAP(candles)
  const volPct = calculateVolatilityPercentile(atr)

  const hurst = calculateHurstExponent(c)
  const zScore = calculateZScore(c)
  const linReg = calculateLinearRegression(c)
  const kama = calculateKAMA(c)
  const autocorr = calculateAutocorrelation(c)
  const volSpikes = detectVolumeSpikes(candles)
  const ichimoku = calculateIchimoku(candles)
  const cvd = calculateCVD(candles)
  const len = candles.length

  return {
    symbol,
    timeframe,
    timeframeLabel: TF_LABELS[timeframe] ?? timeframe,
    rsi: last(rsi),
    stochK: last(stoch.kValues),
    stochD: last(stoch.dValues),
    macdLine: last(macd.macdLine),
    macdSignal: last(macd.signalLine),
    macdHistogram: last(macd.histogram),
    ema10: last(ema10),
    ema50: last(ema50),
    sma200: last(sma200),
    adx: last(adx.adx),
    atr: last(atr),
    close: last(c),
    volume: candles[len - 1]?.volume ?? null,
    candles,
    bbUpper: last(bb.upper),
    bbLower: last(bb.lower),
    bbPercentB: last(bb.percentB),
    bbBandwidth: last(bb.bandwidth),
    supertrendValue: last(st.supertrend),
    supertrendDirection: last(st.direction),
    obv: last(obv),
    obvEma: last(obvEma),
    vwap: last(vwap),
    volatilityPercentile: volPct,
    fundingRate,
    hurstExponent: hurst,
    zScore: last(zScore),
    rSquared: last(linReg.rSquared),
    linearRegressionSlope: last(linReg.slope),
    kama: last(kama),
    autocorrelation: autocorr,
    oiDivergence: null, // OI divergence is only computed for the primary TF in the UI
    volumeSpikeRatio: volSpikes.length > 0 ? (volSpikes[volSpikes.length - 1]?.ratio ?? null) : null,
    ichimokuTenkan: ichimoku.tenkan[len - 1] ?? null,
    ichimokuKijun: ichimoku.kijun[len - 1] ?? null,
    ichimokuSenkouA: ichimoku.senkouA[len - 1] ?? null,
    ichimokuSenkouB: ichimoku.senkouB[len - 1] ?? null,
    ichimokuChikou: ichimoku.chikou[len - 1] ?? null,
    cvd: last(cvd.cvd),
    cvdEma: last(cvd.cvdEma),
  }
}

/**
 * Build `MomentumComputation`s for several timeframes at once.
 * Frames with fewer than `minBars` candles are skipped.
 */
export function buildMomentumComputations(
  frames: { timeframe: string; candles: Candle[] }[],
  symbol: string,
  fundingRate: number | null = null,
  minBars = 1,
): MomentumComputation[] {
  return frames
    .filter((r) => r.candles.length >= minBars)
    .map((r) => buildMomentumComputation(r.timeframe, r.candles, symbol, fundingRate))
}
