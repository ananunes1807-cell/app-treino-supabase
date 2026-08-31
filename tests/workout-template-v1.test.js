const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const PDFLib = require("../assets/vendor/pdf-lib-1.17.1/pdf-lib.min.js");
const pdfjs = require("../assets/vendor/pdfjs-3.11.174/pdf.min.js");
const generator = require("../modules/workout-template-v1.js");
const extractor = require("../modules/workout-pdf-extractor.js");
const reader = require("../modules/workout-template-reader.js");
const matcher = require("../modules/workout-import-matcher.js");

pdfjs.GlobalWorkerOptions.workerSrc = path.resolve(__dirname, "../assets/vendor/pdfjs-3.11.174/pdf.worker.min.js");

async function fill(values = {}, options = {}) {
  const original = await generator.generate(options);
  const document = await PDFLib.PDFDocument.load(original);
  const form = document.getForm();
  Object.entries(values).forEach(([name, value]) => form.getTextField(name).setText(String(value)));
  form.updateFieldAppearances(await document.embedFont(PDFLib.StandardFonts.Helvetica));
  return document.save({ useObjectStreams: false, updateFieldAppearances: true });
}

async function extract(bytes, name = "qa-template.pdf") {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return extractor.extractPdf({
    name, type: "application/pdf", size: array.length,
    arrayBuffer: async () => array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength)
  }, { pdfjs });
}

test("gerador cria A4 AcroForm V1 com campos únicos e aparências", async () => {
  const bytes = await generator.generate({ workoutCount: 2, exercisesPerWorkout: 12 });
  const document = await PDFLib.PDFDocument.load(bytes);
  const fields = document.getForm().getFields();
  const names = fields.map((field) => field.getName());
  assert.equal(document.getPageCount(), 4);
  assert.equal(new Set(names).size, names.length);
  assert.equal(document.getForm().getTextField("alion_template_id").getText(), generator.TEMPLATE_ID);
  assert.equal(document.getForm().getTextField("alion_template_version").getText(), "1");
  assert.equal(document.getSubject(), generator.DISPLAY_ID);
  assert.ok(names.includes("workout_2_exercise_12_adaptation"));
});

test("valores preenchidos persistem ao salvar, reabrir e ler com PDF.js", async () => {
  const bytes = await fill({
    student_name: "QA - Aluno PDF",
    workout_1_name: "Treino A",
    workout_1_days: "Segunda e Quinta",
    workout_1_focus: "Core",
    workout_1_exercise_1_name: "Prancha abdominal",
    workout_1_exercise_1_sets: "3",
    workout_1_exercise_1_duration: "30 segundos",
    workout_1_exercise_1_rest: "60 segundos",
    workout_1_exercise_1_equipment: "Colchonete",
    workout_1_exercise_1_adaptation: "Executar sentada com apoio quando necessário"
  });
  const reopened = await PDFLib.PDFDocument.load(bytes);
  assert.equal(reopened.getForm().getTextField("student_name").getText(), "QA - Aluno PDF");
  const extracted = await extract(bytes);
  assert.equal(reader.inspect(extracted).status, "valid");
  const draft = reader.read(extracted);
  const exercise = draft.workouts[0].exercises[0];
  assert.equal(exercise.duration_text, "30 segundos");
  assert.equal(exercise.rest_seconds, 60);
  assert.equal(exercise.reps, null);
  assert.equal(exercise.adaptation_notes, "Executar sentada com apoio quando necessário");
});

test("campos vazios permanecem null e linhas vazias não viram exercícios", async () => {
  const extracted = await extract(await fill({
    workout_1_name: "Treino parcial",
    workout_1_exercise_1_name: "Leg Press",
    workout_1_exercise_1_sets: "4",
    workout_1_exercise_1_reps: "12"
  }));
  const draft = reader.read(extracted);
  assert.equal(draft.workouts[0].exercises.length, 1);
  assert.equal(draft.workouts[0].exercises[0].weight, null);
  assert.equal(draft.workouts[0].exercises[0].duration_text, null);
  assert.equal(draft.workouts[0].exercises[0].rest_seconds, null);
});

test("matcher continua usando nome original de uma ficha estruturada", async () => {
  const draft = reader.read(await extract(await fill({ workout_1_name: "Treino A", workout_1_exercise_1_name: "Leg Press 45" })));
  matcher.matchDraft(draft, [{ id: "lib-qa", name: "Leg Press 45º" }]);
  assert.equal(draft.workouts[0].exercises[0].exercise_library_id, "lib-qa");
  assert.equal(draft.workouts[0].exercises[0].original_name, "Leg Press 45");
});

test("identificação sem estrutura é malformada e rodapé visual isolado é externo", () => {
  assert.equal(reader.inspect({ form_fields: { alion_template_id: "ALION_WORKOUT_TEMPLATE", alion_template_version: "1" } }).status, "malformed");
  assert.equal(reader.inspect({ pages: [{ text: "ALION_WORKOUT_TEMPLATE_V1" }], form_fields: {} }).status, "external");
});

test("ficha vazia não cria treino", async () => {
  const extracted = await extract(await generator.generate({ workoutCount: 1 }));
  assert.throws(() => reader.read(extracted), /nao contem exercicios preenchidos/);
});

test("oito cenários sintéticos convertem sem OCR e preservam revisão", async () => {
  const scenarios = [
    { name: "simples", options: {}, values: { workout_1_name: "Treino simples", workout_1_exercise_1_name: "Supino reto", workout_1_exercise_1_sets: "3", workout_1_exercise_1_reps: "10" } },
    { name: "abc", options: { workoutCount: 3 }, values: { workout_1_name: "Treino A", workout_1_exercise_1_name: "Agachamento livre", workout_2_name: "Treino B", workout_2_exercise_1_name: "Supino reto", workout_3_name: "Treino C", workout_3_exercise_1_name: "Remada baixa" } },
    { name: "parcial", options: {}, values: { workout_1_name: "Treino parcial", workout_1_exercise_1_name: "Leg Press", workout_1_exercise_1_sets: "4" } },
    { name: "duracao-descanso", options: {}, values: { workout_1_name: "Treino Core", workout_1_exercise_1_name: "Prancha", workout_1_exercise_1_sets: "3", workout_1_exercise_1_duration: "30 segundos", workout_1_exercise_1_rest: "60 segundos" } },
    { name: "adaptacao-pcd", options: {}, values: { workout_1_name: "Treino adaptado", workout_1_exercise_1_name: "Elevacao lateral", workout_1_exercise_1_adaptation: "Executar sentada, com apoio e amplitude reduzida" } },
    { name: "ambiguo", options: {}, values: { workout_1_name: "Treino cardio", workout_1_exercise_1_name: "Bicicleta" } },
    { name: "fora-biblioteca", options: {}, values: { workout_1_name: "Treino QA", workout_1_exercise_1_name: "Movimento QA inexistente" } },
    { name: "vazia", options: {}, values: {} }
  ];
  for (const scenario of scenarios) {
    const extracted = await extract(await fill(scenario.values, scenario.options), `${scenario.name}.pdf`);
    assert.equal(reader.inspect(extracted).status, "valid", scenario.name);
    if (scenario.name === "vazia") assert.throws(() => reader.read(extracted), /nao contem exercicios/);
    else assert.ok(reader.read(extracted).workouts.length >= 1, scenario.name);
  }
});
