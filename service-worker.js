/* ADP Digital Suite - Service Worker
   Caches the app shell so the site can be installed and opened like a native app,
   including basic offline support for already-visited tools. */

const CACHE_NAME = "adp-suite-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./privacy.html",
  "./disclaimer.html",
  "./offline.html",
  "./css/style.css",
  "./js/app.js",
  "./js/tools-data.js",
  "./js/helpers.js",
  "./js/pdf-tools.js",
  "./js/image-tools.js",
  "./js/scanner.js",
  "./js/qr-tools.js",
  "./js/utility-tools.js",
  "./js/passport-photo.js",
  "./js/id-card.js",
  "./js/resume-builder.js",
  "./manifest.json",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

// Install: pre-cache the app shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

// Activate: clear old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: cache-first for app shell, network-first fallback to cache/offline page for everything else
self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          // Cache successful same-origin responses for next time
          if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === "navigate") {
            return caches.match("./offline.html");
          }
        });
    })
  );
});
