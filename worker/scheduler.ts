/**
 * Cron handler — runs every 5 minutes (configured in wrangler.toml).
 * 1. Run full signal detection for each symbol (indicators + confluence)
 * 2. Store computed signals in SIGNAL_CACHE KV (serves GET /api/signals/latest)
 * 3. Filter out alerts still within cooldown
 * 4. Send push notifications to all subscribers
 * 5. Send email alerts to opted-in users
 * 6. Remove expired push subscriptions (410 Gone from push endpoint)
 */

import type { Env } from './push'
import { sendPush } from './push'
import { loadSubscriptions, removeSubscriptions, isInCooldown, setCooldown } from './kv'
import { runSignalDetection, COOLDOWN_SECS } from './compute'
import type { AlertPayload, SignalCachePayload } from './compute'
import { sendEmailNotifications } from './email'

const SYMBOLS = ['BTCUSDT', 'ETHUSDT']

// TTL for the signal cache entry: 10 minutes (2× the cron interval).
// If the cron fails, the frontend gets a 503 and knows to fall back to local computation.
const SIGNAL_CACHE_TTL_SECS = 600

export async function handleScheduled(env: Env): Promise<void> {
  // Run full signal detection for all symbols concurrently
  const results = await Promise.allSettled(SYMBOLS.map(sym => runSignalDetection(sym)))

  const allAlerts: AlertPayload[] = []

  for (let i = 0; i < SYMBOLS.length; i++) {
    const result = results[i]
    const symbol = SYMBOLS[i]

    if (result.status === 'rejected') {
      console.error(`Signal detection failed for ${symbol}:`, result.reason)
      continue
    }

    const { payload, alerts } = result.value

    // Store computed signals in KV so the frontend can read them
    await storeSignalCache(env, symbol, payload)

    allAlerts.push(...alerts)
  }

  if (!allAlerts.length) return

  // Send push and email notifications in parallel
  await Promise.allSettled([
    handlePushNotifications(env, allAlerts),
    sendEmailNotifications(env, allAlerts),
  ])
}

async function storeSignalCache(env: Env, symbol: string, payload: SignalCachePayload): Promise<void> {
  try {
    // candles are large — strip them before caching (snapshots have all computed values)
    const serialisable = {
      ...payload,
      snapshots: payload.snapshots.map(s => ({ ...s })),
    }
    await env.SIGNAL_CACHE.put(
      `signals:${symbol}`,
      JSON.stringify(serialisable),
      { expirationTtl: SIGNAL_CACHE_TTL_SECS }
    )
  } catch (err) {
    console.error(`Failed to store signal cache for ${symbol}:`, err)
  }
}

async function handlePushNotifications(env: Env, allAlerts: AlertPayload[]): Promise<void> {
  const subscriptions = await loadSubscriptions(env)
  if (!subscriptions.length) return

  // Filter alerts that are still within their cooldown window
  const freshAlerts = (
    await Promise.all(
      allAlerts.map(async (alert) => {
        const inCooldown = await isInCooldown(env, alert.tag)
        return inCooldown ? null : alert
      })
    )
  ).filter(Boolean) as AlertPayload[]

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

  // Set cooldowns for sent alerts (use per-tag TF if parseable, else 1h)
  await Promise.allSettled(
    freshAlerts.map((alert) => {
      const tfMatch = alert.tag.match(/-(\w+)-(?:long|short|golden|death)$/)
      const tf = tfMatch?.[1] ?? '60'
      const ttl = COOLDOWN_SECS[tf] ?? 3600
      return setCooldown(env, alert.tag, ttl)
    })
  )

  if (expiredEndpoints.length) {
    await removeSubscriptions(env, expiredEndpoints)
    console.log(`Removed ${expiredEndpoints.length} expired subscription(s)`)
  }

  console.log(`Push cron: sent ${freshAlerts.length} alert(s) to ${subscriptions.length} subscriber(s)`)
}
