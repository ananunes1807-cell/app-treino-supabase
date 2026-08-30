"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20260830000200_trash_purge_scheduler_rpc.sql"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/alion-trash-purge.yml"), "utf8");

test("scheduler executa diariamente e tambem permite disparo manual", () => {
  assert.match(workflow, /cron:\s*"15 6 \* \* \*"/);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /cancel-in-progress:\s*false/);
});

test("workflow usa somente secret e chama a RPC dedicada", () => {
  assert.match(workflow, /secrets\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(workflow, /rpc\/alion_run_scheduled_trash_purge/);
  assert.doesNotMatch(workflow, /sb_secret_|service_role\s*[:=]\s*["'][A-Za-z0-9_-]{20,}/i);
  assert.doesNotMatch(workflow, /checkout|deploy|git push/i);
});

test("RPC nao depende de usuario humano e e exclusiva do service role", () => {
  assert.doesNotMatch(sql, /auth\.uid\(\)/i);
  assert.match(sql, /revoke all on function public\.alion_run_scheduled_trash_purge\(\) from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.alion_run_scheduled_trash_purge\(\) to service_role/i);
});

test("expurgo preserva historico e registra bloqueios", () => {
  assert.match(sql, /purge_after <= now\(\)/i);
  assert.match(sql, /treino possui histórico de execução/i);
  assert.match(sql, /aluno requer revisão administrativa/i);
  assert.match(sql, /exercício ainda está sendo utilizado/i);
  assert.match(sql, /foreign_key_violation/i);
});

test("cada execucao registra contagens e falhas sem dados pessoais", () => {
  for (const field of ["scanned_count", "purged_count", "blocked_count", "error_count", "error_summary"]) {
    assert.match(sql, new RegExp(field, "i"));
  }
  assert.match(sql, /trash_purge_scheduled/i);
});
