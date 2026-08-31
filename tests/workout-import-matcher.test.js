const test = require("node:test");
const assert = require("node:assert/strict");
const matcher = require("../modules/workout-import-matcher.js");

test("normalização considera acentos, grau, pontuação e caixa somente na busca", () => {
  assert.equal(matcher.normalize("  LEG Press 45º! "), "leg press 45");
  assert.equal(matcher.normalize("Elevação-Lateral"), "elevacao lateral");
});

test("correspondência exata é pré-selecionada sem alterar nome original", () => {
  const exercise = { original_name: "Leg Press 45", match_status: "not_found" };
  matcher.matchExercise(exercise, [{ id: "lib-1", name: "Leg Press 45º" }]);
  assert.equal(exercise.match_status, "matched");
  assert.equal(exercise.exercise_library_id, "lib-1");
  assert.equal(exercise.original_name, "Leg Press 45");
});

test("termo com candidatos próximos fica ambíguo e não é selecionado", () => {
  const exercise = { original_name: "Bicicleta", match_status: "not_found" };
  matcher.matchExercise(exercise, [
    { id: "a", name: "Bicicleta horizontal" },
    { id: "b", name: "Bicicleta vertical" }
  ]);
  assert.equal(exercise.match_status, "ambiguous");
  assert.equal(exercise.exercise_library_id, null);
});

test("exercício inexistente permanece importável sem vínculo", () => {
  const exercise = { original_name: "Movimento QA desconhecido", match_status: "not_found" };
  matcher.matchExercise(exercise, [{ id: "a", name: "Supino reto" }]);
  assert.equal(exercise.match_status, "not_found");
  assert.equal(exercise.exercise_library_id, null);
});
