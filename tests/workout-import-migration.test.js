const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20260831000100_workout_pdf_import_mvp.sql"), "utf8");
const rollback = fs.readFileSync(path.join(root, "supabase/rollback/20260831000100_workout_pdf_import_mvp.rollback.sql"), "utf8");

test("migration e aditiva e cria os campos aprovados", () => {
  for (const column of [
    "version_group_id", "version_number", "supersedes_workout_id", "source_type", "import_id", "day_label",
    "exercise_library_id", "original_exercise_name", "equipment", "cadence", "duration_text",
    "adaptation_notes", "progression_notes", "source_page"
  ]) assert.match(sql, new RegExp(`add column if not exists ${column}\\b`, "i"));
  assert.doesNotMatch(sql, /drop\s+(table|column)|truncate/i);
});

test("exercise_library_id aceita null e referencia a biblioteca", () => {
  assert.match(sql, /add column if not exists exercise_library_id uuid/i);
  assert.match(sql, /foreign key \(exercise_library_id\) references public\.exercise_library\(id\) on delete set null/i);
  assert.doesNotMatch(sql, /exercise_library_id uuid not null/i);
});

test("RPC exige Personal ativo e aluno proprio", () => {
  assert.match(sql, /current_app_role\(\) <> 'personal'/i);
  assert.match(sql, /current_app_profile_id\(\)/i);
  assert.match(sql, /coalesce\(student\.personal_id, student\.trainer_id\) = actor_profile_id/i);
  assert.match(sql, /grant execute on function public\.alion_confirm_workout_import\(uuid, jsonb, text\)\s+to authenticated/i);
  assert.match(sql, /revoke all on function public\.alion_confirm_workout_import\(uuid, jsonb, text\)\s+from public, anon/i);
});

test("RPC valida limites, UUIDs e biblioteca antes de concluir", () => {
  assert.match(sql, /workout_count not between 1 and 10/i);
  assert.match(sql, /exercise_count > 200/i);
  assert.match(sql, /parsed_sets not between 1 and 100/i);
  assert.match(sql, /library\.id = parsed_library_id/i);
  assert.match(sql, /raise exception 'Exercicio da biblioteca nao encontrado/i);
});

test("versionamento arquiva sem apagar treinos ou logs", () => {
  assert.match(sql, /set status = 'arquivado', active = false/i);
  assert.match(sql, /supersedes_workout_id/i);
  assert.match(sql, /coalesce\(previous_workout\.version_group_id, previous_workout\.id\)/i);
  assert.doesNotMatch(sql, /delete from public\.(workouts|workout_logs|workout_exercises)/i);
});

test("falha da RPC reverte a operacao completa por transacao PostgreSQL", () => {
  assert.match(sql, /language plpgsql[\s\S]*security definer/i);
  assert.doesNotMatch(sql, /exception\s+when\s+others[\s\S]*return/i);
  assert.match(sql, /insert into public\.workout_imports[\s\S]*insert into public\.workouts[\s\S]*insert into public\.workout_exercises/i);
});

test("rollback desabilita a funcao sem destruir dados importados", () => {
  assert.match(rollback, /drop function if exists public\.alion_confirm_workout_import/i);
  assert.match(rollback, /dados preservados/i);
  assert.doesNotMatch(rollback, /drop\s+(table|column)|truncate|delete from/i);
});

