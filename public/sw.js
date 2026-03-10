self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Simple passthrough for now; can be extended for offline caching.
self.addEventListener('fetch', () => {});

