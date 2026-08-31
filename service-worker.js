const CACHE_NAME = "alion-pwa-v55-workout-template-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css?v=20260831-workout-import-v1",
  "./modules/security.js?v=20260823-core-security-v49",
  "./modules/accessibility.js?v=20260727-a11y-v44",
  "./modules/workout-rotation.js?v=20260727-easy-v45",
  "./modules/easy-workout-flow.js?v=20260727-experience-v46",
  "./modules/workout-data.js?v=20260824-workout-schema-v54",
  "./modules/exercise-media.js?v=20260824-character-preference-v52",
  "./modules/exercise-upload.js?v=20260824-exercise-upload-v51",
  "./modules/workout-pdf.js?v=20260824-pdf-layout-v53",
  "./assets/vendor/pdfjs-3.11.174/pdf.min.js",
  "./assets/vendor/pdfjs-3.11.174/pdf.worker.min.js",
  "./assets/vendor/pdf-lib-1.17.1/pdf-lib.min.js",
  "./modules/workout-import-schema.js?v=20260831-import-v1",
  "./modules/workout-template-v1.js?v=20260831-template-v1",
  "./modules/workout-template-reader.js?v=20260831-template-v1",
  "./modules/workout-pdf-extractor.js?v=20260831-import-v1",
  "./modules/workout-pdf-parser.js?v=20260831-import-v1",
  "./modules/workout-import-matcher.js?v=20260831-import-v1",
  "./modules/workout-import-review.js?v=20260831-import-v1",
  "./modules/trainer-data-rules.js?v=20260728-trainer-fixes",
  "./app.js?v=20260831-workout-import-v1",
  "./supabase.js?v=20260727-security-v44",
  "./modules/pwa.js?v=20260823-core-security-v49",
  "./manifest.webmanifest",
  "./legal/legal.css",
  "./legal/privacidade.html",
  "./legal/termos.html",
  "./legal/suporte.html",
  "./legal/exclusao-conta.html",
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
          .filter((key) => key.startsWith("alion-pwa-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;
  if (/\.pdf$/i.test(requestUrl.pathname) || event.request.destination === "document" && requestUrl.protocol === "blob:") return;

  const isExerciseVideo = requestUrl.pathname.includes("/assets/exercicios/videos/") || requestUrl.pathname.endsWith(".mp4");
  const isExerciseImage = event.request.destination === "image";
  const isNavigation = event.request.mode === "navigate";
  const isStaticAsset = ["script", "style", "font", "manifest"].includes(event.request.destination)
    || requestUrl.pathname.includes("/icons/")
    || requestUrl.pathname.includes("/assets/");

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
        .catch(() => caches.match(event.request).then((cachedPage) => cachedPage || caches.match("./index.html")))
    );
    return;
  }

  if (!isStaticAsset) return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse?.ok) {
          const responseClone = networkResponse.clone();
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request))
  );
});
