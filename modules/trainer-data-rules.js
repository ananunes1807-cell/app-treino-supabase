(function initializeTrainerDataRules(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionTrainerDataRules = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createTrainerDataRules() {
  "use strict";

  const GROUP_ALIASES = new Map([
    ["peito", "Peitoral"], ["peitoral", "Peitoral"],
    ["costas", "Costas"], ["dorsal", "Costas"],
    ["ombro", "Ombros"], ["ombros", "Ombros"],
    ["biceps", "Bíceps"], ["bíceps", "Bíceps"],
    ["triceps", "Tríceps"], ["tríceps", "Tríceps"],
    ["quadriceps", "Quadríceps"], ["quadríceps", "Quadríceps"], ["perna", "Quadríceps"], ["pernas", "Quadríceps"],
    ["posterior", "Posterior de coxa"], ["posterior de coxa", "Posterior de coxa"],
    ["gluteo", "Glúteos"], ["glúteo", "Glúteos"], ["gluteos", "Glúteos"], ["glúteos", "Glúteos"],
    ["panturrilha", "Panturrilhas"], ["panturrilhas", "Panturrilhas"],
    ["abdomen", "Abdômen"], ["abdômen", "Abdômen"], ["abdominal", "Abdômen"],
    ["corpo inteiro", "Corpo inteiro"], ["full body", "Corpo inteiro"],
    ["braco", "Braços"], ["braço", "Braços"], ["bracos", "Braços"], ["braços", "Braços"]
  ]);

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase("pt-BR");
  }

  function normalizeExerciseName(value) {
    return normalizeText(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/45\s*(?:°|º|graus?)/g, "45")
      .replace(/[-_/]+/g, " ")
      .replace(/[^\p{L}\p{N}\s]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeMuscleGroup(value) {
    const normalized = normalizeText(value);
    if (!normalized) return "";
    if (GROUP_ALIASES.has(normalized)) return GROUP_ALIASES.get(normalized);

    const keywordOrder = [
      ["panturr", "Panturrilhas"], ["posterior", "Posterior de coxa"],
      ["quadr", "Quadríceps"], ["glúte", "Glúteos"], ["glute", "Glúteos"],
      ["trícep", "Tríceps"], ["tricep", "Tríceps"], ["bícep", "Bíceps"], ["bicep", "Bíceps"],
      ["peitor", "Peitoral"], ["costas", "Costas"], ["dorsal", "Costas"],
      ["ombro", "Ombros"], ["abd", "Abdômen"], ["full body", "Corpo inteiro"], ["corpo inteiro", "Corpo inteiro"]
    ];
    const inferred = keywordOrder.find(([keyword]) => normalized.includes(keyword));
    if (inferred) return inferred[1];

    const looksLikeDescription = normalized.length > 36 || /[.!?:;]/.test(normalized);
    if (looksLikeDescription) return "";
    return normalized.charAt(0).toLocaleUpperCase("pt-BR") + normalized.slice(1);
  }

  function workoutStatus(value) {
    const normalized = normalizeText(value || "ativo");
    if (normalized === "deleted") return "excluido";
    if (normalized === "archived") return "arquivado";
    if (normalized === "active") return "ativo";
    return normalized || "ativo";
  }

  function calculateTrainerMetrics({ students = [], exercises = [], workouts = [], logs = [] } = {}) {
    const studentIds = new Set(students.map((student) => String(student.id)));
    const scopedWorkouts = workouts.filter((workout) => (
      studentIds.has(String(workout.student_id))
      && workoutStatus(workout.status) !== "excluido"
    ));
    const scopedLogs = logs.filter((log) => studentIds.has(String(log.student_id)));
    const uniqueWorkouts = new Map(scopedWorkouts.map((workout, index) => [
      String(workout.id || `${workout.student_id}:${workout.name || workout.title || ""}:${index}`),
      workout
    ]));
    const uniqueLogs = new Map(scopedLogs.map((log, index) => [
      String(log.id || `${log.student_id}:${log.workout_id || ""}:${log.completed_at || log.created_at || index}`),
      log
    ]));
    const exerciseKeys = new Set(exercises.map((exercise) => (
      `${normalizeText(exercise.name || exercise.title || exercise.nome)}::${normalizeMuscleGroup(exercise.muscle_group || exercise.primary_muscle || exercise.grupo_muscular)}`
    )));
    return {
      students: studentIds.size,
      exercises: exerciseKeys.size,
      workouts: uniqueWorkouts.size,
      completed: uniqueLogs.size
    };
  }

  function maskInviteLink(link, visibleSuffix = 4) {
    const value = String(link || "");
    if (!value) return "";
    const suffix = value.slice(-Math.max(1, visibleSuffix));
    try {
      const url = new URL(value);
      return `${url.origin}${url.pathname}?invite=••••••••${suffix}`;
    } catch (_error) {
      return `••••••••${suffix}`;
    }
  }

  function isInviteUsable(invite, now = new Date()) {
    if (!invite || normalizeText(invite.status) !== "pendente") return false;
    if (!invite.expires_at) return true;
    const expiresAt = new Date(invite.expires_at);
    return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
  }

  return {
    calculateTrainerMetrics,
    isInviteUsable,
    maskInviteLink,
    normalizeExerciseName,
    normalizeMuscleGroup
  };
});
