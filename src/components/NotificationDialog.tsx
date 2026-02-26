import { useState } from 'react'
import { requestNotificationPermission, getNotificationPermission } from '../lib/notifications'

type Props = {
  open: boolean
  onClose: () => void
}

export function NotificationDialog({ open, onClose }: Props) {
  const [permission, setPermission] = useState(getNotificationPermission())
  const [isRequesting, setIsRequesting] = useState(false)

  const handleRequest = async () => {
    setIsRequesting(true)
    try {
      const result = await requestNotificationPermission()
      setPermission(result)
    } finally {
      setIsRequesting(false)
    }
  }

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
            {permission === 'granted' ? 'Enabled' :
             permission === 'denied' ? 'Blocked' :
             'Not Set'}
          </span>
        </div>

        {permission === 'denied' && (
          <p className="text-xs text-red-400">
            Notifications are blocked. Please update your browser settings to allow notifications for this site.
          </p>
        )}

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
          {permission !== 'granted' && permission !== 'denied' && (
            <button
              onClick={handleRequest}
              disabled={isRequesting}
              className="px-3 py-1.5 text-sm bg-primary/20 text-primary border border-primary/30 rounded hover:bg-primary/30 transition-colors disabled:opacity-50"
            >
              {isRequesting ? 'Requesting…' : 'Enable Notifications'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
