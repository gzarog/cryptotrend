import { useEffect, useRef } from 'react'
import type { MomentumNotification, MovingAverageCrossNotification, QuantumPhaseNotification } from '../types/app'

type UnifiedNotification = {
  id: string
  type: 'momentum' | 'cross' | 'quantum'
  title: string
  body: string
  triggeredAt: number
  accentClass: string
  icon: string
}

type Props = {
  open: boolean
  onClose: () => void
  momentumNotifications: MomentumNotification[]
  crossNotifications: MovingAverageCrossNotification[]
  quantumNotifications: QuantumPhaseNotification[]
  readIds: Set<string>
  onMarkAllRead: () => void
  onSettingsClick: () => void
}

function unify(
  momentum: MomentumNotification[],
  cross: MovingAverageCrossNotification[],
  quantum: QuantumPhaseNotification[]
): UnifiedNotification[] {
  const items: UnifiedNotification[] = []

  for (const n of momentum) {
    items.push({
      id: n.id,
      type: 'momentum',
      title: n.label,
      body: `${n.timeframeSummary} • RSI: ${n.rsiSummary} • Stoch: ${n.stochasticSummary}`,
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
      triggeredAt: n.triggeredAt,
      accentClass: n.direction === 'golden' ? 'border-l-yellow-500' : 'border-l-purple-500',
      icon: n.direction === 'golden' ? '🟡' : '🟣',
    })
  }

  for (const n of quantum) {
    items.push({
      id: n.id,
      type: 'quantum',
      title: `${n.phaseLabel} Phase`,
      body: `${n.direction} • ${(n.confidence * 100).toFixed(0)}% confidence`,
      triggeredAt: n.triggeredAt,
      accentClass: n.direction === 'bullish' ? 'border-l-green-500' : n.direction === 'bearish' ? 'border-l-red-500' : 'border-l-gray-500',
      icon: '⚛',
    })
  }

  return items.sort((a, b) => b.triggeredAt - a.triggeredAt)
}

const TIME_FORMAT = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

export function NotificationPanel({
  open,
  onClose,
  momentumNotifications,
  crossNotifications,
  quantumNotifications,
  readIds,
  onMarkAllRead,
  onSettingsClick,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // Delay to avoid immediate close from the same click
    const timer = setTimeout(() => document.addEventListener('mousedown', handler), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handler)
    }
  }, [open, onClose])

  if (!open) return null

  const items = unify(momentumNotifications, crossNotifications, quantumNotifications)
  const unreadCount = items.filter(i => !readIds.has(i.id)).length

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-2 w-80 sm:w-96 max-h-[70vh] bg-card border border-white/10 shadow-2xl shadow-black/50 rounded-xl overflow-hidden z-[200] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            >
              Mark all read
            </button>
          )}
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

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <p>No notifications yet</p>
            <p className="text-xs mt-1">Alerts will appear here when signals trigger</p>
          </div>
        ) : (
          items.map(item => {
            const isRead = readIds.has(item.id)
            return (
              <div
                key={item.id}
                className={`px-4 py-3 border-b border-white/5 border-l-4 ${item.accentClass} transition-colors ${
                  isRead ? 'opacity-60' : 'bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm shrink-0">{item.icon}</span>
                    <span className={`text-xs font-medium truncate ${isRead ? 'text-muted-foreground' : 'text-foreground'}`}>
                      {item.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {TIME_FORMAT.format(new Date(item.triggeredAt))}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 ml-5">
                  {item.body}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
