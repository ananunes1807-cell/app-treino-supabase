const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const html = read("index.html");
const app = read("app.js");
const review = read("modules/workout-import-review.js");
const worker = read("service-worker.js");

test("Personal pode gerar ficha vazia ou para aluno sem alterar o gerador tradicional", () => {
  assert.match(html, /id="open-workout-template"[^>]*>Baixar Ficha Padrão Alion/);
  assert.match(html, /value="blank" checked/);
  assert.match(html, /id="workout-template-student-mode"/);
  assert.match(html, /id="trainer-download-workout-pdf"/);
  assert.match(app, /AlionWorkoutTemplateV1\.download/);
});

test("importador detecta template antes do parser e mantém revisão e RPC", () => {
  const inspectionPosition = review.indexOf("AlionWorkoutTemplateReader.inspect");
  const parserPosition = review.indexOf("AlionWorkoutPdfParser.parseExtractedDocument");
  assert.ok(inspectionPosition >= 0 && inspectionPosition < parserPosition);
  assert.match(review, /AlionWorkoutImportMatcher\.matchDraft/);
  assert.match(review, /alion_confirm_workout_import/);
  assert.match(review, /Ficha Padrão Alion detectada/);
});

test("adaptação e orientação ficam em campo multilinha editável", () => {
  assert.match(review, /<textarea class="import-adaptation-notes" data-field="adaptation_notes" rows="4">/);
  assert.doesNotMatch(review, /Adaptação<input data-field="adaptation_notes"/);
});

test("arquivo e documento são descartados sem armazenamento persistente", () => {
  assert.match(review, /previewDocument\.destroy/);
  assert.match(review, /release\(\{ clearInput: false \}\)/);
  assert.doesNotMatch(review, /localStorage|indexedDB|caches\./i);
  assert.match(worker, /pdf-lib-1\.17\.1\/pdf-lib\.min\.js/);
  assert.doesNotMatch(worker, /\.pdf["']/i);
});
