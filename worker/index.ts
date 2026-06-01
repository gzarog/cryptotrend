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

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getAuthEmail(request: Request, env: Env): string | null {
  return request.headers.get('Cf-Access-Authenticated-User-Email')
    ?? env.DEV_USER_EMAIL
    ?? null
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    // ── Push notification routes ─────────────────────────────────────────

    if (request.method === 'POST' && url.pathname === '/api/push/subscribe') {
      try {
        const body = await request.json() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
        if (!body?.endpoint || !body?.keys?.p256dh || !body?.keys?.auth) {
          return json({ error: 'Invalid subscription body' }, 400)
        }
        await addSubscription(env, { endpoint: body.endpoint, keys: { p256dh: body.keys.p256dh, auth: body.keys.auth } })
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

    // ── Auth ─────────────────────────────────────────────────────────────

    if (request.method === 'GET' && url.pathname === '/api/me') {
      const email = getAuthEmail(request, env)
      return json({ email: email ?? null })
    }

    // ── Email alert toggle (uses CF Access identity) ──────────────────────

    // GET /api/email/status — is the current user subscribed?
    if (request.method === 'GET' && url.pathname === '/api/email/status') {
      const email = getAuthEmail(request, env)
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
      const email = getAuthEmail(request, env)
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
      const email = getAuthEmail(request, env)
      if (!email) return json({ error: 'Not authenticated via Cloudflare Access' }, 401)
      try {
        const nowEnabled = await toggleSubscription(env, email)
        return json({ subscribed: nowEnabled, email })
      } catch (err) {
        console.error('email toggle error:', err)
        return json({ error: 'Failed to toggle subscription' }, 500)
      }
    }

    // ── Admin routes ─────────────────────────────────────────────────────

    if (url.pathname.startsWith('/api/admin/')) {
      const email = getAuthEmail(request, env)
      if (!email) return json({ error: 'Not authenticated' }, 401)

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

    // ── Signal cache ──────────────────────────────────────────────────────

    if (request.method === 'GET' && url.pathname === '/api/signals/latest') {
      const symbol = url.searchParams.get('symbol') ?? 'BTCUSDT'
      const cached = await env.SIGNAL_CACHE.get(`latest:${symbol}`, 'json')
      if (!cached) {
        return json({ error: 'no data yet' }, 503)
      }
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=60',
        },
      })
    }

    return new Response('Not found', { status: 404 })
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env))
  },
} satisfies ExportedHandler<Env>
