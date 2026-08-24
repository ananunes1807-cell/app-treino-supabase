"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const upload = require("../modules/exercise-upload.js");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const file = (name, type, size = 1024) => ({ name, type, size });

test("aceita WEBP, PNG e JPEG coerentes", () => {
  assert.equal(upload.validateImageFile(file("exercicio.webp", "image/webp")).extension, "webp");
  assert.equal(upload.validateImageFile(file("exercicio.png", "image/png")).extension, "png");
  assert.equal(upload.validateImageFile(file("exercicio.jpeg", "image/jpeg")).extension, "jpg");
});

test("recusa formato, MIME/extensão divergentes e arquivo grande", () => {
  assert.throws(() => upload.validateImageFile(file("exercicio.gif", "image/gif")), /Formato não suportado/);
  assert.throws(() => upload.validateImageFile(file("exercicio.png", "image/webp")), /não corresponde/);
  assert.throws(() => upload.validateImageFile(file("exercicio.webp", "image/webp", upload.MAX_FILE_SIZE + 1)), /2 MB/);
});

test("gera nomes previsíveis para padrão, masculino e feminino", () => {
  assert.equal(upload.buildStoragePath("Cadeira Abdutora", "default", "webp"), "images/default/cadeira-abdutora.webp");
  assert.equal(upload.buildStoragePath("Cadeira Abdutora", "masculino", "webp"), "images/masculino/cadeira-abdutora-masculino.webp");
  assert.equal(upload.buildStoragePath("Cadeira Abdutora", "feminino", "webp"), "images/feminino/cadeira-abdutora-feminino.webp");
  assert.throws(() => upload.buildStoragePath("", "default", "webp"), /nome do exercício/);
});

test("admin envia com upsert e recebe URL pública no campo correto", async () => {
  const calls = [];
  const bucket = {
    upload: async (storagePath, selectedFile, options) => {
      calls.push({ storagePath, selectedFile, options });
      return { data: { path: storagePath }, error: null };
    },
    getPublicUrl: (storagePath) => ({ data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/exercise-media/${storagePath}` } })
  };
  const client = { storage: { from: (bucketName) => (assert.equal(bucketName, "exercise-media"), bucket) } };
  const result = await upload.uploadExerciseImage({ client, file: file("foto.webp", "image/webp"), exerciseName: "Cadeira Abdutora", variant: "feminino", isAdmin: true });
  assert.equal(result.field, "image_url_feminino");
  assert.equal(result.path, "images/feminino/cadeira-abdutora-feminino.webp");
  assert.equal(calls[0].options.upsert, true);
  assert.equal(calls[0].options.contentType, "image/webp");
  assert.match(result.publicUrl, /^https:\/\//);
});

test("usuário comum não inicia upload", async () => {
  let requestedStorage = false;
  const client = { storage: { from: () => { requestedStorage = true; } } };
  await assert.rejects(upload.uploadExerciseImage({ client, file: file("foto.png", "image/png"), exerciseName: "Teste", variant: "default", isAdmin: false }), /Somente o Admin legítimo/);
  assert.equal(requestedStorage, false);
});

test("interface, compatibilidade e policies usam a estrutura segura", () => {
  const index = read("index.html");
  const app = read("app.js");
  const media = read("modules/exercise-media.js");
  const migration = read("supabase/migrations/20260824000100_exercise_media_storage.sql");
  assert.equal((index.match(/data-exercise-image-file=/g) || []).length, 3);
  assert.match(index, /data-exercise-image-file="default"/);
  assert.match(index, /data-exercise-image-file="masculino"/);
  assert.match(index, /data-exercise-image-file="feminino"/);
  assert.match(app, /URL\.createObjectURL\(file\)/);
  assert.match(app, /form\.elements\[result\.field\]\.value = result\.publicUrl/);
  assert.match(app, /isAuthenticatedAdminTi\(\)/);
  assert.match(media, /assets\/exercicios\/\$\{folder\}/);
  assert.match(media, /return PLACEHOLDER/);
  assert.match(migration, /public\.is_current_admin_ti\(\)/);
  assert.match(migration, /file_size_limit/);
  assert.match(migration, /image\/webp/);
  assert.doesNotMatch(migration, /email/i);
});
