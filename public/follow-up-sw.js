/* Service worker for follow-up desktop notifications (works when tab is in background). */

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url;
  if (!url) return;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(url) || client.url.endsWith(url)) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

self.addEventListener("message", (event) => {
  const { type, title, options } = event.data || {};
  if (type !== "SHOW_NOTIFICATION" || !title) return;

  event.waitUntil(
    self.registration.showNotification(title, {
      ...options,
      silent: false,
    })
  );
});
