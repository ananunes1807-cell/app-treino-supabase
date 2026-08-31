(function initializeWorkoutTemplateReader(root, factory) {
  "use strict";
  const schema = root?.AlionWorkoutImportSchema || (typeof module === "object" ? require("./workout-import-schema.js") : null);
  const v2Reader = root?.AlionWorkoutTemplateV2Reader || (typeof module === "object" ? require("./workout-template-v2-reader.js") : null);
  const api = factory(schema, v2Reader);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutTemplateReader = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutTemplateReader(schema, v2Reader) {
  "use strict";
  const TEMPLATE_ID = "ALION_WORKOUT_TEMPLATE";
  const TEMPLATE_VERSION = "1";
  const HEADER_FIELDS = ["student_name", "trainer_name", "workout_date", "workout_period", "student_objective", "general_notes"];
  const EXERCISE_SUFFIXES = ["name", "sets", "reps", "weight", "duration", "rest", "equipment", "adaptation"];
  const FIELD_PATTERN = /^(?:alion_(?:template_id|template_version|generated_at|generator_version)|student_name|trainer_name|workout_date|workout_period|student_objective|general_notes|workout_[1-5]_(?:name|days|focus)|workout_[1-5]_exercise_(?:[1-9]|1[0-8])_(?:name|sets|reps|weight|duration|rest|equipment|adaptation))$/;

  const optional = (value) => { const text = String(value ?? "").trim(); return text || null; };
  function getValue(fields, name) {
    const entry = fields?.[name];
    if (entry === undefined || entry === null) return null;
    if (typeof entry === "string" || typeof entry === "number") return optional(entry);
    if (Array.isArray(entry)) {
      const widget = entry.find((item) => item && ("value" in item || "defaultValue" in item));
      return optional(widget?.value ?? widget?.defaultValue);
    }
    return optional(entry.value ?? entry.defaultValue);
  }
  function getPage(fields, name) {
    const entry = fields?.[name];
    const widgets = Array.isArray(entry) ? entry : [entry];
    const widget = widgets.find((item) => Number.isInteger(item?.page) && item.page >= 0);
    return widget ? widget.page + 1 : null;
  }
  function parseInteger(value) {
    if (value === null) return null;
    const number = Number(String(value).trim());
    return Number.isInteger(number) ? number : NaN;
  }
  function parseDurationSeconds(value) {
    const text = optional(value);
    if (!text) return null;
    const clock = text.match(/^(\d{1,2}):(\d{2})$/);
    if (clock) return (Number(clock[1]) * 60) + Number(clock[2]);
    const match = text.match(/^(\d+)\s*(s|seg(?:undo)?s?|min(?:uto)?s?)$/i);
    if (!match) return NaN;
    return Number(match[1]) * (/^min/i.test(match[2]) ? 60 : 1);
  }
  function inspect(extracted) {
    const fields = extracted?.form_fields || {};
    const id = getValue(fields, "alion_template_id");
    const version = getValue(fields, "alion_template_version");
    if (!id && !version) return { status: "external", fields };
    if (id === TEMPLATE_ID && version === "2") return v2Reader.inspect(extracted);
    if (id !== TEMPLATE_ID || version !== TEMPLATE_VERSION) return { status: "malformed", reason: "Identificador ou versao incompativel.", fields };
    const names = Object.keys(fields);
    const invalidNames = names.filter((name) => !FIELD_PATTERN.test(name));
    const structural = ["student_name", "workout_1_name", ...EXERCISE_SUFFIXES.map((suffix) => `workout_1_exercise_1_${suffix}`)];
    const missing = structural.filter((name) => !(name in fields));
    if (invalidNames.length || missing.length) return { status: "malformed", reason: "Estrutura de campos incompleta ou incompativel.", invalidNames, missing, fields };
    return { status: "valid", fields };
  }
  function read(extracted) {
    const inspection = inspect(extracted);
    if (inspection.status === "valid" && getValue(inspection.fields, "alion_template_version") === "2") return v2Reader.read(extracted);
    if (inspection.status !== "valid") {
      const error = new Error(inspection.status === "malformed"
        ? "A Ficha Padrao Alion foi identificada, mas sua estrutura esta incompleta ou incompativel. Revise o arquivo ou utilize a importacao como PDF externo."
        : "O arquivo nao e uma Ficha Padrao Alion valida.");
      error.name = inspection.status === "malformed" ? "MalformedAlionTemplateError" : "NotAlionTemplateError";
      error.inspection = inspection; throw error;
    }
    const fields = inspection.fields;
    const draft = schema.createEmptyDraft({ pageCount: extracted.page_count, documentType: "text" });
    draft.source.template_id = TEMPLATE_ID;
    draft.source.template_version = 1;
    draft.student_name_detected = getValue(fields, "student_name");
    draft.template_detected = true;
    draft.template_label = "Ficha Padrao Alion V1 detectada";
    draft.review_items = [];
    for (let workoutIndex = 1; workoutIndex <= 5; workoutIndex += 1) {
      const exercises = [];
      for (let exerciseIndex = 1; exerciseIndex <= 18; exerciseIndex += 1) {
        const prefix = `workout_${workoutIndex}_exercise_${exerciseIndex}_`;
        const name = getValue(fields, `${prefix}name`);
        const values = Object.fromEntries(EXERCISE_SUFFIXES.map((suffix) => [suffix, getValue(fields, `${prefix}${suffix}`)]));
        if (!name && EXERCISE_SUFFIXES.every((suffix) => !values[suffix])) continue;
        if (!name) {
          draft.review_items.push({ page: Math.ceil(exerciseIndex / 6), text: `Treino ${workoutIndex}, linha ${exerciseIndex} sem nome de exercicio.`, type: "missing_exercise_name" });
          continue;
        }
        const sourcePage = getPage(fields, `${prefix}name`) || Math.ceil(exerciseIndex / 6);
        const exercise = schema.createEmptyExercise({ originalName: name, sourcePage });
        exercise.source.text = `${prefix}name`;
        exercise.source.template_field = `${prefix}name`;
        exercise.interpretation_type = "structured_template_field";
        exercise.sets = parseInteger(values.sets);
        exercise.reps = values.reps;
        exercise.weight = values.weight;
        exercise.duration_text = values.duration;
        exercise.rest_seconds = parseDurationSeconds(values.rest);
        exercise.equipment = values.equipment;
        exercise.adaptation_notes = values.adaptation;
        exercises.push(exercise);
      }
      if (!exercises.length) continue;
      const workout = schema.createEmptyWorkout(workoutIndex - 1);
      workout.source_label = `Ficha Padrao Alion - treino ${workoutIndex}`;
      workout.name = getValue(fields, `workout_${workoutIndex}_name`) || `Treino ${workoutIndex}`;
      workout.day_label = getValue(fields, `workout_${workoutIndex}_days`);
      workout.objective = getValue(fields, `workout_${workoutIndex}_focus`) || getValue(fields, "student_objective");
      workout.notes = [getValue(fields, "general_notes"), getValue(fields, "workout_period") ? `Periodo: ${getValue(fields, "workout_period")}` : null].filter(Boolean).join(" ") || null;
      workout.exercises = exercises;
      draft.workouts.push(workout);
    }
    if (!draft.workouts.length) {
      const error = new Error("Esta ficha nao contem exercicios preenchidos."); error.name = "EmptyAlionTemplateError"; throw error;
    }
    draft.review_items.forEach((item) => draft.warnings.push(item.text));
    return draft;
  }
  return { EXERCISE_SUFFIXES, FIELD_PATTERN, HEADER_FIELDS, TEMPLATE_ID, TEMPLATE_VERSION, getPage, getValue, inspect, parseDurationSeconds, read };
});
