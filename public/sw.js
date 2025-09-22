/* eslint-disable */
// Service Worker - JavaScript file (not TypeScript)
const CACHE_NAME = 'visa-connect-v4';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/logo192.png',
  '/logo512.png',
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // For JavaScript and CSS files, always fetch from network first
  if (
    event.request.url.includes('/static/js/') ||
    event.request.url.includes('/static/css/')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If the response is HTML (404 page), don't cache it
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('text/html')) {
            // This is a 404, return a proper error
            throw new Error('Resource not found');
          }
          return response;
        })
        .catch(() => {
          // If network fails, don't fall back to cache for JS/CSS
          // This prevents serving old cached versions
          return new Response('', { status: 404 });
        })
    );
    return;
  }

  event.respondWith(
    caches
      .match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, show offline page
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});

// Activate event - claim control of all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for skip waiting message
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
