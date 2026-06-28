/**
 * Full indicator + signal computation for the worker cron.
 * Mirrors the computations useMemo in src/pages/Index.tsx so that both the
 * frontend and the worker derive signals from the same logic.
 */

import {
  calculateEMA, calculateFibonacciLevels,
} from '../src/lib/indicators'
import {
  deriveTimeframeSnapshots,
  deriveMultiTimeframeConfluence,
  calculateMultiTimeframeMarkovPriors,
} from '../src/lib/signals'
import { buildMomentumComputations } from '../shared/compute'
import type { Candle, MomentumComputation } from '../src/types/app'
import type { TimeframeSignalSnapshot, MultiTimeframeConfluence } from '../src/types/signals'
import {
  MONITORED_TIMEFRAMES,
  COOLDOWN_SECS,
} from '../shared/config'

// ─── Public types ─────────────────────────────────────────────────────────────

export type AlertPayload = {
  title: string
  body: string
  tag: string
  url?: string
}

export type SignalCachePayload = {
  computedAt: number
  symbol: string
  snapshots: TimeframeSignalSnapshot[]
  confluence: MultiTimeframeConfluence
  firedAlerts: AlertPayload[]
}

// ─── Bybit data fetching ──────────────────────────────────────────────────────

const BYBIT_LIMIT = 200

export async function fetchCandles(symbol: string, interval: string, limit = BYBIT_LIMIT): Promise<Candle[]> {
  const url = new URL('https://api.bybit.com/v5/market/kline')
  url.searchParams.set('category', 'linear')
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', interval)
  url.searchParams.set('limit', String(Math.min(limit, BYBIT_LIMIT)))

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

export async function fetchTicker(symbol: string): Promise<{ fundingRate: number; markPrice: number }> {
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

// ─── Build MomentumComputation objects from raw candles ───────────────────────

// Worker requires ≥55 bars per timeframe so longer-period indicators are valid.
const WORKER_MIN_BARS = 55

export function buildComputations(
  multiFrameCandles: { timeframe: string; candles: Candle[] }[],
  symbol: string,
  fundingRate: number | null = null
): MomentumComputation[] {
  return buildMomentumComputations(multiFrameCandles, symbol, fundingRate, WORKER_MIN_BARS)
}

// ─── Alert generation from full signal objects ────────────────────────────────

function lastValid(arr: (number | null)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) return arr[i]
  }
  return null
}

function prevValid(arr: (number | null)[]): number | null {
  let found = false
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) {
      if (found) return arr[i]
      found = true
    }
  }
  return null
}

function detectMACrossFromCandles(candles: Candle[]): 'golden' | 'death' | null {
  const c = candles.map(x => x.close)
  const ema10 = calculateEMA(c, 10)
  const ema50 = calculateEMA(c, 50)

  const cur10 = lastValid(ema10)
  const cur50 = lastValid(ema50)
  const prev10 = prevValid(ema10)
  const prev50 = prevValid(ema50)

  if (cur10 === null || cur50 === null || prev10 === null || prev50 === null) return null
  if (prev10 <= prev50 && cur10 > cur50) return 'golden'
  if (prev10 >= prev50 && cur10 < cur50) return 'death'
  return null
}

export function generateAlertsFromComputations(
  computations: MomentumComputation[],
  symbol: string,
  fundingRate: number | null
): AlertPayload[] {
  const alerts: AlertPayload[] = []

  // Funding rate alert
  if (fundingRate !== null && Math.abs(fundingRate) >= 0.0005) {
    const dir = fundingRate > 0 ? 'longs paying shorts' : 'shorts paying longs'
    alerts.push({
      title: `💰 Extreme Funding Rate — ${symbol}`,
      body: `Funding rate ${(fundingRate * 100).toFixed(4)}% (${dir})`,
      tag: `funding-${symbol}`,
    })
  }

  for (const comp of computations) {
    const tf = comp.timeframe
    if (!(MONITORED_TIMEFRAMES as readonly string[]).includes(tf)) continue
    if (!comp.close || !comp.candles.length) continue

    const tfLabel = comp.timeframeLabel

    // MA Cross
    const cross = detectMACrossFromCandles(comp.candles)
    if (cross) {
      alerts.push({
        title: `${cross === 'golden' ? '🟡 Golden' : '🟣 Death'} Cross — ${symbol} (${tfLabel})`,
        body: `EMA 10/50 ${cross} cross at $${comp.close.toLocaleString()}`,
        tag: `macross-${symbol}-${tf}-${cross}`,
        url: '/',
      })
    }

    // Momentum (RSI + Stoch extremes)
    const rsi = comp.rsi
    const stochD = comp.stochD

    if (rsi !== null && stochD !== null) {
      if (rsi < 25 && stochD < 15) {
        alerts.push({
          title: `🟢 LONG Momentum — ${symbol} (${tfLabel})`,
          body: `RSI: ${rsi.toFixed(1)} | Stoch D: ${stochD.toFixed(1)}`,
          tag: `momentum-${symbol}-${tf}-long`,
          url: '/',
        })
      } else if (rsi > 75 && stochD > 85) {
        alerts.push({
          title: `🔴 SHORT Momentum — ${symbol} (${tfLabel})`,
          body: `RSI: ${rsi.toFixed(1)} | Stoch D: ${stochD.toFixed(1)}`,
          tag: `momentum-${symbol}-${tf}-short`,
          url: '/',
        })
      }
    }
  }

  return alerts
}

// ─── Main: run full signal detection for one symbol ───────────────────────────

export async function runSignalDetection(symbol: string): Promise<{
  payload: SignalCachePayload
  alerts: AlertPayload[]
}> {
  // Parallel fetch: ticker + all timeframes
  const timeframes = [...(new Set([...MONITORED_TIMEFRAMES, '5', '15', '30']))]
  const [tickerResult, ...candleResults] = await Promise.allSettled([
    fetchTicker(symbol),
    ...timeframes.map(tf => fetchCandles(symbol, tf, BYBIT_LIMIT)),
  ])

  const fundingRate = tickerResult.status === 'fulfilled' ? tickerResult.value.fundingRate : null

  const multiFrameCandles = timeframes.map((tf, i) => ({
    timeframe: tf,
    candles: candleResults[i].status === 'fulfilled' ? candleResults[i].value : [],
  }))

  const computations = buildComputations(multiFrameCandles, symbol, fundingRate)

  // Fibonacci per timeframe (optional — only where candles available)
  const fibResultsByTf: Record<string, ReturnType<typeof calculateFibonacciLevels>> = {}
  for (const r of multiFrameCandles) {
    if (r.candles.length > 0) {
      fibResultsByTf[r.timeframe] = calculateFibonacciLevels(r.candles)
    }
  }

  // Markov priors
  const candlesByTf: Record<string, Candle[]> = {}
  for (const r of multiFrameCandles) {
    if (r.candles.length > 0) candlesByTf[r.timeframe] = r.candles
  }
  const markovPriors = calculateMultiTimeframeMarkovPriors(candlesByTf)

  // Full signal computation (no Bayesian state — worker has no session state)
  const snapshots: TimeframeSignalSnapshot[] = deriveTimeframeSnapshots(computations, markovPriors, undefined, fibResultsByTf)
  const confluence = deriveMultiTimeframeConfluence(snapshots)

  // Generate push/email alert payloads from computed values
  const alerts = generateAlertsFromComputations(computations, symbol, fundingRate)

  return {
    payload: {
      computedAt: Date.now(),
      symbol,
      snapshots,
      confluence,
      firedAlerts: alerts,
    },
    alerts,
  }
}

export { COOLDOWN_SECS }
