import { usePushNotifications } from '../hooks/usePushNotifications'

type Props = {
  open: boolean
  onClose: () => void
}

export function NotificationDialog({ open, onClose }: Props) {
  const { isSupported, isSubscribed, permission, isLoading, subscribe, unsubscribe } = usePushNotifications()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative glass-panel p-6 max-w-md w-full mx-4 space-y-4">
        <h2 className="text-lg font-semibold">Push Notifications</h2>

        <p className="text-sm text-muted-foreground">
          Enable browser notifications to receive alerts for momentum signals, moving average crosses, and quantum phase changes.
        </p>

        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status:</span>
          <span className={
            permission === 'granted' ? 'text-green-400' :
            permission === 'denied' ? 'text-red-400' :
            'text-yellow-400'
          }>
            {permission === 'granted'
              ? (isSubscribed ? 'Active' : 'Enabled')
              : permission === 'denied' ? 'Blocked'
              : 'Not Set'}
          </span>
        </div>

        {!isSupported && (
          <p className="text-xs text-red-400">
            Your browser does not support notifications.
          </p>
        )}

        {permission === 'denied' && (
          <p className="text-xs text-red-400">
            Notifications are blocked. Please update your browser settings to allow notifications for this site.
          </p>
        )}

        <div className="space-y-2 text-xs text-muted-foreground">
          <p className="font-medium text-foreground text-sm">Alert types:</p>
          <ul className="space-y-1 ml-2">
            <li>🟢🔴 <span className="text-foreground">Momentum</span> — RSI & Stochastic extreme threshold crosses</li>
            <li>🟡🟣 <span className="text-foreground">MA Cross</span> — EMA 10/50 golden & death crosses</li>
            <li>⚛ <span className="text-foreground">Quantum Phase</span> — Phase transitions with confidence &gt; 30%</li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Note: Push notification server is not available in this frontend-only build. Browser notifications will work for in-app alerts only.
        </p>

        <div className="flex gap-2 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
          {isSupported && permission !== 'denied' && (
            isSubscribed || permission === 'granted' ? (
              <button
                onClick={unsubscribe}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-destructive/20 text-destructive border border-destructive/30 rounded hover:bg-destructive/30 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Processing…' : 'Disable Notifications'}
              </button>
            ) : (
              <button
                onClick={subscribe}
                disabled={isLoading}
                className="px-3 py-1.5 text-sm bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/30 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Requesting…' : 'Enable Notifications'}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  )
}
