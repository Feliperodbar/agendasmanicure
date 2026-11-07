self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (error) {
    console.error('Notificação recebida com conteúdo inválido.', error);
    return;
  }
  if (typeof payload.title !== 'string' || typeof payload.body !== 'string') return;
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') && !payload.url.startsWith('//')
    ? payload.url : '/';
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: { url },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || '/', self.location.origin);
  event.waitUntil(self.clients.openWindow(url.origin === self.location.origin ? url.href : self.location.origin));
});
