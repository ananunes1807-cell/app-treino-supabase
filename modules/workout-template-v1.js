(function initializeWorkoutTemplateV1(root, factory) {
  "use strict";
  const api = factory(root?.PDFLib || (typeof module === "object" ? require("../assets/vendor/pdf-lib-1.17.1/pdf-lib.min.js") : null));
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutTemplateV1 = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutTemplateV1(PDFLib) {
  "use strict";

  const TEMPLATE_ID = "ALION_WORKOUT_TEMPLATE";
  const TEMPLATE_VERSION = 1;
  const DISPLAY_ID = `${TEMPLATE_ID}_V${TEMPLATE_VERSION}`;
  const EXERCISES_PER_PAGE = 6;
  const A4 = Object.freeze([595.28, 841.89]);
  const MARGIN = 34;
  const MAX_WORKOUTS = 5;
  const MAX_EXERCISES_PER_WORKOUT = 18;

  const clean = (value, max = 500) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  const fieldName = (workout, exercise, suffix) => `workout_${workout}_exercise_${exercise}_${suffix}`;

  function normalizeOptions(options = {}) {
    const workoutCount = Math.min(MAX_WORKOUTS, Math.max(1, Number(options.workoutCount) || 1));
    const exercisesPerWorkout = Math.min(MAX_EXERCISES_PER_WORKOUT, Math.max(EXERCISES_PER_PAGE, Number(options.exercisesPerWorkout) || EXERCISES_PER_PAGE));
    return {
      workoutCount,
      exercisesPerWorkout: Math.ceil(exercisesPerWorkout / EXERCISES_PER_PAGE) * EXERCISES_PER_PAGE,
      studentName: clean(options.studentName, 120),
      trainerName: clean(options.trainerName, 120),
      objective: clean(options.objective, 500),
      generatedAt: options.generatedAt instanceof Date ? options.generatedAt : new Date(options.generatedAt || Date.now()),
      generatorVersion: clean(options.generatorVersion || "alion-web-v1", 80)
    };
  }

  function addTextField(form, font, page, name, label, box, options = {}) {
    const { rgb } = PDFLib;
    page.drawText(label, { x: box.x, y: box.y + box.height + 3, size: 7.5, font, color: rgb(0.22, 0.22, 0.22) });
    let field = form.getFields().find((candidate) => candidate.getName() === name);
    if (!field) field = form.createTextField(name);
    if (options.multiline) field.enableMultiline();
    if (options.maxLength) field.setMaxLength(options.maxLength);
    if (options.value) field.setText(clean(options.value, options.maxLength || 500));
    field.addToPage(page, {
      x: box.x, y: box.y, width: box.width, height: box.height,
      textColor: rgb(0.08, 0.08, 0.08), borderColor: rgb(0.45, 0.45, 0.45),
      backgroundColor: rgb(1, 1, 1), borderWidth: 0.7, font
    });
    field.setFontSize(options.fontSize || 8);
    return field;
  }

  function drawHeader(page, form, font, bold, options) {
    const { rgb } = PDFLib;
    const width = A4[0] - (MARGIN * 2);
    page.drawText("ALION TREINOS", { x: MARGIN, y: 798, size: 17, font: bold, color: rgb(0.12, 0.12, 0.12) });
    page.drawText("FICHA PADRAO PREENCHIVEL", { x: MARGIN, y: 782, size: 8, font, color: rgb(0.32, 0.32, 0.32) });
    page.drawLine({ start: { x: MARGIN, y: 774 }, end: { x: A4[0] - MARGIN, y: 774 }, thickness: 1.2, color: rgb(0.25, 0.25, 0.25) });
    addTextField(form, font, page, "student_name", "Nome do aluno", { x: MARGIN, y: 742, width: 255, height: 18 }, { value: options.studentName, maxLength: 120 });
    addTextField(form, font, page, "trainer_name", "Personal", { x: MARGIN + 267, y: 742, width: width - 267, height: 18 }, { value: options.trainerName, maxLength: 120 });
    addTextField(form, font, page, "workout_date", "Data", { x: MARGIN, y: 708, width: 92, height: 18 }, { maxLength: 40 });
    addTextField(form, font, page, "workout_period", "Validade / periodo", { x: MARGIN + 104, y: 708, width: 150, height: 18 }, { maxLength: 100 });
    addTextField(form, font, page, "student_objective", "Objetivo", { x: MARGIN + 266, y: 708, width: width - 266, height: 18 }, { value: options.objective, maxLength: 500 });
    addTextField(form, font, page, "general_notes", "Observacoes gerais", { x: MARGIN, y: 667, width, height: 25 }, { multiline: true, maxLength: 1200, fontSize: 8 });
  }

  function drawWorkoutPage(pdf, form, font, bold, options, workoutIndex, pageIndex, startExercise) {
    const { rgb } = PDFLib;
    const page = pdf.addPage(A4);
    drawHeader(page, form, font, bold, options);
    const width = A4[0] - (MARGIN * 2);
    const continuation = pageIndex > 0 ? " - continuacao" : "";
    page.drawRectangle({ x: MARGIN, y: 627, width, height: 26, color: rgb(0.92, 0.92, 0.92), borderColor: rgb(0.35, 0.35, 0.35), borderWidth: 0.8 });
    page.drawText(`TREINO ${workoutIndex}${continuation}`, { x: MARGIN + 7, y: 636, size: 10, font: bold, color: rgb(0.12, 0.12, 0.12) });
    addTextField(form, font, page, `workout_${workoutIndex}_name`, "Treino", { x: MARGIN, y: 592, width: 115, height: 18 }, { maxLength: 160 });
    addTextField(form, font, page, `workout_${workoutIndex}_days`, "Dia(s)", { x: MARGIN + 127, y: 592, width: 180, height: 18 }, { maxLength: 80 });
    addTextField(form, font, page, `workout_${workoutIndex}_focus`, "Grupo muscular / foco", { x: MARGIN + 319, y: 592, width: width - 319, height: 18 }, { maxLength: 500 });

    for (let slot = 0; slot < EXERCISES_PER_PAGE; slot += 1) {
      const exerciseIndex = startExercise + slot;
      const top = 565 - (slot * 86);
      page.drawRectangle({ x: MARGIN, y: top - 72, width, height: 77, borderColor: rgb(0.52, 0.52, 0.52), borderWidth: 0.6 });
      page.drawText(String(exerciseIndex).padStart(2, "0"), { x: MARGIN + 5, y: top - 5, size: 8, font: bold, color: rgb(0.35, 0.35, 0.35) });
      const x = MARGIN + 24;
      addTextField(form, font, page, fieldName(workoutIndex, exerciseIndex, "name"), "Exercicio", { x, y: top - 19, width: 257, height: 17 }, { maxLength: 240 });
      addTextField(form, font, page, fieldName(workoutIndex, exerciseIndex, "sets"), "Series", { x: x + 266, y: top - 19, width: 48, height: 17 }, { maxLength: 3 });
      addTextField(form, font, page, fieldName(workoutIndex, exerciseIndex, "reps"), "Repeticoes", { x: x + 323, y: top - 19, width: 78, height: 17 }, { maxLength: 40 });
      addTextField(form, font, page, fieldName(workoutIndex, exerciseIndex, "weight"), "Carga", { x: x + 410, y: top - 19, width: width - 434, height: 17 }, { maxLength: 80 });
      addTextField(form, font, page, fieldName(workoutIndex, exerciseIndex, "duration"), "Duracao", { x, y: top - 56, width: 72, height: 21 }, { maxLength: 80 });
      addTextField(form, font, page, fieldName(workoutIndex, exerciseIndex, "rest"), "Descanso", { x: x + 81, y: top - 56, width: 72, height: 21 }, { maxLength: 80 });
      addTextField(form, font, page, fieldName(workoutIndex, exerciseIndex, "equipment"), "Equipamento", { x: x + 162, y: top - 56, width: 110, height: 21 }, { maxLength: 120 });
      addTextField(form, font, page, fieldName(workoutIndex, exerciseIndex, "adaptation"), "Adaptacao / orientacao", { x: x + 281, y: top - 56, width: width - 305, height: 21 }, { multiline: true, maxLength: 500, fontSize: 7.5 });
    }
    page.drawText(`${DISPLAY_ID} | Pagina ${pdf.getPageCount()} | PDF temporario: o Alion armazena somente dados estruturados aprovados.`, { x: MARGIN, y: 18, size: 6.8, font, color: rgb(0.35, 0.35, 0.35) });
  }

  async function generate(options = {}) {
    if (!PDFLib?.PDFDocument) throw new Error("Gerador PDF indisponivel.");
    const normalized = normalizeOptions(options);
    const pdf = await PDFLib.PDFDocument.create();
    const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    const bold = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    const form = pdf.getForm();
    pdf.setTitle("Ficha Padrao Alion V1");
    pdf.setSubject(DISPLAY_ID);
    pdf.setKeywords([TEMPLATE_ID, `template_version=${TEMPLATE_VERSION}`, "AcroForm", "Alion Treinos"]);
    pdf.setCreator(`Alion Treinos - ${normalized.generatorVersion}`);
    pdf.setProducer("pdf-lib 1.17.1");
    pdf.setCreationDate(normalized.generatedAt);

    const hiddenFields = {
      alion_template_id: TEMPLATE_ID,
      alion_template_version: String(TEMPLATE_VERSION),
      alion_generated_at: normalized.generatedAt.toISOString(),
      alion_generator_version: normalized.generatorVersion
    };
    const hidden = Object.entries(hiddenFields).map(([name, value]) => {
      const field = form.createTextField(name); field.setText(value); field.enableReadOnly();
      return field;
    });

    for (let workout = 1; workout <= normalized.workoutCount; workout += 1) {
      const pages = normalized.exercisesPerWorkout / EXERCISES_PER_PAGE;
      for (let page = 0; page < pages; page += 1) drawWorkoutPage(pdf, form, font, bold, normalized, workout, page, (page * EXERCISES_PER_PAGE) + 1);
    }
    hidden.forEach((field) => field.addToPage(pdf.getPage(0), {
      x: 1, y: 1, width: 1, height: 1, borderWidth: 0,
      textColor: PDFLib.rgb(1, 1, 1), backgroundColor: PDFLib.rgb(1, 1, 1), font
    }));
    form.updateFieldAppearances(font);
    return pdf.save({ useObjectStreams: false, addDefaultPage: false, updateFieldAppearances: true });
  }

  async function download(options = {}, environment = {}) {
    const bytes = await generate(options);
    const host = environment.window || (typeof window !== "undefined" ? window : null);
    if (!host?.URL || !host?.document) return bytes;
    const url = host.URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
    try {
      const link = host.document.createElement("a");
      link.href = url; link.download = `ficha-padrao-alion-v1-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
    } finally {
      host.setTimeout(() => host.URL.revokeObjectURL(url), 0);
    }
    return bytes;
  }

  return { A4, DISPLAY_ID, EXERCISES_PER_PAGE, MAX_EXERCISES_PER_WORKOUT, MAX_WORKOUTS, TEMPLATE_ID, TEMPLATE_VERSION, download, fieldName, generate, normalizeOptions };
});
