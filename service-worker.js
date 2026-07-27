const CACHE_NAME = "alion-pwa-v45";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=20260727-easy-v45",
  "./modules/security.js?v=20260727-security-v44",
  "./modules/accessibility.js?v=20260727-a11y-v44",
  "./modules/workout-rotation.js?v=20260727-easy-v45",
  "./modules/easy-workout-flow.js?v=20260727-easy-v45",
  "./app.js?v=20260727-easy-v45",
  "./supabase.js?v=20260727-security-v44",
  "./modules/pwa.js?v=20260727-pwa-v44",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  const isExerciseVideo = requestUrl.pathname.includes("/assets/exercicios/videos/") || requestUrl.pathname.endsWith(".mp4");
  const isNavigation = event.request.mode === "navigate";

  if (isExerciseVideo) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse?.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put("./index.html", responseClone));
          }
          return networkResponse;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
