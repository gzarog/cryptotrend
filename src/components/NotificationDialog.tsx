import { useEffect, useState } from 'react'
import {
  requestNotificationPermission,
  getNotificationPermission,
  getSoundEnabled,
  setSoundEnabled,
  subscribeToPush,
  sendSubscriptionToServer,
  unsubscribeFromPush,
  getPushSubscription,
} from '../lib/notifications'

type Props = {
  open: boolean
  onClose: () => void
}

export function NotificationDialog({ open, onClose }: Props) {
  const [permission, setPermission] = useState(getNotificationPermission)
  const [soundOn, setSoundOn] = useState(getSoundEnabled)
  const [isRequesting, setIsRequesting] = useState(false)
  const [pushSupported] = useState(() => 'serviceWorker' in navigator && 'PushManager' in window)
  const [pushSubscribed, setPushSubscribed] = useState(false)
  const [pushLoading, setPushLoading] = useState(false)
  const [pushError, setPushError] = useState<string | null>(null)

  // Check if already subscribed on mount
  useEffect(() => {
    if (!open || !pushSupported) return
    getPushSubscription().then((sub) => setPushSubscribed(!!sub))
  }, [open, pushSupported])

  if (!open) return null

  const isSupported = 'Notification' in window

  const handleRequestPermission = async () => {
    setIsRequesting(true)
    try {
      const result = await requestNotificationPermission()
      setPermission(result)
    } finally {
      setIsRequesting(false)
    }
  }

  const handleSoundToggle = () => {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
  }

  const handlePushToggle = async () => {
    setPushError(null)
    setPushLoading(true)
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush()
        setPushSubscribed(false)
      } else {
        // Ensure browser notifications are permitted first
        let perm = permission
        if (perm !== 'granted') {
          perm = await requestNotificationPermission()
          setPermission(perm)
        }
        if (perm !== 'granted') {
          setPushError('Browser notification permission is required for push notifications.')
          return
        }
        const sub = await subscribeToPush()
        if (!sub) {
          setPushError('Push notifications are not supported on this device/browser.')
          return
        }
        await sendSubscriptionToServer(sub)
        setPushSubscribed(true)
      }
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Failed to update push subscription.')
    } finally {
      setPushLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative glass-panel p-6 max-w-md w-full mx-4 space-y-4">
        <h2 className="text-lg font-semibold">Notification Settings</h2>

        {/* Browser Notifications */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Browser Notifications:</span>
            <span className={
              permission === 'granted' ? 'text-green-400' :
              permission === 'denied' ? 'text-red-400' :
              'text-yellow-400'
            }>
              {permission === 'granted' ? 'Enabled' : permission === 'denied' ? 'Blocked' : 'Not Set'}
            </span>
          </div>
          {isSupported && permission !== 'granted' && permission !== 'denied' && (
            <button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              className="px-3 py-1.5 text-sm bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              {isRequesting ? 'Requesting...' : 'Enable'}
            </button>
          )}
        </div>

        {!isSupported && (
          <p className="text-xs text-red-400">Your browser does not support notifications.</p>
        )}

        {permission === 'denied' && (
          <p className="text-xs text-red-400">
            Notifications are blocked. Update your browser settings to allow notifications for this site.
          </p>
        )}

        {/* Push Notifications (installed PWA / background) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm text-muted-foreground">Push Notifications</span>
              <p className="text-xs text-muted-foreground/70">
                {pushSupported
                  ? 'Receive alerts even when the app is closed'
                  : 'Not supported on this browser'}
              </p>
            </div>
            {pushSupported && (
              <button
                onClick={handlePushToggle}
                disabled={pushLoading || !isSupported}
                className={`px-3 py-1 text-xs rounded transition-colors disabled:opacity-50 ${
                  pushSubscribed
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-muted-foreground border border-white/10'
                }`}
              >
                {pushLoading ? '...' : pushSubscribed ? 'ON' : 'OFF'}
              </button>
            )}
          </div>
          {pushError && (
            <p className="text-xs text-red-400">{pushError}</p>
          )}
        </div>

        {/* Sound Alerts */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Sound Alerts</span>
          <button
            onClick={handleSoundToggle}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              soundOn
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-white/5 text-muted-foreground border border-white/10'
            }`}
          >
            {soundOn ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="space-y-2 text-xs text-muted-foreground border-t border-white/5 pt-4">
          <p className="font-medium text-foreground text-sm">Active alert types:</p>
          <ul className="space-y-1.5 ml-2">
            <li>📈📉 <span className="text-foreground">Signal Confluence</span> — 3+ timeframes aligned in same direction</li>
            <li>🔵🔻 <span className="text-foreground">Divergence</span> — RSI/MACD price divergence on higher TFs</li>
            <li>💰 <span className="text-foreground">Funding Rate</span> — Extreme funding rate alerts (|rate| ≥ 0.05%)</li>
            <li>🔄 <span className="text-foreground">Regime Change</span> — Hurst exponent regime transitions</li>
            <li>⚡ <span className="text-foreground">Volatility Spike</span> — Volatility percentile breakout above 80%</li>
            <li>🔗 <span className="text-foreground">Correlation Breakdown</span> — BTC/ETH correlation drop below 0.3</li>
            <li>🟢🔴 <span className="text-foreground">Momentum</span> — RSI & Stochastic extremes (1H+ only)</li>
            <li>🟡🟣 <span className="text-foreground">MA Cross</span> — EMA 10/50 golden & death crosses (1H+ only)</li>
          </ul>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
