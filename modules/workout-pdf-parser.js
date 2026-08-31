(function initializeWorkoutPdfParser(root, factory) {
  "use strict";
  const api = factory(root?.AlionWorkoutImportSchema);
  if (typeof module === "object" && module.exports) module.exports = factory(require("./workout-import-schema.js"));
  if (root) root.AlionWorkoutPdfParser = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutPdfParser(schema) {
  "use strict";

  const WORKOUT_HEADER = /^(?:treino\s+([a-z0-9]+)|((?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?))(?:\s*[-–—:]\s*(.+))?$/i;
  const SET_REPS = /(?:^|\s)(\d{1,2})\s*(?:x|×|s[eé]ries?\s+de)\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)(?:\s|$)/i;
  const WEIGHT = /(?:carga\s*:\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i;
  const REST = /(?:descanso\s*:?\s*)?(?:(\d+)\s*(?:s(?![a-záàâãéêíóôõúç])|seg(?:undo)?s?\b)|(\d+)\s*min(?:uto)?s?\b|(\d{1,2}):(\d{2}))/i;
  const TABLE_HEADER = /^(?:exerc[ií]cio|s[eé]ries|repeti[cç][õo]es|carga|descanso)(?:\s*[|;]\s*(?:exerc[ií]cio|s[eé]ries|repeti[cç][õo]es|carga|descanso))*$/i;

  function clean(value) { return String(value || "").replace(/\s+/g, " ").trim(); }
  function parseRest(line) {
    const match = line.match(REST);
    if (!match) return null;
    if (match[1]) return Number(match[1]);
    if (match[2]) return Number(match[2]) * 60;
    return (Number(match[3]) * 60) + Number(match[4]);
  }
  function removeMetrics(line) {
    return clean(line.replace(SET_REPS, " ").replace(WEIGHT, " ").replace(REST, " ").replace(/[|;]+/g, " ").replace(/\s+[-–—:]\s*$/, ""));
  }
  function isNoise(line) {
    return !line || TABLE_HEADER.test(line) || /^(aluno|nome|data|ficha|observa[cç][õo]es?)\s*:/i.test(line);
  }
  function parseExercise(line, page) {
    const original = clean(line);
    const setMatch = original.match(SET_REPS);
    const weightMatch = original.match(WEIGHT);
    const name = removeMetrics(original);
    if (!name || (!setMatch && name.split(" ").length < 2)) return null;
    const exercise = schema.createEmptyExercise({ originalName: name, sourcePage: page });
    exercise.sets = setMatch ? Number(setMatch[1]) : null;
    exercise.reps = setMatch ? clean(setMatch[2].replace(/–/g, "-")) : null;
    exercise.weight = weightMatch ? `${weightMatch[1].replace(",", ".")} kg` : null;
    exercise.rest_seconds = parseRest(original);
    return exercise;
  }
  function parseExtractedDocument(extracted) {
    if (extracted?.document_type === "scanned") {
      const error = new Error("Este PDF parece ser uma digitalização. A leitura de PDFs escaneados será adicionada na próxima etapa.");
      error.name = "ScannedPdfError";
      throw error;
    }
    const draft = schema.createEmptyDraft({ pageCount: extracted.page_count, documentType: extracted.document_type });
    let current = null;
    extracted.pages.forEach((page) => {
      String(page.text || "").split(/\r?\n/).forEach((rawLine) => {
        const line = clean(rawLine);
        const header = line.match(WORKOUT_HEADER);
        if (header) {
          current = schema.createEmptyWorkout(draft.workouts.length);
          current.source_label = line;
          current.day_label = header[2] ? clean(header[2]) : null;
          current.name = header[1] ? `Treino ${header[1].toUpperCase()}` : clean(header[2]);
          if (header[3]) current.name += ` - ${clean(header[3])}`;
          draft.workouts.push(current);
          return;
        }
        if (isNoise(line)) return;
        if (!current) {
          current = schema.createEmptyWorkout(0);
          current.name = "Treino importado";
          draft.workouts.push(current);
        }
        const exercise = parseExercise(line, page.page_number);
        if (exercise) current.exercises.push(exercise);
        else if (current.exercises.length) {
          const previous = current.exercises[current.exercises.length - 1];
          previous.instructions = [previous.instructions, line].filter(Boolean).join(" ");
        } else if (line.length <= 60) current.name = current.name === "Treino importado" ? line : current.name;
      });
    });
    draft.workouts = draft.workouts.filter((workout) => workout.exercises.length || workout.name !== "Treino importado");
    if (!draft.workouts.length) draft.warnings.push("Nenhum treino foi identificado automaticamente. Revise o documento.");
    return draft;
  }
  return { parseExercise, parseExtractedDocument, parseRest };
});
