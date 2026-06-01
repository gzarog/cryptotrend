import { useState, useEffect, useCallback } from 'react'
import type { NotificationCriteria, AlertTypeConfig, NotificationChannel } from '../types/notifications'
import { DEFAULT_CRITERIA, ALERT_TYPE_LABELS } from '../types/notifications'

type AlertTypeKey = keyof typeof ALERT_TYPE_LABELS

interface Props {
  open: boolean
  onClose: () => void
}

function ChannelButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

export function NotificationPreferencesPanel({ open, onClose }: Props) {
  const [criteria, setCriteria] = useState<NotificationCriteria | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [symbolInput, setSymbolInput] = useState('')
  const [tfInput, setTfInput] = useState('')

  const fetchPreferences = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications/preferences')
      if (res.status === 401) {
        setCriteria(DEFAULT_CRITERIA)
        return
      }
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json() as { criteria: NotificationCriteria }
      setCriteria(data.criteria)
    } catch {
      setError('Could not load preferences — showing defaults')
      setCriteria(DEFAULT_CRITERIA)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open && !criteria) fetchPreferences()
  }, [open, criteria, fetchPreferences])

  const save = useCallback(async () => {
    if (!criteria) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(criteria),
      })
      if (!res.ok) throw new Error('Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Failed to save — please try again')
    } finally {
      setSaving(false)
    }
  }, [criteria])

  const reset = useCallback(async () => {
    if (!confirm('Reset all notification preferences to defaults?')) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/notifications/preferences/reset', { method: 'POST' })
      if (!res.ok) throw new Error('Failed to reset')
      const data = await res.json() as { criteria: NotificationCriteria }
      setCriteria(data.criteria)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch {
      setError('Failed to reset — please try again')
    } finally {
      setSaving(false)
    }
  }, [])

  const setTypeEnabled = (key: AlertTypeKey, enabled: boolean) => {
    setCriteria((prev) => prev ? { ...prev, [key]: { ...prev[key], enabled } } : prev)
  }

  const setTypeChannel = (key: AlertTypeKey, channel: NotificationChannel) => {
    setCriteria((prev) => prev ? { ...prev, [key]: { ...prev[key], channel } } : prev)
  }

  const addSymbol = () => {
    const sym = symbolInput.trim().toUpperCase()
    if (!sym || !criteria) return
    if (!criteria.symbols.includes(sym)) {
      setCriteria({ ...criteria, symbols: [...criteria.symbols, sym] })
    }
    setSymbolInput('')
  }

  const removeSymbol = (sym: string) => {
    if (!criteria) return
    setCriteria({ ...criteria, symbols: criteria.symbols.filter((s) => s !== sym) })
  }

  const addTf = () => {
    const tf = tfInput.trim()
    if (!tf || !criteria) return
    if (!criteria.timeframesAllowed.includes(tf)) {
      setCriteria({ ...criteria, timeframesAllowed: [...criteria.timeframesAllowed, tf] })
    }
    setTfInput('')
  }

  const removeTf = (tf: string) => {
    if (!criteria) return
    setCriteria({ ...criteria, timeframesAllowed: criteria.timeframesAllowed.filter((t) => t !== tf) })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-background/95 backdrop-blur-xl shadow-2xl shadow-black/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-background/80 backdrop-blur-md">
          <h2 className="text-base font-semibold">Notification Preferences</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">Loading…</div>
        ) : !criteria ? null : (
          <div className="px-6 py-5 space-y-6">
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            {/* Alert type toggles */}
            <section className="space-y-1">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Alert Types</h3>
              <div className="space-y-2">
                {(Object.keys(ALERT_TYPE_LABELS) as AlertTypeKey[]).map((key) => {
                  const config = criteria[key] as AlertTypeConfig
                  return (
                    <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                      {/* Enable toggle */}
                      <button
                        onClick={() => setTypeEnabled(key, !config.enabled)}
                        className={`relative w-8 h-4 rounded-full transition-colors flex-shrink-0 ${config.enabled ? 'bg-primary' : 'bg-white/15'}`}
                      >
                        <span
                          className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${config.enabled ? 'translate-x-4' : 'translate-x-0.5'}`}
                        />
                      </button>

                      {/* Label */}
                      <span className={`flex-1 text-sm ${config.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {ALERT_TYPE_LABELS[key]}
                      </span>

                      {/* Channel selector */}
                      {config.enabled && (
                        <div className="flex items-center gap-1">
                          {(['push', 'email', 'both'] as NotificationChannel[]).map((ch) => (
                            <ChannelButton key={ch} active={config.channel === ch} onClick={() => setTypeChannel(key, ch)}>
                              {ch}
                            </ChannelButton>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>

            {/* Cooldown */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Global Cooldown</h3>
              <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Suppress duplicates for</span>
                  <span className="font-medium text-primary">{criteria.cooldownMinutes} min</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={120}
                  step={5}
                  value={criteria.cooldownMinutes}
                  onChange={(e) => setCriteria({ ...criteria, cooldownMinutes: Number(e.target.value) })}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>5 min</span>
                  <span>2 h</span>
                </div>
              </div>
            </section>

            {/* Symbol whitelist */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Symbol Whitelist</h3>
              <p className="text-xs text-muted-foreground mb-3">Leave empty to receive alerts for all symbols.</p>
              <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. BTCUSDT"
                    value={symbolInput}
                    onChange={(e) => setSymbolInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={addSymbol}
                    className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
                {criteria.symbols.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {criteria.symbols.map((sym) => (
                      <span key={sym} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-medium">
                        {sym}
                        <button onClick={() => removeSymbol(sym)} className="hover:text-white transition-colors">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Timeframe whitelist */}
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Timeframe Whitelist</h3>
              <p className="text-xs text-muted-foreground mb-3">Leave empty for all timeframes. Use Bybit interval codes: 5, 15, 30, 60, 120, 240, D.</p>
              <div className="p-3 rounded-xl border border-white/5 bg-white/[0.02] space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. 60"
                    value={tfInput}
                    onChange={(e) => setTfInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTf()}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                  />
                  <button
                    onClick={addTf}
                    className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-sm font-medium transition-colors"
                  >
                    Add
                  </button>
                </div>
                {criteria.timeframesAllowed.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {criteria.timeframesAllowed.map((tf) => (
                      <span key={tf} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/20 text-secondary-foreground text-xs font-medium">
                        {tf}
                        <button onClick={() => removeTf(tf)} className="hover:text-white transition-colors">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Preferences'}
              </button>
              <button
                onClick={reset}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl border border-white/10 text-muted-foreground text-sm hover:bg-white/5 hover:text-foreground disabled:opacity-50 transition-all"
              >
                Reset
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
