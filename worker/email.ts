/**
 * Email notification service via Resend API.
 * Manages subscribers in EMAIL_SUBSCRIPTIONS KV and sends digest emails
 * when trading signals fire during the cron job.
 */

import type { AlertPayload } from './signals'

export interface EmailSubscriber {
  email: string
  symbols: string[]      // e.g. ['BTCUSDT', 'ETHUSDT']
  signalTypes: string[]  // e.g. ['momentum', 'macross', 'funding'] or ['all']
}

export interface EmailEnv {
  EMAIL_SUBSCRIPTIONS: KVNamespace
  ALERT_COOLDOWNS: KVNamespace
  RESEND_API_KEY: string
}

const SUBSCRIBERS_KEY = 'subscribers'
const FROM_ADDRESS = 'CryptoTrendNotify <alerts@cryptotrend.app>'
const COOLDOWN_TTL = 3600 // 1 hour, same as push

// ─── Subscriber storage ───────────────────────────────────────────────────────

export async function getEmailSubscribers(env: EmailEnv): Promise<EmailSubscriber[]> {
  const raw = await env.EMAIL_SUBSCRIPTIONS.get(SUBSCRIBERS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as EmailSubscriber[]
  } catch {
    return []
  }
}

async function saveSubscribers(env: EmailEnv, subs: EmailSubscriber[]): Promise<void> {
  await env.EMAIL_SUBSCRIPTIONS.put(SUBSCRIBERS_KEY, JSON.stringify(subs))
}

export async function subscribeEmail(
  env: EmailEnv,
  email: string,
  preferences: Partial<Pick<EmailSubscriber, 'symbols' | 'signalTypes'>>
): Promise<void> {
  const subs = await getEmailSubscribers(env)
  const idx = subs.findIndex((s) => s.email === email)
  const entry: EmailSubscriber = {
    email,
    symbols: preferences.symbols ?? ['BTCUSDT', 'ETHUSDT'],
    signalTypes: preferences.signalTypes ?? ['all'],
  }
  if (idx >= 0) {
    subs[idx] = entry
  } else {
    subs.push(entry)
  }
  await saveSubscribers(env, subs)
}

export async function unsubscribeEmail(env: EmailEnv, email: string): Promise<void> {
  const subs = await getEmailSubscribers(env)
  await saveSubscribers(env, subs.filter((s) => s.email !== email))
}

// ─── Signal type helpers ──────────────────────────────────────────────────────

function signalTypeFromTag(tag: string): string {
  if (tag.startsWith('momentum-')) return 'momentum'
  if (tag.startsWith('macross-')) return 'macross'
  if (tag.startsWith('funding-')) return 'funding'
  return 'other'
}

function symbolFromTag(tag: string): string {
  const parts = tag.split('-')
  return parts[1] ?? ''
}

function matchesSubscriber(alert: AlertPayload, sub: EmailSubscriber): boolean {
  const symbol = symbolFromTag(alert.tag)
  const type = signalTypeFromTag(alert.tag)

  const symbolMatch = sub.symbols.length === 0 || sub.symbols.includes(symbol)
  const typeMatch = sub.signalTypes.includes('all') || sub.signalTypes.includes(type)

  return symbolMatch && typeMatch
}

// ─── Email sending ────────────────────────────────────────────────────────────

export async function sendEmail(
  env: EmailEnv,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email')
    return false
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    })
    if (!res.ok) {
      const text = await res.text()
      console.error(`Resend error ${res.status}:`, text)
      return false
    }
    return true
  } catch (err) {
    console.error('sendEmail fetch error:', err)
    return false
  }
}

// ─── Digest email builder ─────────────────────────────────────────────────────

function buildDigestHtml(alerts: AlertPayload[]): string {
  const rows = alerts
    .map((a) => {
      return `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #1e2a3a;">
            <div style="font-size:14px;font-weight:600;color:#e2e8f0;">${a.title}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${a.body}</div>
          </td>
        </tr>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>CryptoTrendNotify Alert</title>
</head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f1a;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;border:1px solid #1e2a3a;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#0ea5e9);padding:24px 32px;">
              <div style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">
                📈 CryptoTrend<strong>Notify</strong>
              </div>
              <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">
                ${alerts.length} signal${alerts.length !== 1 ? 's' : ''} detected
              </div>
            </td>
          </tr>

          <!-- Alerts -->
          <table width="100%" cellpadding="0" cellspacing="0">
            ${rows}
          </table>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 24px;border-top:1px solid #1e2a3a;text-align:center;">
              <div style="font-size:11px;color:#4b5563;">
                You're receiving this because you subscribed to email alerts on CryptoTrendNotify.
              </div>
              <div style="font-size:11px;color:#4b5563;margin-top:4px;">
                To unsubscribe, visit the app and click "Unsubscribe" in Email Alert settings.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ─── Public: send email notifications for a cron run ─────────────────────────

export async function sendEmailNotifications(
  env: EmailEnv,
  alerts: AlertPayload[]
): Promise<void> {
  if (!alerts.length) return

  const subscribers = await getEmailSubscribers(env)
  if (!subscribers.length) return

  await Promise.allSettled(
    subscribers.map(async (sub) => {
      // Filter alerts that match this subscriber's preferences
      const matching = alerts.filter((a) => matchesSubscriber(a, sub))
      if (!matching.length) return

      // Cooldown check: skip if all matching alerts are on cooldown for this email
      const freshAlerts = await Promise.all(
        matching.map(async (a) => {
          const cooldownKey = `email:${sub.email}:${a.tag}`
          const inCooldown = (await env.ALERT_COOLDOWNS.get(cooldownKey)) !== null
          return inCooldown ? null : a
        })
      ).then((r) => r.filter(Boolean) as AlertPayload[])

      if (!freshAlerts.length) return

      const subject =
        freshAlerts.length === 1
          ? freshAlerts[0].title
          : `${freshAlerts.length} crypto signals detected`

      const sent = await sendEmail(env, sub.email, subject, buildDigestHtml(freshAlerts))

      if (sent) {
        // Mark cooldowns for sent alerts
        await Promise.allSettled(
          freshAlerts.map((a) =>
            env.ALERT_COOLDOWNS.put(`email:${sub.email}:${a.tag}`, '1', {
              expirationTtl: COOLDOWN_TTL,
            })
          )
        )
        console.log(`Email sent to ${sub.email} with ${freshAlerts.length} alert(s)`)
      }
    })
  )
}
