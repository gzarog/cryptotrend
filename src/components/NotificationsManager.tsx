import { useState } from 'react'
import type { MomentumNotification, MovingAverageCrossNotification, SignalNotification, DivergenceNotification, FundingRateNotification, RegimeChangeNotification, VolatilityBreakoutNotification, CorrelationBreakdownNotification, CustomNotification } from '../types/app'
import { SYMBOLS } from '../constants/market'
import type { UnifiedNotification } from './NotificationPanel'

function unify(
  momentum: MomentumNotification[],
  cross: MovingAverageCrossNotification[],
  signals: SignalNotification[] = [],
  divergences: DivergenceNotification[] = [],
  funding: FundingRateNotification[] = [],
  regime: RegimeChangeNotification[] = [],
  volatility: VolatilityBreakoutNotification[] = [],
  correlation: CorrelationBreakdownNotification[] = [],
  custom: CustomNotification[] = [],
): UnifiedNotification[] {
  const items: UnifiedNotification[] = []

  for (const n of momentum) {
    items.push({ id: n.id, type: 'momentum', title: n.label, body: `${n.timeframeSummary} • RSI: ${n.rsiSummary} • Stoch: ${n.stochasticSummary}`, symbol: n.symbol, triggeredAt: n.triggeredAt, accentClass: n.direction === 'long' ? 'border-l-green-500' : 'border-l-red-500', icon: n.direction === 'long' ? '🟢' : '🔴' })
  }
  for (const n of cross) {
    items.push({ id: n.id, type: 'cross', title: `${n.direction === 'golden' ? 'Golden' : 'Death'} Cross — ${n.pairLabel}`, body: `${n.timeframeLabel} • $${n.price.toLocaleString()}`, symbol: n.symbol, triggeredAt: n.triggeredAt, accentClass: n.direction === 'golden' ? 'border-l-yellow-500' : 'border-l-purple-500', icon: n.direction === 'golden' ? '🟡' : '🟣' })
  }
  for (const n of signals) {
    items.push({ id: n.id, type: 'signal', title: `${n.confluenceCount}-TF ${n.direction.toUpperCase()} Confluence`, body: `${n.timeframes.join(', ')} • Avg: ${(n.avgConfidence * 100).toFixed(0)}%`, symbol: n.symbol, triggeredAt: n.triggeredAt, accentClass: n.direction === 'long' ? 'border-l-emerald-500' : 'border-l-orange-500', icon: n.direction === 'long' ? '📈' : '📉', priority: n.priority })
  }
  for (const n of divergences) {
    items.push({ id: n.id, type: 'divergence', title: `${n.variant.charAt(0).toUpperCase() + n.variant.slice(1)} ${n.divergenceType} divergence`, body: `${n.timeframeLabel} • ${n.indicator.replace('divergence-', '').toUpperCase()}`, symbol: n.symbol, triggeredAt: n.triggeredAt, accentClass: n.divergenceType === 'bullish' ? 'border-l-cyan-500' : 'border-l-pink-500', icon: n.divergenceType === 'bullish' ? '🔵' : '🔻', priority: n.priority })
  }
  for (const n of funding) {
    items.push({ id: n.id, type: 'funding', title: `Extreme Funding — ${n.direction === 'longs_paying' ? 'Longs paying' : 'Shorts paying'}`, body: `Rate: ${(n.rate * 100).toFixed(4)}%`, symbol: n.symbol, triggeredAt: n.triggeredAt, accentClass: 'border-l-amber-500', icon: '💰', priority: n.priority })
  }
  for (const n of regime) {
    items.push({ id: n.id, type: 'regime', title: `Regime: ${n.fromRegime} → ${n.toRegime}`, body: `Hurst: ${n.hurstValue.toFixed(3)}`, symbol: n.symbol, triggeredAt: n.triggeredAt, accentClass: n.toRegime === 'trending' ? 'border-l-blue-500' : n.toRegime === 'mean-reverting' ? 'border-l-amber-500' : 'border-l-gray-500', icon: '🔄', priority: n.priority })
  }
  for (const n of volatility) {
    items.push({ id: n.id, type: 'volatility', title: 'Volatility Spike', body: `Percentile: ${n.volatilityPercentile.toFixed(0)}%`, symbol: n.symbol, triggeredAt: n.triggeredAt, accentClass: 'border-l-rose-500', icon: '⚡', priority: n.priority })
  }
  for (const n of correlation) {
    items.push({ id: n.id, type: 'correlation', title: `${n.asset} Decoupled`, body: `Correlation: ${n.correlation.toFixed(3)} (was ${n.previousCorrelation.toFixed(3)})`, symbol: n.symbol, triggeredAt: n.triggeredAt, accentClass: 'border-l-red-500', icon: '🔗', priority: n.priority })
  }
  for (const n of custom) {
    items.push({ id: n.id, type: 'custom', title: n.title, body: n.body, symbol: n.symbol, triggeredAt: n.triggeredAt, accentClass: 'border-l-violet-500', icon: '📌' })
  }

  return items.sort((a, b) => b.triggeredAt - a.triggeredAt)
}

type ManagerTab = 'all' | 'custom' | 'system'

type Props = {
  open: boolean
  onClose: () => void
  userEmail?: string | null
  momentumNotifications: MomentumNotification[]
  crossNotifications: MovingAverageCrossNotification[]
  signalNotifications?: SignalNotification[]
  divergenceNotifications?: DivergenceNotification[]
  fundingNotifications?: FundingRateNotification[]
  regimeNotifications?: RegimeChangeNotification[]
  volatilityNotifications?: VolatilityBreakoutNotification[]
  correlationNotifications?: CorrelationBreakdownNotification[]
  customNotifications?: CustomNotification[]
  readIds: Set<string>
  onCreateCustom: (notif: CustomNotification) => void
  onEditCustom: (id: string, updates: { title: string; body: string; symbol: string }) => void
  onDeleteNotification: (id: string, type: UnifiedNotification['type']) => void
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const TYPE_LABELS: Record<UnifiedNotification['type'], string> = {
  momentum: 'Momentum',
  cross: 'MA Cross',
  signal: 'Signal',
  divergence: 'Divergence',
  funding: 'Funding',
  regime: 'Regime',
  volatility: 'Volatility',
  correlation: 'Correlation',
  custom: 'Custom',
}

export function NotificationsManager({
  open,
  onClose,
  userEmail,
  momentumNotifications,
  crossNotifications,
  signalNotifications = [],
  divergenceNotifications = [],
  fundingNotifications = [],
  regimeNotifications = [],
  volatilityNotifications = [],
  correlationNotifications = [],
  customNotifications = [],
  readIds,
  onCreateCustom,
  onEditCustom,
  onDeleteNotification,
}: Props) {
  const [tab, setTab] = useState<ManagerTab>('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [createSymbol, setCreateSymbol] = useState<string>('BTCUSDT')
  const [createTitle, setCreateTitle] = useState('')
  const [createBody, setCreateBody] = useState('')

  const [editSymbol, setEditSymbol] = useState<string>('BTCUSDT')
  const [editTitle, setEditTitle] = useState('')
  const [editBody, setEditBody] = useState('')

  if (!open) return null

  const allItems = unify(
    momentumNotifications,
    crossNotifications,
    signalNotifications,
    divergenceNotifications,
    fundingNotifications,
    regimeNotifications,
    volatilityNotifications,
    correlationNotifications,
    customNotifications,
  )

  const filteredItems =
    tab === 'all' ? allItems :
    tab === 'custom' ? allItems.filter(i => i.type === 'custom') :
    allItems.filter(i => i.type !== 'custom')

  const unreadCount = allItems.filter(i => !readIds.has(i.id)).length

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createTitle.trim()) return
    onCreateCustom({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      symbol: createSymbol,
      title: createTitle.trim(),
      body: createBody.trim(),
      triggeredAt: Date.now(),
    })
    setCreateTitle('')
    setCreateBody('')
    setShowCreateForm(false)
  }

  const startEdit = (item: UnifiedNotification) => {
    setEditingId(item.id)
    setEditTitle(item.title)
    setEditBody(item.body)
    setEditSymbol(item.symbol)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTitle.trim() || !editingId) return
    onEditCustom(editingId, { title: editTitle.trim(), body: editBody.trim(), symbol: editSymbol })
    setEditingId(null)
  }

  const TABS: { key: ManagerTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: allItems.length },
    { key: 'custom', label: 'Custom', count: allItems.filter(i => i.type === 'custom').length },
    { key: 'system', label: 'System', count: allItems.filter(i => i.type !== 'custom').length },
  ]

  return (
    <>
      <div className="fixed inset-0 z-[199] bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-[92vw] max-w-[620px] max-h-[85vh] bg-card border border-white/10 shadow-2xl shadow-black/50 rounded-xl overflow-hidden flex flex-col">

        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold leading-none">Notifications Manager</h2>
              {userEmail && (
                <p className="text-[10px] text-muted-foreground mt-0.5 truncate max-w-[220px]">{userEmail}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowCreateForm(v => !v); setEditingId(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                showCreateForm
                  ? 'bg-primary/20 text-primary border-primary/30'
                  : 'bg-white/5 text-muted-foreground hover:text-foreground border-white/10 hover:border-white/20'
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <form onSubmit={handleCreate} className="px-5 py-3 bg-black/20 border-b border-white/5 space-y-2.5 shrink-0">
            <p className="text-xs font-medium text-primary">New Custom Notification</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Symbol</label>
                <select
                  value={createSymbol}
                  onChange={e => setCreateSymbol(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                >
                  {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground block mb-1">Title *</label>
                <input
                  type="text"
                  value={createTitle}
                  onChange={e => setCreateTitle(e.target.value)}
                  placeholder="Notification title"
                  maxLength={80}
                  required
                  className="w-full bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Details</label>
              <input
                type="text"
                value={createBody}
                onChange={e => setCreateBody(e.target.value)}
                placeholder="Optional description"
                maxLength={160}
                className="w-full bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setCreateTitle(''); setCreateBody('') }}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!createTitle.trim()}
                className="px-4 py-1.5 text-xs bg-primary/20 text-primary border border-primary/30 rounded-md hover:bg-primary/30 transition-colors disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </form>
        )}

        {/* Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-white/5 flex gap-1 shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === t.key
                  ? 'bg-primary/20 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[10px] opacity-60">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Notification List */}
        <div className="overflow-y-auto flex-1">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-3xl mb-3 opacity-30">📋</div>
              <p className="text-sm text-muted-foreground">No notifications</p>
              {tab === 'custom' && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-3 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Create your first custom notification
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filteredItems.map(item => {
                const isRead = readIds.has(item.id)
                const isEditing = editingId === item.id
                const isCustom = item.type === 'custom'

                return (
                  <div key={item.id}>
                    {isEditing ? (
                      <form onSubmit={handleSaveEdit} className="px-5 py-3 bg-black/20 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit Notification
                          </p>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-1">Symbol</label>
                            <select
                              value={editSymbol}
                              onChange={e => setEditSymbol(e.target.value)}
                              className="w-full bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
                            >
                              {SYMBOLS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground block mb-1">Title *</label>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              maxLength={80}
                              required
                              className="w-full bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground block mb-1">Details</label>
                          <input
                            type="text"
                            value={editBody}
                            onChange={e => setEditBody(e.target.value)}
                            maxLength={160}
                            className="w-full bg-black/30 border border-white/10 rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="submit"
                            disabled={!editTitle.trim()}
                            className="px-4 py-1.5 text-xs bg-primary/20 text-primary border border-primary/30 rounded-md hover:bg-primary/30 transition-colors disabled:opacity-40"
                          >
                            Save Changes
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className={`group flex items-start gap-3 px-5 py-3 hover:bg-white/[0.03] transition-colors border-l-4 ${item.accentClass} ${isRead ? 'opacity-50' : ''}`}>
                        <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className={`text-xs font-medium truncate ${isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {item.title}
                            </span>
                            {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                          </div>
                          {item.body && (
                            <p className="text-[11px] text-muted-foreground truncate">{item.body}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground/60 bg-white/5 px-1.5 py-0.5 rounded">{item.symbol}</span>
                            <span className="text-[10px] text-muted-foreground/60">{relativeTime(item.triggeredAt)}</span>
                            <span className="text-[10px] text-muted-foreground/40">{TYPE_LABELS[item.type]}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5">
                          {isCustom && (
                            <button
                              onClick={() => startEdit(item)}
                              className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-primary transition-colors"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => onDeleteNotification(item.id, item.type)}
                            className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-white/5 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {allItems.length} total · {unreadCount} unread
          </span>
          <span className="text-[10px] text-muted-foreground/50">
            {allItems.filter(i => i.type === 'custom').length} custom · {allItems.filter(i => i.type !== 'custom').length} system
          </span>
        </div>
      </div>
    </>
  )
}
