/**
 * Email notification service via Resend API.
 * Recipients are the logged-in Cloudflare Access users who toggled alerts on.
 */

import type { AlertPayload } from './compute'

export interface EmailEnv {
  EMAIL_SUBSCRIPTIONS: KVNamespace
  ALERT_COOLDOWNS: KVNamespace
  RESEND_API_KEY: string
  FROM_ADDRESS?: string
}

const SUBSCRIBERS_KEY = 'subscribers'
const DEFAULT_FROM_ADDRESS = 'CryptoTrendNotify <onboarding@resend.dev>'
const COOLDOWN_TTL = 3600

// ─── Subscriber storage ───────────────────────────────────────────────────────

export async function loadSubscribers(env: EmailEnv): Promise<string[]> {
  const raw = await env.EMAIL_SUBSCRIPTIONS.get(SUBSCRIBERS_KEY)
  if (!raw) return []
  try {
    return JSON.parse(raw) as string[]
  } catch {
    return []
  }
}

async function saveSubscribers(env: EmailEnv, emails: string[]): Promise<void> {
  await env.EMAIL_SUBSCRIPTIONS.put(SUBSCRIBERS_KEY, JSON.stringify(emails))
}

export async function removeSubscriber(env: EmailEnv, email: string): Promise<void> {
  const subs = await loadSubscribers(env)
  await saveSubscribers(env, subs.filter((e) => e !== email))
}

export async function isSubscribed(env: EmailEnv, email: string): Promise<boolean> {
  const subs = await loadSubscribers(env)
  return subs.includes(email)
}

export async function toggleSubscription(env: EmailEnv, email: string): Promise<boolean> {
  const subs = await loadSubscribers(env)
  const idx = subs.indexOf(email)
  if (idx >= 0) {
    subs.splice(idx, 1)
    await saveSubscribers(env, subs)
    return false
  }
  subs.push(email)
  await saveSubscribers(env, subs)
  return true
}

// ─── Send via Resend API ──────────────────────────────────────────────────────

export async function sendRawEmail(env: EmailEnv, to: string, subject: string, html: string): Promise<boolean> {
  return sendEmail(env, to, subject, html)
}

async function sendEmail(env: EmailEnv, to: string, subject: string, html: string): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping email')
    return false
  }
  const from = env.FROM_ADDRESS ?? DEFAULT_FROM_ADDRESS
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
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

// ─── Test email ───────────────────────────────────────────────────────────────

export async function sendTestEmail(env: EmailEnv, to: string): Promise<boolean> {
  return sendEmail(
    env,
    to,
    '✅ CryptoTrendNotify — Test Email',
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:32px;background:#0b0f1a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#111827;border-radius:12px;overflow:hidden;border:1px solid #1e2a3a;">
    <div style="background:linear-gradient(135deg,#7c3aed,#0ea5e9);padding:24px 32px;">
      <div style="font-size:20px;font-weight:700;color:#fff;">📈 CryptoTrend<strong>Notify</strong></div>
    </div>
    <div style="padding:24px 32px;">
      <p style="color:#e2e8f0;font-size:15px;margin:0 0 8px;">Test email delivered successfully.</p>
      <p style="color:#94a3b8;font-size:13px;margin:0;">Email alerts are configured correctly. You'll receive a digest like this whenever trading signals fire.</p>
    </div>
  </div>
</body>
</html>`
  )
}

// ─── Digest email template ────────────────────────────────────────────────────

export function buildDigestHtml(alerts: AlertPayload[]): string {
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
            <div style="font-size:11px;color:#4b5563;">You're receiving this because you enabled email alerts on CryptoTrendNotify.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

