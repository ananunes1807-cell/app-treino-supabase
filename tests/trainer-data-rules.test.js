"use strict";

const assert = require("node:assert/strict");
const {
  calculateTrainerMetrics,
  isInviteUsable,
  maskInviteLink,
  normalizeExerciseName,
  normalizeMuscleGroup
} = require("../modules/trainer-data-rules.js");

assert.equal(normalizeMuscleGroup("peito"), "Peitoral");
assert.equal(normalizeMuscleGroup("Exercício para glúteos com atenção à postura."), "Glúteos");
assert.equal(normalizeMuscleGroup("Descrição extensa sem grupo muscular definido para o exercício."), "");
assert.equal(normalizeExerciseName(" Leg Press 45º "), "leg press 45");
assert.equal(normalizeExerciseName("Leg-Press 45 graus"), "leg press 45");

const metrics = calculateTrainerMetrics({
  students: [{ id: "s1" }, { id: "s1" }],
  exercises: [
    { id: "e1", name: "Supino", muscle_group: "peito" },
    { id: "e2", name: "Supino", muscle_group: "Peitoral" }
  ],
  workouts: [
    { id: "w1", student_id: "s1", status: "ativo" },
    { id: "w1", student_id: "s1", status: "ativo" },
    { id: "w2", student_id: "s1", status: "excluido" },
    { id: "w3", student_id: "fora", status: "ativo" }
  ],
  logs: [
    { id: "l1", student_id: "s1" },
    { id: "l1", student_id: "s1" },
    { id: "l2", student_id: "fora" }
  ]
});

assert.deepEqual(metrics, {
  students: 1,
  exercises: 1,
  workouts: 1,
  completed: 1
});

const fullLink = "https://example.test/app?invite=token-super-secreto-1234";
const masked = maskInviteLink(fullLink);
assert.equal(masked.endsWith("1234"), true);
assert.equal(masked.includes("token-super-secreto"), false);

const now = new Date("2026-07-28T12:00:00Z");
assert.equal(isInviteUsable({ status: "pendente", expires_at: "2026-07-28T13:00:00Z" }, now), true);
assert.equal(isInviteUsable({ status: "pendente", expires_at: "2026-07-28T11:00:00Z" }, now), false);
assert.equal(isInviteUsable({ status: "aceito", expires_at: null }, now), false);

console.log("trainer-data-rules: testes concluídos com sucesso");
