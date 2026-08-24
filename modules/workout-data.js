(function initializeWorkoutData(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutData = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutData() {
  "use strict";

  const CANONICAL_SCHEMA_MIGRATION = "20260824000300_workout_objective_notes.sql";
  const PROTECTED_SCHEMA_COLUMNS = Object.freeze({
    workouts: Object.freeze(["name", "objective", "notes"]),
    students: Object.freeze(["objective", "notes"])
  });
  const LEGACY_SCHEMA_COLUMNS = Object.freeze({
    app_profiles: Object.freeze(["nome", "academy_id", "academy_link_status", "independent_personal"]),
    student_invites: Object.freeze(["name"]),
    students: Object.freeze(["telefone", "whatsapp", "contact", "academy_id", "academy_status"]),
    assessments: Object.freeze([
      "objetivo", "data_avaliacao", "data_reavaliacao", "weight_kg", "peso",
      "height_cm", "altura", "estatura_cm", "body_fat_percentage", "body_fat_percent",
      "gordura_corporal", "percentual_gordura_atual", "lean_mass", "muscle_mass_kg",
      "massa_muscular", "gordura_visceral", "body_water_percent", "body_water_percentage",
      "agua_corporal", "imc"
    ]),
    body_measurements: Object.freeze([
      "chest_cm", "waist_cm", "cintura", "abdomen_cm", "abdome", "hip_cm", "quadril",
      "right_arm_cm", "left_arm_cm", "arm", "arm_cm", "arms_cm", "arms", "bracos",
      "right_thigh_cm", "left_thigh_cm", "thigh", "thigh_cm", "thighs_cm", "thighs", "coxas",
      "right_calf_cm", "left_calf_cm", "calf", "calf_cm", "calves_cm", "calves", "panturrilhas"
    ]),
    workouts: Object.freeze(["title", "goal", "description"]),
    workout_exercises: Object.freeze(["exercise_id"])
  });

  function pick(record, keys, fallback = "") {
    for (const key of keys) {
      const value = record?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return fallback;
  }

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function textOrNull(value) {
    const text = cleanText(value);
    return text || null;
  }

  function getWorkoutName(workout, fallback = "") {
    return pick(workout, ["name", "title", "nome"], fallback);
  }

  function getWorkoutObjective(workout, fallback = "") {
    return pick(workout, ["objective", "goal", "description", "objetivo"], fallback);
  }

  function getWorkoutNotes(workout, fallback = "") {
    return pick(workout, ["notes"], fallback);
  }

  function buildWorkoutFields({ name, objective, notes } = {}) {
    const canonicalName = cleanText(name);
    const canonicalObjective = textOrNull(objective);

    return {
      name: canonicalName,
      title: canonicalName,
      objective: canonicalObjective,
      goal: canonicalObjective,
      description: canonicalObjective,
      notes: textOrNull(notes)
    };
  }

  function getMissingColumnFromError(message) {
    const text = String(message || "");
    const quotedMatch = text.match(/'([^']+)' column/);
    if (quotedMatch) return quotedMatch[1];

    const relationMatch = text.match(/column ["']?([a-zA-Z0-9_]+)["']? of relation ["'][^"']+["'] does not exist/i);
    if (relationMatch) return relationMatch[1];

    const columnMatch = text.match(/column (?:[a-zA-Z0-9_]+\.)+([a-zA-Z0-9_]+) does not exist/i);
    if (columnMatch) return columnMatch[1];

    const unqualifiedMatch = text.match(/column ["']?([a-zA-Z0-9_]+)["']? does not exist/i);
    if (unqualifiedMatch) return unqualifiedMatch[1];

    return "";
  }

  function isProtectedSchemaColumn(tableName, columnName, requiredColumns = []) {
    const protectedColumns = PROTECTED_SCHEMA_COLUMNS[tableName] || [];
    return protectedColumns.includes(columnName) || requiredColumns.includes(columnName);
  }

  function isEmptyOptionalValue(value) {
    return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
  }

  function createSchemaMismatchError(tableName, columnName, fallbackMessage, cause) {
    const error = new Error(
      `${fallbackMessage}: o banco esta desatualizado e nao possui a coluna obrigatoria `
      + `public.${tableName}.${columnName}. Aplique a migration ${CANONICAL_SCHEMA_MIGRATION}. `
      + "Os dados informados nao foram salvos."
    );
    error.name = "SchemaMismatchError";
    error.code = "ALION_SCHEMA_MISMATCH";
    error.table = tableName;
    error.column = columnName;
    error.cause = cause;
    return error;
  }

  function createUnsafeFallbackError(tableName, columnName, fallbackMessage, cause) {
    const error = new Error(
      `${fallbackMessage}: o schema nao possui public.${tableName}.${columnName}. `
      + "Essa coluna nao esta classificada como alias legado descartavel, entao a operacao foi cancelada "
      + "para evitar perda silenciosa de dados."
    );
    error.name = "SchemaMismatchError";
    error.code = "ALION_SCHEMA_MISMATCH";
    error.table = tableName;
    error.column = columnName;
    error.cause = cause;
    return error;
  }

  function assertPersistedWorkout(result, expectedFields, fallbackMessage = "Erro ao salvar treino") {
    const saved = Array.isArray(result) ? result[0] : result;
    const expected = buildWorkoutFields(expectedFields);
    const mismatches = [];

    if (!saved) {
      throw new Error(`${fallbackMessage}: o Supabase nao confirmou nenhuma linha salva.`);
    }
    if (cleanText(getWorkoutName(saved)) !== cleanText(expected.name)) mismatches.push("name");
    if (!Object.prototype.hasOwnProperty.call(saved, "objective")
        || cleanText(saved.objective) !== cleanText(expected.objective)) mismatches.push("objective");
    if (!Object.prototype.hasOwnProperty.call(saved, "notes")
        || cleanText(saved.notes) !== cleanText(expected.notes)) mismatches.push("notes");

    if (mismatches.length) {
      throw new Error(
        `${fallbackMessage}: o Supabase nao confirmou os campos canonicos ${mismatches.join(", ")}. `
        + "Atualize os dados antes de tentar novamente."
      );
    }

    return saved;
  }

  async function runWithSchemaFallback({
    tableName,
    payload,
    fallbackMessage,
    execute,
    requiredColumns = [],
    droppableColumns,
    logger = console
  }) {
    if (typeof execute !== "function") {
      throw new TypeError("runWithSchemaFallback requer uma funcao execute.");
    }

    let currentPayload = { ...payload };
    const maxAttempts = Object.keys(currentPayload).length + 2;
    const allowedFallbackColumns = droppableColumns || LEGACY_SCHEMA_COLUMNS[tableName] || [];

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        return await execute({ ...currentPayload });
      } catch (error) {
        const missingColumn = getMissingColumnFromError(error?.message);

        if (!missingColumn || !(missingColumn in currentPayload)) {
          throw error;
        }

        if (isProtectedSchemaColumn(tableName, missingColumn, requiredColumns)) {
          logger?.error?.("[Alion Treinos] Campo canonico ausente no schema; operacao cancelada.", {
            table: tableName,
            column: missingColumn,
            migration: CANONICAL_SCHEMA_MIGRATION,
            originalError: error
          });
          throw createSchemaMismatchError(tableName, missingColumn, fallbackMessage, error);
        }

        const isLegacyAlias = allowedFallbackColumns.includes(missingColumn);
        const isEmptyOptionalColumn = isEmptyOptionalValue(currentPayload[missingColumn]);
        if (!isLegacyAlias && !isEmptyOptionalColumn) {
          logger?.error?.("[Alion Treinos] Fallback recusado para coluna nao classificada como alias legado.", {
            table: tableName,
            column: missingColumn,
            originalError: error
          });
          throw createUnsafeFallbackError(tableName, missingColumn, fallbackMessage, error);
        }

        logger?.warn?.("[Alion Treinos] Removendo coluna ausente sem perda de dados.", {
          table: tableName,
          column: missingColumn,
          reason: isLegacyAlias ? "legacy-alias" : "empty-optional-value"
        });
        const { [missingColumn]: _removed, ...nextPayload } = currentPayload;
        if (!Object.keys(nextPayload).length) {
          throw createUnsafeFallbackError(tableName, missingColumn, fallbackMessage, error);
        }
        currentPayload = nextPayload;
      }
    }

    throw new Error(`${fallbackMessage}: nao foi possivel adaptar o payload ao schema.`);
  }

  return {
    CANONICAL_SCHEMA_MIGRATION,
    LEGACY_SCHEMA_COLUMNS,
    PROTECTED_SCHEMA_COLUMNS,
    assertPersistedWorkout,
    buildWorkoutFields,
    getMissingColumnFromError,
    getWorkoutName,
    getWorkoutNotes,
    getWorkoutObjective,
    isEmptyOptionalValue,
    isProtectedSchemaColumn,
    runWithSchemaFallback
  };
});
