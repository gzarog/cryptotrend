/**
 * Cron handler — runs every 5 minutes (configured in wrangler.toml).
 * 1. Detect signals for configured symbols
 * 2. Filter out alerts still within their cooldown
 * 3. Send push to all subscribers
 * 4. Remove expired subscriptions (410 Gone from push endpoint)
 */

import type { Env } from './push'
import { sendPush } from './push'
import { loadSubscriptions, removeSubscriptions, isInCooldown, setCooldown } from './kv'
import { detectSignals, COOLDOWN_SECS } from './signals'

// Symbols to monitor (can be extended)
const SYMBOLS = ['BTCUSDT', 'ETHUSDT']

export async function handleScheduled(env: Env): Promise<void> {
  // 1. Load subscribers
  const subscriptions = await loadSubscriptions(env)
  if (!subscriptions.length) return

  // 2. Detect signals for all symbols concurrently
  const allAlerts = (
    await Promise.allSettled(SYMBOLS.map((sym) => detectSignals(sym)))
  ).flatMap((result) => (result.status === 'fulfilled' ? result.value : []))

  if (!allAlerts.length) return

  // 3. Filter by cooldown
  const freshAlerts = await Promise.all(
    allAlerts.map(async (alert) => {
      const inCooldown = await isInCooldown(env, alert.tag)
      return inCooldown ? null : alert
    })
  ).then((results) => results.filter(Boolean) as typeof allAlerts)

  if (!freshAlerts.length) return

  // 4. Send pushes and track expired subscriptions
  const expiredEndpoints: string[] = []

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      for (const alert of freshAlerts) {
        const ok = await sendPush(sub, alert, env)
        if (!ok) {
          expiredEndpoints.push(sub.endpoint)
          break // stop sending more alerts to a dead subscription
        }
      }
    })
  )

  // 5. Set cooldowns for sent alerts
  await Promise.allSettled(
    freshAlerts.map((alert) => {
      // Use a 1-hour default cooldown for non-timeframe-specific alerts
      const ttl = COOLDOWN_SECS['60'] ?? 3600
      return setCooldown(env, alert.tag, ttl)
    })
  )

  // 6. Remove expired subscriptions
  if (expiredEndpoints.length) {
    await removeSubscriptions(env, expiredEndpoints)
    console.log(`Removed ${expiredEndpoints.length} expired subscription(s)`)
  }

  console.log(`Push cron: sent ${freshAlerts.length} alert(s) to ${subscriptions.length} subscriber(s)`)
}
