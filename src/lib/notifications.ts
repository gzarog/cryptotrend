/**
 * Client-side notification helpers.
 * Push notification server features are stubbed since this is a frontend-only build.
 */

import type { NotificationPriority } from '../types/app'

export type AppNotification = {
  id: string
  title: string
  body: string
  timestamp: number
  type: 'momentum' | 'cross' | 'signal' | 'divergence' | 'funding' | 'system'
  priority: NotificationPriority
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

// ─── Sound Alerts via Web Audio API ─────────────────────────────────────────

let soundEnabled = true

export function setSoundEnabled(enabled: boolean): void {
  soundEnabled = enabled
  localStorage.setItem('notif-sound-enabled', JSON.stringify(enabled))
}

export function getSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem('notif-sound-enabled')
    if (stored !== null) soundEnabled = JSON.parse(stored)
  } catch { /* ignore */ }
  return soundEnabled
}

export function playNotificationSound(priority: NotificationPriority): void {
  if (!getSoundEnabled()) return

  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const config = {
      critical: { freq: 880, duration: 0.15, repeats: 3, gap: 0.1 },
      high: { freq: 660, duration: 0.15, repeats: 2, gap: 0.12 },
      medium: { freq: 440, duration: 0.12, repeats: 1, gap: 0 },
      low: { freq: 330, duration: 0.1, repeats: 1, gap: 0 },
    }[priority]

    for (let r = 0; r < config.repeats; r++) {
      const startTime = ctx.currentTime + r * (config.duration + config.gap)
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = config.freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.25, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + config.duration)
      osc.start(startTime)
      osc.stop(startTime + config.duration)
    }
  } catch { /* Web Audio not available */ }
}

// ─── Timeframe-Aware Cooldowns ──────────────────────────────────────────────

export const COOLDOWN_MS: Record<string, number> = {
  '5': 5 * 60 * 1000,
  '15': 15 * 60 * 1000,
  '30': 30 * 60 * 1000,
  '60': 60 * 60 * 1000,
  '120': 120 * 60 * 1000,
  '240': 240 * 60 * 1000,
  '360': 360 * 60 * 1000,
}

export function getCooldown(timeframe: string): number {
  return COOLDOWN_MS[timeframe] ?? 60000
}

// ─── Notification Priority ──────────────────────────────────────────────────

export function getTimeframePriority(timeframe: string): NotificationPriority {
  const tf = parseInt(timeframe)
  if (tf >= 240) return 'high'
  if (tf >= 60) return 'medium'
  return 'low'
}
