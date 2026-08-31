const test = require("node:test"); const assert = require("node:assert/strict"); const fs = require("node:fs");
const read = (file) => fs.readFileSync(require("node:path").join(__dirname, "..", file), "utf8");
const html = read("index.html"); const app = read("app.js"); const review = read("modules/workout-import-review.js"); const worker = read("service-worker.js");

test("interface oferece V2 e mantém V1 disponível", () => {
  assert.match(html, /Ficha Rápida V2/); assert.match(html, /Ficha Padrão V1/); assert.match(app, /AlionWorkoutTemplateV2/); assert.match(app, /AlionWorkoutTemplateV1/);
});
test("revisão bloqueia pendências V2 e mostra orientação geral uma única vez", () => {
  assert.match(review, /unresolved_exceptions/); assert.match(review, /unresolved_others/); assert.match(review, /Adaptação\/Orientação geral do Treino/); assert.match(review, /data-apply-exception/);
});
test("V2 é local, cacheia apenas código estático e mantém a RPC existente", () => {
  assert.match(worker, /workout-template-v2\.js/); assert.doesNotMatch(worker, /\.pdf["']/i); assert.match(review, /alion_confirm_workout_import/); assert.doesNotMatch(review, /localStorage|indexedDB|caches\./i);
});
