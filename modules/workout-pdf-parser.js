(function initializeWorkoutPdfParser(root, factory) {
  "use strict";
  const api = factory(root?.AlionWorkoutImportSchema);
  if (typeof module === "object" && module.exports) module.exports = factory(require("./workout-import-schema.js"));
  if (root) root.AlionWorkoutPdfParser = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutPdfParser(schema) {
  "use strict";

  const DAY = "(?:segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo)(?:-feira)?";
  const WORKOUT_HEADER = new RegExp(`^(?:treino\\s+([a-z0-9]+)|(${DAY}))(?:\\s*[-–—:]\\s*(.+))?$`, "i");
  const SET_DURATION = /(?:^|\s)(\d{1,2})\s*(?:x|×|s[eé]ries?\s+de)\s*(\d{1,4})\s*(s(?![a-záàâãéêíóôõúç])|seg(?:undo)?s?|min(?:uto)?s?)(?:\s|$|[,;–—-])/i;
  const SET_REPS = /(?:^|\s)(\d{1,2})\s*(?:x|×|s[eé]ries?\s+de)\s*(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)(?!\s*(?:s(?![a-záàâãéêíóôõúç])|seg(?:undo)?s?|min(?:uto)?s?))(?:\s|$|[,;–—-])/i;
  const SINGLE_DURATION = /(?:^|\s)(\d{1,4})\s*(s(?![a-záàâãéêíóôõúç])|seg(?:undo)?s?|min(?:uto)?s?)(?:\s|$|[,;–—-])/i;
  const WEIGHT = /(?:carga\s*:\s*)?(\d+(?:[.,]\d+)?)\s*kg\b/i;
  const EXPLICIT_REST = /(?:descanso|intervalo)\s*:?\s*(?:(\d+)\s*(?:s(?![a-záàâãéêíóôõúç])|seg(?:undo)?s?)|(\d+)\s*min(?:uto)?s?|(\d{1,2}):(\d{2}))/i;
  const TABLE_WORD = /\b(exerc[ií]cio|s[eé]ries|repeti[cç][õo]es|carga|descanso|intervalo)\b/gi;
  const DOCUMENT_TITLE = /^(?:alion\s+treinos|ficha\s+sint[eé]tica|programa\s+de\s+treino|plano\s+de\s+treino|qa\s+pdf\b)/i;
  const FIXTURE_MARKER = /^(?:ficha(?:\s+qa)?\s+(?:bloco|aluno|n[ºo.]?)\s*[:#-]?\s*(.+)|aluno\s*:\s*(.+)|nome\s*:\s*(.+))$/i;
  const GENERAL_NOTE = /^(?:dados?\s+fict[ií]cios?|proibido\b|aviso\b|aten[cç][aã]o\b|observa[cç][oõ]es?\s*:|nota\s*:)/i;
  const GROUP = /^(?:pernas?|peito(?:\s+e\s+tr[ií]ceps)?|costas?(?:\s+e\s+b[ií]ceps)?|ombros?|bra[cç]os?|gl[uú]teos?|posterior(?:\s+de\s+coxa)?|quadr[ií]ceps|abd[oô]men|cardio)$/i;
  const TABLE_ROW = /^(.+?)\s+(\d{1,2})\s+(\d{1,3}(?:\s*[-–]\s*\d{1,3})?)(?:\s+(\d+(?:[.,]\d+)?)\s*kg)?(?:\s+(\d+)\s*(s|min(?:uto)?s?))?$/i;

  const clean = (value) => String(value || "").replace(/\s+/g, " ").trim();
  const durationText = (value, unit) => `${Number(value)} ${/^min/i.test(unit) ? "minutos" : "segundos"}`;
  function parseRest(line) {
    const match = clean(line).match(EXPLICIT_REST);
    if (!match) return null;
    if (match[1]) return Number(match[1]);
    if (match[2]) return Number(match[2]) * 60;
    return (Number(match[3]) * 60) + Number(match[4]);
  }
  function isTableHeader(line) {
    const matches = clean(line).match(TABLE_WORD) || [];
    return new Set(matches.map((item) => item.toLowerCase())).size >= 2 && !/\d/.test(line);
  }
  function classifyLine(value, context = {}) {
    const line = clean(value);
    if (!line) return { type: "empty", confidence: 1 };
    const fixture = line.match(FIXTURE_MARKER);
    if (fixture) return { type: "fixture_identifier", confidence: 1, label: clean(fixture[1] || fixture[2] || fixture[3] || line) };
    const workout = line.match(WORKOUT_HEADER);
    if (workout) return { type: "workout_header", confidence: 1, match: workout };
    if (isTableHeader(line)) return { type: "table_header", confidence: 0.98 };
    if (DOCUMENT_TITLE.test(line) || (/^[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ0-9 ._-]{8,}$/.test(line) && !/\d+\s*(?:x|×)/i.test(line))) return { type: "document_title", confidence: 0.95 };
    if (GENERAL_NOTE.test(line)) return { type: "general_note", confidence: 0.98 };
    if (GROUP.test(line)) return { type: "muscle_group", confidence: 0.95 };
    if (/^(?:s[eé]ries|repeti[cç][oõ]es|carga|descanso|intervalo|cad[eê]ncia|equipamento)\s*:/i.test(line)) return { type: "exercise_parameters", confidence: 0.95 };
    if (context.tableMode && TABLE_ROW.test(line)) return { type: "exercise", confidence: 0.99, tableRow: true };
    if (SET_DURATION.test(line) || SET_REPS.test(line) || WEIGHT.test(line) || EXPLICIT_REST.test(line)) return { type: "exercise", confidence: 0.98 };
    if (context.insideWorkout && line.length <= 60 && line.split(" ").length <= 5 && !/[.!?]$/.test(line)) return { type: "exercise", confidence: 0.62 };
    return { type: "uncertain", confidence: 0.2 };
  }
  function stripMetrics(line) {
    return clean(line.replace(EXPLICIT_REST, " ").replace(SET_DURATION, " ").replace(SET_REPS, " ").replace(WEIGHT, " ").replace(SINGLE_DURATION, " ").replace(/[|;]+/g, " ").replace(/\s*[,–—-]\s*$/, ""));
  }
  function parseExercise(line, page, blockId = "block-1", options = {}) {
    const original = clean(line);
    const tableMatch = options.tableRow ? original.match(TABLE_ROW) : null;
    const durationMatch = tableMatch ? null : original.match(SET_DURATION);
    const setMatch = durationMatch ? null : original.match(SET_REPS);
    const restSeconds = parseRest(original);
    const singleDuration = durationMatch || tableMatch ? null : original.replace(EXPLICIT_REST, " ").match(SINGLE_DURATION);
    const weightMatch = original.match(WEIGHT);
    const name = tableMatch ? clean(tableMatch[1]) : stripMetrics(original);
    if (!name) return null;
    const exercise = schema.createEmptyExercise({ originalName: name, sourcePage: page });
    exercise.source.text = original;
    exercise.source.block_id = blockId;
    exercise.source_block_id = blockId;
    exercise.interpretation_type = durationMatch || singleDuration ? "duration_exercise" : "repetition_exercise";
    exercise.sets = tableMatch ? Number(tableMatch[2]) : (durationMatch ? Number(durationMatch[1]) : (setMatch ? Number(setMatch[1]) : null));
    exercise.reps = tableMatch ? clean(tableMatch[3].replace(/–/g, "-")) : (setMatch ? clean(setMatch[2].replace(/–/g, "-")) : null);
    exercise.duration_text = durationMatch ? durationText(durationMatch[2], durationMatch[3]) : (singleDuration ? durationText(singleDuration[1], singleDuration[2]) : null);
    exercise.weight = tableMatch?.[4] ? `${tableMatch[4].replace(",", ".")} kg` : (weightMatch ? `${weightMatch[1].replace(",", ".")} kg` : null);
    exercise.rest_seconds = tableMatch?.[5] ? Number(tableMatch[5]) * (/^min/i.test(tableMatch[6]) ? 60 : 1) : restSeconds;
    exercise.extracted_fields = { sets: exercise.sets, reps: exercise.reps, duration_text: exercise.duration_text, weight: exercise.weight, rest_seconds: exercise.rest_seconds };
    return exercise;
  }
  function flattenLines(extracted) {
    return extracted.pages.flatMap((page) => String(page.text || "").split(/\r?\n/).map((text) => ({ text: clean(text), page: page.page_number })));
  }
  function segmentFixtures(lines) {
    const markers = [];
    lines.forEach((line, index) => {
      const classification = classifyLine(line.text);
      if (classification.type === "fixture_identifier") markers.push({ index, classification });
    });
    if (markers.length < 2) return [{ id: "block-1", label: "Ficha identificada", lines }];
    return markers.map((marker, markerIndex) => ({
      id: `block-${markerIndex + 1}`,
      label: marker.classification.label || `Ficha ${markerIndex + 1}`,
      lines: lines.slice(marker.index + 1, markers[markerIndex + 1]?.index ?? lines.length)
    }));
  }
  function parseSegment(segment, source) {
    const draft = schema.createEmptyDraft({ pageCount: source.page_count, documentType: source.document_type });
    draft.source_block_id = segment.id;
    draft.line_classifications = [];
    draft.review_items = [];
    let current = null;
    let currentGroup = null;
    let tableMode = false;
    segment.lines.forEach(({ text, page }) => {
      const classification = classifyLine(text, { insideWorkout: Boolean(current), tableMode });
      draft.line_classifications.push({ page, text, block_id: segment.id, type: classification.type, confidence: classification.confidence });
      if (classification.type === "table_header") { tableMode = true; return; }
      if (["empty", "fixture_identifier", "document_title"].includes(classification.type)) return;
      if (classification.type === "general_note") { draft.review_items.push({ page, text, block_id: segment.id, type: "general_note" }); return; }
      if (classification.type === "workout_header") {
        const header = classification.match;
        current = schema.createEmptyWorkout(draft.workouts.length);
        current.source_label = text; current.source_block_id = segment.id;
        current.day_label = header[2] ? clean(header[2]) : null;
        current.name = header[1] ? `Treino ${header[1].toUpperCase()}` : clean(header[2]);
        if (header[3]) current.name += ` - ${clean(header[3])}`;
        draft.workouts.push(current); currentGroup = null; tableMode = false; return;
      }
      if (classification.type === "muscle_group") { currentGroup = text; if (current && !current.objective) current.objective = text; return; }
      if (classification.type === "exercise_parameters") {
        const previous = current?.exercises[current.exercises.length - 1];
        if (!previous) draft.review_items.push({ page, text, block_id: segment.id, type: "orphan_parameters" });
        else previous.instructions = [previous.instructions, text].filter(Boolean).join(" ");
        return;
      }
      if (classification.type !== "exercise" || !current) { draft.review_items.push({ page, text, block_id: segment.id, type: classification.type }); return; }
      const exercise = parseExercise(text, page, segment.id, { tableRow: Boolean(classification.tableRow) });
      if (!exercise) { draft.review_items.push({ page, text, block_id: segment.id, type: "uncertain" }); return; }
      if (currentGroup) exercise.source.group_label = currentGroup;
      current.exercises.push(exercise);
    });
    draft.workouts = draft.workouts.filter((workout) => workout.exercises.length);
    draft.review_items.forEach((item) => draft.warnings.push(`Página ${item.page}: ${item.text}`));
    if (!draft.workouts.length) draft.warnings.push("Nenhum treino foi identificado automaticamente. Revise o documento.");
    return draft;
  }
  function parseExtractedDocument(extracted) {
    if (extracted?.document_type === "scanned") {
      const error = new Error("Este PDF parece ser uma digitalização. A leitura de PDFs escaneados será adicionada na próxima etapa.");
      error.name = "ScannedPdfError"; throw error;
    }
    const segments = segmentFixtures(flattenLines(extracted));
    if (segments.length > 1) {
      const draft = schema.createEmptyDraft({ pageCount: extracted.page_count, documentType: extracted.document_type });
      draft.requires_fixture_selection = true;
      draft.fixture_candidates = segments.map((segment) => ({ id: segment.id, label: segment.label, draft: parseSegment(segment, extracted) }));
      draft.warnings.push("Este PDF parece conter mais de uma ficha. Escolha qual deseja importar.");
      return draft;
    }
    return parseSegment(segments[0], extracted);
  }
  function selectFixture(draft, fixtureId) {
    if (!draft?.requires_fixture_selection) return draft;
    const selected = draft.fixture_candidates.find((candidate) => candidate.id === fixtureId);
    if (!selected) throw new Error("Escolha uma ficha válida para continuar.");
    const result = JSON.parse(JSON.stringify(selected.draft));
    result.selected_fixture_id = fixtureId;
    result.requires_fixture_selection = false;
    result.fixture_candidates = [];
    return result;
  }
  return { classifyLine, parseExercise, parseExtractedDocument, parseRest, selectFixture };
});
