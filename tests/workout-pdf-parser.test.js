const test = require("node:test");
const assert = require("node:assert/strict");
const parser = require("../modules/workout-pdf-parser.js");

test("parser reconhece A/B, intervalos, carga e descanso", () => {
  const draft = parser.parseExtractedDocument({
    page_count: 2,
    document_type: "text",
    pages: [
      { page_number: 1, text: "Treino A - Pernas\nLeg Press 45º 3 x 10-12 Carga: 60 kg Descanso: 1:30" },
      { page_number: 2, text: "Treino B - Superiores\nSupino reto 4 séries de 10 Descanso: 60 segundos" }
    ]
  });
  assert.equal(draft.workouts.length, 2);
  assert.equal(draft.workouts[0].exercises[0].reps, "10-12");
  assert.equal(draft.workouts[0].exercises[0].weight, "60 kg");
  assert.equal(draft.workouts[0].exercises[0].rest_seconds, 90);
  assert.equal(draft.workouts[1].exercises[0].sets, 4);
  assert.equal(draft.workouts[1].exercises[0].rest_seconds, 60);
});

test("classificação não transforma cabeçalhos e avisos em exercícios", () => {
  const draft = parser.parseExtractedDocument({
    page_count: 1,
    document_type: "text",
    pages: [{ page_number: 1, text: [
      "ALION TREINOS - FICHA SINTETICA QA",
      "QA PDF 7 - caso de regressao",
      "Dados ficticios. Proibido utilizar como prescricao real.",
      "Treino A - Core",
      "Prancha abdominal 3 x 30 segundos",
      "Este texto explica como executar o documento com seguranca."
    ].join("\n") }]
  });
  assert.equal(draft.workouts.length, 1);
  assert.deepEqual(draft.workouts[0].exercises.map((item) => item.original_name), ["Prancha abdominal"]);
  assert.equal(draft.review_items.some((item) => item.text.startsWith("Este texto explica")), true);
});

test("duração e descanso são separados pelo contexto", () => {
  const cases = [
    ["Prancha abdominal 3 x 30 segundos", { sets: 3, duration: "30 segundos", rest: null }],
    ["Prancha 3x45s", { sets: 3, duration: "45 segundos", rest: null }],
    ["Isometria 4 séries de 20 segundos", { sets: 4, duration: "20 segundos", rest: null }],
    ["Prancha 3 x 30s, descanso 60s", { sets: 3, duration: "30 segundos", rest: 60 }],
    ["Isometria 30 segundos", { sets: null, duration: "30 segundos", rest: null }]
  ];
  cases.forEach(([line, expected]) => {
    const exercise = parser.parseExercise(line, 1);
    assert.equal(exercise.sets, expected.sets, line);
    assert.equal(exercise.duration_text, expected.duration, line);
    assert.equal(exercise.reps, null, line);
    assert.equal(exercise.rest_seconds, expected.rest, line);
    assert.doesNotMatch(exercise.original_name, /segundos|\d+\s*s$/i, line);
  });
  assert.equal(parser.parseRest("Descanso 30 segundos"), 30);
  assert.equal(parser.parseRest("Intervalo 30 s"), 30);
  assert.equal(parser.parseRest("Prancha 30 s"), null);
});

test("duas fichas bloqueiam seleção e a escolhida não recebe dados da outra", () => {
  const multi = parser.parseExtractedDocument({
    page_count: 2,
    document_type: "text",
    pages: [
      { page_number: 1, text: "FICHA QA BLOCO 1\nTreino A\nAgachamento livre 3 x 12" },
      { page_number: 2, text: "FICHA QA BLOCO 2\nTreino B\nSupino reto 4 x 10" }
    ]
  });
  assert.equal(multi.requires_fixture_selection, true);
  assert.equal(multi.workouts.length, 0);
  assert.equal(multi.fixture_candidates.length, 2);
  const selected = parser.selectFixture(multi, "block-1");
  assert.equal(selected.requires_fixture_selection, false);
  assert.equal(selected.workouts[0].name, "Treino A");
  assert.deepEqual(selected.workouts[0].exercises.map((item) => item.original_name), ["Agachamento livre"]);
  assert.equal(JSON.stringify(selected).includes("Supino reto"), false);
});

test("tabela textual separa nome, séries, repetições, carga e descanso", () => {
  const draft = parser.parseExtractedDocument({
    page_count: 1,
    document_type: "text",
    pages: [{ page_number: 1, text: [
      "Treino A - Superiores",
      "Exercicio Series Repeticoes Carga Descanso",
      "Desenvolvimento com halteres 3 12 8 kg 60 s",
      "Elevacao lateral 3 10-12 45 s",
      "Face pull 4 10 20 kg 1 min"
    ].join("\n") }]
  });
  const [development, lateralRaise, facePull] = draft.workouts[0].exercises;
  assert.deepEqual([development.original_name, development.sets, development.reps, development.weight, development.rest_seconds], ["Desenvolvimento com halteres", 3, "12", "8 kg", 60]);
  assert.equal(development.duration_text, null);
  assert.deepEqual([lateralRaise.original_name, lateralRaise.sets, lateralRaise.reps, lateralRaise.weight, lateralRaise.rest_seconds], ["Elevacao lateral", 3, "10-12", null, 45]);
  assert.deepEqual([facePull.original_name, facePull.sets, facePull.reps, facePull.weight, facePull.rest_seconds], ["Face pull", 4, "10", "20 kg", 60]);
  assert.equal(facePull.duration_text, null);
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
