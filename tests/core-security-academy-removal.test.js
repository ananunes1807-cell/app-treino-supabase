"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const app = read("app.js");
const index = read("index.html");
const serviceWorker = read("service-worker.js");
const pwa = read("modules/pwa.js");
const security = read("modules/security.js");
const migrationPath = "supabase/migrations/20260823000100_alion_core_security_remove_academia.sql";
const manualSqlPath = "sql/027_alion_core_security_remove_academia.sql";
const migration = read(migrationPath);

// Academia não possui mais entrada, tela, cadastro, estado, fetch ou handlers no frontend.
for (const forbidden of [
  "screen-academy-area",
  "data-login-role=\"owner\"",
  "gestor_academia",
  "trainer-academy-link-form",
  "academy_attendance",
  "academy_financials",
  "renderAcademyArea",
  "saveAcademy"
]) {
  assert.equal(index.includes(forbidden) || app.includes(forbidden), false, `Frontend ainda contém ${forbidden}`);
}
assert.match(app, /academy_id:\s*null/);
assert.match(app, /academy_status:\s*"independente"/);

// Admin é validado por RPC/UUID; convite não faz escrita estrutural direta.
assert.match(app, /rpc\("is_current_admin_ti"\)/);
assert.match(app, /rpc\("accept_student_invite_link"/);
assert.equal(app.includes("ADMIN_EMAIL"), false);
assert.equal(app.includes("handleBootstrapAdmin"), false);
assert.equal(app.includes('.from("trainer_students").upsert'), false);
assert.match(app, /function cancelTrainerEditModes\(\)/);
assert.match(app, /admin_preview_student_maintenance/);
assert.match(app, /admin_preview_workout_deletion/);
assert.match(
  index,
  /<\/article>\s*<\/div>\s*<\/section>\s*<section class="screen" id="screen-admin-area">/,
  "A area Admin deve ficar fora da section do Personal"
);

// O helper legado também não trata e-mail como identidade administrativa.
assert.equal(security.includes("ananunes1807@gmail.com"), false);
assert.match(security, /trustedServerFlag === true/);

// PWA: apenas mesma origem, vídeos fora do cache, atualização e limpeza limitadas ao Alion.
assert.match(serviceWorker, /requestUrl\.origin !== self\.location\.origin/);
assert.match(serviceWorker, /isExerciseVideo[\s\S]*fetch\(event\.request\)/);
assert.match(serviceWorker, /key\.startsWith\("alion-pwa-"\)/);
assert.equal(serviceWorker.includes("supabase.co"), false);
assert.match(pwa, /controllerchange/);
assert.match(pwa, /registration\.update\(\)/);
const shellSource = serviceWorker.match(/const APP_SHELL = \[([\s\S]*?)\];/)?.[1] || "";
const shellPaths = [...shellSource.matchAll(/"(\.\/[^\"]+)"/g)].map((match) => match[1]);
for (const shellPath of shellPaths) {
  const localPath = shellPath.split("?")[0].replace(/^\.\//, "") || "index.html";
  assert.equal(fs.existsSync(path.join(root, localPath)), true, `Arquivo do APP_SHELL ausente: ${localPath}`);
}

// Migração cumulativa endurece o núcleo e apenas congela o legado Academia.
for (const expected of [
  "alion_admin_identities",
  "is_current_admin_ti",
  "protect_app_profile_identity",
  "protect_student_ownership",
  "protect_student_invite_ownership",
  "accept_student_invite_link",
  "admin_preview_maintenance",
  "admin_preview_student_maintenance",
  "admin_preview_workout_deletion",
  "alion_students_select",
  "alion_workouts_write",
  "alion_academies_legacy_admin_read"
]) {
  assert.equal(migration.includes(expected), true, `Migração sem ${expected}`);
}
assert.equal(/drop\s+table/i.test(migration), false);
assert.equal(/drop\s+column/i.test(migration), false);
assert.equal(read(manualSqlPath).trimEnd(), migration.trimEnd());

console.log("core-security-academy-removal: regressões estáticas validadas");
