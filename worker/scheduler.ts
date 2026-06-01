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
import { loadSubscribers, buildDigestHtml, sendRawEmail } from './email'
import { loadUserPreferences, shouldSendAlert, getDefaultCriteria } from './preferences'

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
    handleEmailNotifications(env, allAlerts),
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

  // Pre-filter: remove alerts still in global cooldown
  const cooldownChecked = (
    await Promise.all(
      allAlerts.map(async (alert) => {
        const inCooldown = await isInCooldown(env, alert.tag)
        return inCooldown ? null : alert
      })
    )
  ).filter(Boolean) as AlertPayload[]

  if (!cooldownChecked.length) return

  const expiredEndpoints: string[] = []
  let totalSent = 0

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      // Apply per-user preference filtering if the subscription has an associated email
      const prefs = sub.email
        ? await loadUserPreferences(env, sub.email)
        : getDefaultCriteria()

      const filtered = cooldownChecked.filter((a) => shouldSendAlert(a.tag, prefs, 'push'))
      if (!filtered.length) return

      for (const alert of filtered) {
        const ok = await sendPush(sub, alert, env)
        if (!ok) {
          expiredEndpoints.push(sub.endpoint)
          totalSent++
          break
        }
        totalSent++
      }
    })
  )

  // Set global cooldowns for alerts that were dispatched
  await Promise.allSettled(
    cooldownChecked.map((alert) => {
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

  console.log(`Push cron: dispatched ${totalSent} push(es) across ${subscriptions.length} subscriber(s)`)
}

async function handleEmailNotifications(env: Env, allAlerts: AlertPayload[]): Promise<void> {
  const subscribers = await loadSubscribers(env)
  if (!subscribers.length) return

  await Promise.allSettled(
    subscribers.map(async (email) => {
      const prefs = await loadUserPreferences(env, email)

      const freshAlerts = (
        await Promise.all(
          allAlerts.map(async (a) => {
            if (!shouldSendAlert(a.tag, prefs, 'email')) return null
            const key = `email:${email}:${a.tag}`
            const inCooldown = (await env.ALERT_COOLDOWNS.get(key)) !== null
            return inCooldown ? null : a
          })
        )
      ).filter(Boolean) as AlertPayload[]

      if (!freshAlerts.length) return

      const subject =
        freshAlerts.length === 1
          ? freshAlerts[0].title
          : `${freshAlerts.length} crypto signals detected`

      const sent = await sendRawEmail(env, email, subject, buildDigestHtml(freshAlerts))
      if (sent) {
        await Promise.allSettled(
          freshAlerts.map((a) =>
            env.ALERT_COOLDOWNS.put(`email:${email}:${a.tag}`, '1', { expirationTtl: 3600 })
          )
        )
        console.log(`Email sent to ${email} (${freshAlerts.length} alerts)`)
      }
    })
  )
}
