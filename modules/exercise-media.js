(function initializeExerciseMedia(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionExerciseMedia = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createExerciseMedia() {
  "use strict";

  const PLACEHOLDER = "assets/exercicios/placeholder-exercicio.svg";

  function isAllowedUrl(value, type = "image") {
    const url = String(value || "").trim();
    if (!url) return false;
    if (/^https:\/\/[^<>"']+$/i.test(url)) return true;
    const clean = url.replace(/^\.?\//, "");
    const folder = type === "video" ? "videos" : "imagens";
    const extension = type === "video" ? /\.mp4$/i : /\.(svg|webp|png|jpe?g)$/i;
    return clean.startsWith(`assets/exercicios/${folder}/`) && extension.test(clean);
  }

  function safeUrl(value, type = "image") {
    const url = String(value || "").trim();
    return isAllowedUrl(url, type) ? url.replace(/^\.?\//, "") : "";
  }

  function instructionParts(exercise) {
    if (!exercise) return [];
    return [
      ["Execução", exercise.instructions || exercise.description],
      ["Postura", exercise.posture],
      ["Respiração", exercise.breathing],
      ["Erros comuns", exercise.common_mistakes],
      ["Cuidados", exercise.care_notes]
    ].filter(([, value]) => String(value || "").trim());
  }

  return { PLACEHOLDER, instructionParts, isAllowedUrl, safeUrl };
});
