import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope & typeof globalThis

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// NetworkFirst for API calls (mirrors previous workbox config)
registerRoute(
  ({ url }) => url.origin.startsWith('https://api.'),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 5 })
)

// Offline fallback for navigation (exclude OAuth routes)
registerRoute(
  new NavigationRoute(
    new NetworkFirst({ cacheName: 'pages' }),
    { denylist: [/^\/~oauth/] }
  )
)

// ─── Web Push ────────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return
  const data = event.data.json() as {
    title?: string
    body?: string
    icon?: string
    badge?: string
    tag?: string
    url?: string
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'CryptoTrend Alert', {
      body: data.body,
      icon: data.icon ?? '/pwa-192x192.png',
      badge: data.badge ?? '/pwa-192x192.png',
      tag: data.tag ?? 'crypto-alert',
      renotify: true,
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl: string = (event.notification.data as { url: string })?.url ?? '/'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) => c.url.startsWith(self.location.origin))
        if (existing) {
          existing.navigate(targetUrl)
          return existing.focus()
        }
        return self.clients.openWindow(targetUrl)
      })
  )
})
