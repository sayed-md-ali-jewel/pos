const clearCaches = () =>
  caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))));

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(clearCaches());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    clearCaches()
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      })
  );
});
