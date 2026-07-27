(function initializeWorkoutRotation(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutRotation = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutRotation() {
  "use strict";

  function normalizeStatus(workout) {
    const value = String(workout?.status || "ativo").trim().toLowerCase();
    return value === "active" ? "ativo" : value;
  }

  function getOrderValue(workout) {
    for (const field of ["order_index", "position", "sequence"]) {
      const value = Number(workout?.[field]);
      if (Number.isFinite(value)) return value;
    }
    return Number.MAX_SAFE_INTEGER;
  }

  function getActiveWorkouts(workouts, studentId) {
    return [...(workouts || [])]
      .filter((workout) => String(workout?.student_id) === String(studentId) && normalizeStatus(workout) === "ativo")
      .sort((left, right) => {
        const explicitOrder = getOrderValue(left) - getOrderValue(right);
        if (explicitOrder) return explicitOrder;
        const createdOrder = String(left?.created_at || "").localeCompare(String(right?.created_at || ""));
        if (createdOrder) return createdOrder;
        return String(left?.id || "").localeCompare(String(right?.id || ""));
      });
  }

  function getLogTimestamp(log) {
    return log?.completed_at || log?.created_at || "";
  }

  function getStudentLogs(logs, studentId) {
    return [...(logs || [])]
      .filter((log) => String(log?.student_id) === String(studentId))
      .sort((left, right) => new Date(getLogTimestamp(right)).getTime() - new Date(getLogTimestamp(left)).getTime());
  }

  function localDateKey(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function findTodayLog(logs, studentId, now = new Date()) {
    const today = localDateKey(now);
    return getStudentLogs(logs, studentId).find((log) => localDateKey(getLogTimestamp(log)) === today) || null;
  }

  function selectCurrentWorkout(workouts, logs, studentId) {
    const active = getActiveWorkouts(workouts, studentId);
    if (!active.length) return null;

    const lastLog = getStudentLogs(logs, studentId)[0];
    if (!lastLog) return active[0];

    const lastIndex = active.findIndex((workout) => String(workout.id) === String(lastLog.workout_id));
    if (lastIndex < 0) return active[0];
    return active[(lastIndex + 1) % active.length];
  }

  return {
    findTodayLog,
    getActiveWorkouts,
    getStudentLogs,
    localDateKey,
    selectCurrentWorkout
  };
});
