const test = require("node:test");
const assert = require("node:assert/strict");
const parser = require("../modules/workout-pdf-parser.js");

test("parser reconhece A/B, intervalos, carga e descanso", () => {
  const draft = parser.parseExtractedDocument({
    page_count: 2,
    document_type: "text",
    pages: [
      { page_number: 1, text: "Treino A - Pernas\nLeg Press 45º 3 x 10-12 Carga: 60 kg Descanso: 1:30" },
      { page_number: 2, text: "Treino B - Superiores\nSupino reto 4 séries de 10 60 segundos" }
    ]
  });
  assert.equal(draft.workouts.length, 2);
  assert.equal(draft.workouts[0].exercises[0].reps, "10-12");
  assert.equal(draft.workouts[0].exercises[0].weight, "60 kg");
  assert.equal(draft.workouts[0].exercises[0].rest_seconds, 90);
  assert.equal(draft.workouts[1].exercises[0].sets, 4);
  assert.equal(draft.workouts[1].exercises[0].rest_seconds, 60);
});

test("campos ausentes continuam null", () => {
  const exercise = parser.parseExercise("Elevação lateral sentada com apoio", 1);
  assert.equal(exercise.sets, null);
  assert.equal(exercise.reps, null);
  assert.equal(exercise.weight, null);
  assert.equal(exercise.rest_seconds, null);
});

test("PDF escaneado é interrompido com mensagem amigável", () => {
  assert.throws(
    () => parser.parseExtractedDocument({ page_count: 1, document_type: "scanned", pages: [] }),
    /parece ser uma digitalização/
  );
});
