const test = require("node:test");
const assert = require("node:assert/strict");

const schema = require("../modules/workout-import-schema.js");

function validDraft() {
  return {
    schema_version: 1,
    source: { file_name: "qa-textual.pdf", page_count: 2, document_type: "text" },
    student_name_detected: null,
    workouts: [{
      source_label: "Treino A",
      name: "Treino A - Pernas",
      day_label: "Segunda-feira",
      objective: null,
      notes: null,
      exercises: [{
        source: { page: 1, text: "Elevação lateral sentada com apoio" },
        original_name: "Elevação lateral sentada com apoio",
        exercise_library_id: null,
        matched_library_name: null,
        match_status: "not_found",
        match_confidence: null,
        match_candidates: [],
        sets: 3,
        reps: "10-12",
        weight: null,
        rest_seconds: null,
        duration_text: null,
        cadence: null,
        equipment: null,
        instructions: null,
        adaptation_notes: "sentada com apoio",
        progression_notes: null,
        source_page: 1
      }]
    }],
    warnings: []
  };
}

test("contrato preserva campos ausentes como null e repeticoes como texto", () => {
  const payload = schema.toRpcPayload(validDraft());
  const exercise = payload.workouts[0].exercises[0];
  assert.equal(exercise.reps, "10-12");
  assert.equal(exercise.weight, null);
  assert.equal(exercise.rest_seconds, null);
  assert.equal(exercise.adaptation_notes, "sentada com apoio");
  assert.equal(exercise.original_name, "Elevação lateral sentada com apoio");
});

test("contrato recusa series negativas e pagina inexistente", () => {
  const draft = validDraft();
  draft.workouts[0].exercises[0].sets = -1;
  draft.workouts[0].exercises[0].source_page = 3;
  const errors = schema.validateDraft(draft);
  assert.ok(errors.some((message) => message.includes("sets")));
  assert.ok(errors.some((message) => message.includes("source_page")));
});

test("exercicio nao encontrado pode seguir sem id da biblioteca", () => {
  const draft = validDraft();
  assert.deepEqual(schema.validateDraft(draft), []);
  assert.equal(schema.toRpcPayload(draft).workouts[0].exercises[0].exercise_library_id, null);
});

test("id da biblioteca nao pode coexistir com status nao encontrado", () => {
  const draft = validDraft();
  draft.workouts[0].exercises[0].exercise_library_id = "11111111-1111-4111-8111-111111111111";
  assert.ok(schema.validateDraft(draft).some((message) => message.includes("status not_found")));
});

test("limites do MVP sao aplicados ao arquivo e ao documento", () => {
  assert.deepEqual(schema.validateFileMetadata({ name: "ficha.pdf", type: "application/pdf", size: 1024 }), []);
  assert.ok(schema.validateFileMetadata({ name: "ficha.pdf", type: "application/pdf", size: 16 * 1024 * 1024 }).length);
  const draft = validDraft();
  draft.source.page_count = 41;
  assert.ok(schema.validateDraft(draft).some((message) => message.includes("1 e 40")));
});

test("rascunho vazio nao inventa parametros de exercicio", () => {
  const exercise = schema.createEmptyExercise({ originalName: "Exercício QA", sourcePage: 1 });
  for (const field of ["sets", "reps", "weight", "rest_seconds", "equipment", "cadence", "duration_text"]){
    assert.equal(exercise[field], null);
  }
});

