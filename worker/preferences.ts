import type { Env } from './push'
import type { NotificationCriteria } from './types'

export function getDefaultCriteria(): NotificationCriteria {
  return {
    momentum: { enabled: true, channel: 'both' },
    crossover: { enabled: true, channel: 'both' },
    confluence: { enabled: true, channel: 'both', minTFs: 3, minConfidence: 0.65 },
    divergence: { enabled: true, channel: 'email' },
    fundingRate: { enabled: true, channel: 'push', threshold: 0.0005 },
    regimeChange: { enabled: true, channel: 'email' },
    volatility: { enabled: true, channel: 'push', percentileThreshold: 80 },
    correlation: { enabled: false, channel: 'push' },
    cooldownMinutes: 15,
    symbols: [],
    timeframesAllowed: [],
  }
}

export async function loadUserPreferences(env: Env, email: string): Promise<NotificationCriteria> {
  const raw = await env.NOTIFICATION_PREFERENCES.get(`prefs:${email}`)
  if (!raw) return getDefaultCriteria()
  try {
    return { ...getDefaultCriteria(), ...(JSON.parse(raw) as Partial<NotificationCriteria>) }
  } catch {
    return getDefaultCriteria()
  }
}

export async function saveUserPreferences(
  env: Env,
  email: string,
  criteria: NotificationCriteria
): Promise<void> {
  await env.NOTIFICATION_PREFERENCES.put(`prefs:${email}`, JSON.stringify(criteria))
}

/** Extracts the logical alert type from a tag string (e.g. "momentum-BTCUSDT-60-long" → "momentum"). */
export function getAlertType(tag: string): keyof NotificationCriteria | null {
  if (tag.startsWith('momentum-')) return 'momentum'
  if (tag.startsWith('macross-')) return 'crossover'
  if (tag.startsWith('funding-')) return 'fundingRate'
  if (tag.startsWith('confluence-')) return 'confluence'
  if (tag.startsWith('divergence-')) return 'divergence'
  if (tag.startsWith('regime-')) return 'regimeChange'
  if (tag.startsWith('volatility-')) return 'volatility'
  if (tag.startsWith('correlation-')) return 'correlation'
  return null
}

function getTagParts(tag: string): { symbol: string | null; timeframe: string | null } {
  const parts = tag.split('-')
  const type = parts[0]
  if (type === 'funding') {
    // funding-SYMBOL
    return { symbol: parts[1] ?? null, timeframe: null }
  }
  // most tags: TYPE-SYMBOL-TF-...
  return { symbol: parts[1] ?? null, timeframe: parts[2] ?? null }
}

/** Returns true if `channel` should receive this alert given the user's criteria. */
export function shouldSendAlert(
  tag: string,
  criteria: NotificationCriteria,
  channel: 'push' | 'email'
): boolean {
  const alertType = getAlertType(tag)
  if (!alertType) return true // unknown types pass through

  const config = criteria[alertType] as { enabled: boolean; channel: string }
  if (!config.enabled) return false
  if (config.channel !== 'both' && config.channel !== channel) return false

  const { symbol, timeframe } = getTagParts(tag)
  if (symbol && criteria.symbols.length > 0 && !criteria.symbols.includes(symbol)) return false
  if (timeframe && criteria.timeframesAllowed.length > 0 && !criteria.timeframesAllowed.includes(timeframe)) return false

  return true
}
