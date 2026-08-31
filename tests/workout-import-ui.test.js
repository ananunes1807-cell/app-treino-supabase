const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const worker = fs.readFileSync(path.join(root, "service-worker.js"), "utf8");
const review = fs.readFileSync(path.join(root, "modules", "workout-import-review.js"), "utf8");

test("interface exige confirmação explícita antes da RPC", () => {
  assert.match(html, /id="workout-import-save"[^>]*>Salvar treino no Alion/);
  assert.match(review, /validateDraft\(draft\)/);
  assert.match(review, /alion_confirm_workout_import/);
  assert.doesNotMatch(review, /localStorage|indexedDB|caches\./i);
});

test("múltiplas fichas bloqueiam o salvamento até a escolha explícita", () => {
  assert.match(review, /requires_fixture_selection/);
  assert.match(review, /selectFixture/);
  assert.match(review, /saveButton\.disabled = true/);
  assert.match(review, /Itens que precisam de revisão/);
});

test("PDF.js usa versão fixa local e worker local", () => {
  assert.match(html, /assets\/vendor\/pdfjs-3\.11\.174\/pdf\.min\.js/);
  assert.match(review, /assets\/vendor\/pdfjs-3\.11\.174\/pdf\.worker\.min\.js/);
  assert.equal(fs.existsSync(path.join(root, "assets", "vendor", "pdfjs-3.11.174", "pdf.min.js")), true);
  assert.equal(fs.existsSync(path.join(root, "assets", "vendor", "pdfjs-3.11.174", "pdf.worker.min.js")), true);
});

test("cancelamento libera documento e referências locais", () => {
  assert.match(review, /abortController\?\.abort\(\)/);
  assert.match(review, /previewDocument\.destroy\(\)/);
  assert.match(review, /previewDocument = null; file = null; draft = null/);
});

test("service worker cacheia apenas o leitor e módulos estáticos", () => {
  assert.match(worker, /pdfjs-3\.11\.174\/pdf\.worker\.min\.js/);
  assert.doesNotMatch(worker, /application\/pdf|\.pdf["']/);
  assert.match(app, /AlionWorkoutImportReview\?\.initialize/);
});
