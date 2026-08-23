"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const media = require("../modules/exercise-media.js");
const pdf = require("../modules/workout-pdf.js");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const exerciseImages = {
  image_url: "assets/exercicios/imagens/generica.svg",
  image_url_masculino: "assets/exercicios/imagens/masculina.svg",
  image_url_feminino: "assets/exercicios/imagens/feminina.svg"
};

// Seleção por gênero e cadeia de fallback segura.
assert.equal(media.selectExerciseImage(exerciseImages, "masculino"), exerciseImages.image_url_masculino);
assert.equal(media.selectExerciseImage(exerciseImages, "feminino"), exerciseImages.image_url_feminino);
assert.equal(media.selectExerciseImage({ image_url: exerciseImages.image_url }, "masculino"), exerciseImages.image_url);
assert.equal(media.selectExerciseImage({ image_url_feminino: exerciseImages.image_url_feminino }, "masculino"), exerciseImages.image_url_feminino);
assert.equal(media.selectExerciseImage({}, "feminino"), media.PLACEHOLDER);
assert.equal(media.selectExerciseImage({ image_url: "javascript:alert(1)" }, ""), media.PLACEHOLDER);
assert.equal(media.normalizeGender("FEMINÍNO"), "feminino");

const student = {
  id: "student-1",
  name: "Ana Teste",
  genero: "feminino",
  objective: "Condicionamento",
  email: "nao-vazar@example.com",
  phone: "11999999999",
  restrictions: "dado sensível fora da ficha"
};
const workouts = [
  { id: "A", student_id: student.id, status: "ativo", order_index: 1, name: "Treino A", goal: "Força" },
  { id: "B", student_id: student.id, status: "ativo", order_index: 2, name: "Treino B" },
  { id: "C", student_id: student.id, status: "arquivado", order_index: 3, name: "Treino antigo" }
];
const workoutExercises = Array.from({ length: 9 }, (_, index) => ({
  id: `assignment-${index + 1}`,
  workout_id: index < 7 ? "A" : "B",
  exercise_id: `exercise-${index + 1}`,
  order_index: index,
  sets: index === 0 ? null : 3,
  reps: index === 0 ? "" : "10",
  load: index === 0 ? undefined : "20 kg",
  rest_seconds: index === 0 ? null : 60,
  notes: index === 1 ? "Movimento controlado" : ""
}));
const exerciseLibrary = workoutExercises.map((assignment, index) => ({
  id: assignment.exercise_id,
  name: `Exercício ${index + 1}`,
  instructions: index === 1 ? "Manter postura estável" : "",
  image_url: index === 2 ? "" : `assets/exercicios/imagens/exercicio-${index + 1}.svg`,
  image_url_feminino: index === 0 ? exerciseImages.image_url_feminino : ""
}));

assert.deepEqual(pdf.getActiveStudentWorkouts(workouts, student.id).map((workout) => workout.id), ["A", "B"]);
assert.deepEqual(pdf.resolveWorkoutSelection(workouts, "B").map((workout) => workout.id), ["B"]);

const plan = pdf.buildPlan({
  student,
  personalName: "Personal Responsável",
  workouts: pdf.getActiveStudentWorkouts(workouts, student.id),
  workoutExercises,
  exerciseLibrary,
  generatedAt: new Date("2026-08-23T12:00:00Z"),
  selectExerciseImage: media.selectExerciseImage
});

// Dados opcionais ausentes recebem traço sem impedir a ficha.
assert.equal(plan.workouts[0].exercises[0].sets, "—");
assert.equal(plan.workouts[0].exercises[0].reps, "—");
assert.equal(plan.workouts[0].exercises[0].load, "—");
assert.equal(plan.workouts[0].exercises[0].rest, "—");
assert.equal(plan.workouts[0].exercises[0].imageUrl, exerciseImages.image_url_feminino);

// Mais de seis exercícios criam páginas adicionais e mantêm cada treino separado.
const pages = pdf.paginatePlan(plan, 6);
assert.equal(pages.length, 3);
assert.deepEqual(pages.map((page) => page.workout.id), ["A", "A", "B"]);
assert.deepEqual(pages.map((page) => page.exercises.length), [6, 1, 2]);
assert.equal(pages[2].pageNumber, 3);

const documentHtml = pdf.renderDocument(plan, { baseUrl: "https://example.com/app/" });
assert.match(documentHtml, /@page\{size:A4 landscape/);
assert.match(documentHtml, /grid-template-columns:minmax\(0,1\.45fr\) minmax\(0,1fr\)/);
assert.match(documentHtml, /object-fit:contain/);
assert.match(documentHtml, /Ana Teste/);
assert.match(documentHtml, /Personal Responsável/);
assert.match(documentHtml, /Treino A/);
assert.match(documentHtml, /Treino B/);
assert.match(documentHtml, /Movimento controlado · Manter postura estável/);
assert.doesNotMatch(documentHtml, /nao-vazar@example\.com|11999999999|dado sensível fora da ficha/);

const planWithoutAnyImage = pdf.buildPlan({
  student,
  personalName: "Personal Responsável",
  workouts: [workouts[0]],
  workoutExercises: [workoutExercises[0]],
  exerciseLibrary: [exerciseLibrary[0]],
  selectExerciseImage: () => ""
});
assert.match(pdf.renderDocument(planWithoutAnyImage), /\[imagem padrão\]<\/span><strong>Exercício 1/);

// O helper exige aluno visível e aplica as regras atuais de Aluno, Personal e Admin.
assert.equal(pdf.canExportStudent({ role: "student", selectedStudentId: "student-1", ownStudentId: "student-1", accessibleStudentIds: ["student-1"] }), true);
assert.equal(pdf.canExportStudent({ role: "student", selectedStudentId: "student-2", ownStudentId: "student-1", accessibleStudentIds: ["student-1"] }), false);
assert.equal(pdf.canExportStudent({ role: "trainer", selectedStudentId: "student-1", accessibleStudentIds: ["student-1"] }), true);
assert.equal(pdf.canExportStudent({ role: "trainer", selectedStudentId: "student-2", accessibleStudentIds: ["student-1"] }), false);
assert.equal(pdf.canExportStudent({ role: "admin", trustedAdmin: true, selectedStudentId: "student-2", accessibleStudentIds: ["student-2"] }), true);
assert.equal(pdf.canExportStudent({ role: "admin", trustedAdmin: false, selectedStudentId: "student-2", accessibleStudentIds: ["student-2"] }), false);

// Integração estática: três áreas, módulo no shell e Academia continua ausente.
const index = read("index.html");
const app = read("app.js");
const serviceWorker = read("service-worker.js");
assert.match(index, /id="student-download-workout-pdf"/);
assert.match(index, /id="trainer-download-workout-pdf"/);
assert.match(index, /modules\/workout-pdf\.js\?v=/);
assert.match(app, /data-admin-student-action="pdf"/);
assert.match(app, /function generateWorkoutPdf/);
assert.match(app, /canExportWorkoutPdfForStudent/);
assert.match(serviceWorker, /modules\/workout-pdf\.js\?v=/);
assert.equal(index.includes("screen-academy-area"), false);
assert.equal(app.includes("renderAcademyArea"), false);

// Biblioteca do Admin: usa somente os exercícios já carregados e abre impressão A4 retrato.
assert.match(index, /id="admin-download-exercise-library-pdf"[\s\S]*Baixar biblioteca em PDF/);
assert.match(app, /adminDownloadExerciseLibraryPdf\?\.addEventListener\("click", printAdminExerciseLibraryPdf\)/);
const libraryPdfFunction = app.match(/function printAdminExerciseLibraryPdf\(\) \{[\s\S]+?\n\}\n\nfunction getFilteredAdminExercises/)?.[0] || "";
assert.match(libraryPdfFunction, /state\.exercises/);
assert.match(libraryPdfFunction, /exercise\.image_url_masculino/);
assert.match(libraryPdfFunction, /exercise\.image_url_feminino/);
assert.match(libraryPdfFunction, /size: A4 portrait/);
assert.match(libraryPdfFunction, /window\.open\("", "_blank"\)/);
assert.match(libraryPdfFunction, /printWindow\.print\(\)/);
assert.doesNotMatch(libraryPdfFunction, /fetchTable|safeFetchTable|supabaseClient|state\.students|state\.workouts/);

console.log("✓ geração, imagens, paginação e permissões da ficha em PDF passaram.");
