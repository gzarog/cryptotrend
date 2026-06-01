import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MainLayout } from '../layouts/MainLayout'
import { WorkerHeartbeat } from '../components/WorkerHeartbeat'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'

interface PushSubscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

interface CooldownKey {
  name: string
  expiration?: number
}

function formatTTL(expiration: number | undefined): string {
  if (expiration == null) return '—'
  const remaining = expiration - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return 'expired'
  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function SectionHeader({ title, count, onRefresh }: { title: string; count?: number; onRefresh: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {count != null && <Badge variant="secondary">{count}</Badge>}
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="p-1.5 rounded-lg border border-white/10 text-muted-foreground hover:bg-white/10 hover:text-foreground transition-colors"
        title="Refresh"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  )
}

export default function Admin() {
  const navigate = useNavigate()

  const [pushSubs, setPushSubs] = useState<PushSubscription[]>([])
  const [emails, setEmails] = useState<string[]>([])
  const [cooldowns, setCooldowns] = useState<CooldownKey[]>([])
  const [triggerState, setTriggerState] = useState<'idle' | 'running' | 'ok' | 'fail'>('idle')
  const [loading, setLoading] = useState(true)

  // Auth guard
  useEffect(() => {
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { email?: string | null } | null) => {
        if (!data?.email) navigate('/')
      })
      .catch(() => navigate('/'))
  }, [navigate])

  const fetchSubscriptions = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/subscriptions')
      if (res.ok) {
        const data = await res.json() as { subscriptions: PushSubscription[] }
        setPushSubs(data.subscriptions ?? [])
      }
    } catch { /* ignore */ }
  }, [])

  const fetchEmails = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/emails')
      if (res.ok) {
        const data = await res.json() as { emails: string[] }
        setEmails(data.emails ?? [])
      }
    } catch { /* ignore */ }
  }, [])

  const fetchCooldowns = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/cooldowns')
      if (res.ok) {
        const data = await res.json() as { keys: CooldownKey[] }
        setCooldowns(data.keys ?? [])
      }
    } catch { /* ignore */ }
  }, [])

  // Initial load
  useEffect(() => {
    Promise.all([fetchSubscriptions(), fetchEmails(), fetchCooldowns()]).finally(() => setLoading(false))
  }, [fetchSubscriptions, fetchEmails, fetchCooldowns])

  const removePushSub = useCallback(async (endpoint: string) => {
    await fetch('/api/admin/subscriptions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })
    await fetchSubscriptions()
  }, [fetchSubscriptions])

  const removeEmail = useCallback(async (email: string) => {
    await fetch('/api/admin/emails', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    await fetchEmails()
  }, [fetchEmails])

  const triggerCron = useCallback(async () => {
    setTriggerState('running')
    try {
      const res = await fetch('/api/admin/trigger-cron', { method: 'POST' })
      setTriggerState(res.ok ? 'ok' : 'fail')
    } catch {
      setTriggerState('fail')
    } finally {
      setTimeout(() => setTriggerState('idle'), 3000)
    }
  }, [])

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading…</div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gradient">Admin Panel</h2>
          <a
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to dashboard
          </a>
        </div>

        {/* Push Subscriptions */}
        <div className="glass-panel p-6">
          <SectionHeader title="Push Subscriptions" count={pushSubs.length} onRefresh={fetchSubscriptions} />
          {pushSubs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No push subscribers.</p>
          ) : (
            <ul className="space-y-2">
              {pushSubs.map((sub) => (
                <li key={sub.endpoint} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                  <span
                    className="text-xs text-muted-foreground font-mono truncate max-w-[70%]"
                    title={sub.endpoint}
                  >
                    {sub.endpoint}
                  </span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removePushSub(sub.endpoint)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Email Subscribers */}
        <div className="glass-panel p-6">
          <SectionHeader title="Email Subscribers" count={emails.length} onRefresh={fetchEmails} />
          {emails.length === 0 ? (
            <p className="text-xs text-muted-foreground">No email subscribers.</p>
          ) : (
            <ul className="space-y-2">
              {emails.map((email) => (
                <li key={email} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="text-sm text-foreground">{email}</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeEmail(email)}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Active Cooldowns */}
        <div className="glass-panel p-6">
          <SectionHeader title="Active Cooldowns" count={cooldowns.length} onRefresh={fetchCooldowns} />
          {cooldowns.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active cooldowns.</p>
          ) : (
            <ul className="space-y-2">
              {cooldowns.map((k) => (
                <li key={k.name} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                  <span className="text-xs font-mono text-muted-foreground truncate">{k.name}</span>
                  <Badge variant="outline" className="shrink-0 text-xs tabular-nums">
                    {formatTTL(k.expiration)}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Manual Trigger */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold text-foreground mb-1">Manual Trigger</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Runs signal detection immediately. Cooldowns still apply — no duplicate alerts will fire.
          </p>
          <button
            type="button"
            onClick={triggerCron}
            disabled={triggerState === 'running'}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all disabled:opacity-50 ${
              triggerState === 'ok'
                ? 'border-green-500/40 bg-green-500/10 text-green-400'
                : triggerState === 'fail'
                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
            }`}
          >
            {triggerState === 'running' ? 'Running…' : triggerState === 'ok' ? '✓ Done' : triggerState === 'fail' ? '✗ Failed' : 'Trigger Signal Detection Now'}
          </button>
        </div>

        {/* Worker Status */}
        <div className="glass-panel p-6">
          <h3 className="text-sm font-semibold text-foreground mb-4">Worker Status</h3>
          <div className="flex items-center gap-3">
            <WorkerHeartbeat />
            <span className="text-xs text-muted-foreground">Cloudflare Worker health</span>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
