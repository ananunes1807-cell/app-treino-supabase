(function initializeWorkoutTemplateV2(root, factory) {
  "use strict";
  const api = factory(root?.PDFLib || (typeof module === "object" ? require("../assets/vendor/pdf-lib-1.17.1/pdf-lib.min.js") : null));
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutTemplateV2 = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutTemplateV2(PDFLib) {
  "use strict";

  const TEMPLATE_ID = "ALION_WORKOUT_TEMPLATE";
  const TEMPLATE_VERSION = 2;
  const TEMPLATE_REVISION = "2.0";
  const DISPLAY_ID = `${TEMPLATE_ID}_V${TEMPLATE_VERSION}`;
  const A4_LANDSCAPE = Object.freeze([841.89, 595.28]);
  const WORKOUT_KEYS = Object.freeze(["A", "B", "C", "D", "E", "F", "G"]);
  const DAYS = Object.freeze(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
  const QUICK_EXERCISES = Object.freeze([
    { key: "squat_free", name: "Agachamento Livre", category: "PERNAS / GLUTEOS" },
    { key: "leg_press_45", name: "Leg press 45", category: "PERNAS / GLUTEOS" },
    { key: "leg_extension", name: "Cadeira extensora", category: "PERNAS / GLUTEOS" },
    { key: "leg_curl", name: "Mesa Flexora", category: "PERNAS / GLUTEOS" },
    { key: "hip_thrust", name: "Elevação Pélvica", category: "PERNAS / GLUTEOS" },
    { key: "bench_press", name: "Supino Reto", category: "SUPERIORES" },
    { key: "incline_bench_press", name: "Supino Inclinado", category: "SUPERIORES" },
    { key: "bent_over_row", name: "Remada Curvada", category: "SUPERIORES" },
    { key: "lat_pulldown", name: "Puxada frontal", category: "SUPERIORES" },
    { key: "shoulder_press_dumbbell", name: "Desenvolvimento com halteres", category: "SUPERIORES" },
    { key: "plank", name: "Prancha abdominal", category: "ABDOMEN / CORE" },
    { key: "abdominal_crunch", name: "Abdominal crunch", category: "ABDOMEN / CORE" },
    { key: "lower_abs", name: "Infra", category: "ABDOMEN / CORE" },
    { key: "oblique", name: "Oblíquo", category: "ABDOMEN / CORE" },
    { key: "treadmill", name: "Esteira", category: "CARDIO" }
  ]);
  const clean = (value, max = 800) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

  function normalizeOptions(options = {}) {
    return {
      workoutCount: Math.min(7, Math.max(1, Number(options.workoutCount) || 6)),
      studentName: clean(options.studentName, 120), trainerName: clean(options.trainerName, 120),
      objective: clean(options.objective, 500), generatedAt: options.generatedAt instanceof Date ? options.generatedAt : new Date(options.generatedAt || Date.now()),
      generatorVersion: clean(options.generatorVersion || "alion-web-template-v2", 80), values: options.values || {}
    };
  }
  function textField(form, font, page, name, label, x, y, width, height = 15, options = {}) {
    const { rgb } = PDFLib;
    if (label) page.drawText(label, { x, y: y + height + 2, size: options.labelSize || 5.8, font: options.bold || font, color: rgb(0.12, 0.08, 0.28) });
    const field = form.createTextField(name);
    if (options.multiline) field.enableMultiline();
    if (options.maxLength) field.setMaxLength(options.maxLength);
    field.addToPage(page, { x, y, width, height, font, textColor: rgb(0.08, 0.06, 0.16), borderColor: rgb(0.67, 0.62, 0.8), backgroundColor: rgb(1, 1, 1), borderWidth: 0.45 });
    field.setFontSize(options.fontSize || 6.5);
    return field;
  }
  function checkbox(form, font, page, name, label, x, y, size = 8, labelSize = 5.25) {
    const { rgb } = PDFLib; const field = form.createCheckBox(name);
    field.addToPage(page, { x, y, width: size, height: size, borderColor: rgb(0.42, 0.36, 0.62), backgroundColor: rgb(1, 1, 1), borderWidth: 0.45 });
    page.drawText(label, { x: x + size + 2, y: y + 1, size: labelSize, font, color: rgb(0.12, 0.1, 0.2) });
    return field;
  }
  function sectionBox(page, x, y, width, height, title, bold) {
    const { rgb } = PDFLib;
    page.drawRectangle({ x, y, width, height, borderColor: rgb(0.55, 0.42, 0.9), borderWidth: 0.65 });
    page.drawRectangle({ x, y: y + height - 19, width, height: 19, color: rgb(0.16, 0.03, 0.55) });
    page.drawText(title, { x: x + 8, y: y + height - 13, size: 8.5, font: bold, color: rgb(1, 1, 1) });
  }
  function drawHeader(page, form, font, bold, options) {
    const { rgb } = PDFLib;
    page.drawText("ALION TREINOS - FICHA RAPIDA PARA IMPORTACAO", { x: 22, y: 565, size: 16, font: bold, color: rgb(0.15, 0.03, 0.58) });
    page.drawText("VERSAO 2", { x: 770, y: 566, size: 8, font: bold, color: rgb(0.15, 0.03, 0.58) });
    textField(form, font, page, "student_name", "ALUNO", 22, 535, 225, 14, { maxLength: 120, bold });
    textField(form, font, page, "trainer_name", "PERSONAL", 260, 535, 210, 14, { maxLength: 120, bold });
    textField(form, font, page, "student_objective", "OBJETIVO GERAL", 22, 505, 310, 14, { maxLength: 500, bold });
    textField(form, font, page, "workout_period", "PERIODO", 345, 505, 125, 14, { maxLength: 100, bold });
    const level = form.createRadioGroup("student_level");
    [["beginner", "Iniciante"], ["intermediate", "Intermediario"], ["advanced", "Avancado"]].forEach(([value, label], index) => {
      level.addOptionToPage(value, page, { x: 500 + (index * 90), y: 536, width: 9, height: 9, borderWidth: 0.5 });
      page.drawText(label, { x: 512 + (index * 90), y: 538, size: 6.5, font, color: rgb(0.12, 0.1, 0.2) });
    });
    textField(form, font, page, "general_notes", "OBSERVACOES GERAIS", 485, 505, 333, 14, { maxLength: 1200, bold });
  }
  function drawQuickWorkout(page, form, font, bold, key, x, y, width, height) {
    sectionBox(page, x, y, width, height, `TREINO ${key}`, bold);
    textField(form, font, page, `workout_${key}_name`, "NOME", x + 7, y + height - 43, 105, 12, { maxLength: 160, bold });
    textField(form, font, page, `workout_${key}_focus`, "FOCO", x + 119, y + height - 43, width - 126, 12, { maxLength: 500, bold });
    const dayY = y + height - 66;
    ["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].forEach((label, index) => checkbox(form, font, page, `workout_${key}_day_${DAYS[index]}`, label, x + 7 + (index * 30), dayY, 7, 4.9));
    const defaultY = y + height - 95;
    textField(form, font, page, `workout_${key}_default_sets`, "SERIES", x + 7, defaultY, 34, 12, { maxLength: 3, bold });
    textField(form, font, page, `workout_${key}_default_reps_or_time`, "REPS / TEMPO", x + 46, defaultY, 55, 12, { maxLength: 40, bold });
    textField(form, font, page, `workout_${key}_default_weight`, "CARGA", x + 106, defaultY, 42, 12, { maxLength: 80, bold });
    textField(form, font, page, `workout_${key}_default_rest`, "DESCANSO", x + 153, defaultY, 42, 12, { maxLength: 80, bold });
    checkbox(form, font, page, `workout_${key}_apply_default`, "Padrao", x + 201, defaultY + 2, 8);
    const columns = [QUICK_EXERCISES.slice(0, 5), QUICK_EXERCISES.slice(5, 10), QUICK_EXERCISES.slice(10)];
    const exerciseColumnWidth = (width - 14) / 3;
    columns.forEach((items, column) => items.forEach((item, row) => {
      checkbox(form, font, page, `workout_${key}_exercise_${item.key}_selected`, item.name, x + 7 + (column * exerciseColumnWidth), y + 43 + ((items.length - row - 1) * 15), 7, 4.65);
    }));
    checkbox(form, font, page, `workout_${key}_other_selected`, "Outros", x + 7, y + 22, 7);
    textField(form, font, page, `workout_${key}_other_name`, "", x + 55, y + 17, width - 62, 13, { maxLength: 240 });
  }
  function drawQuickPage(pdf, form, font, bold, options) {
    const page = pdf.addPage(A4_LANDSCAPE); drawHeader(page, form, font, bold, options);
    const width = 231; const height = 214;
    WORKOUT_KEYS.slice(0, Math.min(6, options.workoutCount)).forEach((key, index) => {
      const column = index % 3; const row = Math.floor(index / 3);
      drawQuickWorkout(page, form, font, bold, key, 22 + (column * 238), row === 0 ? 275 : 51, width, height);
    });
    page.drawRectangle({ x: 738, y: 51, width: 81, height: 438, borderColor: PDFLib.rgb(0.55, 0.42, 0.9), borderWidth: 0.65, color: PDFLib.rgb(0.97, 0.96, 1) });
    page.drawText("COMO PREENCHER", { x: 746, y: 470, size: 7, font: bold, color: PDFLib.rgb(0.15, 0.03, 0.58) });
    ["1. Marque os dias", "livremente.", "", "2. Selecione os", "exercicios rapidos.", "", "3. Use o padrao", "somente quando", "Aplicar estiver", "marcado.", "", "4. Registre ajustes", "e orientacoes na", "pagina seguinte.", "", "5. Salve e importe", "para revisar."].forEach((line, index) => page.drawText(line, { x: 746, y: 450 - (index * 18), size: 5.7, font: line.match(/^\d/) ? bold : font, color: PDFLib.rgb(0.18, 0.14, 0.3) }));
    page.drawText(`${DISPLAY_ID} | Pagina 1 | PDF temporario - somente os dados aprovados serao salvos.`, { x: 22, y: 18, size: 6, font, color: PDFLib.rgb(0.35, 0.32, 0.42) });
  }
  function drawAdjustmentBlock(page, form, font, bold, key, x, y, width, height) {
    sectionBox(page, x, y, width, height, `AJUSTES E ORIENTACAO - TREINO ${key}`, bold);
    for (let row = 1; row <= 3; row += 1) {
      const lineY = y + height - 43 - ((row - 1) * 34); const prefix = `workout_${key}_exception_${String(row).padStart(2, "0")}`;
      textField(form, font, page, `${prefix}_name`, `EXCECAO ${row} - EXERCICIO`, x + 8, lineY, 142, 13, { maxLength: 240, bold });
      textField(form, font, page, `${prefix}_sets`, "SERIES", x + 155, lineY, 38, 13, { maxLength: 3, bold });
      textField(form, font, page, `${prefix}_reps_or_time`, "REPS / TEMPO", x + 198, lineY, 72, 13, { maxLength: 40, bold });
      textField(form, font, page, `${prefix}_weight`, "CARGA", x + 275, lineY, 50, 13, { maxLength: 80, bold });
      textField(form, font, page, `${prefix}_rest`, "DESCANSO", x + 330, lineY, 55, 13, { maxLength: 80, bold });
    }
    textField(form, font, page, `workout_${key}_adaptation_notes`, "ADAPTACAO / ORIENTACAO GERAL", x + 8, y + 9, width - 16, 35, { multiline: true, maxLength: 1600, fontSize: 7, bold });
  }
  function drawAdjustmentsPage(pdf, form, font, bold, keys, title) {
    const page = pdf.addPage(A4_LANDSCAPE);
    page.drawText(title, { x: 22, y: 566, size: 15, font: bold, color: PDFLib.rgb(0.15, 0.03, 0.58) });
    const width = keys.length === 1 ? 797 : 392; const height = keys.length === 1 ? 475 : 164;
    keys.forEach((key, index) => drawAdjustmentBlock(page, form, font, bold, key, keys.length === 1 ? 22 : 22 + ((index % 2) * 405), keys.length === 1 ? 63 : 377 - (Math.floor(index / 2) * 174), width, height));
    page.drawText(`${DISPLAY_ID} | Pagina ${pdf.getPageCount()} | Ajustes nunca sao aplicados por similaridade ambigua.`, { x: 22, y: 18, size: 6, font, color: PDFLib.rgb(0.35, 0.32, 0.42) });
  }
  function applyValues(form, values) {
    Object.entries(values || {}).forEach(([name, value]) => {
      let field; try { field = form.getField(name); } catch { return; }
      if (field instanceof PDFLib.PDFCheckBox) value ? field.check() : field.uncheck();
      else if (field instanceof PDFLib.PDFRadioGroup) { if (value) field.select(String(value)); }
      else field.setText(clean(value, 1600));
    });
  }
  async function generate(options = {}) {
    if (!PDFLib?.PDFDocument) throw new Error("Gerador PDF V2 indisponivel.");
    const normalized = normalizeOptions(options); const pdf = await PDFLib.PDFDocument.create();
    const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica); const bold = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold); const form = pdf.getForm();
    pdf.setTitle("Ficha Rapida Alion V2"); pdf.setSubject(DISPLAY_ID); pdf.setKeywords([TEMPLATE_ID, `template_version=${TEMPLATE_VERSION}`, `template_revision=${TEMPLATE_REVISION}`, "AcroForm", "Alion Treinos"]);
    pdf.setCreator(`Alion Treinos - ${normalized.generatorVersion}`); pdf.setProducer("pdf-lib 1.17.1"); pdf.setCreationDate(normalized.generatedAt);
    drawQuickPage(pdf, form, font, bold, normalized);
    drawAdjustmentsPage(pdf, form, font, bold, WORKOUT_KEYS.slice(0, Math.min(6, normalized.workoutCount)), "EXCECOES E ADAPTACOES - TREINOS A-F");
    if (normalized.workoutCount === 7) {
      const page = pdf.addPage(A4_LANDSCAPE); page.drawText("TREINO G - FICHA RAPIDA E AJUSTES", { x: 22, y: 566, size: 15, font: bold, color: PDFLib.rgb(0.15, 0.03, 0.58) }); drawQuickWorkout(page, form, font, bold, "G", 22, 310, 797, 220);
      drawAdjustmentBlock(page, form, font, bold, "G", 22, 48, 797, 242);
    }
    const hiddenValues = { alion_template_id: TEMPLATE_ID, alion_template_version: String(TEMPLATE_VERSION), alion_template_revision: TEMPLATE_REVISION, alion_generated_at: normalized.generatedAt.toISOString(), alion_generator_version: normalized.generatorVersion };
    Object.entries(hiddenValues).forEach(([name, value]) => { const field = form.createTextField(name); field.setText(value); field.enableReadOnly(); field.addToPage(pdf.getPage(0), { x: 1, y: 1, width: 1, height: 1, borderWidth: 0, textColor: PDFLib.rgb(1, 1, 1), backgroundColor: PDFLib.rgb(1, 1, 1), font }); });
    if (normalized.studentName) form.getTextField("student_name").setText(normalized.studentName);
    if (normalized.trainerName) form.getTextField("trainer_name").setText(normalized.trainerName);
    if (normalized.objective) form.getTextField("student_objective").setText(normalized.objective);
    applyValues(form, normalized.values); form.updateFieldAppearances(font);
    return pdf.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: true });
  }
  async function download(options = {}, environment = {}) {
    const bytes = await generate(options); const host = environment.window || (typeof window !== "undefined" ? window : null); if (!host?.URL || !host?.document) return bytes;
    const url = host.URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    try { const link = host.document.createElement("a"); link.href = url; link.download = `ficha-rapida-alion-v2-${new Date().toISOString().slice(0, 10)}.pdf`; link.click(); }
    finally { host.setTimeout(() => host.URL.revokeObjectURL(url), 0); }
    return bytes;
  }
  return { A4_LANDSCAPE, DAYS, DISPLAY_ID, QUICK_EXERCISES, TEMPLATE_ID, TEMPLATE_REVISION, TEMPLATE_VERSION, WORKOUT_KEYS, download, generate, normalizeOptions };
});
