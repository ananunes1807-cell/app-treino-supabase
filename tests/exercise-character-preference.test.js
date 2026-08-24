"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const media = require("../modules/exercise-media.js");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const images = {
  id: "exercise-1",
  image_url: "assets/exercicios/imagens/legacy.webp",
  image_url_masculino: "assets/exercicios/imagens/masculino.webp",
  image_url_feminino: "assets/exercicios/imagens/feminino.webp"
};
const resolve = (options = {}) => media.resolveExerciseImage({ exercise: images, studentId: "student-1", exerciseId: images.id, ...options });

test("preferência inicial deriva somente uma vez da identidade cadastrada", () => {
  assert.equal(media.resolveCharacterPreference("", "masculino"), "masculine");
  assert.equal(media.resolveCharacterPreference("", "feminino"), "feminine");
  assert.equal(media.resolveCharacterPreference("", "nao_binario"), "random");
  assert.equal(media.resolveCharacterPreference("", "outro"), "random");
  assert.equal(media.resolveCharacterPreference("", "prefiro_nao_informar"), "random");
  assert.equal(media.resolveCharacterPreference("", ""), "random");
});

test("preferência explícita tem prioridade sobre gênero", () => {
  assert.equal(resolve({ preference: "feminine", gender: "masculino" }), images.image_url_feminino);
  assert.equal(resolve({ preference: "masculine", gender: "feminino" }), images.image_url_masculino);
});

test("aleatório é estável no rerender e varia entre chaves", () => {
  const first = resolve({ preference: "random" });
  for (let index = 0; index < 10; index += 1) assert.equal(resolve({ preference: "random" }), first);
  const variants = new Set(Array.from({ length: 20 }, (_, index) => (
    media.getStableCharacterVariant(`student-${index}`, images.id)
  )));
  assert.deepEqual([...variants].sort(), ["feminine", "masculine"]);
});

test("fallbacks respeitam variante oposta, legado e placeholder", () => {
  assert.equal(media.resolveExerciseImage({ exercise: { ...images, image_url_masculino: "" }, preference: "masculine" }), images.image_url_feminino);
  assert.equal(media.resolveExerciseImage({ exercise: { ...images, image_url_feminino: "" }, preference: "feminine" }), images.image_url_masculino);
  assert.equal(media.resolveExerciseImage({ exercise: { image_url: images.image_url }, preference: "random" }), images.image_url);
  assert.equal(media.resolveExerciseImage({ exercise: {}, preference: "random" }), media.PLACEHOLDER);
});

test("random usa a única variante disponível e retorna uma única URL", () => {
  assert.equal(media.resolveExerciseImage({ exercise: { image_url_masculino: images.image_url_masculino }, preference: "random" }), images.image_url_masculino);
  assert.equal(media.resolveExerciseImage({ exercise: { image_url_feminino: images.image_url_feminino }, preference: "random" }), images.image_url_feminino);
  assert.equal(typeof resolve({ preference: "random" }), "string");
});

test("interface e RPC limitam a alteração ao campo permitido", () => {
  const index = read("index.html");
  const app = read("app.js");
  const migration = read("supabase/migrations/20260824000200_exercise_character_preference.sql");
  assert.match(index, /id="student-character-preference-form"/);
  assert.match(index, /value="masculine"/);
  assert.match(index, /value="feminine"/);
  assert.match(index, /value="random"/);
  assert.doesNotMatch(index.match(/id="admin-exercise-library-form"[\s\S]*?<\/form>/)?.[0] || "", /Imagem padrão|data-exercise-image-file="default"/);
  assert.match(app, /rpc\("update_my_exercise_character_preference"/);
  assert.match(migration, /check \([\s\S]*'masculine', 'feminine', 'random'/);
  assert.match(migration, /set exercise_character_preference = normalized_preference/);
  assert.doesNotMatch(migration, /set\s+(role|personal_id|trainer_id|academy_id)\s*=/i);
  assert.match(migration, /revoke all on function public\.update_my_exercise_character_preference\(text\) from public, anon/);
});
