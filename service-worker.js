const CACHE_PREFIX = 'invoice-app-';
const CACHE_NAME = CACHE_PREFIX + 'v4';
const CACHE_ASSETS = [
    './', './index.html', './tong-hop.html', './main.js', './ui.js', './vietnam-time.js',
    './src/output.css', './manifest.json', './images/favicon.ico',
    './images/icon-192x192.png', './images/icon-512x512.png'
];
const assetURLs = new Set(CACHE_ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_ASSETS)));
});

self.addEventListener('activate', event => {
    event.waitUntil(caches.keys().then(names => Promise.all(
        names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
            .map(name => caches.delete(name))
    )));
});

// Only this app's static assets participate. APIs and non-GET requests bypass the cache.
// A waiting worker activates after existing tabs close, avoiding a mid-session takeover.
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || !assetURLs.has(event.request.url)) return;
    event.respondWith((async () => {
        const cache = await caches.open(CACHE_NAME);
        let response;
        try { response = await fetch(event.request); }
        catch { return (await cache.match(event.request)) || Response.error(); }
        if (!response.ok) return (await cache.match(event.request)) || response;
        try { await cache.put(event.request, response.clone()); }
        catch { /* A full cache must not hide a successful network response. */ }
        return response;
    })());
});
