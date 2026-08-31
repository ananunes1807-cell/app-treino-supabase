(function initializeWorkoutImportMatcher(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutImportMatcher = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutImportMatcher() {
  "use strict";
  function normalize(value) {
    return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
      .replace(/º/g, "").replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
  }
  function tokens(value) { return new Set(normalize(value).split(" ").filter(Boolean)); }
  function similarity(left, right) {
    const a = normalize(left); const b = normalize(right);
    if (!a || !b) return 0;
    if (a === b) return 1;
    const aTokens = tokens(a); const bTokens = tokens(b);
    const intersection = [...aTokens].filter((token) => bTokens.has(token)).length;
    const union = new Set([...aTokens, ...bTokens]).size;
    const tokenScore = union ? intersection / union : 0;
    const containment = a.includes(b) || b.includes(a) ? Math.min(a.length, b.length) / Math.max(a.length, b.length) : 0;
    return Math.max(tokenScore, containment * 0.95);
  }
  function libraryName(item) { return item?.name || item?.nome || item?.exercise_name || ""; }
  function matchExercise(exercise, library) {
    const candidates = (library || []).map((item) => ({ item, score: similarity(exercise.original_name, libraryName(item)) }))
      .filter((candidate) => candidate.score >= 0.35).sort((a, b) => b.score - a.score).slice(0, 5);
    const best = candidates[0]; const second = candidates[1];
    exercise.match_candidates = candidates.map(({ item, score }) => ({ id: item.id, name: libraryName(item), confidence: Number(score.toFixed(3)) }));
    exercise.exercise_library_id = null; exercise.matched_library_name = null; exercise.match_confidence = best ? Number(best.score.toFixed(3)) : null;
    if (best && second && best.score >= 0.45 && best.score - second.score < 0.08) exercise.match_status = "ambiguous";
    else if (!best || best.score < 0.58) exercise.match_status = "not_found";
    else if (best.score >= 0.88) {
      exercise.match_status = "matched"; exercise.exercise_library_id = best.item.id; exercise.matched_library_name = libraryName(best.item);
    } else exercise.match_status = "review_required";
    return exercise;
  }
  function matchDraft(draft, library) {
    draft.workouts.forEach((workout) => workout.exercises.forEach((exercise) => matchExercise(exercise, library)));
    return draft;
  }
  return { matchDraft, matchExercise, normalize, similarity };
});
