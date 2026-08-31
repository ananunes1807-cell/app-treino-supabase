(function initializeWorkoutImportReview(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlionWorkoutImportReview = Object.freeze(api);
})(typeof window !== "undefined" ? window : null, function createWorkoutImportReview(root) {
  "use strict";
  let config = null;
  let draft = null;
  let file = null;
  let previewDocument = null;
  let pageNumber = 1;
  let abortController = null;

  const byId = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const statusLabel = { matched: "✅ Correspondência encontrada", review_required: "⚠️ Verificar correspondência", ambiguous: "❓ Ambíguo", not_found: "➕ Não encontrado" };

  function progress(message) {
    byId("workout-import-progress").textContent = message;
    byId("workout-import-progress").classList.remove("hidden");
  }
  async function release({ clearInput = true } = {}) {
    abortController?.abort(); abortController = null;
    if (previewDocument) await previewDocument.destroy().catch(() => {});
    previewDocument = null; file = null; draft = null; pageNumber = 1;
    const input = byId("workout-import-file"); if (input && clearInput) input.value = "";
  }
  async function close() {
    await release();
    byId("workout-import-modal").classList.add("hidden");
    byId("workout-import-review").classList.add("hidden");
    byId("workout-import-progress").classList.add("hidden");
    byId("workout-import-start").classList.remove("hidden");
  }
  function open() {
    if (!config.getStudentId()) return config.toast("Selecione um aluno antes de importar.", "error");
    byId("workout-import-modal").classList.remove("hidden");
  }
  function libraryOptions(selectedId) {
    return [`<option value="">Sem vínculo com a biblioteca</option>`, ...config.getLibrary().map((item) => {
      const name = item.name || item.nome || item.exercise_name || "Exercício";
      return `<option value="${escapeHtml(item.id)}" ${item.id === selectedId ? "selected" : ""}>${escapeHtml(name)}</option>`;
    })].join("");
  }
  function renderDraft() {
    const saveButton = byId("workout-import-save");
    if (draft.requires_fixture_selection) {
      saveButton.disabled = true;
      byId("workout-import-draft").innerHTML = `
        <section class="import-fixture-selection" role="alert">
          <h3>Este PDF parece conter mais de uma ficha. Escolha qual deseja importar.</h3>
          <div class="button-row">${draft.fixture_candidates.map((candidate) => `<button class="secondary-button" type="button" data-select-fixture="${escapeHtml(candidate.id)}">${escapeHtml(candidate.label)}</button>`).join("")}</div>
        </section>`;
      return;
    }
    saveButton.disabled = false;
    const templateNotice = draft.template_detected
      ? `<p class="import-template-detected" role="status">✅ ${escapeHtml(draft.template_label || "Ficha Padrão Alion detectada")}. Revise todos os dados antes de salvar.</p>`
      : "";
    const reviewItems = draft.review_items?.length ? `
      <details class="import-review-items" open>
        <summary>Itens que precisam de revisão (${draft.review_items.length})</summary>
        ${draft.review_items.map((item) => `<p><strong>Página ${item.page}</strong> · ${escapeHtml(item.type)}: ${escapeHtml(item.text)}</p>`).join("")}
      </details>` : "";
    byId("workout-import-draft").innerHTML = templateNotice + reviewItems + draft.workouts.map((workout, workoutIndex) => `
      <section class="import-workout" data-workout-index="${workoutIndex}">
        <div class="mini-grid"><label>Treino<input data-field="name" value="${escapeHtml(workout.name)}"></label><label>Dia<input data-field="day_label" value="${escapeHtml(workout.day_label)}"></label></div>
        ${workout.exercises.map((exercise, exerciseIndex) => `
          <article class="import-exercise" data-exercise-index="${exerciseIndex}" data-page="${exercise.source_page || 1}">
            <strong>${escapeHtml(exercise.original_name)}</strong><small>${statusLabel[exercise.match_status]} · página ${exercise.source_page || "?"} · ${escapeHtml(exercise.interpretation_type || "exercise")}</small>
            <label>Exercício relacionado<select data-field="exercise_library_id">${libraryOptions(exercise.exercise_library_id)}</select></label>
            <div class="mini-grid"><label>Nome original<input data-field="original_name" value="${escapeHtml(exercise.original_name)}"></label><label>Séries<input data-field="sets" type="number" min="1" max="100" value="${escapeHtml(exercise.sets)}"></label><label>Repetições<input data-field="reps" value="${escapeHtml(exercise.reps)}"></label><label>Duração<input data-field="duration_text" value="${escapeHtml(exercise.duration_text)}"></label><label>Carga<input data-field="weight" value="${escapeHtml(exercise.weight)}"></label><label>Descanso (s)<input data-field="rest_seconds" type="number" min="0" value="${escapeHtml(exercise.rest_seconds)}"></label><label>Equipamento<input data-field="equipment" value="${escapeHtml(exercise.equipment)}"></label></div>
            <label>Instruções<input data-field="instructions" value="${escapeHtml(exercise.instructions)}"></label><label>Adaptação / Orientação<textarea class="import-adaptation-notes" data-field="adaptation_notes" rows="4">${escapeHtml(exercise.adaptation_notes)}</textarea></label>
            <button class="tiny-button" type="button" data-remove-exercise>Remover exercício</button>
          </article>`).join("")}
      </section>`).join("");
  }
  function updateDraft(event) {
    const workoutElement = event.target.closest("[data-workout-index]");
    if (!workoutElement || !event.target.dataset.field) return;
    const workout = draft.workouts[Number(workoutElement.dataset.workoutIndex)];
    const exerciseElement = event.target.closest("[data-exercise-index]");
    const target = exerciseElement ? workout.exercises[Number(exerciseElement.dataset.exerciseIndex)] : workout;
    const field = event.target.dataset.field;
    const value = event.target.value.trim();
    target[field] = ["sets", "rest_seconds"].includes(field) ? (value === "" ? null : Number(value)) : (value || null);
    if (field === "exercise_library_id") target.match_status = value ? "matched" : "not_found";
  }
  async function renderPage() {
    if (!previewDocument) return;
    const page = await previewDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1.15 });
    const canvas = byId("workout-import-canvas"); const context = canvas.getContext("2d");
    canvas.width = viewport.width; canvas.height = viewport.height;
    await page.render({ canvasContext: context, viewport }).promise;
    byId("workout-import-page-label").textContent = `Página ${pageNumber} de ${previewDocument.numPages}`;
    page.cleanup();
  }
  async function process() {
    const selected = byId("workout-import-file").files[0];
    const errors = root.AlionWorkoutImportSchema.validateFileMetadata(selected);
    if (errors.length) return config.toast(errors.join(" "), "error");
    await release({ clearInput: false });
    file = selected; abortController = new AbortController();
    try {
      byId("workout-import-start").classList.add("hidden"); progress("Validando PDF...");
      root.pdfjsLib.GlobalWorkerOptions.workerSrc = "assets/vendor/pdfjs-3.11.174/pdf.worker.min.js";
      progress("Lendo documento...");
      const extracted = await root.AlionWorkoutPdfExtractor.extractPdf(file, { signal: abortController.signal, onProgress: ({ page, total }) => progress(`Lendo documento... página ${page} de ${total}`) });
      progress("Identificando treinos...");
      const templateInspection = root.AlionWorkoutTemplateReader.inspect(extracted);
      draft = templateInspection.status === "external"
        ? root.AlionWorkoutPdfParser.parseExtractedDocument(extracted)
        : root.AlionWorkoutTemplateReader.read(extracted);
      draft.source.file_name = file.name;
      progress("Relacionando exercícios..."); root.AlionWorkoutImportMatcher.matchDraft(draft, config.getLibrary());
      progress("Preparando revisão...");
      previewDocument = await root.pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
      renderDraft(); await renderPage();
      byId("workout-import-progress").classList.add("hidden"); byId("workout-import-review").classList.remove("hidden");
    } catch (error) {
      if (error.name !== "AbortError") config.toast(error.message, "error");
      await close();
    }
  }
  async function save() {
    const errors = root.AlionWorkoutImportSchema.validateDraft(draft);
    if (errors.length) return config.toast(errors[0], "error");
    const button = byId("workout-import-save"); button.disabled = true; button.textContent = "Salvando...";
    try {
      const payload = root.AlionWorkoutImportSchema.toRpcPayload(draft);
      const result = await config.rpc("alion_confirm_workout_import", { target_student_id: config.getStudentId(), import_payload: payload, conflict_strategy: byId("workout-import-strategy").value });
      await close(); await config.onSaved(result); config.toast("Treino importado e salvo com segurança.");
    } catch (error) { config.toast(error.message, "error"); }
    finally { button.disabled = false; button.textContent = "Salvar treino no Alion"; }
  }
  function initialize(options) {
    config = options;
    byId("open-workout-import")?.addEventListener("click", open);
    byId("workout-import-close")?.addEventListener("click", close);
    byId("workout-import-cancel")?.addEventListener("click", close);
    byId("workout-import-process")?.addEventListener("click", process);
    byId("workout-import-file")?.addEventListener("change", async () => {
      if (previewDocument || draft || file) await release({ clearInput: false });
    });
    byId("workout-import-save")?.addEventListener("click", save);
    byId("workout-import-draft")?.addEventListener("input", updateDraft);
    byId("workout-import-draft")?.addEventListener("change", updateDraft);
    byId("workout-import-draft")?.addEventListener("click", (event) => {
      const fixtureButton = event.target.closest("[data-select-fixture]");
      if (fixtureButton) {
        draft = root.AlionWorkoutPdfParser.selectFixture(draft, fixtureButton.dataset.selectFixture);
        draft.source.file_name = file?.name || null;
        root.AlionWorkoutImportMatcher.matchDraft(draft, config.getLibrary());
        renderDraft();
        return;
      }
      const exerciseElement = event.target.closest("[data-exercise-index]");
      if (event.target.matches("[data-remove-exercise]") && exerciseElement) { const workoutElement = event.target.closest("[data-workout-index]"); draft.workouts[Number(workoutElement.dataset.workoutIndex)].exercises.splice(Number(exerciseElement.dataset.exerciseIndex), 1); renderDraft(); }
      else if (exerciseElement) { pageNumber = Number(exerciseElement.dataset.page || 1); renderPage(); }
    });
    byId("workout-import-review")?.addEventListener("click", (event) => {
      if (!event.target.dataset.importPage || !previewDocument) return;
      pageNumber = Math.max(1, Math.min(previewDocument.numPages, pageNumber + (event.target.dataset.importPage === "next" ? 1 : -1))); renderPage();
    });
  }
  return { close, initialize, open };
});
