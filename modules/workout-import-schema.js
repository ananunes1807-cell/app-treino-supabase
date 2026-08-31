(function initializeWorkoutImportSchema(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutImportSchema = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutImportSchema() {
  "use strict";

  const SCHEMA_VERSION = 1;
  const LIMITS = Object.freeze({
    maxFileBytes: 15 * 1024 * 1024,
    maxPages: 40,
    maxWorkouts: 10,
    maxExercises: 200
  });
  const DOCUMENT_TYPES = Object.freeze(["text", "mixed", "scanned"]);
  const MATCH_STATUSES = Object.freeze(["matched", "review_required", "ambiguous", "not_found"]);
  const CONFLICT_STRATEGIES = Object.freeze(["new_version", "create_new", "replace"]);

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function optionalText(value) {
    if (value === null || value === undefined) return null;
    const text = String(value).trim();
    return text || null;
  }

  function optionalInteger(value) {
    if (value === null || value === undefined || value === "") return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : NaN;
  }

  function createEmptyDraft({ fileName = null, pageCount = null, documentType = "text" } = {}) {
    return {
      schema_version: SCHEMA_VERSION,
      source: {
        file_name: optionalText(fileName),
        page_count: optionalInteger(pageCount),
        document_type: documentType
      },
      student_name_detected: null,
      workouts: [],
      warnings: []
    };
  }

  function createEmptyWorkout(position = 0) {
    return {
      source_label: null,
      name: null,
      day_label: null,
      objective: null,
      notes: null,
      exercises: []
    };
  }

  function createEmptyExercise({ originalName = "", sourcePage = null } = {}) {
    return {
      source: {
        page: optionalInteger(sourcePage),
        text: optionalText(originalName)
      },
      original_name: String(originalName || "").trim(),
      exercise_library_id: null,
      matched_library_name: null,
      match_status: "not_found",
      match_confidence: null,
      match_candidates: [],
      sets: null,
      reps: null,
      weight: null,
      rest_seconds: null,
      duration_text: null,
      cadence: null,
      equipment: null,
      instructions: null,
      adaptation_notes: null,
      progression_notes: null,
      source_page: optionalInteger(sourcePage)
    };
  }

  function validateFileMetadata(file) {
    const errors = [];
    if (!file) return ["Selecione um arquivo PDF."];
    const name = String(file.name || "");
    const type = String(file.type || "").toLowerCase();
    if (!name.toLowerCase().endsWith(".pdf") || (type && type !== "application/pdf")) {
      errors.push("O arquivo selecionado deve ser um PDF.");
    }
    if (!Number.isFinite(file.size) || file.size <= 0) errors.push("O arquivo PDF esta vazio.");
    if (file.size > LIMITS.maxFileBytes) errors.push("O PDF excede o limite de 15 MB.");
    return errors;
  }

  function validateExercise(exercise, workoutIndex, exerciseIndex, pageCount) {
    const path = `workouts[${workoutIndex}].exercises[${exerciseIndex}]`;
    const errors = [];
    if (!isPlainObject(exercise)) return [`${path} deve ser um objeto.`];
    if (!optionalText(exercise.original_name)) errors.push(`${path}.original_name e obrigatorio.`);
    if (exercise.sets !== null && exercise.sets !== undefined
        && (!Number.isInteger(Number(exercise.sets)) || Number(exercise.sets) < 1 || Number(exercise.sets) > 100)) {
      errors.push(`${path}.sets deve estar entre 1 e 100 ou ser null.`);
    }
    if (exercise.rest_seconds !== null && exercise.rest_seconds !== undefined
        && (!Number.isInteger(Number(exercise.rest_seconds)) || Number(exercise.rest_seconds) < 0 || Number(exercise.rest_seconds) > 86400)) {
      errors.push(`${path}.rest_seconds deve estar entre 0 e 86400 ou ser null.`);
    }
    if (exercise.source_page !== null && exercise.source_page !== undefined
        && (!Number.isInteger(Number(exercise.source_page)) || Number(exercise.source_page) < 1
          || Number(exercise.source_page) > pageCount)) {
      errors.push(`${path}.source_page deve apontar para uma pagina existente.`);
    }
    if (!MATCH_STATUSES.includes(exercise.match_status)) errors.push(`${path}.match_status e invalido.`);
    if (exercise.match_confidence !== null && exercise.match_confidence !== undefined
        && (!Number.isFinite(Number(exercise.match_confidence))
          || Number(exercise.match_confidence) < 0 || Number(exercise.match_confidence) > 1)) {
      errors.push(`${path}.match_confidence deve estar entre 0 e 1 ou ser null.`);
    }
    if (exercise.exercise_library_id && exercise.match_status === "not_found") {
      errors.push(`${path} nao pode vincular biblioteca com status not_found.`);
    }
    return errors;
  }

  function validateDraft(draft) {
    const errors = [];
    if (!isPlainObject(draft)) return ["O rascunho de importacao deve ser um objeto."];
    if (draft.schema_version !== SCHEMA_VERSION) errors.push("Versao do contrato nao suportada.");
    if (!isPlainObject(draft.source)) errors.push("source deve ser um objeto.");

    const pageCount = optionalInteger(draft.source?.page_count);
    if (!Number.isInteger(pageCount) || pageCount < 1 || pageCount > LIMITS.maxPages) {
      errors.push("source.page_count deve estar entre 1 e 40.");
    }
    if (!DOCUMENT_TYPES.includes(draft.source?.document_type)) errors.push("source.document_type e invalido.");
    if (!Array.isArray(draft.workouts) || draft.workouts.length < 1 || draft.workouts.length > LIMITS.maxWorkouts) {
      errors.push("O rascunho deve conter entre 1 e 10 treinos.");
      return errors;
    }

    let exerciseCount = 0;
    draft.workouts.forEach((workout, workoutIndex) => {
      const path = `workouts[${workoutIndex}]`;
      if (!isPlainObject(workout)) {
        errors.push(`${path} deve ser um objeto.`);
        return;
      }
      if (!optionalText(workout.name)) errors.push(`${path}.name e obrigatorio.`);
      if (!Array.isArray(workout.exercises)) {
        errors.push(`${path}.exercises deve ser uma lista.`);
        return;
      }
      exerciseCount += workout.exercises.length;
      workout.exercises.forEach((exercise, exerciseIndex) => {
        errors.push(...validateExercise(exercise, workoutIndex, exerciseIndex, pageCount));
      });
    });

    if (exerciseCount > LIMITS.maxExercises) errors.push("O rascunho excede o limite de 200 exercicios.");
    return errors;
  }

  function toRpcPayload(draft) {
    const errors = validateDraft(draft);
    if (errors.length) {
      const error = new Error(errors.join(" "));
      error.name = "WorkoutImportValidationError";
      error.errors = errors;
      throw error;
    }

    return {
      schema_version: SCHEMA_VERSION,
      source: {
        page_count: Number(draft.source.page_count),
        document_type: draft.source.document_type
      },
      workouts: draft.workouts.map((workout) => ({
        name: String(workout.name).trim(),
        day_label: optionalText(workout.day_label),
        objective: optionalText(workout.objective),
        notes: optionalText(workout.notes),
        exercises: workout.exercises.map((exercise) => ({
          original_name: String(exercise.original_name).trim(),
          exercise_library_id: optionalText(exercise.exercise_library_id),
          sets: optionalInteger(exercise.sets),
          reps: optionalText(exercise.reps),
          weight: optionalText(exercise.weight),
          rest_seconds: optionalInteger(exercise.rest_seconds),
          equipment: optionalText(exercise.equipment),
          cadence: optionalText(exercise.cadence),
          duration_text: optionalText(exercise.duration_text),
          instructions: optionalText(exercise.instructions),
          adaptation_notes: optionalText(exercise.adaptation_notes),
          progression_notes: optionalText(exercise.progression_notes),
          source_page: optionalInteger(exercise.source_page)
        }))
      }))
    };
  }

  return {
    CONFLICT_STRATEGIES,
    DOCUMENT_TYPES,
    LIMITS,
    MATCH_STATUSES,
    SCHEMA_VERSION,
    createEmptyDraft,
    createEmptyExercise,
    createEmptyWorkout,
    toRpcPayload,
    validateDraft,
    validateFileMetadata
  };
});
