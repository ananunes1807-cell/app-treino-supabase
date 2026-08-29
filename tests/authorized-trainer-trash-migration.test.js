const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const sql = fs.readFileSync(path.join(root, "supabase/migrations/20260829000100_alion_authorized_trainers_and_trash_fix.sql"), "utf8");

test("autocadastro de perfis privilegiados fica bloqueado", () => {
  assert.match(sql, /drop policy if exists alion_app_profiles_insert_self/i);
  assert.match(sql, /Perfil somente pode ser criado por convite autorizado/i);
  assert.match(sql, /create policy alion_app_profiles_insert_controlled[\s\S]*is_current_admin_ti/i);
  assert.match(sql, /create policy alion_profiles_insert_controlled[\s\S]*is_current_admin_ti/i);
});

test("convite de treinador é administrado, expirável e de uso único", () => {
  assert.match(sql, /create table if not exists public\.trainer_invites/i);
  assert.match(sql, /admin_create_trainer_invite/i);
  assert.match(sql, /accept_trainer_invite/i);
  assert.match(sql, /created_by uuid not null references auth\.users/i);
  assert.match(sql, /status text not null default 'pendente'/i);
  assert.match(sql, /accepted_user_id uuid/i);
  assert.match(sql, /expires_at timestamptz/i);
});

test("role depende de status ativo", () => {
  assert.match(sql, /current_app_role\(\)[\s\S]*status_usuario,'ativo'\)='ativo'/i);
  assert.match(sql, /is_current_admin_ti\(\)[\s\S]*status_usuario,'ativo'\)='ativo'/i);
});

test("lixeira usa profile id e bloqueia adulteração direta", () => {
  assert.match(sql, /owner_profile_id=public\.current_app_profile_id\(\)/i);
  assert.doesNotMatch(sql, /owner_profile_id\s*=\s*auth\.uid\(\)/i);
  assert.match(sql, /protect_soft_delete_fields/i);
  for (const field of ["deleted_at", "deleted_by", "purge_after"]) assert.match(sql, new RegExp(field, "i"));
  assert.match(sql, /revoke select on public\.alion_trash_records from anon/i);
});

test("expurgo é interno e preserva históricos dependentes", () => {
  assert.match(sql, /alion_purge_expired_trash_internal/i);
  assert.match(sql, /revoke all on function public\.alion_purge_expired_trash_internal\(\) from public,anon,authenticated,service_role/i);
  assert.match(sql, /Treino possui histórico de execução/i);
  assert.match(sql, /Aluno requer revisão administrativa de dependências/i);
  assert.match(sql, /to_regclass\('cron\.job'\) is null/i);
  assert.match(sql, /execute 'select cron\.schedule\(\$1,\$2,\$3\)'/i);
});
