import type { StoredSubscription, Env } from './push'

const SUBSCRIPTIONS_KEY = 'subscriptions'

/** Load all stored push subscriptions. */
export async function loadSubscriptions(env: Env): Promise<StoredSubscription[]> {
  const raw = await env.PUSH_SUBSCRIPTIONS.get(SUBSCRIPTIONS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as StoredSubscription[]
  } catch {
    return []
  }
}

/** Persist the subscriptions array. */
async function saveSubscriptions(env: Env, subs: StoredSubscription[]): Promise<void> {
  await env.PUSH_SUBSCRIPTIONS.put(SUBSCRIPTIONS_KEY, JSON.stringify(subs))
}

/** Add a new subscription (deduplicates by endpoint). */
export async function addSubscription(env: Env, sub: StoredSubscription): Promise<void> {
  const subs = await loadSubscriptions(env)
  const existing = subs.findIndex((s) => s.endpoint === sub.endpoint)
  if (existing >= 0) {
    subs[existing] = sub // update keys if they changed
  } else {
    subs.push(sub)
  }
  await saveSubscriptions(env, subs)
}

/** Remove a subscription by endpoint. */
export async function removeSubscription(env: Env, endpoint: string): Promise<void> {
  const subs = await loadSubscriptions(env)
  const filtered = subs.filter((s) => s.endpoint !== endpoint)
  await saveSubscriptions(env, filtered)
}

/** Remove multiple subscriptions by endpoint. */
export async function removeSubscriptions(env: Env, endpoints: string[]): Promise<void> {
  if (!endpoints.length) return
  const subs = await loadSubscriptions(env)
  const set = new Set(endpoints)
  await saveSubscriptions(env, subs.filter((s) => !set.has(s.endpoint)))
}

// ─── Cooldown tracking ───────────────────────────────────────────────────────

/** Returns true if the alert is still in cooldown (suppress duplicate push). */
export async function isInCooldown(env: Env, key: string): Promise<boolean> {
  const val = await env.ALERT_COOLDOWNS.get(key)
  return val !== null
}

/** Mark an alert key as sent; expires after `ttlSeconds`. */
export async function setCooldown(env: Env, key: string, ttlSeconds: number): Promise<void> {
  await env.ALERT_COOLDOWNS.put(key, '1', { expirationTtl: ttlSeconds })
}
