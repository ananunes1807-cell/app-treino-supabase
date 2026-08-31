const test = require("node:test");
const assert = require("node:assert/strict");
const PDFLib = require("../assets/vendor/pdf-lib-1.17.1/pdf-lib.min.js");
const path = require("node:path"); const pdfjs = require("../assets/vendor/pdfjs-3.11.174/pdf.min.js");
const generator = require("../modules/workout-template-v2.js");
const reader = require("../modules/workout-template-v2-reader.js");
const matcher = require("../modules/workout-import-matcher.js");
const extractor = require("../modules/workout-pdf-extractor.js");
pdfjs.GlobalWorkerOptions.workerSrc = path.resolve(__dirname, "../assets/vendor/pdfjs-3.11.174/pdf.worker.min.js");

async function extracted(values = {}, workoutCount = 6) {
  const bytes = await generator.generate({ workoutCount, values, generatedAt: new Date("2026-08-31T00:00:00Z") });
  const pdf = await PDFLib.PDFDocument.load(bytes); const fields = {};
  pdf.getForm().getFields().forEach((field) => {
    let value = null;
    if (field instanceof PDFLib.PDFCheckBox) value = field.isChecked() ? "Yes" : "Off";
    else if (field instanceof PDFLib.PDFRadioGroup) value = field.getSelected();
    else value = field.getText();
    fields[field.getName()] = [{ value, page: 0 }];
  });
  return { bytes, document: { page_count: pdf.getPageCount(), document_type: "text", form_fields: fields }, pdf };
}

async function extractWithPdfJs(bytes) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  return extractor.extractPdf({ name: "ficha-v2.pdf", type: "application/pdf", size: array.length, arrayBuffer: async () => array.buffer.slice(array.byteOffset, array.byteOffset + array.byteLength) }, { pdfjs });
}

test("V2 gera A4 paisagem com AcroForm estável A-G e radio group de nível", async () => {
  const result = await extracted({}, 7); const names = result.pdf.getForm().getFields().map((field) => field.getName());
  assert.deepEqual(result.pdf.getPages()[0].getSize(), { width: generator.A4_LANDSCAPE[0], height: generator.A4_LANDSCAPE[1] });
  assert.equal(result.pdf.getPageCount(), 3); assert.ok(names.includes("workout_G_day_sun")); assert.ok(names.includes("workout_A_exception_03_rest"));
  assert.ok(names.includes("student_level")); assert.ok(names.includes("workout_A_exercise_leg_press_45_selected"));
  assert.equal(result.pdf.getSubject(), "ALION_WORKOUT_TEMPLATE_V2");
});

test("PDF.js lê diretamente checkboxes, radio group e textos da V2", async () => {
  const generated = await extracted({ student_level: "advanced", workout_A_name: "A", workout_A_day_sun: true, workout_A_exercise_plank_selected: true });
  const document = await extractWithPdfJs(generated.bytes); const draft = reader.read(document);
  assert.equal(reader.inspect(document).status, "valid"); assert.equal(draft.workouts[0].day_label, "Dom"); assert.equal(draft.workouts[0].exercises[0].original_name, "Prancha abdominal");
});

test("dias são independentes e preservam combinações, ausência, sábado e domingo", async () => {
  const { document } = await extracted({ workout_A_name: "A", workout_A_exercise_plank_selected: true, workout_A_day_mon: true, workout_A_day_thu: true,
    workout_B_name: "B", workout_B_exercise_treadmill_selected: true, workout_B_day_tue: true, workout_B_day_fri: true,
    workout_C_name: "C", workout_C_exercise_abdominal_crunch_selected: true,
    workout_D_name: "D", workout_D_exercise_squat_free_selected: true, workout_D_day_sat: true,
    workout_E_name: "E", workout_E_exercise_leg_press_45_selected: true, workout_E_day_sun: true });
  const draft = reader.read(document); assert.deepEqual(draft.workouts.map((w) => w.day_label), ["Seg + Qui", "Ter + Sex", null, "Sab", "Dom"]);
});

test("padrão é aplicado por atributo e exceção parcial não apaga valores herdados", async () => {
  const { document } = await extracted({ workout_A_name: "Treino A", workout_A_exercise_squat_free_selected: true, workout_A_apply_default: true,
    workout_A_default_sets: "3", workout_A_default_reps_or_time: "10-12", workout_A_default_rest: "60 s",
    workout_A_exception_01_name: "Agachamento Livre", workout_A_exception_01_sets: "4", workout_A_exception_01_rest: "90 s" });
  const exercise = reader.read(document).workouts[0].exercises[0];
  assert.deepEqual({ sets: exercise.sets, reps: exercise.reps, weight: exercise.weight, rest: exercise.rest_seconds }, { sets: 4, reps: "10-12", weight: null, rest: 90 });
});

test("padrão preenchido e desmarcado não propaga prescrição", async () => {
  const { document } = await extracted({ workout_A_name: "A", workout_A_exercise_plank_selected: true, workout_A_default_sets: "3", workout_A_default_reps_or_time: "30 s", workout_A_default_rest: "60" });
  const exercise = reader.read(document).workouts[0].exercises[0]; assert.equal(exercise.sets, null); assert.equal(exercise.reps, null); assert.equal(exercise.duration_text, null); assert.equal(exercise.rest_seconds, null);
});

test("repetições e duração preservam o texto original e dúvida gera revisão", () => {
  assert.deepEqual(reader.classifyRepsOrTime("12"), { reps: "12", duration: null, ambiguous: false, original: "12" });
  assert.deepEqual(reader.classifyRepsOrTime("10-12"), { reps: "10-12", duration: null, ambiguous: false, original: "10-12" });
  assert.deepEqual(reader.classifyRepsOrTime("30 s"), { reps: null, duration: "30 s", ambiguous: false, original: "30 s" });
  assert.deepEqual(reader.classifyRepsOrTime("45 segundos"), { reps: null, duration: "45 segundos", ambiguous: false, original: "45 segundos" });
  assert.equal(reader.classifyRepsOrTime("ate cansar").ambiguous, true);
});

test("exceção ambígua permanece sem aplicação até escolha manual", async () => {
  const { document } = await extracted({ workout_A_name: "A", workout_A_exercise_bench_press_selected: true, workout_A_exercise_incline_bench_press_selected: true,
    workout_A_exception_01_name: "Supino", workout_A_exception_01_sets: "4" });
  const draft = reader.read(document); assert.equal(draft.unresolved_exceptions.length, 1); assert.equal(draft.workouts[0].exercises.every((e) => e.sets === null), true);
  assert.match(draft.review_items[0].text, /Nao foi possivel identificar com seguranca/);
});

test("Outros sem nome exige revisão sem criar exercício vazio", async () => {
  const { document } = await extracted({ workout_A_name: "A", workout_A_other_selected: true }); const draft = reader.read(document);
  assert.equal(draft.workouts[0].exercises.length, 0); assert.equal(draft.unresolved_others.length, 1); assert.match(draft.review_items[0].text, /Outros/);
});

test("adaptação longa aparece uma vez em workout.notes e nunca é duplicada nos exercícios", async () => {
  const note = "Evitar sobrecarga no membro direito. Executar com apoio, amplitude confortável e interromper em caso de dor.";
  const { document } = await extracted({ workout_A_name: "A", workout_A_exercise_leg_press_45_selected: true, workout_A_exercise_leg_extension_selected: true, workout_A_adaptation_notes: note });
  const workout = reader.read(document).workouts[0]; assert.match(workout.notes, new RegExp(note)); assert.equal(workout.exercises.every((e) => e.adaptation_notes === null), true);
});

test("chave rápida vira nome canônico e matcher atual decide vínculo", async () => {
  const { document } = await extracted({ workout_A_name: "A", workout_A_exercise_treadmill_selected: true }); const draft = reader.read(document);
  matcher.matchDraft(draft, [{ id: "lib-esteira", name: "Esteira" }]); assert.equal(draft.workouts[0].exercises[0].exercise_library_id, "lib-esteira");
  matcher.matchDraft(draft, []); assert.equal(draft.workouts[0].exercises[0].original_name, "Esteira"); assert.equal(draft.workouts[0].exercises[0].match_status, "not_found");
});

test("V1 continua sendo detectada pelo leitor compartilhado", () => {
  const shared = require("../modules/workout-template-reader.js");
  const fields = { alion_template_id: [{ value: "ALION_WORKOUT_TEMPLATE" }], alion_template_version: [{ value: "1" }], student_name: [{ value: "" }], workout_1_name: [{ value: "A" }] };
  ["name", "sets", "reps", "weight", "duration", "rest", "equipment", "adaptation"].forEach((suffix) => { fields[`workout_1_exercise_1_${suffix}`] = [{ value: suffix === "name" ? "Esteira" : "" }]; });
  assert.equal(shared.inspect({ form_fields: fields }).status, "valid");
});
