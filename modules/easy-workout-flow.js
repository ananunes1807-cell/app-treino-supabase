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

  return { areAllExercisesCompleted, completeSeries };
});
