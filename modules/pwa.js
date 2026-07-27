(function initializeAlionPwa() {
  "use strict";

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("./service-worker.js");
      await registration.update();
    } catch (error) {
      console.error("[Alion Treinos] Erro ao registrar service worker:", error);
    }
  });
})();
