const test = require("node:test");
const assert = require("node:assert/strict");
const extractor = require("../modules/workout-pdf-extractor.js");

test("itens são agrupados e ordenados por posição visual", () => {
  const lines = extractor.buildLines([
    { str: "12", transform: [1, 0, 0, 10, 120, 700] },
    { str: "3 x", transform: [1, 0, 0, 10, 80, 700] },
    { str: "Leg press", transform: [1, 0, 0, 12, 20, 700] },
    { str: "Treino A", transform: [1, 0, 0, 18, 20, 750] }
  ]);
  assert.deepEqual(lines.map((line) => line.text), ["Treino A", "Leg press 3 x 12"]);
});

test("erros de senha e arquivo inválido têm mensagens públicas", () => {
  assert.match(extractor.friendlyPdfError({ name: "PasswordException" }), /protegido por senha/);
  assert.match(extractor.friendlyPdfError({ name: "InvalidPDFException" }), /Não conseguimos abrir/);
});
