(function initializeWorkoutPdf(root, factory) {
  "use strict";

  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutPdf = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutPdf(root) {
  "use strict";

  const DEFAULT_EXERCISES_PER_PAGE = 6;

  function pick(record, keys, fallback = "") {
    for (const key of keys) {
      const value = record?.[key];
      if (value !== undefined && value !== null && value !== "") return value;
    }
    return fallback;
  }

  function cleanText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function normalizeText(value) {
    return cleanText(value)
      .toLocaleLowerCase("pt-BR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, " ");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeWorkoutStatus(value) {
    const status = normalizeText(value || "ativo");
    if (status === "active") return "ativo";
    if (status === "archived") return "arquivado";
    if (["draft", "not_done", "incomplete"].includes(status)) return "rascunho";
    if (status === "deleted") return "excluido";
    return status || "ativo";
  }

  function sortByStableOrder(records) {
    return [...records].sort((first, second) => {
      const firstOrder = Number(pick(first, ["order_index", "position", "ordem"], Number.MAX_SAFE_INTEGER));
      const secondOrder = Number(pick(second, ["order_index", "position", "ordem"], Number.MAX_SAFE_INTEGER));
      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return cleanText(pick(first, ["created_at", "id"], "")).localeCompare(cleanText(pick(second, ["created_at", "id"], "")));
    });
  }

  function getActiveStudentWorkouts(workouts, studentId) {
    return sortByStableOrder((workouts || []).filter((workout) => (
      String(workout?.student_id) === String(studentId)
      && normalizeWorkoutStatus(pick(workout, ["status"], "ativo")) === "ativo"
    )));
  }

  function resolveWorkoutSelection(workouts, selection = "all") {
    const source = workouts || [];
    if (!selection || selection === "all") return source;
    return source.filter((workout) => String(workout.id) === String(selection));
  }

  function canExportStudent({ role, trustedAdmin, selectedStudentId, ownStudentId, accessibleStudentIds = [] }) {
    const selected = String(selectedStudentId || "");
    const accessible = new Set(accessibleStudentIds.map(String));
    if (!selected || !accessible.has(selected)) return false;
    if (role === "admin") return trustedAdmin === true;
    if (role === "trainer") return true;
    if (role === "student") return selected === String(ownStudentId || "");
    return false;
  }

  function findLibraryExercise(item, exerciseLibrary) {
    const byId = (exerciseLibrary || []).find((exercise) => String(exercise.id) === String(item.exercise_id));
    if (byId) return byId;
    const itemName = normalizeText(pick(item, ["exercise_name", "name", "nome"], ""));
    return (exerciseLibrary || []).find((exercise) => (
      normalizeText(pick(exercise, ["name", "title", "nome"], "")) === itemName
    )) || null;
  }

  function buildExercise(item, libraryExercise, mediaContext, selectExerciseImage) {
    const source = libraryExercise || item || {};
    const name = cleanText(
      pick(libraryExercise, ["name", "title", "nome"], pick(item, ["exercise_name", "name", "nome"], "Exercício")),
      "Exercício"
    );
    const imageUrl = typeof selectExerciseImage === "function"
      ? cleanText(selectExerciseImage(source, mediaContext.preference || mediaContext.gender, {
        preference: mediaContext.preference,
        gender: mediaContext.gender,
        studentId: mediaContext.studentId,
        exerciseId: libraryExercise?.id || item?.exercise_id
      }))
      : cleanText(pick(source, ["image_url", "image_url_masculino", "image_url_feminino"], ""));

    return {
      id: cleanText(item?.id),
      libraryExerciseId: cleanText(libraryExercise?.id || item?.exercise_id),
      name,
      sets: cleanText(pick(item, ["sets", "series", "set_count"], "—"), "—"),
      reps: cleanText(pick(item, ["reps", "repetitions", "repeticoes"], "—"), "—"),
      load: cleanText(pick(item, ["load", "weight", "carga"], "—"), "—"),
      rest: cleanText(pick(item, ["rest_seconds", "rest", "descanso"], "—"), "—"),
      notes: cleanText(pick(item, ["notes", "observations", "observation"], "")),
      instructions: cleanText(pick(libraryExercise, ["instructions", "description"], "")),
      imageUrl
    };
  }

  function buildPlan({
    student,
    personalName,
    workouts,
    workoutExercises,
    exerciseLibrary,
    generatedAt = new Date(),
    selectExerciseImage
  }) {
    if (!student?.id) throw new Error("Aluno inválido para geração da ficha.");
    const mediaContext = {
      gender: pick(student, ["genero", "gender", "sexo", "avatar_gender"], ""),
      preference: pick(student, ["exercise_character_preference"], ""),
      studentId: student.id
    };
    const planWorkouts = (workouts || []).map((workout) => {
      const items = sortByStableOrder((workoutExercises || []).filter((item) => (
        String(item.workout_id) === String(workout.id)
      ))).map((item) => buildExercise(
        item,
        findLibraryExercise(item, exerciseLibrary),
        mediaContext,
        selectExerciseImage
      ));

      return {
        id: cleanText(workout.id),
        name: cleanText(pick(workout, ["name", "title", "nome"], "Treino"), "Treino"),
        objective: cleanText(pick(workout, ["objective", "goal", "description", "objetivo"], "")),
        notes: cleanText(pick(workout, ["notes"], "")),
        exercises: items
      };
    });

    const studentObjective = cleanText(pick(student, ["objective", "objetivo"], ""));
    return {
      studentId: String(student.id),
      studentName: cleanText(pick(student, ["name", "full_name", "nome"], "Aluno"), "Aluno"),
      personalName: cleanText(personalName, "Personal responsável"),
      studentObjective,
      objective: studentObjective,
      generatedAt: generatedAt instanceof Date ? generatedAt.toISOString() : cleanText(generatedAt),
      workouts: planWorkouts
    };
  }

  function paginatePlan(plan, exercisesPerPage = DEFAULT_EXERCISES_PER_PAGE) {
    const limit = Math.max(1, Number(exercisesPerPage) || DEFAULT_EXERCISES_PER_PAGE);
    const pages = [];
    (plan?.workouts || []).forEach((workout) => {
      const exercises = workout.exercises || [];
      const chunks = exercises.length ? Math.ceil(exercises.length / limit) : 1;
      for (let index = 0; index < chunks; index += 1) {
        pages.push({
          workout,
          workoutPage: index + 1,
          workoutPages: chunks,
          exerciseOffset: index * limit,
          exercises: exercises.slice(index * limit, (index + 1) * limit)
        });
      }
    });
    return pages.map((page, index) => ({ ...page, pageNumber: index + 1, totalPages: pages.length }));
  }

  function formatGeneratedDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return cleanText(value, "Não informada");
    return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(date);
  }

  function formatRest(value) {
    const text = cleanText(value, "—");
    return /^\d+(?:[.,]\d+)?$/.test(text) ? `${text}s` : text;
  }

  function renderImage(exercise) {
    if (!exercise.imageUrl) {
      return `<div class="visual-placeholder"><span>[imagem padrão]</span><strong>${escapeHtml(exercise.name)}</strong></div>`;
    }
    return `<img src="${escapeHtml(exercise.imageUrl)}" alt="Demonstração de ${escapeHtml(exercise.name)}" data-exercise-name="${escapeHtml(exercise.name)}" loading="eager" decoding="async" />`;
  }

  function renderExerciseRow(exercise, index, exerciseOffset = 0) {
    const details = [exercise.notes, exercise.instructions].filter(Boolean).join(" - ");
    return `
      <tr>
        <td class="exercise-name"><b>${exerciseOffset + index + 1}. ${escapeHtml(exercise.name)}</b>${details ? `<small>${escapeHtml(details)}</small>` : ""}</td>
        <td>${escapeHtml(exercise.sets)}</td>
        <td>${escapeHtml(exercise.reps)}</td>
        <td>${escapeHtml(exercise.load)}</td>
        <td>${escapeHtml(formatRest(exercise.rest))}</td>
      </tr>
    `;
  }

  function renderCompactExerciseRow(exercise, index) {
    return `
      <tr>
        <td class="exercise-name"><b>${index + 1}. ${escapeHtml(exercise.name)}</b></td>
        <td>${escapeHtml(exercise.sets)}</td>
        <td>${escapeHtml(exercise.reps)}</td>
        <td>${escapeHtml(exercise.load)}</td>
        <td>${escapeHtml(formatRest(exercise.rest))}</td>
      </tr>
    `;
  }

  function renderGuideItem(exercise) {
    return `
      <figure class="guide-item">
        <div class="guide-image">${renderImage(exercise)}</div>
        <figcaption>${escapeHtml(exercise.name)}</figcaption>
      </figure>
    `;
  }

  function getUniqueExercises(plan) {
    const unique = new Map();
    (plan?.workouts || []).forEach((workout) => {
      (workout.exercises || []).forEach((exercise) => {
        const key = exercise.libraryExerciseId
          ? `id:${exercise.libraryExerciseId}`
          : `name:${normalizeText(exercise.name)}`;
        if (!unique.has(key)) unique.set(key, exercise);
      });
    });
    return [...unique.values()];
  }

  function renderFullWorkout(workout, workoutIndex) {
    return `
      <section class="full-workout-block">
        <div class="full-workout-title"><h3>${workoutIndex + 1}. ${escapeHtml(workout.name)}</h3><span>${workout.exercises.length} exercício(s)</span></div>
        <p class="full-workout-meta"><b>Objetivo:</b> ${escapeHtml(workout.objective || "Não informado")}${workout.notes ? ` <b>Observações:</b> ${escapeHtml(workout.notes)}` : ""}</p>
        <table class="full-workout-table">
          <thead><tr><th>Exercício</th><th>Séries</th><th>Reps</th><th>Carga</th><th>Desc.</th></tr></thead>
          <tbody>${workout.exercises.length ? workout.exercises.map(renderCompactExerciseRow).join("") : '<tr><td colspan="5">Nenhum exercício cadastrado neste treino.</td></tr>'}</tbody>
        </table>
      </section>
    `;
  }

  function renderFullPlanPage(plan) {
    const uniqueExercises = getUniqueExercises(plan);
    const guideDensity = uniqueExercises.length <= 11
      ? "few"
      : uniqueExercises.length <= 20 ? "medium" : "many";
    const guideColumns = guideDensity === "few" ? 3 : guideDensity === "medium" ? 4 : 5;
    const guideRemainder = uniqueExercises.length % guideColumns;
    const totalExercises = plan.workouts.reduce((total, workout) => total + workout.exercises.length, 0);
    return `
      <section class="pdf-page full-plan">
        <main class="fold-layout full-plan-layout">
          <section class="training-side full-plan-training" data-fit-side>
            <div class="full-plan-content">
              <header class="page-header full-plan-header">
                <div class="full-plan-heading"><span class="brand-mark">AT</span><h1>ALION TREINOS <small>- Plano completo</small></h1></div>
                <dl>
                  <div class="student-field"><dt>Aluno</dt><dd>${escapeHtml(plan.studentName)}</dd></div>
                  <div class="personal-field"><dt>Personal</dt><dd>${escapeHtml(plan.personalName)}</dd></div>
                  <div><dt>Objetivo geral</dt><dd>${escapeHtml(plan.studentObjective || plan.objective || "Não informado")}</dd></div>
                  <div><dt>Gerado em</dt><dd>${escapeHtml(formatGeneratedDate(plan.generatedAt))}</dd></div>
                  <div><dt>Página</dt><dd>1/1</dd></div>
                </dl>
              </header>
              <div class="area-title full-plan-title"><h2>Plano completo - ${plan.workouts.length} treinos</h2><span>${totalExercises} exercício(s)</span></div>
              <div class="full-workouts">${plan.workouts.map(renderFullWorkout).join("")}</div>
            </div>
          </section>
          <aside class="visual-side full-plan-visual" data-fit-side>
            <div class="full-plan-content">
              <div class="area-title"><h2>Guia visual</h2><span>${uniqueExercises.length} exercício(s) sem repetição</span></div>
              <p class="placeholder-legend">Imagem padrão = mídia ainda não cadastrada</p>
              <div class="guide-grid full-plan-guide guide-density-${guideDensity} guide-remainder-${guideRemainder}">${uniqueExercises.length ? uniqueExercises.map(renderGuideItem).join("") : '<p class="empty-guide">Sem imagens para este plano.</p>'}</div>
            </div>
          </aside>
        </main>
      </section>
    `;
  }

  function renderPage(plan, page) {
    const subtitle = page.workoutPages > 1 ? ` - parte ${page.workoutPage}/${page.workoutPages}` : "";
    const guideCount = Math.min(page.exercises.length, DEFAULT_EXERCISES_PER_PAGE);
    return `
      <section class="pdf-page">
        <main class="fold-layout">
          <section class="training-side">
            <header class="page-header">
              <div class="brand-block"><span class="brand-mark">AT</span><div><h1>ALION TREINOS</h1><p>Ficha profissional de treino</p></div></div>
              <dl>
                <div class="full-field"><dt>Aluno</dt><dd>${escapeHtml(plan.studentName)}</dd></div>
                <div><dt>Personal</dt><dd>${escapeHtml(plan.personalName)}</dd></div>
                <div><dt>Página</dt><dd>${page.pageNumber}/${page.totalPages}</dd></div>
                <div class="full-field"><dt>Treino</dt><dd>${escapeHtml(page.workout.name)}${escapeHtml(subtitle)}</dd></div>
                <div class="full-field"><dt>Objetivo do treino</dt><dd>${escapeHtml(page.workout.objective || "Não informado")}</dd></div>
                <div class="full-field"><dt>Gerado em</dt><dd>${escapeHtml(formatGeneratedDate(plan.generatedAt))}</dd></div>
              </dl>
            </header>
            <div class="area-title"><h2>Treino / informações</h2><span>${page.exercises.length} exercício(s)</span></div>
            ${page.workout.notes ? `<p class="workout-note"><b>Observação do treino:</b> ${escapeHtml(page.workout.notes)}</p>` : ""}
            <table>
              <thead><tr><th>Exercício e orientação</th><th>Séries</th><th>Repetições</th><th>Carga</th><th>Descanso</th></tr></thead>
              <tbody>${page.exercises.length ? page.exercises.map((exercise, index) => renderExerciseRow(exercise, index, page.exerciseOffset)).join("") : '<tr><td colspan="5">Nenhum exercício cadastrado neste treino.</td></tr>'}</tbody>
            </table>
            <footer>Alion Treinos - ficha destinada exclusivamente à orientação do treino</footer>
          </section>
          <aside class="visual-side">
            <div class="area-title"><h2>Guia visual</h2><span>Referência dos exercícios</span></div>
            <div class="guide-grid guide-count-${guideCount}">${page.exercises.length ? page.exercises.map(renderGuideItem).join("") : '<p class="empty-guide">Sem imagens para esta página.</p>'}</div>
          </aside>
        </main>
      </section>
    `;
  }

  function renderDocument(plan, options = {}) {
    const isFullPlan = plan.workouts.length > 1;
    const pages = isFullPlan ? [] : paginatePlan(plan, options.exercisesPerPage);
    const title = `${plan.studentName} - ${plan.workouts.length === 1 ? plan.workouts[0].name : "Plano completo"} - Alion Treinos`;
    return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${escapeHtml(options.baseUrl || "./")}"><title>${escapeHtml(title)}</title>
<style>
@page { size: A4 landscape; margin: ${isFullPlan ? "4mm" : "7mm"}; }
* { box-sizing: border-box; }
html, body { margin: 0; background: #e8e8ec; color: #17131c; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: economy; print-color-adjust: economy; }
.pdf-page { width: 283mm; min-height: 196mm; margin: 7mm auto; padding: 6mm; background: #fff; border: 1px solid #8f8995; break-after: page; page-break-after: always; }
.pdf-page:last-child { break-after: auto; page-break-after: auto; }
.fold-layout { position: relative; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8mm; min-height: 182mm; }
.fold-layout::before { content: ""; position: absolute; top: 0; bottom: 0; left: 50%; border-left: 1px dashed #aaa5ad; transform: translateX(-.5px); }
.training-side, .visual-side { min-width: 0; border: 1px solid #6c6570; padding: 3mm; }
.training-side { display: flex; flex-direction: column; }
.page-header { border: 1.5px solid #26202b; padding: 2.5mm; margin-bottom: 3mm; }
.brand-block { display: flex; align-items: center; gap: 2.5mm; padding-bottom: 2mm; margin-bottom: 2mm; border-bottom: 1px solid #8f8995; }
.brand-mark { width: 11mm; height: 11mm; border: 1.5px solid #26202b; border-radius: 50%; display: grid; place-items: center; flex: 0 0 auto; font-size: 9pt; font-weight: 900; }
.page-header h1 { font-size: 13pt; letter-spacing: .07em; margin: 0; }
.page-header p { font-size: 7pt; margin: .5mm 0 0; }
.page-header dl { margin: 0; display: grid; grid-template-columns: minmax(0, 1fr) 28mm; gap: 1.3mm 3mm; }
.page-header dl div { min-width: 0; }
.page-header dl .full-field { grid-column: 1 / -1; }
.page-header dt { font-size: 6.3pt; text-transform: uppercase; font-weight: 700; color: #4d4652; }
.page-header dd { font-size: 7.8pt; line-height: 1.2; font-weight: 700; margin: .25mm 0 0; overflow-wrap: anywhere; }
.area-title { display: flex; justify-content: space-between; align-items: baseline; gap: 3mm; border-bottom: 1.5px solid #26202b; margin-bottom: 2mm; padding-bottom: 1.2mm; }
.area-title h2 { font-size: 9.5pt; margin: 0; text-transform: uppercase; }
.area-title span { font-size: 6.8pt; text-align: right; }
.workout-note { border: 1px solid #8f8995; margin: 0 0 2mm; padding: 1.5mm; font-size: 7pt; line-height: 1.25; }
table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 6.8pt; }
th, td { border: 1px solid #77717b; padding: 1.25mm 1mm; vertical-align: top; text-align: center; overflow-wrap: anywhere; }
th { font-size: 6.1pt; text-transform: uppercase; background: #eee; }
th:first-child, td:first-child { width: 51%; text-align: left; }
th:nth-child(2), td:nth-child(2) { width: 9%; }
th:nth-child(3), td:nth-child(3) { width: 14%; }
th:nth-child(4), td:nth-child(4) { width: 12%; }
th:nth-child(5), td:nth-child(5) { width: 14%; }
.exercise-name b { display: block; font-size: 7.2pt; }
.exercise-name small { display: block; margin-top: .7mm; line-height: 1.25; color: #3f3943; }
.visual-side { display: flex; flex-direction: column; }
.guide-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 2.2mm; align-content: start; }
.guide-grid.guide-count-0 { grid-template-columns: 1fr; place-items: center; }
.guide-grid.guide-count-1 { grid-template-columns: minmax(0, 48mm); justify-content: center; }
.guide-grid.guide-count-2 { grid-template-columns: repeat(2, minmax(0, 42mm)); justify-content: center; }
.guide-grid.guide-count-3, .guide-grid.guide-count-4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.guide-item { border: 1px solid #8f8995; margin: 0; padding: 1.2mm; min-width: 0; break-inside: avoid; }
.guide-image { height: 27mm; display: grid; place-items: center; background: #fff; }
.guide-image img { width: 100%; height: 100%; object-fit: contain; }
.guide-item figcaption { min-height: 7mm; border-top: 1px solid #8f8995; margin-top: 1mm; padding: 1mm .5mm 0; font-size: 6.7pt; line-height: 1.15; font-weight: 700; text-align: center; overflow-wrap: anywhere; }
.visual-placeholder { width: 100%; height: 100%; border: 1px dashed #77717b; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 1.5mm; gap: .8mm; font-size: 6.3pt; }
.visual-placeholder strong { font-size: 6.5pt; }
.empty-guide { font-size: 8pt; text-align: center; }
footer { margin-top: auto; padding-top: 2mm; border-top: 1px solid #77717b; text-align: center; font-size: 6.3pt; color: #4d4652; }
.full-plan { width: 289mm; height: 202mm; min-height: 202mm; margin: 4mm auto; padding: 2.5mm; overflow: hidden; }
.full-plan-layout { height: 197mm; min-height: 197mm; gap: 6mm; }
.full-plan-training, .full-plan-visual { height: 197mm; overflow: hidden; padding: 1.4mm; }
.full-plan-content { width: 100%; height: 100%; }
.full-plan-visual .full-plan-content { display: flex; flex-direction: column; }
.full-plan-header { padding: 1mm 1.3mm; margin-bottom: 1mm; }
.full-plan-heading { display: flex; align-items: center; gap: 1.3mm; padding-bottom: .6mm; margin-bottom: .6mm; border-bottom: 1px solid #8f8995; }
.full-plan-header .brand-mark { width: 7mm; height: 7mm; font-size: 6pt; }
.full-plan-header h1 { font-size: 8.5pt; }
.full-plan-header h1 small { font-size: 6.5pt; font-weight: 700; letter-spacing: 0; }
.full-plan-header dl { grid-template-columns: 1.15fr 1fr .65fr; gap: .3mm 1.8mm; }
.full-plan-header dl .student-field { grid-column: span 1; }
.full-plan-header dl .personal-field { grid-column: span 2; }
.full-plan-header dt { display: inline; font-size: 4.8pt; }
.full-plan-header dd { display: inline; font-size: 5.7pt; margin: 0 0 0 .6mm; }
.full-plan-title { margin-bottom: .55mm; padding-bottom: .4mm; }
.full-plan-title h2 { font-size: 7pt; }
.full-plan-title span { font-size: 5pt; }
.full-workout-block { margin: 0 0 .65mm; break-inside: avoid; page-break-inside: avoid; }
.full-workout-title { display: flex; justify-content: space-between; align-items: baseline; gap: 2mm; border: 1px solid #39333d; border-bottom: 0; padding: .55mm .8mm; color: #fff; background: #39333d; }
.full-workout-title h3 { margin: 0; font-size: 6.2pt; text-transform: uppercase; }
.full-workout-title span { font-size: 4.8pt; }
.full-workout-meta { margin: 0; border: 1px solid #77717b; border-bottom: 0; padding: .35mm .55mm; font-size: 4.8pt; line-height: 1.08; overflow-wrap: anywhere; }
.full-workout-table { font-size: 5.5pt; }
.full-workout-table th, .full-workout-table td { padding: .42mm .48mm; line-height: 1.08; }
.full-workout-table th { font-size: 4.5pt; }
.full-workout-table th:first-child, .full-workout-table td:first-child { width: 48%; }
.full-workout-table th:nth-child(2), .full-workout-table td:nth-child(2) { width: 10%; }
.full-workout-table th:nth-child(3), .full-workout-table td:nth-child(3) { width: 17%; }
.full-workout-table th:nth-child(4), .full-workout-table td:nth-child(4) { width: 12%; }
.full-workout-table th:nth-child(5), .full-workout-table td:nth-child(5) { width: 13%; }
.full-workout-table .exercise-name b { font-size: 5.8pt; }
.full-plan-visual .area-title { margin-bottom: .6mm; padding-bottom: .5mm; }
.full-plan-visual .area-title h2 { font-size: 8pt; }
.full-plan-visual .area-title span { font-size: 5.5pt; }
.placeholder-legend { margin: 0 0 .7mm; font-size: 4.8pt; color: #4d4652; text-align: right; }
.full-plan-guide { flex: 1; min-height: 0; display: grid; gap: 1.2mm; align-content: stretch; }
.full-plan-guide.guide-density-few { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.full-plan-guide.guide-density-medium { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.full-plan-guide.guide-density-many { grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .9mm; }
.full-plan-guide.guide-density-medium.guide-remainder-1 .guide-item:last-child { grid-column: 2 / span 2; }
.full-plan-guide.guide-density-medium.guide-remainder-2 .guide-item:nth-last-child(-n + 2) { grid-column: span 2; }
.full-plan-guide .guide-item { min-height: 0; display: flex; flex-direction: column; padding: .7mm; }
.full-plan-guide .guide-image { flex: 1; min-height: 0; height: auto; }
.full-plan-guide .guide-item figcaption { flex: 0 0 auto; min-height: 4.5mm; margin-top: .45mm; padding: .45mm .25mm 0; font-size: 5.2pt; line-height: 1.08; }
.full-plan-guide.guide-density-few .guide-item figcaption { font-size: 5.8pt; }
.full-plan-guide.guide-density-many .guide-item { padding: .45mm; }
.full-plan-guide.guide-density-many .guide-item figcaption { min-height: 3.8mm; font-size: 4.5pt; }
.full-plan-guide .visual-placeholder { padding: .4mm; gap: .2mm; font-size: 3.5pt; }
.full-plan-guide .visual-placeholder strong { font-size: 3.8pt; }
.full-plan-dense .full-workout-table { font-size: 5.2pt; }
.full-plan-dense .full-workout-table th, .full-plan-dense .full-workout-table td { padding: .3mm .4mm; }
.full-plan-extra-dense .full-workout-title { padding-top: .35mm; padding-bottom: .35mm; }
.full-plan-extra-dense .full-workout-meta { padding-top: .2mm; padding-bottom: .2mm; font-size: 4.4pt; }
.full-plan-extra-dense .full-workout-block { margin-bottom: .4mm; }
@media print { html, body { width: 100%; height: 100%; background: #fff; } .pdf-page { margin: 0; border: 0; } .pdf-page:not(.full-plan) { width: auto; min-height: 196mm; padding: 0; } .pdf-page:not(.full-plan) .fold-layout { min-height: 196mm; } .full-plan { width: 289mm; height: 202mm; min-height: 202mm; padding: 2.5mm; } }
</style></head><body>${isFullPlan ? renderFullPlanPage(plan) : pages.map((page) => renderPage(plan, page)).join("")}</body></html>`;
  }

  function fitFullPlanPages(documentRef) {
    [...documentRef.querySelectorAll(".full-plan")].forEach((page) => {
      page.classList.remove("full-plan-dense", "full-plan-extra-dense");
      const hasOverflow = () => [...page.querySelectorAll("[data-fit-side]")].some((side) => {
        const content = side.querySelector(".full-plan-content");
        return Boolean(content && side.clientHeight && content.scrollHeight > side.clientHeight + 1);
      });
      if (hasOverflow()) page.classList.add("full-plan-dense");
      if (hasOverflow()) page.classList.add("full-plan-extra-dense");
    });
  }

  function replaceBrokenImage(image) {
    const documentRef = image.ownerDocument;
    const placeholder = documentRef.createElement("div");
    placeholder.className = "visual-placeholder";
    const label = documentRef.createElement("span");
    label.textContent = "[imagem padrão]";
    const name = documentRef.createElement("strong");
    name.textContent = image.dataset.exerciseName || "Exercício";
    placeholder.append(label, name);
    image.replaceWith(placeholder);
  }

  function waitForImages(documentRef, timeoutMs = 7000) {
    const images = [...documentRef.images];
    if (!images.length) return Promise.resolve();
    return Promise.all(images.map((image) => new Promise((resolve) => {
      let settled = false;
      const finish = (loaded) => {
        if (settled) return;
        settled = true;
        if (!loaded) replaceBrokenImage(image);
        resolve();
      };
      if (image.complete) {
        finish(image.naturalWidth > 0);
        return;
      }
      image.addEventListener("load", () => finish(true), { once: true });
      image.addEventListener("error", () => finish(false), { once: true });
      setTimeout(() => finish(image.complete && image.naturalWidth > 0), timeoutMs);
    })));
  }

  async function printPlan(plan, options = {}) {
    const host = options.hostWindow || root;
    if (!host?.open) throw new Error("Impressão não disponível neste dispositivo.");
    const printWindow = host.open("", "_blank");
    if (!printWindow) throw new Error("Permita a abertura da ficha para salvar o PDF.");
    printWindow.opener = null;
    printWindow.document.open();
    printWindow.document.write(renderDocument(plan, {
      ...options,
      baseUrl: options.baseUrl || host.document?.baseURI || "./"
    }));
    printWindow.document.close();
    await waitForImages(printWindow.document, options.imageTimeoutMs);
    fitFullPlanPages(printWindow.document);
    await new Promise((resolve) => {
      if (typeof printWindow.requestAnimationFrame === "function") {
        printWindow.requestAnimationFrame(() => resolve());
        return;
      }
      setTimeout(resolve, 0);
    });
    printWindow.focus();
    printWindow.print();
    return printWindow;
  }

  return {
    DEFAULT_EXERCISES_PER_PAGE,
    buildPlan,
    canExportStudent,
    getActiveStudentWorkouts,
    fitFullPlanPages,
    paginatePlan,
    printPlan,
    renderDocument,
    resolveWorkoutSelection,
    waitForImages
  };
});
