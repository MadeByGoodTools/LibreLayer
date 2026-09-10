const CACHE = 'librelayer-shell-v30';
const SHELL = ['/', '/manifest.webmanifest', '/favicon.svg', '/offline.html'];
const LOCAL_DEVELOPMENT = ['localhost', '127.0.0.1'].includes(
  self.location.hostname,
);

self.addEventListener('install', (event) => {
  if (LOCAL_DEVELOPMENT) {
    event.waitUntil(self.skipWaiting());
    return;
  }
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) =>
              LOCAL_DEVELOPMENT
                ? key.startsWith('pixel-studio-shell-') ||
                  key.startsWith('librelayer-shell-')
                : key !== CACHE,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim())
      .then(() =>
        LOCAL_DEVELOPMENT ? self.registration.unregister() : undefined,
      ),
  );
});

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put('/', response.clone());
    }
    return response;
  } catch {
    return (await caches.match('/')) || caches.match('/offline.html');
  }
}

async function cacheFirstAsset(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (
    response.ok &&
    ['script', 'style', 'font', 'image'].includes(request.destination)
  ) {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  if (LOCAL_DEVELOPMENT) return;
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }
  event.respondWith(cacheFirstAsset(event.request));
});
