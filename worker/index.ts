/**
 * Cloudflare Worker entry point.
 * - Handles push subscription API routes
 * - Handles email alert toggle for the CF-Access authenticated user
 * - Handles cron triggers for signal detection + push/email delivery
 */

import type { Env } from './push'
import { addSubscription, removeSubscription } from './kv'
import { handleScheduled } from './scheduler'
import { isSubscribed, toggleSubscription } from './email'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
      const email = request.headers.get('Cf-Access-Authenticated-User-Email')
      return json({ email: email ?? null })
    }

    // ── Email alert toggle (uses CF Access identity) ──────────────────────

    // GET /api/email/status — is the current user subscribed?
    if (request.method === 'GET' && url.pathname === '/api/email/status') {
      const email = request.headers.get('Cf-Access-Authenticated-User-Email')
      if (!email) return json({ subscribed: false, email: null })
      try {
        const subscribed = await isSubscribed(env, email)
        return json({ subscribed, email })
      } catch (err) {
        console.error('email status error:', err)
        return json({ error: 'Failed to check status' }, 500)
      }
    }

    // POST /api/email/toggle — flip subscription state for current user
    if (request.method === 'POST' && url.pathname === '/api/email/toggle') {
      const email = request.headers.get('Cf-Access-Authenticated-User-Email')
      if (!email) return json({ error: 'Not authenticated via Cloudflare Access' }, 401)
      try {
        const nowEnabled = await toggleSubscription(env, email)
        return json({ subscribed: nowEnabled, email })
      } catch (err) {
        console.error('email toggle error:', err)
        return json({ error: 'Failed to toggle subscription' }, 500)
      }
    }

    return new Response('Not found', { status: 404 })
  },

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env))
  },
} satisfies ExportedHandler<Env>
