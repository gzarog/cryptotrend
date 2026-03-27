/**
 * Server-side signal detection for the push notification scheduler.
 * Fetches market data from Bybit and runs a subset of the indicator checks
 * that are also run client-side in src/pages/Index.tsx.
 *
 * Shared calculation utilities are imported directly from src/lib/indicators.ts
 * (those files have no browser dependencies).
 */

import { calculateEMA, calculateRSI, calculateStochasticRSI } from '../src/lib/indicators'

// calculateStochasticRSI signature: (closes, rsiLength, stochLength, kSmoothing, dSmoothing) → { kValues, dValues }
import type { Candle } from '../src/types/app'

export interface AlertPayload {
  title: string
  body: string
  tag: string
  url?: string
}

// ─── Bybit data fetching ─────────────────────────────────────────────────────

const BYBIT_LIMIT = 200

async function fetchCandles(symbol: string, interval: string, limit = BYBIT_LIMIT): Promise<Candle[]> {
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

// ─── Timeframe config ────────────────────────────────────────────────────────

// Bybit interval string → minutes
const TF_MINUTES: Record<string, number> = {
  '60': 60, '120': 120, '240': 240, '360': 360, 'D': 1440, 'W': 10080,
}

// Timeframes monitored by the cron job (1H and above, matching MIN_NOTIF_TF in the app)
const MONITORED_TIMEFRAMES = ['60', '240', 'D'] as const

// Cooldown in seconds per timeframe (matches COOLDOWN_MS in notifications.ts)
const COOLDOWN_SECS: Record<string, number> = {
  '60': 3600, '120': 7200, '240': 14400, '360': 21600, 'D': 86400, 'W': 604800,
}

// ─── Signal detectors ────────────────────────────────────────────────────────

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

type CrossDirection = 'golden' | 'death'

function detectMACross(ema10: (number | null)[], ema50: (number | null)[]): CrossDirection | null {
  const cur10 = lastValid(ema10)
  const cur50 = lastValid(ema50)
  const prev10 = prevValid(ema10)
  const prev50 = prevValid(ema50)

  if (cur10 === null || cur50 === null || prev10 === null || prev50 === null) return null

  const wasBelowOrEqual = prev10 <= prev50
  const isNowAbove = cur10 > cur50
  if (wasBelowOrEqual && isNowAbove) return 'golden'

  const wasAboveOrEqual = prev10 >= prev50
  const isNowBelow = cur10 < cur50
  if (wasAboveOrEqual && isNowBelow) return 'death'

  return null
}

// ─── Main: run signal detection for all configured symbols & timeframes ───────

export async function detectSignals(symbol: string): Promise<AlertPayload[]> {
  const alerts: AlertPayload[] = []

  // Parallel fetch for all monitored timeframes + ticker
  const [tickerData, ...candleResults] = await Promise.allSettled([
    fetchTicker(symbol),
    ...MONITORED_TIMEFRAMES.map((tf) => fetchCandles(symbol, tf, 200)),
  ])

  // ── Funding rate check ──
  if (tickerData.status === 'fulfilled') {
    const { fundingRate } = tickerData.value
    const absFr = Math.abs(fundingRate)
    if (absFr >= 0.0005) {
      const dir = fundingRate > 0 ? 'longs paying shorts' : 'shorts paying longs'
      alerts.push({
        title: `💰 Extreme Funding Rate — ${symbol}`,
        body: `Funding rate ${(fundingRate * 100).toFixed(4)}% (${dir})`,
        tag: `funding-${symbol}`,
      })
    }
  }

  // ── Per-timeframe checks ──
  for (let i = 0; i < MONITORED_TIMEFRAMES.length; i++) {
    const tf = MONITORED_TIMEFRAMES[i]
    const result = candleResults[i]
    if (result.status !== 'fulfilled') continue

    const candles = result.value
    if (candles.length < 55) continue // need enough bars for EMA 50

    const closes = candles.map((c) => c.close)
    const lastClose = closes[closes.length - 1]
    const tfLabel = tf === 'D' ? '1D' : tf === 'W' ? '1W' : `${tf}M`

    const ema10 = calculateEMA(closes, 10)
    const ema50 = calculateEMA(closes, 50)
    const rsi = calculateRSI(closes, 14)
    const { dValues: stochD } = calculateStochasticRSI(closes, 14, 14, 3, 3)

    // MA Cross
    const cross = detectMACross(ema10, ema50)
    if (cross) {
      alerts.push({
        title: `${cross === 'golden' ? '🟡 Golden' : '🟣 Death'} Cross — ${symbol} (${tfLabel})`,
        body: `EMA 10/50 ${cross} cross at $${lastClose.toLocaleString()}`,
        tag: `macross-${symbol}-${tf}-${cross}`,
        url: '/',
      })
    }

    // Momentum (RSI + Stoch extremes)
    const lastRsi = lastValid(rsi)
    const lastStochD = lastValid(stochD)

    if (lastRsi !== null && lastStochD !== null) {
      if (lastRsi < 25 && lastStochD < 15) {
        alerts.push({
          title: `🟢 LONG Momentum — ${symbol} (${tfLabel})`,
          body: `RSI: ${lastRsi.toFixed(1)} | Stoch D: ${lastStochD.toFixed(1)}`,
          tag: `momentum-${symbol}-${tf}-long`,
          url: '/',
        })
      } else if (lastRsi > 75 && lastStochD > 85) {
        alerts.push({
          title: `🔴 SHORT Momentum — ${symbol} (${tfLabel})`,
          body: `RSI: ${lastRsi.toFixed(1)} | Stoch D: ${lastStochD.toFixed(1)}`,
          tag: `momentum-${symbol}-${tf}-short`,
          url: '/',
        })
      }
    }
  }

  return alerts
}

export { COOLDOWN_SECS, TF_MINUTES }
