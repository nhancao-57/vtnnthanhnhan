// service-worker.js

// 1. VERSIONING: Change this string (e.g., to 'v3') every time you update your app's code!
const CACHE_NAME = 'invoice-app-v2'; 

const CACHE_ASSETS = [
  '/', 
  '/index.html',
  '/main.js', // Added main.js so it caches properly for offline use
  '/images/favicon.ico'
];

self.addEventListener('install', (event) => {
  // Forces the new service worker to activate immediately without waiting for the old one to close
  self.skipWaiting(); 
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CACHE_ASSETS);
    })
  );
});

// 2. THE CLEANUP CREW: This removes the old cache when you bump the CACHE_NAME version
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Clearing Old Cache');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. SINGLE FETCH LISTENER: Combines your logic into one functional block
self.addEventListener('fetch', (event) => {
  // EXPLICITLY BYPASS EXTERNAL APIs
  if (
    event.request.url.includes('worldtimeapi.org') || 
    event.request.url.includes('timeapi.io')
  ) {
    return; // Let the browser handle it via network natively
  }

  // STANDARD CACHE-FIRST FOR EVERYTHING ELSE
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request);
    })
  );
});