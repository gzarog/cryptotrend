/**
 * Cloudflare Worker entry point.
 * - Handles push subscription API routes
 * - Handles cron triggers for signal detection + push delivery
 * - Falls through to static assets for all other requests
 */

import type { Env } from './push'
import { addSubscription, removeSubscription } from './kv'
import { handleScheduled } from './scheduler'
import { subscribeEmail, unsubscribeEmail, getEmailSubscribers } from './email'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default {
  // ─── HTTP handler ────────────────────────────────────────────────────────

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders() })
    }

    // POST /api/push/subscribe
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

    // POST /api/push/unsubscribe
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

    // GET /api/push/status (health check)
    if (request.method === 'GET' && url.pathname === '/api/push/status') {
      return json({ ok: true, ts: Date.now() })
    }

    // POST /api/email/subscribe
    if (request.method === 'POST' && url.pathname === '/api/email/subscribe') {
      try {
        const body = await request.json() as {
          email?: string
          symbols?: string[]
          signalTypes?: string[]
        }
        if (!body?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
          return json({ error: 'Valid email required' }, 400)
        }
        await subscribeEmail(env, body.email, {
          symbols: body.symbols,
          signalTypes: body.signalTypes,
        })
        return json({ ok: true }, 201)
      } catch (err) {
        console.error('email subscribe error:', err)
        return json({ error: 'Failed to save email subscription' }, 500)
      }
    }

    // DELETE /api/email/unsubscribe
    if (request.method === 'DELETE' && url.pathname === '/api/email/unsubscribe') {
      try {
        const body = await request.json() as { email?: string }
        if (!body?.email) return json({ error: 'Missing email' }, 400)
        await unsubscribeEmail(env, body.email)
        return json({ ok: true })
      } catch (err) {
        console.error('email unsubscribe error:', err)
        return json({ error: 'Failed to remove email subscription' }, 500)
      }
    }

    // GET /api/email/status — returns subscription for the requesting user
    if (request.method === 'GET' && url.pathname === '/api/email/status') {
      try {
        const cfEmail = request.headers.get('Cf-Access-Authenticated-User-Email')
        const subscribers = await getEmailSubscribers(env)
        const sub = cfEmail ? subscribers.find((s) => s.email === cfEmail) ?? null : null
        return json({ subscriberCount: subscribers.length, subscription: sub })
      } catch (err) {
        console.error('email status error:', err)
        return json({ error: 'Failed to read email subscriptions' }, 500)
      }
    }

    // GET /api/me — returns the Cloudflare Access authenticated user, if any.
    // Cloudflare Access injects the Cf-Access-Authenticated-User-Email header on
    // requests that pass an Access policy. Returns null when not behind Access
    // (e.g. local dev), so the frontend can no-op gracefully.
    if (request.method === 'GET' && url.pathname === '/api/me') {
      const email = request.headers.get('Cf-Access-Authenticated-User-Email')
      return json({ email: email ?? null })
    }

    // All other requests → fall through to static assets (handled by [assets] config)
    return new Response('Not found', { status: 404 })
  },

  // ─── Cron trigger ────────────────────────────────────────────────────────

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env))
  },
} satisfies ExportedHandler<Env>
