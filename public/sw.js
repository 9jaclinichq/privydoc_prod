const CACHE_NAME = "privydoc-v2";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/pwa_logo.svg"
];

// PrivyDoc PWA Prompt Sync Comment:
// The main window captures the beforeinstallprompt and coordinates with the App state.
// We also track navigator.getInstalledRelatedApps() dynamically to re-trigger or suppress prompts.

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event with Stale-While-Revalidate Strategy
self.addEventListener("fetch", (event) => {
  // Check if we are in development/preview environment
  const isDev = self.location.hostname.includes("localhost") || 
                self.location.hostname.includes("ais-dev") || 
                self.location.hostname.includes("127.0.0.1") ||
                self.location.hostname.includes("run.app");
  if (isDev) {
    return; // Let the browser handle everything normally
  }

  // Only handle GET requests and exclude Chrome extensions or external analytics API calls
  if (event.request.method !== "GET" || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(event.request.url);
  // Do not intercept or cache development assets or hot module updates
  if (
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/") ||
    url.pathname.startsWith("/@") ||
    url.pathname.includes("vite") ||
    url.pathname.includes("hot-update")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});
