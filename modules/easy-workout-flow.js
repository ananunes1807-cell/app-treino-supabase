(function initializeEasyWorkoutFlow(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionEasyWorkoutFlow = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createEasyWorkoutFlow() {
  "use strict";

  function completeSeries(execution, plannedSets) {
    const total = Math.max(1, Number(plannedSets) || 1);
    const completedSets = Math.min(total, Math.max(0, Number(execution.completed_sets || 0)) + 1);
    execution.completed_sets = completedSets;
    execution.actual_sets = String(completedSets);
    execution.skipped = false;
    execution.completed = completedSets >= total;
    return {
      completedSets,
      exerciseCompleted: execution.completed,
      shouldStartRest: completedSets < total,
      total
    };
  }

  function areAllExercisesCompleted(exerciseIds, executions) {
    return exerciseIds.length > 0 && exerciseIds.every((id) => {
      const execution = executions[String(id)];
      return Boolean(execution?.completed && !execution?.skipped);
    });
  }

  function getCurrentExerciseIndex(exerciseIds, executions, requestedIndex = 0) {
    if (!exerciseIds.length) return -1;
    const bounded = Math.min(exerciseIds.length - 1, Math.max(0, Number(requestedIndex) || 0));
    const requested = executions[String(exerciseIds[bounded])];
    if (!requested?.completed || requested?.skipped) return bounded;
    const nextPending = exerciseIds.findIndex((id) => {
      const execution = executions[String(id)];
      return !execution?.completed || execution?.skipped;
    });
    return nextPending >= 0 ? nextPending : bounded;
  }

  function normalizeFeedback(value) {
    const allowed = ["facil", "adequado", "dificil", "dor"];
    const normalized = String(value || "").trim().toLowerCase();
    return allowed.includes(normalized) ? normalized : "";
  }

  function normalizePainIntensity(value) {
    if (value === "" || value == null) return null;
    const number = Number(value);
    if (!Number.isFinite(number)) return null;
    return Math.min(10, Math.max(1, Math.round(number)));
  }

  return {
    areAllExercisesCompleted,
    completeSeries,
    getCurrentExerciseIndex,
    normalizeFeedback,
    normalizePainIntensity
  };
});
