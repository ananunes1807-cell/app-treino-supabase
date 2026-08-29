const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("login público não oferece Google nem administrador", () => {
  const html = read("index.html");
  const app = read("app.js");
  assert.doesNotMatch(html, /google-login-button|Entrar com Google/i);
  assert.doesNotMatch(app, /signInWithOAuth|provider:\s*["']google/i);
  assert.doesNotMatch(html.match(/id="login-role-picker"[\s\S]*?<\/div>\s*<\/div>/)?.[0] || "", /data-login-role="admin"/);
});

test("credenciais não podem ser vistas ou sobrescritas pela interface", () => {
  const html = read("index.html");
  const config = read("supabase.js");
  assert.doesNotMatch(html, /admin-supabase-(url|key)|copy-supabase/);
  assert.doesNotMatch(config, /app-treino-supabase-config|localStorage\.setItem/);
  assert.match(config, /storageKey:\s*SUPABASE_AUTH_STORAGE_KEY/);
});

test("migração revoga DELETE e implementa lixeira de 60 dias", () => {
  const sql = read("supabase/migrations/20260825000100_alion_trash_audit_security.sql");
  assert.match(sql, /revoke delete on public\.students[\s\S]*from authenticated/i);
  assert.match(sql, /interval '60 days'/i);
  assert.match(sql, /alion_soft_delete_owned_record/i);
  assert.match(sql, /alion_restore_trash/i);
  assert.match(sql, /alion_purge_expired_trash/i);
  assert.match(sql, /revoke execute on function public\.admin_delete_test_students/i);
});
