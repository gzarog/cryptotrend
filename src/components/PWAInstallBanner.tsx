import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('pwa-banner-dismissed') === '1')
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // Detect iOS Safari (no beforeinstallprompt support)
    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream
    const standalone = (navigator as any).standalone === true
    setIsIOS(ios && !standalone)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setDeferredPrompt(null)
    handleDismiss()
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('pwa-banner-dismissed', '1')
  }

  if (dismissed) return null
  if (!deferredPrompt && !isIOS) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-4 duration-500">
      <div className="relative rounded-2xl border border-primary/20 bg-card/95 backdrop-blur-xl p-4 shadow-2xl shadow-primary/10">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <svg className="w-6 h-6 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Install CryptoTrendNotify</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isIOS
                ? 'Tap the Share button, then "Add to Home Screen"'
                : 'Get instant alerts on your home screen'}
            </p>
          </div>
        </div>

        {!isIOS && (
          <button
            onClick={handleInstall}
            className="mt-3 w-full py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Install App
          </button>
        )}
      </div>
    </div>
  )
}
