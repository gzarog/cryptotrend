/**
 * Cloudflare Worker entry point.
 * - Handles push subscription API routes
 * - Handles admin API routes for email notification management
 * - Handles cron triggers for signal detection + push/email delivery
 * - Falls through to static assets for all other requests
 */

import type { Env } from './push'
import { addSubscription, removeSubscription } from './kv'
import { handleScheduled } from './scheduler'
import {
  getEmailConfig,
  saveEmailConfig,
  addRecipient,
  removeRecipient,
  updateRecipient,
  setGlobalEnabled,
  sendEmail,
} from './email'

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Secret',
  }
}

function isAdminAuthorized(request: Request, env: Env): boolean {
  const secret = request.headers.get('X-Admin-Secret')
  return !!env.ADMIN_SECRET && secret === env.ADMIN_SECRET
}

export default {
  // ─── HTTP handler ────────────────────────────────────────────────────────

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

    // ── Admin: email notification management ─────────────────────────────
    // All /admin/api/* routes require X-Admin-Secret header.

    if (url.pathname.startsWith('/admin/api/')) {
      if (!isAdminAuthorized(request, env)) {
        return json({ error: 'Unauthorized' }, 401)
      }

      // GET /admin/api/email — return full config
      if (request.method === 'GET' && url.pathname === '/admin/api/email') {
        try {
          const config = await getEmailConfig(env)
          return json(config)
        } catch (err) {
          console.error('admin email get error:', err)
          return json({ error: 'Failed to load config' }, 500)
        }
      }

      // PATCH /admin/api/email — toggle global enabled flag
      if (request.method === 'PATCH' && url.pathname === '/admin/api/email') {
        try {
          const body = await request.json() as { enabled?: boolean }
          if (typeof body?.enabled !== 'boolean') return json({ error: 'enabled (boolean) required' }, 400)
          await setGlobalEnabled(env, body.enabled)
          return json({ ok: true })
        } catch (err) {
          console.error('admin email patch error:', err)
          return json({ error: 'Failed to update config' }, 500)
        }
      }

      // POST /admin/api/email/recipients — add or update a recipient
      if (request.method === 'POST' && url.pathname === '/admin/api/email/recipients') {
        try {
          const body = await request.json() as {
            email?: string
            enabled?: boolean
            symbols?: string[]
            signalTypes?: string[]
          }
          if (!body?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
            return json({ error: 'Valid email required' }, 400)
          }
          await addRecipient(env, {
            email: body.email,
            enabled: body.enabled ?? true,
            symbols: body.symbols ?? [],
            signalTypes: body.signalTypes ?? [],
          })
          return json({ ok: true }, 201)
        } catch (err) {
          console.error('admin add recipient error:', err)
          return json({ error: 'Failed to add recipient' }, 500)
        }
      }

      // PATCH /admin/api/email/recipients/:email — update enabled/symbols/signalTypes
      const patchMatch = url.pathname.match(/^\/admin\/api\/email\/recipients\/(.+)$/)
      if (request.method === 'PATCH' && patchMatch) {
        try {
          const email = decodeURIComponent(patchMatch[1])
          const body = await request.json() as Partial<{ enabled: boolean; symbols: string[]; signalTypes: string[] }>
          await updateRecipient(env, email, body)
          return json({ ok: true })
        } catch (err) {
          console.error('admin update recipient error:', err)
          return json({ error: 'Failed to update recipient' }, 500)
        }
      }

      // DELETE /admin/api/email/recipients/:email — remove a recipient
      const deleteMatch = url.pathname.match(/^\/admin\/api\/email\/recipients\/(.+)$/)
      if (request.method === 'DELETE' && deleteMatch) {
        try {
          const email = decodeURIComponent(deleteMatch[1])
          await removeRecipient(env, email)
          return json({ ok: true })
        } catch (err) {
          console.error('admin delete recipient error:', err)
          return json({ error: 'Failed to remove recipient' }, 500)
        }
      }

      // POST /admin/api/email/test — send a test email to a specific address
      if (request.method === 'POST' && url.pathname === '/admin/api/email/test') {
        try {
          const body = await request.json() as { email?: string }
          if (!body?.email) return json({ error: 'email required' }, 400)
          const ok = await sendEmail(
            env,
            body.email,
            '✅ CryptoTrendNotify — Test Email',
            `<p style="font-family:sans-serif;color:#e2e8f0;background:#111827;padding:24px;border-radius:8px;">
              Test email from <strong>CryptoTrendNotify</strong>.<br/>
              Email notifications are configured correctly.
            </p>`
          )
          return json({ ok })
        } catch (err) {
          console.error('admin test email error:', err)
          return json({ error: 'Failed to send test email' }, 500)
        }
      }

      return json({ error: 'Not found' }, 404)
    }

    return new Response('Not found', { status: 404 })
  },

  // ─── Cron trigger ────────────────────────────────────────────────────────

  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduled(env))
  },
} satisfies ExportedHandler<Env>
