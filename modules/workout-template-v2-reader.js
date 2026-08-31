(function initializeWorkoutTemplateV2Reader(root, factory) {
  "use strict";
  const schema = root?.AlionWorkoutImportSchema || (typeof module === "object" ? require("./workout-import-schema.js") : null);
  const template = root?.AlionWorkoutTemplateV2 || (typeof module === "object" ? require("./workout-template-v2.js") : null);
  const api = factory(schema, template);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutTemplateV2Reader = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutTemplateV2Reader(schema, template) {
  "use strict";
  const TEMPLATE_ID = "ALION_WORKOUT_TEMPLATE"; const TEMPLATE_VERSION = "2";
  const optional = (value) => { const text = String(value ?? "").trim(); return text || null; };
  const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  function getValue(fields, name) {
    const entry = fields?.[name]; if (entry === undefined || entry === null) return null;
    if (typeof entry === "string" || typeof entry === "number" || typeof entry === "boolean") return entry;
    const widgets = Array.isArray(entry) ? entry : [entry]; const widget = widgets.find((item) => item && ("value" in item || "defaultValue" in item));
    return widget?.value ?? widget?.defaultValue ?? null;
  }
  function checked(fields, name) {
    const value = getValue(fields, name); if (value === true || value === 1) return true;
    const text = String(value ?? "").toLowerCase(); return !["", "off", "false", "0", "no", "null", "undefined"].includes(text);
  }
  function pageOf(fields, name, fallback = 1) {
    const widgets = Array.isArray(fields?.[name]) ? fields[name] : [fields?.[name]]; const widget = widgets.find((item) => Number.isInteger(item?.page)); return widget ? widget.page + 1 : fallback;
  }
  function parseInteger(value) { const text = optional(value); if (!text) return null; const number = Number(text); return Number.isInteger(number) ? number : NaN; }
  function parseSeconds(value) {
    const text = optional(value); if (!text) return null; if (/^\d+$/.test(text)) return Number(text);
    const match = text.match(/^(\d+)\s*(s|seg(?:undo)?s?|min(?:uto)?s?)$/i); return match ? Number(match[1]) * (/^min/i.test(match[2]) ? 60 : 1) : NaN;
  }
  function classifyRepsOrTime(value) {
    const original = optional(value); if (!original) return { reps: null, duration: null, ambiguous: false, original: null };
    if (/^\d+(?:\s*-\s*\d+)?$/.test(original)) return { reps: original, duration: null, ambiguous: false, original };
    if (/^\d+\s*(?:s|seg(?:undo)?s?|min(?:uto)?s?)$/i.test(original) || /^\d{1,2}:\d{2}$/.test(original)) return { reps: null, duration: original, ambiguous: false, original };
    return { reps: original, duration: null, ambiguous: true, original };
  }
  function inspect(extracted) {
    const fields = extracted?.form_fields || {}; const id = optional(getValue(fields, "alion_template_id")); const version = optional(getValue(fields, "alion_template_version"));
    if (id !== TEMPLATE_ID || version !== TEMPLATE_VERSION) return { status: "external", fields };
    const missing = ["student_name", "student_level", "workout_A_name", "workout_A_day_mon", "workout_A_default_sets", "workout_A_apply_default", "workout_A_adaptation_notes"].filter((name) => !(name in fields));
    return missing.length ? { status: "malformed", reason: "Estrutura V2 incompleta.", missing, fields } : { status: "valid", fields };
  }
  function mergeAttribute(exercise, field, value) { if (value !== null && value !== undefined && !Number.isNaN(value)) exercise[field] = value; }
  function applyPrescription(exercise, values, draft, page, label) {
    mergeAttribute(exercise, "sets", parseInteger(values.sets));
    const classified = classifyRepsOrTime(values.reps_or_time); mergeAttribute(exercise, "reps", classified.reps); mergeAttribute(exercise, "duration_text", classified.duration);
    mergeAttribute(exercise, "weight", optional(values.weight)); mergeAttribute(exercise, "rest_seconds", parseSeconds(values.rest));
    if (classified.ambiguous) draft.review_items.push({ page, type: "ambiguous_reps_or_time", text: `${label}: nao foi possivel classificar com seguranca "${classified.original}" como repeticoes ou duracao.` });
    if (Number.isNaN(parseInteger(values.sets))) draft.review_items.push({ page, type: "invalid_sets", text: `${label}: series precisa ser um numero inteiro.` });
    if (Number.isNaN(parseSeconds(values.rest))) draft.review_items.push({ page, type: "invalid_rest", text: `${label}: descanso nao foi reconhecido com seguranca.` });
  }
  function exceptionTarget(name, exercises) {
    const exact = exercises.map((exercise, index) => ({ exercise, index, value: normalize(exercise.original_name) })).filter((item) => item.value === normalize(name));
    if (exact.length === 1) return exact[0].index;
    const needle = normalize(name); const partial = exercises.map((exercise, index) => ({ index, value: normalize(exercise.original_name) })).filter((item) => needle.length >= 5 && (item.value.includes(needle) || needle.includes(item.value)));
    return partial.length === 1 ? partial[0].index : null;
  }
  function read(extracted) {
    const inspection = inspect(extracted); if (inspection.status !== "valid") { const error = new Error("A Ficha Rapida Alion V2 foi identificada, mas sua estrutura esta incompleta ou incompativel."); error.name = "MalformedAlionTemplateError"; error.inspection = inspection; throw error; }
    const fields = inspection.fields; const draft = schema.createEmptyDraft({ pageCount: extracted.page_count, documentType: "text" });
    draft.source.template_id = TEMPLATE_ID; draft.source.template_version = 2; draft.template_detected = true; draft.template_label = "Ficha Rapida Alion V2 detectada"; draft.student_name_detected = optional(getValue(fields, "student_name"));
    draft.review_items = []; draft.unresolved_exceptions = []; draft.unresolved_others = [];
    const level = optional(getValue(fields, "student_level")); if (level && !["beginner", "intermediate", "advanced"].includes(level)) draft.review_items.push({ page: 1, type: "ambiguous_level", text: "Mais de um nivel foi marcado ou o nivel nao foi reconhecido. Selecione manualmente na revisao." });
    const generalObjective = optional(getValue(fields, "student_objective")); const generalNotes = optional(getValue(fields, "general_notes")); const period = optional(getValue(fields, "workout_period"));
    template.WORKOUT_KEYS.forEach((key, workoutIndex) => {
      const prefix = `workout_${key}_`; const exercises = []; const draftWorkoutIndex = draft.workouts.length;
      template.QUICK_EXERCISES.forEach((quick) => {
        if (!checked(fields, `${prefix}exercise_${quick.key}_selected`)) return;
        const exercise = schema.createEmptyExercise({ originalName: quick.name, sourcePage: pageOf(fields, `${prefix}exercise_${quick.key}_selected`, key === "G" ? 3 : 1) });
        exercise.source.template_field = `${prefix}exercise_${quick.key}_selected`; exercise.source.v2_quick_key = quick.key; exercise.interpretation_type = "structured_template_v2_quick_option"; exercises.push(exercise);
      });
      if (checked(fields, `${prefix}other_selected`)) {
        const otherName = optional(getValue(fields, `${prefix}other_name`));
        if (otherName) { const exercise = schema.createEmptyExercise({ originalName: otherName, sourcePage: pageOf(fields, `${prefix}other_name`, key === "G" ? 3 : 1) }); exercise.interpretation_type = "structured_template_v2_other"; exercises.push(exercise); }
        else draft.unresolved_others.push({ workout_key: key, workout_index: draftWorkoutIndex, page: key === "G" ? 3 : 1, message: '"Outros" foi selecionado, mas o exercício não foi informado.' });
      }
      const workoutName = optional(getValue(fields, `${prefix}name`)); const focus = optional(getValue(fields, `${prefix}focus`));
      const hasContent = exercises.length || workoutName || focus || draft.unresolved_others.some((item) => item.workout_key === key);
      if (!hasContent) return;
      const workout = schema.createEmptyWorkout(workoutIndex); workout.source_label = `Ficha Rapida Alion V2 - treino ${key}`; workout.name = workoutName || `Treino ${key}`;
      const selectedDays = template.DAYS.filter((day) => checked(fields, `${prefix}day_${day}`)); const labels = { mon: "Seg", tue: "Ter", wed: "Qua", thu: "Qui", fri: "Sex", sat: "Sab", sun: "Dom" }; workout.day_label = selectedDays.map((day) => labels[day]).join(" + ") || null;
      workout.objective = focus;
      const adaptation = optional(getValue(fields, `${prefix}adaptation_notes`)); workout.notes = [generalObjective ? `Objetivo geral: ${generalObjective}` : null, generalNotes, period ? `Periodo: ${period}` : null, adaptation ? `Adaptacao/Orientacao geral do Treino ${key}: ${adaptation}` : null].filter(Boolean).join("\n") || null;
      if (checked(fields, `${prefix}apply_default`)) {
        const defaults = { sets: getValue(fields, `${prefix}default_sets`), reps_or_time: getValue(fields, `${prefix}default_reps_or_time`), weight: getValue(fields, `${prefix}default_weight`), rest: getValue(fields, `${prefix}default_rest`) };
        exercises.forEach((exercise) => applyPrescription(exercise, defaults, draft, exercise.source_page, `Padrao do Treino ${key}`));
      }
      for (let row = 1; row <= 3; row += 1) {
        const exceptionPrefix = `${prefix}exception_${String(row).padStart(2, "0")}_`; const exceptionName = optional(getValue(fields, `${exceptionPrefix}name`)); if (!exceptionName) continue;
        const values = { sets: getValue(fields, `${exceptionPrefix}sets`), reps_or_time: getValue(fields, `${exceptionPrefix}reps_or_time`), weight: getValue(fields, `${exceptionPrefix}weight`), rest: getValue(fields, `${exceptionPrefix}rest`) };
        const target = exceptionTarget(exceptionName, exercises); const page = key === "G" ? 3 : 2;
        if (target === null) {
          draft.unresolved_exceptions.push({ workout_key: key, workout_index: draftWorkoutIndex, name: exceptionName, values, page, candidates: exercises.map((exercise, index) => ({ index, name: exercise.original_name })) });
          draft.review_items.push({ page, type: "unresolved_exception", text: `Nao foi possivel identificar com seguranca a qual exercicio o ajuste "${exceptionName}" pertence.` });
        } else applyPrescription(exercises[target], values, draft, page, `Excecao ${row} do Treino ${key}`);
      }
      workout.exercises = exercises; draft.workouts.push(workout);
    });
    if (!draft.workouts.length) { const error = new Error("Esta ficha nao contem treinos preenchidos."); error.name = "EmptyAlionTemplateError"; throw error; }
    draft.unresolved_others.forEach((item) => draft.review_items.push({ page: item.page, type: "missing_other_name", text: item.message }));
    draft.review_items.forEach((item) => draft.warnings.push(item.text)); return draft;
  }
  return { TEMPLATE_ID, TEMPLATE_VERSION, applyPrescription, checked, classifyRepsOrTime, exceptionTarget, getValue, inspect, parseSeconds, read };
});
