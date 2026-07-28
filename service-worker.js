const CACHE_NAME = "alion-pwa-v47-local";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=20260728-round-fixes",
  "./modules/security.js?v=20260727-security-v44",
  "./modules/accessibility.js?v=20260727-a11y-v44",
  "./modules/workout-rotation.js?v=20260727-easy-v45",
  "./modules/easy-workout-flow.js?v=20260727-experience-v46",
  "./modules/exercise-media.js?v=20260727-experience-v46",
  "./modules/trainer-data-rules.js?v=20260728-trainer-fixes",
  "./app.js?v=20260728-trainer-fixes",
  "./supabase.js?v=20260727-security-v44",
  "./modules/pwa.js?v=20260727-pwa-v44",
  "./manifest.webmanifest",
  "./favicon.ico",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/maskable-icon-512.png",
  "./assets/exercicios/placeholder-exercicio.svg"
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
  const isExerciseImage = event.request.destination === "image";
  const isNavigation = event.request.mode === "navigate";

  if (isExerciseVideo) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (isExerciseImage) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => (
        fetch(event.request)
          .then((networkResponse) => {
            if (!networkResponse?.ok) throw new Error("Imagem indisponível");
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return networkResponse;
          })
          .catch(() => cachedResponse || caches.match("./assets/exercicios/placeholder-exercicio.svg"))
      ))
    );
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
