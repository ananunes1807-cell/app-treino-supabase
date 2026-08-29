"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const index = fs.readFileSync(path.join(root, "index.html"), "utf8");

assert.match(index, />Salvar aluno</);
assert.doesNotMatch(index, />Salvar e gerar convite</);
assert.match(app, /Aluno cadastrado com sucesso\./);
assert.match(app, /Deseja gerar o convite de acesso agora\?/);
assert.match(app, /data-student-invite-offer="generate"/);
assert.match(app, /data-student-invite-offer="later"/);
assert.match(app, /create_or_get_student_invite/);
assert.match(app, /replace_pending:\s*options\.forceNew === true/);
assert.match(app, /Este aluno ja possui um convite pendente/);
assert.match(app, /Adicione um e-mail ao aluno para gerar o convite de acesso/);
assert.match(app, /data-student-invite-link="copy"/);
assert.match(app, /data-student-invite-link="share"/);

console.log("student-invite-flow-ui: fluxo pós-cadastro validado estaticamente");
