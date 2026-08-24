"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const workoutData = require("../modules/workout-data.js");

const root = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const silentLogger = { error() {}, warn() {} };

function missingColumnError(table, column) {
  return new Error(`Could not find the '${column}' column of '${table}' in the schema cache`);
}

test("campos canonicos tem prioridade e aliases antigos continuam legiveis", () => {
  assert.equal(workoutData.getWorkoutName({ name: "Novo", title: "Antigo" }), "Novo");
  assert.equal(workoutData.getWorkoutObjective({ objective: "Hipertrofia" }, "Objetivo não informado"), "Hipertrofia");
  assert.equal(workoutData.getWorkoutObjective({ goal: "Força" }), "Força");
  assert.equal(workoutData.getWorkoutObjective({ description: "Mobilidade" }), "Mobilidade");
  assert.equal(workoutData.getWorkoutObjective({ objetivo: "Resistência" }), "Resistência");
  assert.equal(workoutData.getWorkoutObjective({ notes: "Evitar impacto" }, "Objetivo não informado"), "Objetivo não informado");
  assert.equal(workoutData.getWorkoutNotes({ notes: "Evitar impacto", description: "Fortalecimento" }), "Evitar impacto");
  assert.equal(workoutData.getWorkoutNotes({ description: "Fortalecimento" }), "");
});

test("criacao e edicao preservam nome, objetivo e observacoes apos releitura", async () => {
  const creationInput = {
    name: "Treino Teste",
    objective: "Fortalecimento de membros inferiores",
    notes: "Evitar impacto no joelho"
  };
  const creationPayload = {
    student_id: "student-1",
    ...workoutData.buildWorkoutFields(creationInput),
    status: "ativo"
  };
  let storedWorkout = null;

  const created = await workoutData.runWithSchemaFallback({
    tableName: "workouts",
    payload: creationPayload,
    fallbackMessage: "Erro ao criar treino",
    logger: silentLogger,
    execute: async (payload) => {
      storedWorkout = { id: "workout-1", ...payload };
      return [storedWorkout];
    }
  });
  const savedCreation = workoutData.assertPersistedWorkout(created, creationInput, "Erro ao criar treino");
  const reloadedCreation = { ...storedWorkout };

  assert.equal(savedCreation.name, creationInput.name);
  assert.equal(reloadedCreation.name || reloadedCreation.title, creationInput.name);
  assert.equal(reloadedCreation.objective, creationInput.objective);
  assert.equal(reloadedCreation.notes, creationInput.notes);

  const editionInput = {
    name: "Treino Teste Atualizado",
    objective: "Estabilidade e força",
    notes: "Sem saltos; respeitar limite do joelho"
  };
  const editionPayload = workoutData.buildWorkoutFields(editionInput);
  const updated = await workoutData.runWithSchemaFallback({
    tableName: "workouts",
    payload: editionPayload,
    fallbackMessage: "Erro ao editar treino",
    logger: silentLogger,
    execute: async (payload) => {
      storedWorkout = { ...storedWorkout, ...payload };
      return [storedWorkout];
    }
  });
  workoutData.assertPersistedWorkout(updated, editionInput, "Erro ao editar treino");
  const reloadedEdition = { ...storedWorkout };

  assert.equal(reloadedEdition.name, editionInput.name);
  assert.equal(reloadedEdition.objective, editionInput.objective);
  assert.equal(reloadedEdition.notes, editionInput.notes);
  assert.equal(reloadedEdition.student_id, "student-1");
  assert.equal(reloadedEdition.status, "ativo");
});

test("fallback remove somente aliases legados e mantem os campos canonicos", async () => {
  const input = { name: "Treino A", objective: "Força", notes: "Controle de carga" };
  const originalPayload = workoutData.buildWorkoutFields(input);
  let persistedPayload = null;
  let attempts = 0;

  const result = await workoutData.runWithSchemaFallback({
    tableName: "workouts",
    payload: originalPayload,
    fallbackMessage: "Erro ao criar treino",
    logger: silentLogger,
    execute: async (payload) => {
      attempts += 1;
      const missingAlias = ["title", "goal", "description"].find((column) => column in payload);
      if (missingAlias) throw missingColumnError("workouts", missingAlias);
      persistedPayload = payload;
      return [{ id: "workout-legacy-schema", ...payload }];
    }
  });

  assert.equal(attempts, 4);
  assert.equal(persistedPayload.name, input.name);
  assert.equal(persistedPayload.objective, input.objective);
  assert.equal(persistedPayload.notes, input.notes);
  assert.equal("goal" in persistedPayload, false);
  workoutData.assertPersistedWorkout(result, input);
});

test("fallback recusa colunas canonicas ausentes sem retornar sucesso", async () => {
  for (const scenario of [
    { tableName: "workouts", column: "name", payload: { name: "Treino" } },
    { tableName: "workouts", column: "objective", payload: { objective: "Hipertrofia" } },
    { tableName: "workouts", column: "notes", payload: { notes: "Evitar impacto" } },
    { tableName: "students", column: "objective", payload: { objective: "Condicionamento" } },
    { tableName: "students", column: "notes", payload: { notes: "Rotina noturna" } }
  ]) {
    let attempts = 0;
    await assert.rejects(
      workoutData.runWithSchemaFallback({
        tableName: scenario.tableName,
        payload: scenario.payload,
        fallbackMessage: "Erro ao salvar",
        logger: silentLogger,
        execute: async () => {
          attempts += 1;
          throw missingColumnError(scenario.tableName, scenario.column);
        }
      }),
      (error) => error.code === "ALION_SCHEMA_MISMATCH"
        && error.table === scenario.tableName
        && error.column === scenario.column
        && error.message.includes(workoutData.CANONICAL_SCHEMA_MIGRATION)
    );
    assert.equal(attempts, 1, `${scenario.tableName}.${scenario.column} nao deve ser descartado e retentado`);
  }
});

test("fallback recusa qualquer coluna nao classificada e nunca executa payload vazio", async () => {
  let attempts = 0;
  await assert.rejects(
    workoutData.runWithSchemaFallback({
      tableName: "student_invites",
      payload: { status: "cancelado" },
      fallbackMessage: "Erro ao cancelar convite",
      logger: silentLogger,
      execute: async () => {
        attempts += 1;
        throw missingColumnError("student_invites", "status");
      }
    }),
    (error) => error.code === "ALION_SCHEMA_MISMATCH" && error.column === "status"
  );
  assert.equal(attempts, 1);

  attempts = 0;
  await assert.rejects(
    workoutData.runWithSchemaFallback({
      tableName: "student_invites",
      payload: { name: "Ana" },
      fallbackMessage: "Erro ao criar convite",
      logger: silentLogger,
      execute: async () => {
        attempts += 1;
        throw missingColumnError("student_invites", "name");
      }
    }),
    (error) => error.code === "ALION_SCHEMA_MISMATCH" && error.column === "name"
  );
  assert.equal(attempts, 1, "um alias unico nao pode virar insert/update com payload vazio");
});

test("campo opcional vazio pode ser omitido, mas valor preenchido nunca e descartado", async () => {
  let attempts = 0;
  const saved = await workoutData.runWithSchemaFallback({
    tableName: "exercise_library",
    payload: { name: "Agachamento", posture: null },
    fallbackMessage: "Erro ao salvar exercicio",
    logger: silentLogger,
    execute: async (payload) => {
      attempts += 1;
      if ("posture" in payload) throw missingColumnError("exercise_library", "posture");
      return [payload];
    }
  });
  assert.equal(attempts, 2);
  assert.deepEqual(saved, [{ name: "Agachamento" }]);

  attempts = 0;
  await assert.rejects(workoutData.runWithSchemaFallback({
    tableName: "exercise_library",
    payload: { name: "Agachamento", posture: "Manter tronco neutro" },
    fallbackMessage: "Erro ao salvar exercicio",
    logger: silentLogger,
    execute: async () => {
      attempts += 1;
      throw missingColumnError("exercise_library", "posture");
    }
  }), (error) => error.code === "ALION_SCHEMA_MISMATCH" && error.column === "posture");
  assert.equal(attempts, 1);
});

test("erro de schema registra tabela, coluna e migration canonica", async () => {
  const logged = [];
  await assert.rejects(workoutData.runWithSchemaFallback({
    tableName: "workouts",
    payload: { objective: "Hipertrofia" },
    fallbackMessage: "Erro ao criar treino",
    logger: { warn() {}, error(message, metadata) { logged.push({ message, metadata }); } },
    execute: async () => {
      throw missingColumnError("workouts", "objective");
    }
  }));

  assert.equal(logged.length, 1);
  assert.equal(logged[0].metadata.table, "workouts");
  assert.equal(logged[0].metadata.column, "objective");
  assert.equal(logged[0].metadata.migration, workoutData.CANONICAL_SCHEMA_MIGRATION);
});

test("parser reconhece mensagens PostgREST e PostgreSQL de coluna ausente", () => {
  assert.equal(workoutData.getMissingColumnFromError(missingColumnError("workouts", "objective").message), "objective");
  assert.equal(workoutData.getMissingColumnFromError("column workouts.notes does not exist"), "notes");
  assert.equal(workoutData.getMissingColumnFromError("column public.workouts.objective does not exist"), "objective");
  assert.equal(workoutData.getMissingColumnFromError('column "notes" of relation "students" does not exist'), "notes");
});

test("confirmacao de persistencia impede toast de sucesso sem linha ou com valor divergente", () => {
  const input = { name: "Treino", objective: "Força", notes: "Sem impacto" };
  assert.throws(
    () => workoutData.assertPersistedWorkout([], input),
    /nao confirmou nenhuma linha salva/
  );
  assert.throws(
    () => workoutData.assertPersistedWorkout([{ name: "Treino", objective: null, notes: "Sem impacto" }], input),
    /objective/
  );
});

test("integracao usa objective no formulario e edicao nao altera ownership ou status", () => {
  const app = read("app.js");
  const index = read("index.html");
  const serviceWorker = read("service-worker.js");
  const createWorkoutSource = app.match(/async function createWorkout\(form\) \{[\s\S]+?(?=async function addExerciseToWorkout\()/)?.[0] || "";
  const editBranch = createWorkoutSource.match(/if \(editId\) \{([\s\S]+?)\n    \} else \{/)?.[1] || "";

  assert.match(index, /id="new-workout-form"[\s\S]*name="objective"/);
  assert.doesNotMatch(index.match(/id="new-workout-form"[\s\S]*?<\/form>/)?.[0] || "", /name="goal"/);
  assert.match(index, /modules\/workout-data\.js\?v=/);
  assert.match(serviceWorker, /modules\/workout-data\.js\?v=/);
  assert.match(createWorkoutSource, /buildWorkoutFields\(workoutInput\)/);
  assert.match(editBranch, /updateWithSchemaFallback\("workouts", editId, workoutFields/);
  assert.doesNotMatch(editBranch, /student_id|personal_id|trainer_id|created_by|status:\s*"ativo"/);
  assert.match(app, /setFormControlValue\(form, "objective", getWorkoutObjective\(record, ""\)\)/);
  assert.match(app, /assertPersistedWorkout\(updated, workoutInput/);
});

test("migration e estritamente aditiva e nao reabre acesso anon", () => {
  const migration = read("supabase/migrations/20260824000300_workout_objective_notes.sql");
  const manualSql = read("sql/030_workout_objective_notes.sql");

  assert.match(migration, /alter table public\.workouts[\s\S]*add column if not exists name text[\s\S]*add column if not exists objective text[\s\S]*add column if not exists notes text/i);
  assert.match(migration, /alter table public\.students[\s\S]*add column if not exists objective text[\s\S]*add column if not exists notes text/i);
  assert.doesNotMatch(migration, /grant\s+[^;]*\s+to\s+anon|create\s+policy|disable\s+row\s+level\s+security|drop\s+column/i);
  assert.match(manualSql, /add column if not exists objective text/i);
  assert.doesNotMatch(manualSql, /\bgrant\b|create\s+policy|drop\s+column/i);
});
