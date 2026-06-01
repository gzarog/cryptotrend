/**
 * Cron handler — runs every 5 minutes (configured in wrangler.toml).
 * 1. Compute full multi-timeframe signals for configured symbols
 * 2. Store results in SIGNAL_CACHE KV for the React app to consume
 * 3. Filter out alerts still within their cooldown
 * 4. Send push to all subscribers
 * 5. Remove expired subscriptions (410 Gone from push endpoint)
 */

import type { Env } from './push'
import { sendPush } from './push'
import { loadSubscriptions, removeSubscriptions, isInCooldown, setCooldown } from './kv'
import { sendEmailNotifications } from './email'
import type { Candle, MomentumComputation } from '../src/types/app'
import type { AlertPayload } from './types'
import {
  calculateRSI, calculateEMA, calculateSMA, calculateStochasticRSI,
  calculateMACD, calculateADX, calculateATR,
  calculateBollingerBands, calculateSupertrend, calculateOBV, calculateVWAP,
  calculateVolatilityPercentile, calculateHurstExponent, calculateZScore,
  calculateLinearRegression, calculateKAMA, calculateAutocorrelation,
  detectVolumeSpikes, calculateIchimoku, calculateFibonacciLevels, calculateCVD,
} from '../shared/indicators'
import {
  deriveTimeframeSnapshots, deriveMultiTimeframeConfluence,
  calculateMultiTimeframeMarkovPriors,
} from '../shared/signals'

// Symbols to monitor
const SYMBOLS = ['BTCUSDT', 'ETHUSDT']

// All 9 timeframes matching the React app
const ALL_TIMEFRAMES = ['5', '15', '30', '60', '120', '240', '360', 'D', 'W'] as const

const TF_LABELS: Record<string, string> = {
  '5': '5m', '15': '15m', '30': '30m', '60': '1H',
  '120': '2H', '240': '4H', '360': '6H', 'D': '1D', 'W': '1W',
}

// Timeframe-adaptive settings (mirrors Index.tsx)
const RSI_SETTINGS: Record<string, { period: number }> = {
  '5': { period: 8 }, '15': { period: 11 }, '30': { period: 13 },
  '60': { period: 15 }, '120': { period: 17 }, '240': { period: 20 },
  '360': { period: 23 }, 'D': { period: 14 }, 'W': { period: 14 },
}

const STOCH_SETTINGS: Record<string, { rsiLength: number; stochLength: number; kSmoothing: number; dSmoothing: number }> = {
  '5': { rsiLength: 7, stochLength: 7, kSmoothing: 2, dSmoothing: 2 },
  '15': { rsiLength: 9, stochLength: 9, kSmoothing: 2, dSmoothing: 3 },
  '30': { rsiLength: 12, stochLength: 12, kSmoothing: 3, dSmoothing: 3 },
  '60': { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 },
  '120': { rsiLength: 16, stochLength: 16, kSmoothing: 3, dSmoothing: 3 },
  '240': { rsiLength: 21, stochLength: 21, kSmoothing: 4, dSmoothing: 4 },
  '360': { rsiLength: 24, stochLength: 24, kSmoothing: 4, dSmoothing: 4 },
  'D': { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 },
  'W': { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 },
}

const MACD_SETTINGS: Record<string, { fast: number; slow: number; signal: number }> = {
  '5': { fast: 8, slow: 21, signal: 5 }, '15': { fast: 10, slow: 24, signal: 7 },
  '30': { fast: 12, slow: 26, signal: 9 }, '60': { fast: 12, slow: 30, signal: 9 },
  '120': { fast: 16, slow: 36, signal: 9 }, '240': { fast: 20, slow: 40, signal: 9 },
  '360': { fast: 22, slow: 44, signal: 10 }, 'D': { fast: 12, slow: 26, signal: 9 },
  'W': { fast: 12, slow: 26, signal: 9 },
}

// Cooldown in seconds per timeframe (matches COOLDOWN_MS in notifications.ts)
export const COOLDOWN_SECS: Record<string, number> = {
  '60': 3600, '120': 7200, '240': 14400, '360': 21600, 'D': 86400, 'W': 604800,
}

// Timeframes monitored for push alert delivery (1H and above)
const MONITORED_TIMEFRAMES = ['60', '240', 'D'] as const

// ─── Bybit data fetching ─────────────────────────────────────────────────────

async function fetchCandles(symbol: string, interval: string, limit = 200): Promise<Candle[]> {
  const url = new URL('https://api.bybit.com/v5/market/kline')
  url.searchParams.set('category', 'linear')
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', interval)
  url.searchParams.set('limit', String(Math.min(limit, 200)))

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Bybit OHLCV fetch failed: ${res.status}`)

  const json = await res.json() as { retCode: number; retMsg: string; result?: { list?: string[][] } }
  if (json.retCode !== 0 || !json.result?.list) throw new Error(json.retMsg ?? 'Bybit error')

  return json.result.list
    .map((e) => ({
      openTime: Number(e[0]),
      open: Number(e[1]),
      high: Number(e[2]),
      low: Number(e[3]),
      close: Number(e[4]),
      volume: Number(e[5]),
      turnover: Number(e[6] ?? 0),
      closeTime: Number(e[0]) + 1,
    }))
    .sort((a, b) => a.openTime - b.openTime)
}

async function fetchTicker(symbol: string): Promise<{ fundingRate: number; markPrice: number }> {
  const url = new URL('https://api.bybit.com/v5/market/tickers')
  url.searchParams.set('category', 'linear')
  url.searchParams.set('symbol', symbol)

  const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`Bybit ticker fetch failed: ${res.status}`)

  const json = await res.json() as { retCode: number; retMsg: string; result?: { list?: Record<string, string>[] } }
  if (json.retCode !== 0 || !json.result?.list?.[0]) throw new Error(json.retMsg ?? 'Ticker error')

  const t = json.result.list[0]
  return {
    fundingRate: parseFloat(t.fundingRate ?? '0'),
    markPrice: parseFloat(t.markPrice ?? '0'),
  }
}

// ─── Build MomentumComputation from candles ──────────────────────────────────

function buildComputation(symbol: string, timeframe: string, candles: Candle[], fundingRate: number | null): MomentumComputation {
  const c = candles.map(x => x.close)
  const rsiSetting = RSI_SETTINGS[timeframe] ?? { period: 14 }
  const stochSetting = STOCH_SETTINGS[timeframe] ?? { rsiLength: 14, stochLength: 14, kSmoothing: 3, dSmoothing: 3 }
  const macdSetting = MACD_SETTINGS[timeframe] ?? { fast: 12, slow: 26, signal: 9 }

  const tfRsi = calculateRSI(c, rsiSetting.period)
  const tfStoch = calculateStochasticRSI(c, stochSetting.rsiLength, stochSetting.stochLength, stochSetting.kSmoothing, stochSetting.dSmoothing)
  const tfMacd = calculateMACD(c, macdSetting.fast, macdSetting.slow, macdSetting.signal)
  const tfEma10 = calculateEMA(c, 10)
  const tfEma50 = calculateEMA(c, 50)
  const tfSma200 = calculateSMA(c, 200)
  const tfAdx = calculateADX(candles, 14)
  const tfAtr = calculateATR(candles, 14)
  const tfBB = calculateBollingerBands(c, 20, 2)
  const tfST = calculateSupertrend(candles, 10, 3)
  const tfOBV = calculateOBV(candles)
  const tfOBVEma = calculateEMA(tfOBV, 20)
  const tfVWAP = calculateVWAP(candles)
  const tfVolPct = calculateVolatilityPercentile(tfAtr)
  const tfHurst = calculateHurstExponent(c)
  const tfZScore = calculateZScore(c)
  const tfLinReg = calculateLinearRegression(c)
  const tfKAMA = calculateKAMA(c)
  const tfAutocorr = calculateAutocorrelation(c)
  const tfVolSpikes = detectVolumeSpikes(candles)
  const tfIchimoku = calculateIchimoku(candles)
  const tfCVD = calculateCVD(candles)
  const len = candles.length

  return {
    symbol,
    timeframe,
    timeframeLabel: TF_LABELS[timeframe] ?? timeframe,
    rsi: tfRsi[tfRsi.length - 1] ?? null,
    stochK: tfStoch.kValues[tfStoch.kValues.length - 1] ?? null,
    stochD: tfStoch.dValues[tfStoch.dValues.length - 1] ?? null,
    macdLine: tfMacd.macdLine[tfMacd.macdLine.length - 1] ?? null,
    macdSignal: tfMacd.signalLine[tfMacd.signalLine.length - 1] ?? null,
    macdHistogram: tfMacd.histogram[tfMacd.histogram.length - 1] ?? null,
    ema10: tfEma10[tfEma10.length - 1] ?? null,
    ema50: tfEma50[tfEma50.length - 1] ?? null,
    sma200: tfSma200[tfSma200.length - 1] ?? null,
    adx: tfAdx.adx[tfAdx.adx.length - 1] ?? null,
    atr: tfAtr[tfAtr.length - 1] ?? null,
    close: c[c.length - 1] ?? null,
    volume: candles[len - 1]?.volume ?? null,
    candles,
    bbUpper: tfBB.upper[tfBB.upper.length - 1] ?? null,
    bbLower: tfBB.lower[tfBB.lower.length - 1] ?? null,
    bbPercentB: tfBB.percentB[tfBB.percentB.length - 1] ?? null,
    bbBandwidth: tfBB.bandwidth[tfBB.bandwidth.length - 1] ?? null,
    supertrendValue: tfST.supertrend[tfST.supertrend.length - 1] ?? null,
    supertrendDirection: tfST.direction[tfST.direction.length - 1] ?? null,
    obv: tfOBV[tfOBV.length - 1] ?? null,
    obvEma: tfOBVEma[tfOBVEma.length - 1] ?? null,
    vwap: tfVWAP[tfVWAP.length - 1] ?? null,
    volatilityPercentile: tfVolPct,
    fundingRate,
    hurstExponent: tfHurst,
    zScore: tfZScore[tfZScore.length - 1] ?? null,
    rSquared: tfLinReg.rSquared[tfLinReg.rSquared.length - 1] ?? null,
    linearRegressionSlope: tfLinReg.slope[tfLinReg.slope.length - 1] ?? null,
    kama: tfKAMA[tfKAMA.length - 1] ?? null,
    autocorrelation: tfAutocorr,
    oiDivergence: null,
    volumeSpikeRatio: tfVolSpikes.length > 0 ? tfVolSpikes[tfVolSpikes.length - 1]?.ratio ?? null : null,
    ichimokuTenkan: tfIchimoku.tenkan[len - 1] ?? null,
    ichimokuKijun: tfIchimoku.kijun[len - 1] ?? null,
    ichimokuSenkouA: tfIchimoku.senkouA[len - 1] ?? null,
    ichimokuSenkouB: tfIchimoku.senkouB[len - 1] ?? null,
    ichimokuChikou: tfIchimoku.chikou[len - 1] ?? null,
    cvd: tfCVD.cvd[tfCVD.cvd.length - 1] ?? null,
    cvdEma: tfCVD.cvdEma[tfCVD.cvdEma.length - 1] ?? null,
  }
}

// ─── Compute full signals for a symbol ───────────────────────────────────────

async function computeAndCacheSignals(symbol: string, env: Env): Promise<AlertPayload[]> {
  const alerts: AlertPayload[] = []

  const [tickerResult, ...candleResults] = await Promise.allSettled([
    fetchTicker(symbol),
    ...ALL_TIMEFRAMES.map((tf) => fetchCandles(symbol, tf, 200)),
  ])

  const fundingRate = tickerResult.status === 'fulfilled' ? tickerResult.value.fundingRate : null

  // Funding rate alert
  if (fundingRate !== null && Math.abs(fundingRate) >= 0.0005) {
    const dir = fundingRate > 0 ? 'longs paying shorts' : 'shorts paying longs'
    alerts.push({
      title: `Extreme Funding Rate — ${symbol}`,
      body: `Funding rate ${(fundingRate * 100).toFixed(4)}% (${dir})`,
      tag: `funding-${symbol}`,
    })
  }

  // Build computations for all timeframes that succeeded
  const computations: MomentumComputation[] = []
  const candlesByTf: Record<string, Candle[]> = {}

  for (let i = 0; i < ALL_TIMEFRAMES.length; i++) {
    const tf = ALL_TIMEFRAMES[i]
    const result = candleResults[i]
    if (result.status !== 'fulfilled' || result.value.length < 55) continue

    const candles = result.value
    candlesByTf[tf] = candles
    computations.push(buildComputation(symbol, tf, candles, fundingRate))
  }

  if (computations.length === 0) return alerts

  // Compute Markov priors and Fibonacci per timeframe
  const markovPriors = calculateMultiTimeframeMarkovPriors(candlesByTf)
  const fibResults: Record<string, ReturnType<typeof calculateFibonacciLevels>> = {}
  for (const [tf, candles] of Object.entries(candlesByTf)) {
    fibResults[tf] = calculateFibonacciLevels(candles)
  }

  // Derive full signals (no Bayesian state — worker is stateless)
  const snapshots = deriveTimeframeSnapshots(computations, markovPriors, undefined, fibResults)
  const confluence = deriveMultiTimeframeConfluence(snapshots)

  // Store in SIGNAL_CACHE
  const cachePayload = {
    computedAt: Date.now(),
    symbol,
    snapshots,
    confluence,
  }
  await env.SIGNAL_CACHE.put(
    `latest:${symbol}`,
    JSON.stringify(cachePayload),
    { expirationTtl: 600 }
  )

  // Generate push alerts for monitored timeframes
  for (const tf of MONITORED_TIMEFRAMES) {
    const candles = candlesByTf[tf]
    if (!candles) continue

    const comp = computations.find(c => c.timeframe === tf)
    if (!comp || !comp.close) continue

    const tfLabel = TF_LABELS[tf] ?? tf
    const lastClose = comp.close

    // MA Cross alert
    if (comp.ema10 !== null && comp.ema50 !== null) {
      const closes = candles.map(c => c.close)
      const ema10 = calculateEMA(closes, 10)
      const ema50 = calculateEMA(closes, 50)
      const len = ema10.length
      const cur10 = ema10[len - 1]; const cur50 = ema50[len - 1]
      const prev10 = ema10[len - 2]; const prev50 = ema50[len - 2]

      if (cur10 !== null && cur50 !== null && prev10 !== null && prev50 !== null) {
        if (prev10 <= prev50 && cur10 > cur50) {
          alerts.push({
            title: `Golden Cross — ${symbol} (${tfLabel})`,
            body: `EMA 10/50 golden cross at $${lastClose.toLocaleString()}`,
            tag: `macross-${symbol}-${tf}-golden`,
            url: '/',
          })
        } else if (prev10 >= prev50 && cur10 < cur50) {
          alerts.push({
            title: `Death Cross — ${symbol} (${tfLabel})`,
            body: `EMA 10/50 death cross at $${lastClose.toLocaleString()}`,
            tag: `macross-${symbol}-${tf}-death`,
            url: '/',
          })
        }
      }
    }

    // Momentum alert (RSI + Stoch extremes)
    if (comp.rsi !== null && comp.stochD !== null) {
      if (comp.rsi < 25 && comp.stochD < 15) {
        alerts.push({
          title: `LONG Momentum — ${symbol} (${tfLabel})`,
          body: `RSI: ${comp.rsi.toFixed(1)} | Stoch D: ${comp.stochD.toFixed(1)}`,
          tag: `momentum-${symbol}-${tf}-long`,
          url: '/',
        })
      } else if (comp.rsi > 75 && comp.stochD > 85) {
        alerts.push({
          title: `SHORT Momentum — ${symbol} (${tfLabel})`,
          body: `RSI: ${comp.rsi.toFixed(1)} | Stoch D: ${comp.stochD.toFixed(1)}`,
          tag: `momentum-${symbol}-${tf}-short`,
          url: '/',
        })
      }
    }
  }

  return alerts
}

// ─── Main scheduled handler ──────────────────────────────────────────────────

export async function handleScheduled(env: Env): Promise<void> {
  const allAlerts = (
    await Promise.allSettled(SYMBOLS.map((sym) => computeAndCacheSignals(sym, env)))
  ).flatMap((result) => (result.status === 'fulfilled' ? result.value : []))

  if (!allAlerts.length) return

  await Promise.allSettled([
    handlePushNotifications(env, allAlerts),
    sendEmailNotifications(env, allAlerts),
  ])
}

async function handlePushNotifications(env: Env, allAlerts: AlertPayload[]): Promise<void> {
  const subscriptions = await loadSubscriptions(env)
  if (!subscriptions.length) return

  const freshAlerts = await Promise.all(
    allAlerts.map(async (alert) => {
      const inCooldown = await isInCooldown(env, alert.tag)
      return inCooldown ? null : alert
    })
  ).then((results) => results.filter(Boolean) as AlertPayload[])

  if (!freshAlerts.length) return

  const expiredEndpoints: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      for (const alert of freshAlerts) {
        const ok = await sendPush(sub, alert, env)
        if (!ok) {
          expiredEndpoints.push(sub.endpoint)
          break
        }
      }
    })
  )

  await Promise.allSettled(
    freshAlerts.map((alert) => {
      const ttl = COOLDOWN_SECS['60'] ?? 3600
      return setCooldown(env, alert.tag, ttl)
    })
  )

  if (expiredEndpoints.length) {
    await removeSubscriptions(env, expiredEndpoints)
    console.log(`Removed ${expiredEndpoints.length} expired subscription(s)`)
  }

  console.log(`Push cron: sent ${freshAlerts.length} alert(s) to ${subscriptions.length} subscriber(s)`)
}
