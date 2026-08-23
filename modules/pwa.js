(function initializeAlionPwa() {
  "use strict";

  if (!("serviceWorker" in navigator)) return;
  let hadController = Boolean(navigator.serviceWorker.controller);
  let reloadingForUpdate = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (hadController && !reloadingForUpdate) {
      reloadingForUpdate = true;
      window.location.reload();
      return;
    }
    hadController = true;
  });

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");
      registration.addEventListener("updatefound", () => {
        const installingWorker = registration.installing;
        installingWorker?.addEventListener("statechange", () => {
          if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
            window.dispatchEvent(new CustomEvent("alion:pwa-update-ready"));
          }
        });
      });
      await registration.update();
    } catch (error) {
      console.error("[Alion Treinos] Erro ao registrar service worker:", error);
    }
  });
})();
