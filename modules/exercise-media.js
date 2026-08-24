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

  function normalizeCharacterPreference(value) {
    const normalized = String(value || "").trim().toLowerCase();
    if (["masculine", "masculino"].includes(normalized)) return "masculine";
    if (["feminine", "feminino"].includes(normalized)) return "feminine";
    if (["random", "aleatorio", "aleatório"].includes(normalized)) return "random";
    return "";
  }

  function resolveCharacterPreference(preference, gender) {
    const explicit = normalizeCharacterPreference(preference);
    if (explicit) return explicit;
    const normalizedGender = normalizeGender(gender);
    if (normalizedGender === "masculino") return "masculine";
    if (normalizedGender === "feminino") return "feminine";
    return "random";
  }

  function stableHash(value) {
    let hash = 2166136261;
    for (const character of String(value || "")) {
      hash ^= character.codePointAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function getStableCharacterVariant(studentId, exerciseId) {
    return stableHash(`${studentId || "student"}:${exerciseId || "exercise"}`) % 2 === 0
      ? "masculine"
      : "feminine";
  }

  function resolveExerciseImage({ exercise, preference, gender, studentId, exerciseId } = {}) {
    const resolvedPreference = resolveCharacterPreference(preference, gender);
    const masculine = safeUrl(exercise?.image_url_masculino, "image");
    const feminine = safeUrl(exercise?.image_url_feminino, "image");
    const legacy = safeUrl(exercise?.image_url, "image");
    let candidates;

    if (resolvedPreference === "masculine") {
      candidates = [masculine, feminine, legacy];
    } else if (resolvedPreference === "feminine") {
      candidates = [feminine, masculine, legacy];
    } else if (masculine && feminine) {
      const stableVariant = getStableCharacterVariant(studentId, exerciseId || exercise?.id);
      candidates = stableVariant === "masculine" ? [masculine, feminine, legacy] : [feminine, masculine, legacy];
    } else {
      candidates = [masculine, feminine, legacy];
    }

    return candidates.find(Boolean) || PLACEHOLDER;
  }

  function selectExerciseImage(exercise, gender, options = {}) {
    return resolveExerciseImage({
      exercise,
      preference: options.preference || gender,
      gender: options.gender || gender,
      studentId: options.studentId,
      exerciseId: options.exerciseId || exercise?.id
    });
  }

  return {
    PLACEHOLDER,
    getStableCharacterVariant,
    instructionParts,
    isAllowedUrl,
    normalizeCharacterPreference,
    normalizeGender,
    resolveCharacterPreference,
    resolveExerciseImage,
    safeUrl,
    selectExerciseImage,
    stableHash
  };
});
