import React, { useEffect, useState } from 'react'
import { NotificationPanel } from '../components/NotificationPanel'
import { EmailNotificationSettings } from '../components/EmailNotificationSettings'
import type { MomentumNotification, MovingAverageCrossNotification, SignalNotification, DivergenceNotification, FundingRateNotification, RegimeChangeNotification, VolatilityBreakoutNotification, CorrelationBreakdownNotification } from '../types/app'

interface MainLayoutProps {
  children: React.ReactNode
  onNotificationClick?: () => void
  showNotifPanel?: boolean
  onToggleNotifPanel?: () => void
  onCloseNotifPanel?: () => void
  momentumNotifications?: MomentumNotification[]
  crossNotifications?: MovingAverageCrossNotification[]
  signalNotifications?: SignalNotification[]
  divergenceNotifications?: DivergenceNotification[]
  fundingNotifications?: FundingRateNotification[]
  regimeNotifications?: RegimeChangeNotification[]
  volatilityNotifications?: VolatilityBreakoutNotification[]
  correlationNotifications?: CorrelationBreakdownNotification[]
  readNotifIds?: Set<string>
  onMarkRead?: (id: string) => void
  onMarkAllRead?: () => void
  onClearAllNotifs?: () => void
  unreadCount?: number
}

export function MainLayout({
  children,
  onNotificationClick,
  showNotifPanel,
  onToggleNotifPanel,
  onCloseNotifPanel,
  momentumNotifications = [],
  crossNotifications = [],
  signalNotifications = [],
  divergenceNotifications = [],
  fundingNotifications = [],
  regimeNotifications = [],
  volatilityNotifications = [],
  correlationNotifications = [],
  readNotifIds = new Set(),
  onMarkRead,
  onMarkAllRead,
  onClearAllNotifs,
  unreadCount = 0,
}: MainLayoutProps) {
  // Cloudflare Access: surface the signed-in email + a logout link when the app
  // is served behind Access. Outside Access (e.g. local dev) /api/me returns
  // { email: null } and this renders nothing.
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [showEmailSettings, setShowEmailSettings] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { email?: string | null } | null) => {
        if (!cancelled && data?.email) setUserEmail(data.email)
      })
      .catch(() => {
        /* not behind Access / offline — ignore */
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans selection:bg-primary/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-glow-purple mix-blend-screen animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-glow-cyan mix-blend-screen animate-pulse-slow" style={{ animationDelay: '3s' }} />
      </div>

      {/* Glass Header */}
      <header className="fixed top-0 left-0 right-0 h-16 z-50 border-b border-white/5 bg-background/70 backdrop-blur-md flex items-center px-4 sm:px-6 lg:px-8 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
            <svg className="w-5 h-5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gradient tracking-tight">
            CryptoTrend<span className="font-extrabold text-primary">Notify</span>
          </h1>
        </div>

        {/* Signed-in user (Cloudflare Access) */}
        {userEmail && (
          <div className="ml-auto mr-2 flex items-center gap-2">
            <span
              className="hidden sm:inline text-xs text-muted-foreground max-w-[180px] truncate"
              title={userEmail}
            >
              {userEmail}
            </span>
            <a
              href="/cdn-cgi/access/logout"
              className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
              title="Sign out"
            >
              Logout
            </a>
          </div>
        )}

        {/* Bell with panel */}
        <div className={`${userEmail ? '' : 'ml-auto '}relative`}>
          <button
            onClick={onToggleNotifPanel}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground relative"
            title="Notifications"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full leading-none px-1">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationPanel
            open={!!showNotifPanel}
            onClose={() => onCloseNotifPanel?.()}
            momentumNotifications={momentumNotifications}
            crossNotifications={crossNotifications}
            signalNotifications={signalNotifications}
            divergenceNotifications={divergenceNotifications}
            fundingNotifications={fundingNotifications}
            regimeNotifications={regimeNotifications}
            volatilityNotifications={volatilityNotifications}
            correlationNotifications={correlationNotifications}
            readIds={readNotifIds}
            onMarkRead={(id) => onMarkRead?.(id)}
            onMarkAllRead={() => onMarkAllRead?.()}
            onClearAll={() => onClearAllNotifs?.()}
            onSettingsClick={() => {
              onCloseNotifPanel?.()
              setShowEmailSettings(true)
              onNotificationClick?.()
            }}
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {children}
      </main>

      <EmailNotificationSettings
        open={showEmailSettings}
        onClose={() => setShowEmailSettings(false)}
      />
    </div>
  )
}
