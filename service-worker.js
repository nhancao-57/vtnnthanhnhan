// service-worker.js

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('my-cache').then((cache) => {
      return cache.addAll([
        '/', // Home page
        '/index.html',
        '/images/favicon.ico',
      ]);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});

self.addEventListener('fetch', (event) => {
  // 1. EXPLICITLY BYPASS EXTERNAL APIs
  // If the request is for our time servers, ignore the cache entirely
  if (
    event.request.url.includes('worldtimeapi.org') || 
    event.request.url.includes('timeapi.io')
  ) {
    // Returning without event.respondWith() lets the browser handle it natively via network
    return; 
  }

  // 2. STANDARD CACHE-FIRST FOR EVERYTHING ELSE
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});
