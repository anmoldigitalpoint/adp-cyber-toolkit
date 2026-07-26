const CACHE_NAME = "adp-suite-v3";

const APP_SHELL = [
  "./",
  "./index.html",
  "./privacy.html",
  "./disclaimer.html",
  "./offline.html",
  "./style.css",
  "./app.js",
  "./tools-data.js",
  "./helpers.js",
  "./pdf-tools.js",
  "./image-tools.js",
  "./scanner.js",
  "./qr-tools.js",
  "./utility-tools.js",
  "./passport-photo.js",
  "./id-card.js",
  "./resume-builder.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && req.url.startsWith(self.location.origin)) {
            const resClone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          }
          return res;
        })
        .catch(() => {
          if (req.mode === "navigate") return caches.match("./offline.html");
        });
    })
  );
});
