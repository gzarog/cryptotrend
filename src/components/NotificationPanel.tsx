import { useState, useEffect, useRef } from 'react'
import type { MomentumNotification, MovingAverageCrossNotification, SignalNotification, DivergenceNotification, FundingRateNotification, RegimeChangeNotification, VolatilityBreakoutNotification, CorrelationBreakdownNotification, CustomNotification } from '../types/app'
import { SYMBOLS } from '../constants/market'

export type UnifiedNotification = {
  id: string
  type: 'momentum' | 'cross' | 'signal' | 'divergence' | 'funding' | 'regime' | 'volatility' | 'correlation' | 'custom'
  title: string
  body: string
  symbol: string
  triggeredAt: number
  accentClass: string
  icon: string
  priority?: string
}

type FilterType = 'all' | 'signal' | 'divergence' | 'market' | 'momentum' | 'cross' | 'custom'

type Props = {
  open: boolean
  onClose: () => void
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
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  onClearAll: () => void
  onSettingsClick: () => void
  onDeleteNotification: (id: string, type: UnifiedNotification['type']) => void
  onAddCustomNotification: (notif: CustomNotification) => void
}

const MARKET_TYPES = new Set(['funding', 'regime', 'volatility', 'correlation'])

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
    items.push({
      id: n.id,
      type: 'momentum',
      title: n.label,
      body: `${n.timeframeSummary} • RSI: ${n.rsiSummary} • Stoch: ${n.stochasticSummary}`,
      symbol: n.symbol,
      triggeredAt: n.triggeredAt,
      accentClass: n.direction === 'long' ? 'border-l-green-500' : 'border-l-red-500',
      icon: n.direction === 'long' ? '🟢' : '🔴',
    })
  }

  for (const n of cross) {
    items.push({
      id: n.id,
      type: 'cross',
      title: `${n.direction === 'golden' ? 'Golden' : 'Death'} Cross — ${n.pairLabel}`,
      body: `${n.timeframeLabel} • $${n.price.toLocaleString()}`,
      symbol: n.symbol,
      triggeredAt: n.triggeredAt,
      accentClass: n.direction === 'golden' ? 'border-l-yellow-500' : 'border-l-purple-500',
      icon: n.direction === 'golden' ? '🟡' : '🟣',
    })
  }

  for (const n of signals) {
    items.push({
      id: n.id,
      type: 'signal',
      title: `${n.confluenceCount}-TF ${n.direction.toUpperCase()} Confluence`,
      body: `${n.timeframes.join(', ')} • Avg: ${(n.avgConfidence * 100).toFixed(0)}%`,
      symbol: n.symbol,
      triggeredAt: n.triggeredAt,
      accentClass: n.direction === 'long' ? 'border-l-emerald-500' : 'border-l-orange-500',
      icon: n.direction === 'long' ? '📈' : '📉',
      priority: n.priority,
    })
  }

  for (const n of divergences) {
    items.push({
      id: n.id,
      type: 'divergence',
      title: `${n.variant.charAt(0).toUpperCase() + n.variant.slice(1)} ${n.divergenceType} divergence`,
      body: `${n.timeframeLabel} • ${n.indicator.replace('divergence-', '').toUpperCase()}`,
      symbol: n.symbol,
      triggeredAt: n.triggeredAt,
      accentClass: n.divergenceType === 'bullish' ? 'border-l-cyan-500' : 'border-l-pink-500',
      icon: n.divergenceType === 'bullish' ? '🔵' : '🔻',
      priority: n.priority,
    })
  }

  for (const n of funding) {
    const dirLabel = n.direction === 'longs_paying' ? 'Longs paying' : 'Shorts paying'
    items.push({
      id: n.id,
      type: 'funding',
      title: `Extreme Funding — ${dirLabel}`,
      body: `Rate: ${(n.rate * 100).toFixed(4)}%`,
      symbol: n.symbol,
      triggeredAt: n.triggeredAt,
      accentClass: 'border-l-amber-500',
      icon: '💰',
      priority: n.priority,
    })
  }

  for (const n of regime) {
    items.push({
      id: n.id,
      type: 'regime',
      title: `Regime: ${n.fromRegime} → ${n.toRegime}`,
      body: `Hurst: ${n.hurstValue.toFixed(3)}`,
      symbol: n.symbol,
      triggeredAt: n.triggeredAt,
      accentClass: n.toRegime === 'trending' ? 'border-l-blue-500' :
                   n.toRegime === 'mean-reverting' ? 'border-l-amber-500' : 'border-l-gray-500',
      icon: '🔄',
      priority: n.priority,
    })
  }

  for (const n of volatility) {
    items.push({
      id: n.id,
      type: 'volatility',
      title: 'Volatility Spike',
      body: `Percentile: ${n.volatilityPercentile.toFixed(0)}%`,
      symbol: n.symbol,
      triggeredAt: n.triggeredAt,
      accentClass: 'border-l-rose-500',
      icon: '⚡',
      priority: n.priority,
    })
  }

  for (const n of correlation) {
    items.push({
      id: n.id,
      type: 'correlation',
      title: `${n.asset} Decoupled`,
      body: `Correlation: ${n.correlation.toFixed(3)} (was ${n.previousCorrelation.toFixed(3)})`,
      symbol: n.symbol,
      triggeredAt: n.triggeredAt,
      accentClass: 'border-l-red-500',
      icon: '🔗',
      priority: n.priority,
    })
  }

  for (const n of custom) {
    items.push({
      id: n.id,
      type: 'custom',
      title: n.title,
      body: n.body,
      symbol: n.symbol,
      triggeredAt: n.triggeredAt,
      accentClass: 'border-l-violet-500',
      icon: '📌',
    })
  }

  return items.sort((a, b) => b.triggeredAt - a.triggeredAt)
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const FILTER_TABS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'signal', label: 'Signal' },
  { key: 'divergence', label: 'Diverg.' },
  { key: 'market', label: 'Market' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'cross', label: 'MA Cross' },
  { key: 'custom', label: 'Custom' },
]

export function NotificationPanel({
  open,
  onClose,
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
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onSettingsClick,
  onDeleteNotification,
  onAddCustomNotification,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [filter, setFilter] = useState<FilterType>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [addSymbol, setAddSymbol] = useState('BTCUSDT')
  const [addTitle, setAddTitle] = useState('')
  const [addBody, setAddBody] = useState('')

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, onClose])

  if (!open) return null

  const allItems = unify(momentumNotifications, crossNotifications, signalNotifications, divergenceNotifications, fundingNotifications, regimeNotifications, volatilityNotifications, correlationNotifications, customNotifications)
  const filteredItems = filter === 'all' ? allItems :
    filter === 'market' ? allItems.filter(i => MARKET_TYPES.has(i.type)) :
    allItems.filter(i => i.type === filter)
  const unreadCount = allItems.filter(i => !readIds.has(i.id)).length

  const countByType: Record<FilterType, number> = {
    all: allItems.length,
    signal: allItems.filter(i => i.type === 'signal').length,
    divergence: allItems.filter(i => i.type === 'divergence').length,
    market: allItems.filter(i => MARKET_TYPES.has(i.type)).length,
    momentum: allItems.filter(i => i.type === 'momentum').length,
    cross: allItems.filter(i => i.type === 'cross').length,
    custom: allItems.filter(i => i.type === 'custom').length,
  }

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!addTitle.trim()) return
    onAddCustomNotification({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      symbol: addSymbol,
      title: addTitle.trim(),
      body: addBody.trim(),
      triggeredAt: Date.now(),
    })
    setAddTitle('')
    setAddBody('')
    setShowAddForm(false)
  }

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 w-80 sm:w-[420px] max-h-[75vh] bg-card border border-white/10 shadow-2xl shadow-black/50 rounded-xl overflow-hidden z-[200] flex flex-col"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-[11px] text-primary hover:text-primary/80 transition-colors px-2 py-1 font-medium"
              >
                Read all
              </button>
            )}
            {allItems.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1"
              >
                Clear
              </button>
            )}
            {/* Add custom notification button */}
            <button
              onClick={() => setShowAddForm(v => !v)}
              className={`p-1.5 rounded-md transition-colors ${
                showAddForm
                  ? 'bg-primary/20 text-primary'
                  : 'hover:bg-white/10 text-muted-foreground hover:text-foreground'
              }`}
              title="Add custom notification"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button
              onClick={onSettingsClick}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
              title="Notification settings"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Add Custom Notification Form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="mb-2.5 p-3 bg-black/20 rounded-lg space-y-2 border border-white/5"
          >
            <p className="text-[11px] font-medium text-primary flex items-center gap-1">
              <span>📌</span> Add Custom Notification
            </p>
            <div className="flex gap-2">
              <select
                value={addSymbol}
                onChange={e => setAddSymbol(e.target.value)}
                className="flex-1 bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:border-primary/50"
              >
                {SYMBOLS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              placeholder="Title *"
              value={addTitle}
              onChange={e => setAddTitle(e.target.value)}
              maxLength={80}
              required
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
            <input
              type="text"
              placeholder="Details (optional)"
              value={addBody}
              onChange={e => setAddBody(e.target.value)}
              maxLength={160}
              className="w-full bg-black/30 border border-white/10 rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!addTitle.trim()}
                className="px-3 py-1 text-[11px] bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/30 transition-colors disabled:opacity-40"
              >
                Add
              </button>
            </div>
          </form>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-0.5 bg-black/20 rounded-lg p-0.5 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 px-1.5 py-1 rounded-md text-[10px] font-medium transition-all whitespace-nowrap ${
                filter === tab.key
                  ? 'bg-primary/20 text-primary shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              {tab.label}
              {countByType[tab.key] > 0 && (
                <span className="ml-0.5 text-[9px] opacity-60">({countByType[tab.key]})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <div className="overflow-y-auto flex-1">
        {filteredItems.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <div className="text-3xl mb-3 opacity-30">🔔</div>
            <p>{filter === 'all' ? 'No notifications yet' : `No ${filter} alerts`}</p>
            <p className="text-xs mt-1 opacity-70">Alerts will appear here when signals trigger</p>
          </div>
        ) : (
          filteredItems.map(item => {
            const isRead = readIds.has(item.id)
            return (
              <div
                key={item.id}
                className={`group relative w-full text-left px-4 py-3 border-b border-white/5 border-l-4 ${item.accentClass} transition-all hover:bg-white/[0.03] ${
                  isRead ? 'opacity-50' : ''
                }`}
              >
                <button
                  className="w-full text-left"
                  onClick={() => !isRead && onMarkRead(item.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {!isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                      <span className="text-sm shrink-0">{item.icon}</span>
                      <span className={`text-xs font-medium truncate ${isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                        {item.title}
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 gap-0.5 pr-5">
                      <span className="text-[10px] text-muted-foreground">
                        {relativeTime(item.triggeredAt)}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60">
                        {item.symbol}
                      </span>
                    </div>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isRead ? 'text-muted-foreground/60' : 'text-muted-foreground'} ${!isRead ? 'ml-[22px]' : 'ml-5'}`}>
                    {item.body}
                  </p>
                </button>

                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); onDeleteNotification(item.id, item.type) }}
                  className="absolute top-2.5 right-2.5 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/10 text-muted-foreground hover:text-destructive transition-all"
                  title="Delete notification"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Footer */}
      {allItems.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 text-center">
          <span className="text-[10px] text-muted-foreground">
            {allItems.length} total • {unreadCount} unread
          </span>
        </div>
      )}
    </div>
  )
}
