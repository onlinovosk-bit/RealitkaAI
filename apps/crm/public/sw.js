// ================================================================
// Revolis.AI Service Worker — Web Push handler
// Registered from: src/app/layout.tsx or sw-register.ts
// ================================================================

self.addEventListener('push', event => {
  if (!event.data) return

  let data
  try { data = event.data.json() }
  catch { data = { title: 'Revolis.AI', body: event.data.text() } }

  event.waitUntil(
    self.registration.showNotification(data.title || 'Revolis.AI', {
      body:    data.body,
      icon:    data.icon    || '/icons/revolis-192.png',
      badge:   data.badge   || '/icons/revolis-badge-72.png',
      tag:     data.tag     || 'revolis-brief',
      data:    data.data    || {},
      actions: data.actions || [],
      requireInteraction: data.data?.urgency === 'high',
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()

  const action = event.action
  const url    = event.notification.data?.url || '/'

  if (action === 'dismiss') return

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        const existing = windowClients.find(c => c.url.includes('app.revolis.ai'))
        if (existing) return existing.focus()
        return clients.openWindow(url)
      })
  )
})

// Minimal install/activate
self.addEventListener('install',  () => self.skipWaiting())
self.addEventListener('activate', e  => e.waitUntil(clients.claim()))
