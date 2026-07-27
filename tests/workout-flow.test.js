"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const rotation = require("../modules/workout-rotation.js");
const easyFlow = require("../modules/easy-workout-flow.js");

const studentId = "student-1";
const workouts = [
  { id: "A", student_id: studentId, status: "ativo", order_index: 1, created_at: "2026-01-01T10:00:00Z" },
  { id: "B", student_id: studentId, status: "ativo", order_index: 2, created_at: "2026-01-02T10:00:00Z" },
  { id: "C", student_id: studentId, status: "ativo", order_index: 3, created_at: "2026-01-03T10:00:00Z" }
];

function log(workoutId, completedAt) {
  return { workout_id: workoutId, student_id: studentId, completed_at: completedAt };
}

// 1. Aluno sem histórico recebe o primeiro treino ativo.
assert.equal(rotation.selectCurrentWorkout(workouts, [], studentId).id, "A");

// 2. A última série conclui o exercício e permite avançar ao próximo.
const firstExecution = { completed_sets: 2, completed: false, skipped: false };
const firstResult = easyFlow.completeSeries(firstExecution, 3);
assert.equal(firstResult.exerciseCompleted, true);
assert.equal(firstResult.shouldStartRest, false);
assert.equal(easyFlow.areAllExercisesCompleted(["ex-1", "ex-2"], {
  "ex-1": firstExecution,
  "ex-2": { completed: false, skipped: false }
}), false);

// 3. A última série do último exercício conclui o treino.
assert.equal(easyFlow.areAllExercisesCompleted(["ex-1", "ex-2"], {
  "ex-1": firstExecution,
  "ex-2": { completed: true, skipped: false }
}), true);

// 4 e 5. Conclusão de hoje é encontrada após renderização/recarregamento.
const today = new Date(2026, 6, 27, 23, 45, 0);
const todayLog = log("A", today.toISOString());
assert.equal(rotation.findTodayLog([todayLog], studentId, today).workout_id, "A");
assert.equal(rotation.findTodayLog([todayLog], studentId, new Date(2026, 6, 28, 8, 0, 0)), null);

// 6. No dia seguinte, o treino seguinte ao último log é selecionado.
assert.equal(rotation.selectCurrentWorkout(workouts, [todayLog], studentId).id, "B");

// 7. Depois do último treino, a rotação volta ao primeiro.
assert.equal(rotation.selectCurrentWorkout(workouts, [log("C", "2026-07-26T12:00:00Z")], studentId).id, "A");

// 8. Um único treino ativo continua em rotação.
assert.equal(rotation.selectCurrentWorkout([workouts[0]], [log("A", "2026-07-26T12:00:00Z")], studentId).id, "A");

// 9. Treino arquivado não entra na rotação e log inválido volta ao primeiro ativo.
const withArchived = [...workouts, { id: "D", student_id: studentId, status: "arquivado", order_index: 0 }];
assert.deepEqual(rotation.getActiveWorkouts(withArchived, studentId).map((item) => item.id), ["A", "B", "C"]);
assert.equal(rotation.selectCurrentWorkout(withArchived, [log("D", "2026-07-26T12:00:00Z")], studentId).id, "A");

// 10. Log offline pendente bloqueia hoje e também orienta a rotação.
const pendingOfflineLog = { ...todayLog, pending_id: "offline-1" };
assert.equal(rotation.findTodayLog([pendingOfflineLog], studentId, today).workout_id, "A");
assert.equal(rotation.selectCurrentWorkout(workouts, [pendingOfflineLog], studentId).id, "B");

// Ordem estável por position/sequence/created_at.
const unordered = [
  { id: "3", student_id: studentId, status: "ativo", position: 3 },
  { id: "1", student_id: studentId, status: "ativo", position: 1 },
  { id: "2", student_id: studentId, status: "ativo", position: 2 }
];
assert.deepEqual(rotation.getActiveWorkouts(unordered, studentId).map((item) => item.id), ["1", "2", "3"]);

// Série intermediária incrementa e solicita descanso.
const intermediate = { completed_sets: 0, completed: false, skipped: true };
const intermediateResult = easyFlow.completeSeries(intermediate, 3);
assert.equal(intermediate.completed_sets, 1);
assert.equal(intermediate.skipped, false);
assert.equal(intermediateResult.shouldStartRest, true);

// 11. O fluxo manual e a navegação do Modo Avançado permanecem no app.
const appSource = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");
assert.match(appSource, /if \(!window\.confirm\(confirmMessage\)\) return;/);
assert.match(appSource, /data-student-exercise-nav="next"/);
assert.match(appSource, /el\.completeWorkoutButton\.addEventListener\("click", completeCurrentWorkout\)/);
assert.match(appSource, /async function persistWorkoutCompletion[\s\S]+const todayLog = getTodayWorkoutLog\(\)/);
assert.match(appSource, /function enqueuePendingWorkoutLog[\s\S]+const duplicate = pending\.some/);
assert.doesNotMatch(
  appSource.match(/async function persistWorkoutCompletion[\s\S]+?\n}\n\n\/\*\*/)?.[0] || "",
  /window\.confirm/
);

console.log("✓ 11 cenários do fluxo de treino passaram.");
