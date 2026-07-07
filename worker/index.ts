/**
 * Cloudflare Worker entry point.
 * - Handles push subscription API routes
 * - Handles email alert toggle for the CF-Access authenticated user
 * - Handles cron triggers for signal detection + push/email delivery
 */

import type { Env } from './push'
import { addSubscription, removeSubscription } from './kv'
import { handleScheduled } from './scheduler'
import { isSubscribed, toggleSubscription, sendTestEmail, loadSubscribers, removeSubscriber } from './email'
import { loadSubscriptions } from './kv'
import type { SignalCachePayload } from './compute'
import { loadUserPreferences, saveUserPreferences, getDefaultCriteria } from './preferences'
import type { NotificationCriteria } from './types'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Verify a Cloudflare Access JWT when ACCESS_AUD + ACCESS_TEAM_DOMAIN are configured.
 * Falls back to trusting the plain header only in local dev (DEV_USER_EMAIL set, no aud).
 *
 * Returns the authenticated email or null.
 */
async function getAuthEmail(request: Request, env: Env): Promise<string | null> {
  // Local dev shortcut (no CF Access configured)
  if (!env.ACCESS_AUD && env.DEV_USER_EMAIL) {
    return env.DEV_USER_EMAIL
  }

  // If ACCESS_AUD is set, verify the CF Access JWT assertion
  if (env.ACCESS_AUD && env.ACCESS_TEAM_DOMAIN) {
    const token = request.headers.get('Cf-Access-Jwt-Assertion')
    if (!token) return null
    try {
      const certsUrl = `https://${env.ACCESS_TEAM_DOMAIN}.cloudflareaccess.com/cdn-cgi/access/certs`
      const certsRes = await fetch(certsUrl)
      if (!certsRes.ok) throw new Error(`Failed to fetch CF Access certs: ${certsRes.status}`)
      const certs = await certsRes.json() as { keys: JsonWebKey[] }

      const [headerB64, payloadB64, sigB64] = token.split('.')
      if (!headerB64 || !payloadB64 || !sigB64) return null

      const header = JSON.parse(atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'))) as { kid?: string; alg?: string }
      const jwk = certs.keys.find((k: JsonWebKey & { kid?: string }) => k.kid === header.kid) ?? certs.keys[0]
      if (!jwk) return null

      const key = await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['verify']
      )
      const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`)
      const sigBytes = Uint8Array.from(atob(sigB64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
      const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, sigBytes, signingInput)
      if (!valid) return null

      const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'))) as { email?: string; aud?: string | string[]; exp?: number }
      const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud ?? '']
      if (!aud.includes(env.ACCESS_AUD)) return null
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

      return payload.email ?? null
    } catch (err) {
      console.error('CF Access JWT verification failed:', err)
      return null
    }
  }

  // Fallback: trust the plain header only when no aud is configured (permissive dev mode)
  return request.headers.get('Cf-Access-Authenticated-User-Email') ?? null
}

function isAdmin(email: string, env: Env): boolean {
  if (!env.ADMIN_EMAILS) return false
  return env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase()).includes(email.toLowerCase())
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const allowedOrigin = env.ALLOWED_ORIGIN ?? request.headers.get('Origin') ?? ''
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Cf-Access-Jwt-Assertion',
    'Vary': 'Origin',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    const cors = corsHeaders(request, env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    // ── Push notification routes ─────────────────────────────────────────

    if (request.method === 'POST' && url.pathname === '/api/push/subscribe') {
      try {
        const body = await request.json() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
        if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
          return json({ error: 'Invalid subscription body' }, 400)
        }
        const email = (await getAuthEmail(request, env)) ?? undefined
        await addSubscription(env, { endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth }, email })
        return json({ ok: true }, 201)
      } catch (err) {
        console.error('subscribe error:', err)
        return json({ error: 'Failed to save subscription' }, 500)
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/push/unsubscribe') {
      try {
        const body = await request.json() as { endpoint?: string }
        if (!body?.endpoint) return json({ error: 'Missing endpoint' }, 400)
        await removeSubscription(env, body.endpoint)
        return json({ ok: true })
      } catch (err) {
        console.error('unsubscribe error:', err)
        return json({ error: 'Failed to remove subscription' }, 500)
      }
    }

    if (request.method === 'GET' && url.pathname === '/api/push/status') {
      return json({ ok: true, ts: Date.now() })
    }

    // ── Signals cache ─────────────────────────────────────────────────────────

    // GET /api/signals/latest?symbol=BTCUSDT
    if (request.method === 'GET' && url.pathname === '/api/signals/latest') {
      const symbol = (url.searchParams.get('symbol') ?? 'BTCUSDT').toUpperCase()
      try {
        const cached = await env.SIGNAL_CACHE.get(`signals:${symbol}`, 'text')
        if (!cached) {
          return json({ error: 'No signal data yet — cron has not run or KV not configured' }, 503)
        }
        const payload = JSON.parse(cached) as SignalCachePayload
        return new Response(cached, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=60',
            'X-Computed-At': String(payload.computedAt),
            ...cors,
          },
        })
      } catch (err) {
        console.error('signals/latest error:', err)
        return json({ error: 'Failed to read signal cache' }, 500)
      }
    }

    // ── Auth ─────────────────────────────────────────────────────────────

    if (request.method === 'GET' && url.pathname === '/api/me') {
      const email = await getAuthEmail(request, env)
      return json({ email: email ?? null })
    }

    // ── Email alert toggle (uses CF Access identity) ──────────────────────

    // GET /api/email/status — is the current user subscribed?
    if (request.method === 'GET' && url.pathname === '/api/email/status') {
      const email = await getAuthEmail(request, env)
      if (!email) return json({ subscribed: false, email: null })
      try {
        const subscribed = await isSubscribed(env, email)
        return json({ subscribed, email })
      } catch (err) {
        console.error('email status error:', err)
        return json({ error: 'Failed to check status' }, 500)
      }
    }

    // POST /api/email/test — send a test email to the current CF Access user
    if (request.method === 'POST' && url.pathname === '/api/email/test') {
      const email = await getAuthEmail(request, env)
      if (!email) return json({ error: 'Not authenticated via Cloudflare Access' }, 401)
      try {
        const ok = await sendTestEmail(env, email)
        return json({ ok })
      } catch (err) {
        console.error('email test error:', err)
        return json({ error: 'Failed to send test email' }, 500)
      }
    }

    // POST /api/email/toggle — flip subscription state for current user
    if (request.method === 'POST' && url.pathname === '/api/email/toggle') {
      const email = await getAuthEmail(request, env)
      if (!email) return json({ error: 'Not authenticated via Cloudflare Access' }, 401)
      try {
        const nowEnabled = await toggleSubscription(env, email)
        return json({ subscribed: nowEnabled, email })
      } catch (err) {
        console.error('email toggle error:', err)
        return json({ error: 'Failed to toggle subscription' }, 500)
      }
    }

    // ── Notification preferences ──────────────────────────────────────────────

    if (url.pathname === '/api/notifications/preferences') {
      const email = await getAuthEmail(request, env)
      if (!email) return json({ error: 'Not authenticated' }, 401)

      if (request.method === 'GET') {
        try {
          const criteria = await loadUserPreferences(env, email)
          return json({ email, criteria })
        } catch (err) {
          console.error('preferences get error:', err)
          return json({ error: 'Failed to load preferences' }, 500)
        }
      }

      if (request.method === 'POST') {
        try {
          const body = await request.json() as Partial<NotificationCriteria>
          const current = await loadUserPreferences(env, email)
          const updated: NotificationCriteria = { ...current, ...body }
          await saveUserPreferences(env, email, updated)
          return json({ email, criteria: updated })
        } catch (err) {
          console.error('preferences save error:', err)
          return json({ error: 'Failed to save preferences' }, 500)
        }
      }
    }

    if (request.method === 'POST' && url.pathname === '/api/notifications/preferences/reset') {
      const email = await getAuthEmail(request, env)
      if (!email) return json({ error: 'Not authenticated' }, 401)
      try {
        const defaults = getDefaultCriteria()
        await saveUserPreferences(env, email, defaults)
        return json({ email, criteria: defaults })
      } catch (err) {
        console.error('preferences reset error:', err)
        return json({ error: 'Failed to reset preferences' }, 500)
      }
    }

    // ── Admin routes ─────────────────────────────────────────────────────
    // Requires authenticated email AND presence in the ADMIN_EMAILS env var.

    if (url.pathname.startsWith('/api/admin/')) {
      const email = await getAuthEmail(request, env)
      if (!email) return json({ error: 'Not authenticated' }, 401)
      if (!isAdmin(email, env)) return json({ error: 'Forbidden' }, 403)

      // GET /api/admin/subscriptions
      if (request.method === 'GET' && url.pathname === '/api/admin/subscriptions') {
        try {
          const subscriptions = await loadSubscriptions(env)
          return json({ count: subscriptions.length, subscriptions })
        } catch (err) {
          console.error('admin subscriptions error:', err)
          return json({ error: 'Failed to load subscriptions' }, 500)
        }
      }

      // DELETE /api/admin/subscriptions
      if (request.method === 'DELETE' && url.pathname === '/api/admin/subscriptions') {
        try {
          const body = await request.json() as { endpoint?: string }
          if (!body?.endpoint) return json({ error: 'Missing endpoint' }, 400)
          await removeSubscription(env, body.endpoint)
          return json({ ok: true })
        } catch (err) {
          console.error('admin remove subscription error:', err)
          return json({ error: 'Failed to remove subscription' }, 500)
        }
      }

      // GET /api/admin/emails
      if (request.method === 'GET' && url.pathname === '/api/admin/emails') {
        try {
          const emails = await loadSubscribers(env)
          return json({ count: emails.length, emails })
        } catch (err) {
          console.error('admin emails error:', err)
          return json({ error: 'Failed to load emails' }, 500)
        }
      }

      // DELETE /api/admin/emails
      if (request.method === 'DELETE' && url.pathname === '/api/admin/emails') {
        try {
          const body = await request.json() as { email?: string }
          if (!body?.email) return json({ error: 'Missing email' }, 400)
          await removeSubscriber(env, body.email)
          return json({ ok: true })
        } catch (err) {
          console.error('admin remove email error:', err)
          return json({ error: 'Failed to remove email' }, 500)
        }
      }

      // GET /api/admin/cooldowns
      if (request.method === 'GET' && url.pathname === '/api/admin/cooldowns') {
        try {
          const result = await env.ALERT_COOLDOWNS.list()
          return json({ keys: result.keys.map((k) => ({ name: k.name, expiration: k.expiration })) })
        } catch (err) {
          console.error('admin cooldowns error:', err)
          return json({ error: 'Failed to load cooldowns' }, 500)
        }
      }

      // POST /api/admin/trigger-cron
      if (request.method === 'POST' && url.pathname === '/api/admin/trigger-cron') {
        try {
          await handleScheduled(env)
          return json({ ok: true, triggeredAt: Date.now() })
        } catch (err) {
          console.error('admin trigger-cron error:', err)
          return json({ error: 'Failed to trigger cron' }, 500)
        }
      }
    }

    return new Response('Not found', { status: 404 })
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env))
  },
} satisfies ExportedHandler<Env>
