const CACHE_NAME = 'mern-app-v2';
const STATIC_ASSETS = ['/', '/index.html', '/icon-512.png', '/manifest.json'];

const NETWORK_TIMEOUT_MS = 2000;

const isStaticAssetRequest = (request) => {
  const url = new URL(request.url);
  return (
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image' ||
    /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)
  );
};

const fetchWithTimeout = async (request, timeoutMs) => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('network-timeout')), timeoutMs);
  });
  return Promise.race([fetch(request), timeoutPromise]);
};

// Install: cache critical app shell assets.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clear older cache versions.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith('/api/') || url.pathname.includes('socket.io')) return;

  // For SPA navigations, fail fast to cache if network is slow.
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
          if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          const cachedRoute = await caches.match(request);
          if (cachedRoute) return cachedRoute;

          const cachedIndex = await caches.match('/index.html');
          if (cachedIndex) return cachedIndex;

          return fetch(request);
        }
      })()
    );
    return;
  }

  // Static assets: return from cache first, then refresh from network.
  if (isStaticAssetRequest(request)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;

        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      })()
    );
    return;
  }

  // Default: network-first with cache fallback.
  event.respondWith(
    fetch(request)
      .then(async (response) => {
        if (response && response.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, response.clone());
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});
