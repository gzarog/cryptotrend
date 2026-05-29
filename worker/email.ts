/**
 * Email notification service via Resend API.
 * Recipients are managed by an admin — no user self-subscription.
 */

import type { AlertPayload } from './signals'

export interface EmailRecipient {
  email: string
  enabled: boolean
  symbols: string[]      // ['BTCUSDT', 'ETHUSDT'] — empty means all
  signalTypes: string[]  // ['momentum', 'macross', 'funding'] — empty means all
}

export interface EmailConfig {
  enabled: boolean        // global kill-switch
  recipients: EmailRecipient[]
}

export interface EmailEnv {
  EMAIL_SUBSCRIPTIONS: KVNamespace
  ALERT_COOLDOWNS: KVNamespace
  RESEND_API_KEY: string
  ADMIN_SECRET: string    // required header: X-Admin-Secret
}

const CONFIG_KEY = 'config'
const FROM_ADDRESS = 'CryptoTrendNotify <alerts@cryptotrend.app>'
const COOLDOWN_TTL = 3600

// ─── Config storage ───────────────────────────────────────────────────────────

export async function getEmailConfig(env: EmailEnv): Promise<EmailConfig> {
  const raw = await env.EMAIL_SUBSCRIPTIONS.get(CONFIG_KEY)
  if (!raw) return { enabled: true, recipients: [] }
  try {
    return JSON.parse(raw) as EmailConfig
  } catch {
    return { enabled: true, recipients: [] }
  }
}

export async function saveEmailConfig(env: EmailEnv, config: EmailConfig): Promise<void> {
  await env.EMAIL_SUBSCRIPTIONS.put(CONFIG_KEY, JSON.stringify(config))
}

// ─── Admin helpers ────────────────────────────────────────────────────────────

export async function addRecipient(env: EmailEnv, recipient: EmailRecipient): Promise<void> {
  const config = await getEmailConfig(env)
  const idx = config.recipients.findIndex((r) => r.email === recipient.email)
  if (idx >= 0) {
    config.recipients[idx] = recipient
  } else {
    config.recipients.push(recipient)
  }
  await saveEmailConfig(env, config)
}

export async function removeRecipient(env: EmailEnv, email: string): Promise<void> {
  const config = await getEmailConfig(env)
  config.recipients = config.recipients.filter((r) => r.email !== email)
  await saveEmailConfig(env, config)
}

export async function updateRecipient(
  env: EmailEnv,
  email: string,
  patch: Partial<Omit<EmailRecipient, 'email'>>
): Promise<void> {
  const config = await getEmailConfig(env)
  const idx = config.recipients.findIndex((r) => r.email === email)
  if (idx >= 0) Object.assign(config.recipients[idx], patch)
  await saveEmailConfig(env, config)
}

export async function setGlobalEnabled(env: EmailEnv, enabled: boolean): Promise<void> {
  const config = await getEmailConfig(env)
  config.enabled = enabled
  await saveEmailConfig(env, config)
}

// ─── Signal matching ──────────────────────────────────────────────────────────

function signalTypeFromTag(tag: string): string {
  if (tag.startsWith('momentum-')) return 'momentum'
  if (tag.startsWith('macross-')) return 'macross'
  if (tag.startsWith('funding-')) return 'funding'
  return 'other'
}

function symbolFromTag(tag: string): string {
  return tag.split('-')[1] ?? ''
}

function alertMatchesRecipient(alert: AlertPayload, r: EmailRecipient): boolean {
  const symbol = symbolFromTag(alert.tag)
  const type = signalTypeFromTag(alert.tag)
  const symbolMatch = r.symbols.length === 0 || r.symbols.includes(symbol)
  const typeMatch = r.signalTypes.length === 0 || r.signalTypes.includes(type)
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
      console.error(`Resend error ${res.status}:`, await res.text())
      return false
    }
    return true
  } catch (err) {
    console.error('sendEmail error:', err)
    return false
  }
}

// ─── Digest email template ────────────────────────────────────────────────────

function buildDigestHtml(alerts: AlertPayload[]): string {
  const rows = alerts
    .map(
      (a) => `
        <tr>
          <td style="padding:12px 16px;border-bottom:1px solid #1e2a3a;">
            <div style="font-size:14px;font-weight:600;color:#e2e8f0;">${a.title}</div>
            <div style="font-size:12px;color:#94a3b8;margin-top:4px;">${a.body}</div>
          </td>
        </tr>`
    )
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#0b0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f1a;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111827;border-radius:12px;overflow:hidden;border:1px solid #1e2a3a;">
        <tr>
          <td style="background:linear-gradient(135deg,#7c3aed,#0ea5e9);padding:24px 32px;">
            <div style="font-size:20px;font-weight:700;color:#fff;">📈 CryptoTrend<strong>Notify</strong></div>
            <div style="font-size:12px;color:rgba(255,255,255,0.75);margin-top:4px;">${alerts.length} signal${alerts.length !== 1 ? 's' : ''} detected</div>
          </td>
        </tr>
        <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #1e2a3a;text-align:center;">
            <div style="font-size:11px;color:#4b5563;">Managed by the CryptoTrendNotify admin panel.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Main: send email notifications for a cron run ───────────────────────────

export async function sendEmailNotifications(
  env: EmailEnv,
  alerts: AlertPayload[]
): Promise<void> {
  if (!alerts.length) return

  const config = await getEmailConfig(env)
  if (!config.enabled || !config.recipients.length) return

  const activeRecipients = config.recipients.filter((r) => r.enabled)
  if (!activeRecipients.length) return

  await Promise.allSettled(
    activeRecipients.map(async (r) => {
      const matching = alerts.filter((a) => alertMatchesRecipient(a, r))
      if (!matching.length) return

      const freshAlerts = (
        await Promise.all(
          matching.map(async (a) => {
            const key = `email:${r.email}:${a.tag}`
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

      const sent = await sendEmail(env, r.email, subject, buildDigestHtml(freshAlerts))
      if (sent) {
        await Promise.allSettled(
          freshAlerts.map((a) =>
            env.ALERT_COOLDOWNS.put(`email:${r.email}:${a.tag}`, '1', {
              expirationTtl: COOLDOWN_TTL,
            })
          )
        )
        console.log(`Email sent to ${r.email} (${freshAlerts.length} alerts)`)
      }
    })
  )
}
