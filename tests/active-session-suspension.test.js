"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const sql = fs.readFileSync(
  path.join(root, "supabase/migrations/20260830000100_enforce_active_account_on_existing_sessions.sql"),
  "utf8"
);
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");

test("status atual de app_profiles prevalece sobre o fallback legado", () => {
  assert.match(sql, /create or replace function public\.is_current_user_active\(\)/i);
  assert.match(sql, /not exists\s*\([\s\S]*from public\.app_profiles ap where ap\.user_id = auth\.uid\(\)/i);
  assert.match(sql, /when not public\.is_current_user_active\(\) then null/i);
  assert.match(sql, /where not exists\s*\([\s\S]*from public\.app_profiles ap where ap\.user_id = auth\.uid\(\)/i);
});

test("policies restritivas fecham todas as tabelas privadas para conta inativa", () => {
  assert.match(sql, /as restrictive for all to authenticated using \(public\.is_current_user_active\(\)\)/i);
  for (const table of [
    "app_profiles", "profiles", "students", "trainer_students", "student_invites",
    "trainer_invites", "workouts", "workout_exercises", "workout_logs", "assessments",
    "body_measurements", "alion_trash_records", "manutencao_logs"
  ]) {
    assert.match(sql, new RegExp(`'${table}'`, "i"));
  }
});

test("admin e profile id tambem dependem da conta ativa", () => {
  assert.match(sql, /is_current_admin_ti\(\)[\s\S]*is_current_user_active\(\)/i);
  assert.match(sql, /current_app_profile_id\(\)[\s\S]*is_current_user_active\(\)/i);
});

test("renderizador efetivo atualiza o painel de acesso junto com o aluno", () => {
  const activeRenderer = app.match(/async function renderTrainerProfile\(\)[\s\S]*?\n}\n/);
  assert.ok(activeRenderer, "renderTrainerProfile efetivo nao encontrado");
  assert.match(activeRenderer[0], /renderStudentAccessPanel\(null\)/);
  assert.match(activeRenderer[0], /renderStudentAccessPanel\(student\)/);
});

test("frontend distingue suspensao pelo RPC atual e encerra somente a sessao", () => {
  assert.match(app, /supabaseClient\.rpc\("is_current_user_active"\)/);
  assert.match(app, /data === true/);
  assert.match(app, /Sua conta está suspensa\. Procure o administrador\./);
  assert.match(app, /handleAuthLogout\(\{ skipConfirmation: true, silent: true \}\)/);
  assert.match(app, /error\.code = "ACCOUNT_SUSPENDED"/);
  assert.doesNotMatch(app, /removeItem\(PENDING_WORKOUT_LOGS_KEY\)/);
});
