import React from 'react'

interface MainLayoutProps {
  children: React.ReactNode
  onNotificationClick?: () => void
}

export function MainLayout({ children, onNotificationClick }: MainLayoutProps) {
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
        {onNotificationClick && (
          <button
            onClick={onNotificationClick}
            className="ml-auto p-2 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            title="Notification Settings"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {children}
      </main>
    </div>
  )
}
