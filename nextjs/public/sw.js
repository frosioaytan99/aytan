self.addEventListener('push', event => {
  let payload = {}
  try { payload = event.data ? event.data.json() : {} } catch {}
  const title = payload.title || 'Nouveau message sur Weshbien2'
  const options = {
    body: payload.body || 'Tu as reçu un nouveau message.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.tag || 'weshbien-message',
    renotify: true,
    data: { url: payload.url || '/inbox' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const target = new URL(event.notification.data?.url || '/inbox', self.location.origin).href
  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.focus()
        if ('navigate' in client) await client.navigate(target)
        return
      }
    }
    await clients.openWindow(target)
  })())
})
