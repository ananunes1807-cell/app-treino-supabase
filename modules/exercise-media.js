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

  function normalizeGender(value) {
    const normalized = String(value || "")
      .trim()
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s-]+/g, "_");
    if (["masculino", "male", "homem", "m", "masc"].includes(normalized)) return "masculino";
    if (["feminino", "female", "mulher", "f", "fem"].includes(normalized)) return "feminino";
    return "";
  }

  function selectExerciseImage(exercise, gender, options = {}) {
    const normalizedGender = normalizeGender(gender);
    const allowOppositeFallback = options.allowOppositeFallback !== false;
    let fields;

    if (normalizedGender === "masculino") {
      fields = ["image_url_masculino", "image_url"];
      if (allowOppositeFallback) fields.push("image_url_feminino");
    } else if (normalizedGender === "feminino") {
      fields = ["image_url_feminino", "image_url"];
      if (allowOppositeFallback) fields.push("image_url_masculino");
    } else {
      fields = ["image_url", "image_url_masculino", "image_url_feminino"];
    }

    for (const field of fields) {
      const url = safeUrl(exercise?.[field], "image");
      if (url) return url;
    }
    return PLACEHOLDER;
  }

  return { PLACEHOLDER, instructionParts, isAllowedUrl, normalizeGender, safeUrl, selectExerciseImage };
});
