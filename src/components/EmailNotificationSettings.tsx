import { useState, useEffect } from 'react'

interface EmailSubscription {
  email: string
  symbols: string[]
  signalTypes: string[]
}

const ALL_SYMBOLS = ['BTCUSDT', 'ETHUSDT']
const ALL_SIGNAL_TYPES = [
  { value: 'momentum', label: 'Momentum (RSI/Stoch extremes)' },
  { value: 'macross', label: 'MA Cross (Golden/Death)' },
  { value: 'funding', label: 'Extreme Funding Rate' },
]

interface Props {
  open: boolean
  onClose: () => void
}

export function EmailNotificationSettings({ open, onClose }: Props) {
  const [email, setEmail] = useState('')
  const [symbols, setSymbols] = useState<string[]>(['BTCUSDT', 'ETHUSDT'])
  const [signalTypes, setSignalTypes] = useState<string[]>(['all'])
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [currentSub, setCurrentSub] = useState<EmailSubscription | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(false)

  useEffect(() => {
    if (!open) return
    setCheckingStatus(true)
    fetch('/api/email/status')
      .then((r) => r.ok ? r.json() : null)
      .then((data: { subscription: EmailSubscription | null } | null) => {
        if (data?.subscription) {
          setCurrentSub(data.subscription)
          setEmail(data.subscription.email)
          setSymbols(data.subscription.symbols)
          setSignalTypes(data.subscription.signalTypes)
        }
      })
      .catch(() => { /* not behind Access or offline */ })
      .finally(() => setCheckingStatus(false))
  }, [open])

  if (!open) return null

  function toggleSymbol(sym: string) {
    setSymbols((prev) =>
      prev.includes(sym) ? prev.filter((s) => s !== sym) : [...prev, sym]
    )
  }

  function toggleSignalType(type: string) {
    if (type === 'all') {
      setSignalTypes(['all'])
      return
    }
    setSignalTypes((prev) => {
      const without = prev.filter((s) => s !== 'all')
      if (without.includes(type)) {
        const next = without.filter((s) => s !== type)
        return next.length === 0 ? ['all'] : next
      }
      return [...without, type]
    })
  }

  async function handleSubscribe() {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }
    if (symbols.length === 0) {
      setStatus('error')
      setMessage('Select at least one symbol.')
      return
    }
    setStatus('loading')
    try {
      const res = await fetch('/api/email/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, symbols, signalTypes }),
      })
      if (res.ok) {
        setStatus('success')
        setMessage(`Subscribed! You'll receive email alerts at ${email}.`)
        setCurrentSub({ email, symbols, signalTypes })
      } else {
        const body = await res.json() as { error?: string }
        setStatus('error')
        setMessage(body.error ?? 'Failed to subscribe.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  async function handleUnsubscribe() {
    if (!currentSub?.email) return
    setStatus('loading')
    try {
      const res = await fetch('/api/email/unsubscribe', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentSub.email }),
      })
      if (res.ok) {
        setStatus('success')
        setMessage('Unsubscribed from email alerts.')
        setCurrentSub(null)
        setEmail('')
      } else {
        setStatus('error')
        setMessage('Failed to unsubscribe.')
      }
    } catch {
      setStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-card border border-white/10 rounded-xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-lg">📧</span>
            <h2 className="text-sm font-semibold">Email Alert Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 overflow-y-auto max-h-[70vh]">
          {checkingStatus ? (
            <p className="text-sm text-muted-foreground text-center py-4">Checking subscription status…</p>
          ) : (
            <>
              {currentSub && (
                <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <span className="text-green-400 mt-0.5">✓</span>
                  <div>
                    <p className="text-xs font-medium text-green-400">Currently subscribed</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{currentSub.email}</p>
                  </div>
                </div>
              )}

              {/* Email input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2 text-sm bg-background border border-white/10 rounded-lg outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground/40"
                />
              </div>

              {/* Symbol selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Symbols
                </label>
                <div className="flex gap-2">
                  {ALL_SYMBOLS.map((sym) => (
                    <button
                      key={sym}
                      onClick={() => toggleSymbol(sym)}
                      className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
                        symbols.includes(sym)
                          ? 'bg-primary/20 border-primary/50 text-primary'
                          : 'border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'
                      }`}
                    >
                      {sym.replace('USDT', '')}
                      <span className="text-muted-foreground font-normal">/USDT</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Signal type selection */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Signal Types
                </label>
                <div className="space-y-1.5">
                  <button
                    onClick={() => toggleSignalType('all')}
                    className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg border text-xs transition-all text-left ${
                      signalTypes.includes('all')
                        ? 'bg-primary/20 border-primary/50 text-primary'
                        : 'border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                      signalTypes.includes('all') ? 'bg-primary border-primary' : 'border-white/30'
                    }`}>
                      {signalTypes.includes('all') && (
                        <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    All signal types
                  </button>
                  {ALL_SIGNAL_TYPES.map((type) => {
                    const checked = !signalTypes.includes('all') && signalTypes.includes(type.value)
                    return (
                      <button
                        key={type.value}
                        onClick={() => toggleSignalType(type.value)}
                        className={`w-full flex items-center gap-3 py-2 px-3 rounded-lg border text-xs transition-all text-left ${
                          checked
                            ? 'bg-primary/20 border-primary/50 text-primary'
                            : 'border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground'
                        } ${signalTypes.includes('all') ? 'opacity-40 pointer-events-none' : ''}`}
                      >
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                          checked ? 'bg-primary border-primary' : 'border-white/30'
                        }`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        {type.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Status message */}
              {status !== 'idle' && status !== 'loading' && message && (
                <div className={`p-3 rounded-lg text-xs ${
                  status === 'success'
                    ? 'bg-green-500/10 border border-green-500/20 text-green-400'
                    : 'bg-red-500/10 border border-red-500/20 text-red-400'
                }`}>
                  {message}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!checkingStatus && (
          <div className="px-5 py-4 border-t border-white/5 flex gap-2">
            <button
              onClick={handleSubscribe}
              disabled={status === 'loading'}
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Saving…' : currentSub ? 'Update Subscription' : 'Subscribe'}
            </button>
            {currentSub && (
              <button
                onClick={handleUnsubscribe}
                disabled={status === 'loading'}
                className="py-2 px-4 border border-destructive/50 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Unsubscribe
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
