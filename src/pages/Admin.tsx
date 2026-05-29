import { useState, useEffect, useCallback } from 'react'

interface EmailRecipient {
  email: string
  enabled: boolean
  symbols: string[]
  signalTypes: string[]
}

interface EmailConfig {
  enabled: boolean
  recipients: EmailRecipient[]
}

const ALL_SYMBOLS = ['BTCUSDT', 'ETHUSDT']
const ALL_SIGNAL_TYPES = [
  { value: 'momentum', label: 'Momentum' },
  { value: 'macross', label: 'MA Cross' },
  { value: 'funding', label: 'Funding Rate' },
]

function useAdminSecret() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem('adminSecret') ?? '')
  const save = (s: string) => {
    sessionStorage.setItem('adminSecret', s)
    setSecret(s)
  }
  return [secret, save] as const
}

async function adminFetch(
  secret: string,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Secret': secret,
      ...(options.headers ?? {}),
    },
  })
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Tag({ label, color = 'default' }: { label: string; color?: 'green' | 'blue' | 'gray' | 'default' }) {
  const cls = {
    green: 'bg-green-500/15 text-green-400 border-green-500/20',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    gray: 'bg-white/5 text-muted-foreground border-white/10',
    default: 'bg-primary/15 text-primary border-primary/20',
  }[color]
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${cls}`}>
      {label}
    </span>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-primary' : 'bg-white/20'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
        style={{ transform: checked ? 'translateX(18px)' : 'translateX(2px)' }}
      />
    </button>
  )
}

// ─── Add recipient form ───────────────────────────────────────────────────────

function AddRecipientForm({ onAdd }: { onAdd: (r: EmailRecipient) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [symbols, setSymbols] = useState<string[]>([])
  const [signalTypes, setSignalTypes] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Valid email required')
      return
    }
    setSaving(true)
    setError('')
    try {
      await onAdd({ email, enabled: true, symbols, signalTypes })
      setEmail('')
      setSymbols([])
      setSignalTypes([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add recipient')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="recipient@example.com"
          className="flex-1 px-3 py-2 text-sm bg-background border border-white/10 rounded-lg outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
        />
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
        >
          {saving ? 'Adding…' : 'Add'}
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Symbols:</span>
          {ALL_SYMBOLS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => setSymbols((p) => toggle(p, sym))}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                symbols.includes(sym)
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'border-white/10 text-muted-foreground hover:border-white/20'
              }`}
            >
              {sym.replace('USDT', '')}
            </button>
          ))}
          {symbols.length === 0 && <span className="text-[11px] text-muted-foreground/50 italic">all</span>}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Signals:</span>
          {ALL_SIGNAL_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setSignalTypes((p) => toggle(p, t.value))}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                signalTypes.includes(t.value)
                  ? 'bg-primary/20 border-primary/40 text-primary'
                  : 'border-white/10 text-muted-foreground hover:border-white/20'
              }`}
            >
              {t.label}
            </button>
          ))}
          {signalTypes.length === 0 && <span className="text-[11px] text-muted-foreground/50 italic">all</span>}
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  )
}

// ─── Main Admin page ──────────────────────────────────────────────────────────

export default function Admin() {
  const [secret, setSecret] = useAdminSecret()
  const [secretInput, setSecretInput] = useState(secret)
  const [authenticated, setAuthenticated] = useState(false)
  const [config, setConfig] = useState<EmailConfig | null>(null)
  const [loading, setLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [testingEmail, setTestingEmail] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, boolean>>({})
  const [savingGlobal, setSavingGlobal] = useState(false)

  const loadConfig = useCallback(async (s: string) => {
    setLoading(true)
    setAuthError('')
    try {
      const res = await adminFetch(s, '/admin/api/email')
      if (res.status === 401) {
        setAuthError('Invalid secret. Check ADMIN_SECRET wrangler secret.')
        setAuthenticated(false)
        return
      }
      if (!res.ok) throw new Error('Failed to load config')
      setConfig(await res.json() as EmailConfig)
      setAuthenticated(true)
    } catch {
      setAuthError('Could not reach admin API.')
    } finally {
      setLoading(false)
    }
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setSecret(secretInput)
    await loadConfig(secretInput)
  }

  async function toggleGlobal(enabled: boolean) {
    if (!config) return
    setSavingGlobal(true)
    try {
      await adminFetch(secret, '/admin/api/email', {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      })
      setConfig({ ...config, enabled })
    } finally {
      setSavingGlobal(false)
    }
  }

  async function toggleRecipient(email: string, enabled: boolean) {
    if (!config) return
    await adminFetch(secret, `/admin/api/email/recipients/${encodeURIComponent(email)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    })
    setConfig({
      ...config,
      recipients: config.recipients.map((r) =>
        r.email === email ? { ...r, enabled } : r
      ),
    })
  }

  async function deleteRecipient(email: string) {
    if (!config) return
    await adminFetch(secret, `/admin/api/email/recipients/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    })
    setConfig({
      ...config,
      recipients: config.recipients.filter((r) => r.email !== email),
    })
  }

  async function addRecipient(r: EmailRecipient) {
    if (!config) return
    const res = await adminFetch(secret, '/admin/api/email/recipients', {
      method: 'POST',
      body: JSON.stringify(r),
    })
    if (!res.ok) {
      const body = await res.json() as { error?: string }
      throw new Error(body.error ?? 'Failed to add recipient')
    }
    const existing = config.recipients.findIndex((x) => x.email === r.email)
    const updated = existing >= 0
      ? config.recipients.map((x) => (x.email === r.email ? r : x))
      : [...config.recipients, r]
    setConfig({ ...config, recipients: updated })
  }

  async function sendTest(email: string) {
    setTestingEmail(email)
    try {
      const res = await adminFetch(secret, '/admin/api/email/test', {
        method: 'POST',
        body: JSON.stringify({ email }),
      })
      const body = await res.json() as { ok?: boolean }
      setTestResult((p) => ({ ...p, [email]: !!body.ok }))
      setTimeout(() => setTestResult((p) => { const n = { ...p }; delete n[email]; return n }), 4000)
    } finally {
      setTestingEmail(null)
    }
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-card border border-white/10 rounded-xl p-6 shadow-2xl shadow-black/40">
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xl">🔐</span>
            <h1 className="text-base font-semibold">Admin — Email Notifications</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="Admin secret (ADMIN_SECRET)"
              className="w-full px-3 py-2 text-sm bg-background border border-white/10 rounded-lg outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
              autoFocus
            />
            {authError && <p className="text-xs text-red-400">{authError}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? 'Checking…' : 'Sign in'}
            </button>
          </form>
          <p className="mt-4 text-[11px] text-muted-foreground/50 text-center">
            Set via <code className="font-mono">wrangler secret put ADMIN_SECRET</code>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Email Notifications</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure who receives alerts when signals are detected
            </p>
          </div>
          <a
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors border border-white/10 px-3 py-1.5 rounded-lg hover:bg-white/5"
          >
            ← Dashboard
          </a>
        </div>

        {/* Global toggle */}
        <div className="bg-card border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Email notifications</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {config?.enabled ? 'Active — emails will be sent when signals fire' : 'Paused — no emails will be sent'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Tag
              label={config?.enabled ? 'Enabled' : 'Paused'}
              color={config?.enabled ? 'green' : 'gray'}
            />
            <Toggle
              checked={!!config?.enabled}
              onChange={(v) => !savingGlobal && toggleGlobal(v)}
            />
          </div>
        </div>

        {/* Recipients */}
        <div className="bg-card border border-white/10 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Recipients</h2>
            <span className="text-xs text-muted-foreground">{config?.recipients.length ?? 0} total</span>
          </div>

          {config && config.recipients.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">No recipients yet</p>
              <p className="text-xs text-muted-foreground/50 mt-1">Add one below to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {config?.recipients.map((r) => (
                <div key={r.email} className="px-4 py-3 flex items-start gap-3">
                  <Toggle
                    checked={r.enabled}
                    onChange={(v) => toggleRecipient(r.email, v)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${!r.enabled ? 'text-muted-foreground' : ''}`}>
                      {r.email}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {r.symbols.length === 0
                        ? <Tag label="All symbols" color="gray" />
                        : r.symbols.map((s) => <Tag key={s} label={s.replace('USDT', '')} color="blue" />)}
                      {r.signalTypes.length === 0
                        ? <Tag label="All signals" color="gray" />
                        : r.signalTypes.map((t) => <Tag key={t} label={t} />)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {testResult[r.email] !== undefined && (
                      <span className={`text-xs ${testResult[r.email] ? 'text-green-400' : 'text-red-400'}`}>
                        {testResult[r.email] ? '✓ sent' : '✗ failed'}
                      </span>
                    )}
                    <button
                      onClick={() => sendTest(r.email)}
                      disabled={testingEmail === r.email}
                      className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground text-xs disabled:opacity-50"
                      title="Send test email"
                    >
                      {testingEmail === r.email ? '…' : '✉'}
                    </button>
                    <button
                      onClick={() => deleteRecipient(r.email)}
                      className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                      title="Remove recipient"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add recipient form */}
          <div className="px-4 py-4 border-t border-white/5 bg-black/10">
            <p className="text-xs font-medium text-muted-foreground mb-3">Add recipient</p>
            <AddRecipientForm onAdd={addRecipient} />
          </div>
        </div>

        {/* Info */}
        <div className="p-4 rounded-xl border border-white/5 bg-white/[0.02] space-y-2">
          <p className="text-xs font-medium text-muted-foreground">How it works</p>
          <ul className="text-xs text-muted-foreground/70 space-y-1 list-disc list-inside">
            <li>The cron job runs every 5 minutes and detects trading signals</li>
            <li>Enabled recipients receive a digest email grouped by signal</li>
            <li>Each alert has a 1-hour cooldown per recipient to prevent spam</li>
            <li>Empty symbol/signal filters means the recipient gets all types</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
