/**
 * Client-side notification helpers.
 * Push notification server features are stubbed since this is a frontend-only build.
 */

export type AppNotification = {
  id: string
  title: string
  body: string
  timestamp: number
  type: 'momentum' | 'cross' | 'quantum' | 'system'
  read: boolean
}

let notificationId = 0

export function createNotificationId(): string {
  return `notif-${Date.now()}-${++notificationId}`
}

export function showBrowserNotification(title: string, body: string): void {
  if (!('Notification' in window)) return

  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' })
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied'

  if (Notification.permission === 'granted') return 'granted'
  if (Notification.permission === 'denied') return 'denied'

  return await Notification.requestPermission()
}

export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

// ─── Push Subscription Stubs ────────────────────────────────────────────────

export type PushSubscriptionState = {
  isSupported: boolean
  isSubscribed: boolean
  permission: NotificationPermission
}

export function getPushSubscriptionState(): PushSubscriptionState {
  return {
    isSupported: 'Notification' in window && 'serviceWorker' in navigator,
    isSubscribed: false,
    permission: getNotificationPermission(),
  }
}

export async function subscribeToPush(): Promise<boolean> {
  // Stub: would connect to push server in full implementation
  const permission = await requestNotificationPermission()
  return permission === 'granted'
}

export async function unsubscribeFromPush(): Promise<boolean> {
  // Stub: would disconnect from push server
  return true
}
