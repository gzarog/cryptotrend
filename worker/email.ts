/**
 * Email notification service via Cloudflare Email Workers (send_email binding).
 * No third-party API — uses Cloudflare's native email infrastructure.
 *
 * Setup:
 *  1. Enable Email Routing on your Cloudflare domain
 *  2. Add [[send_email]] binding in wrangler.toml (see below)
 *  3. The "from" address must be on a domain with Email Routing active
 */

import type { AlertPayload } from './signals'

export interface EmailEnv {
  EMAIL_SUBSCRIPTIONS: KVNamespace
  ALERT_COOLDOWNS: KVNamespace
  EMAIL: SendEmail          // Cloudflare send_email binding
  FROM_EMAIL: string        // e.g. alerts@yourdomain.com  (set in [vars])
}

const SUBSCRIBERS_KEY = 'subscribers'
const COOLDOWN_TTL = 3600

// ─── Subscriber storage ───────────────────────────────────────────────────────

async function loadSubscribers(env: EmailEnv): Promise<string[]> {
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

// ─── Raw MIME builder ─────────────────────────────────────────────────────────
// Builds a minimal RFC 2822 / MIME 1.0 message for an HTML email.
// No dependencies — avoids adding mimetext or similar packages.

function buildRawEmail(from: string, to: string, subject: string, html: string): string {
  // Encode subject as UTF-8 base64 (RFC 2047) so special chars are safe
  const encodedSubject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`
  return [
    'MIME-Version: 1.0',
    `From: CryptoTrendNotify <${from}>`,
    `To: ${to}`,
    `Subject: ${encodedSubject}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
  ].join('\r\n')
}

// ─── Send via CF Email Workers ────────────────────────────────────────────────

async function sendEmail(
  env: EmailEnv,
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  const from = env.FROM_EMAIL
  if (!from) {
    console.warn('FROM_EMAIL not set — skipping email')
    return false
  }
  try {
    const raw = buildRawEmail(from, to, subject, html)
    const encoded = new TextEncoder().encode(raw)
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoded)
        controller.close()
      },
    })
    const message = new EmailMessage(from, to, stream)
    await env.EMAIL.send(message)
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
            <div style="font-size:11px;color:#4b5563;">You're receiving this because you enabled email alerts on CryptoTrendNotify.</div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─── Main: called from cron scheduler ────────────────────────────────────────

export async function sendEmailNotifications(
  env: EmailEnv,
  alerts: AlertPayload[]
): Promise<void> {
  if (!alerts.length) return

  const subscribers = await loadSubscribers(env)
  if (!subscribers.length) return

  await Promise.allSettled(
    subscribers.map(async (email) => {
      const freshAlerts = (
        await Promise.all(
          alerts.map(async (a) => {
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

      const sent = await sendEmail(env, email, subject, buildDigestHtml(freshAlerts))
      if (sent) {
        await Promise.allSettled(
          freshAlerts.map((a) =>
            env.ALERT_COOLDOWNS.put(`email:${email}:${a.tag}`, '1', {
              expirationTtl: COOLDOWN_TTL,
            })
          )
        )
        console.log(`Email sent to ${email} (${freshAlerts.length} alerts)`)
      }
    })
  )
}
