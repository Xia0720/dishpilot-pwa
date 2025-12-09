const CACHE_NAME = 'dishpilot-cache-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/recipes.json',
    // Add your icon files here
    '/icons/icon-192.png', 
    // TF.js library is usually served by CDN and not strictly required in the cache, but main files are.
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                if (response) {
                    return response; // Return from cache if found
                }
                return fetch(event.request); // Go to network if not found
            })
    );
});