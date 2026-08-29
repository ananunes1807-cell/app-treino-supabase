"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const sql = fs.readFileSync(path.resolve(__dirname, "../supabase/migrations/20260829000200_fix_student_invite_profile_ambiguity.sql"), "utf8");

assert.match(sql, /v_current_profile_id uuid := public\.current_app_profile_id\(\)/i);
assert.match(sql, /from public\.students as s[\s\S]*coalesce\(s\.personal_id, s\.trainer_id\) = v_current_profile_id/i);
assert.doesNotMatch(sql, /declare\s+profile_id uuid/i);
assert.match(sql, /create_or_get_student_invite/i);
assert.match(sql, /pg_advisory_xact_lock/i);
assert.match(sql, /v_existing_invite\.expires_at > now\(\) and not replace_pending/i);
assert.match(sql, /O e-mail do convite deve ser o mesmo e-mail cadastrado no aluno/i);
assert.match(sql, /revoke all on function public\.create_or_get_student_invite\(uuid, text, boolean\)[\s\S]*from public, anon/i);

console.log("student-invite-ambiguity-migration: SQL validado");
