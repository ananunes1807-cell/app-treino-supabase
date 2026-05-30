const db = window.GymSupabase.createSupabaseClient();

const state = {
  students: [],
  exercises: [],
  workouts: [],
  selectedStudentId: null,
  selectedWorkoutId: null,
  studentAreaId: null,
  evolutionStudentId: null,
  profileData: {
    assessments: [],
    measurements: [],
    logs: [],
    workoutExercises: []
  }
};

const selectors = {
  connectionStatus: document.querySelector("#connection-status"),
  pageTitle: document.querySelector("#page-title"),
  toast: document.querySelector("#toast"),
  studentsList: document.querySelector("#students-list"),
  exerciseList: document.querySelector("#exercise-list"),
  muscleFilter: document.querySelector("#muscle-filter"),
  exerciseSearch: document.querySelector("#exercise-search"),
  selectedStudentTitle: document.querySelector("#selected-student-title"),
  studentProfile: document.querySelector("#student-profile"),
  studentProfileContent: document.querySelector("#student-profile-content"),
  studentNotes: document.querySelector("#student-notes"),
  workoutSelect: document.querySelector("#workout-select"),
  workoutExerciseSelect: document.querySelector("#workout-exercise-select"),
  currentWorkout: document.querySelector("#current-workout"),
  completeWorkoutButton: document.querySelector("#complete-workout-button"),
  studentAreaSelect: document.querySelector("#student-area-select"),
  evolutionStudentSelect: document.querySelector("#evolution-student-select")
};

/**
 * Obtém o primeiro valor existente entre nomes de colunas equivalentes.
 */
function valueOf(record, keys, fallback = "") {
  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null && record[key] !== "") {
      return record[key];
    }
  }

  return fallback;
}

/**
 * Formata datas vindas do banco para o padrão brasileiro.
 */
function formatDate(value) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

/**
 * Exibe uma mensagem curta de feedback na interface.
 */
function showToast(message, type = "success") {
  selectors.toast.textContent = message;
  selectors.toast.dataset.type = type;
  selectors.toast.classList.add("is-visible");
  window.setTimeout(() => selectors.toast.classList.remove("is-visible"), 3200);
}

/**
 * Cria um elemento HTML a partir de uma string controlada pelo app.
 */
function createElement(html) {
  const template = document.createElement("template");
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

/**
 * Escapa conteúdo vindo do banco antes de inserir no HTML.
 */
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/**
 * Renderiza um estado vazio padronizado.
 */
function emptyState(message) {
  return `<div class="empty-state"><i data-lucide="inbox"></i><span>${escapeHtml(message)}</span></div>`;
}

/**
 * Atualiza o indicador de conexão com o Supabase.
 */
function renderConnectionStatus() {
  const configured = window.GymSupabase.hasValidSupabaseConfig();
  selectors.connectionStatus.classList.toggle("is-online", Boolean(db));
  selectors.connectionStatus.innerHTML = `<span></span>${db ? "Supabase conectado" : configured ? "Erro ao conectar" : "Supabase não configurado"}`;
}

/**
 * Executa consultas Supabase com tratamento único de erro.
 */
async function runQuery(query, errorMessage) {
  if (!db) {
    throw new Error("Configure a URL e a anon key do Supabase para carregar dados reais.");
  }

  const { data, error } = await query;
  if (error) {
    console.error(errorMessage, error);
    throw new Error(error.message || errorMessage);
  }

  return data || [];
}

/**
 * Busca todos os alunos cadastrados na tabela students.
 */
async function fetchStudents() {
  state.students = await runQuery(
    db.from("students").select("*").order("created_at", { ascending: false }),
    "Não foi possível buscar alunos."
  );
  renderStudents();
  renderStudentSelects();
  renderDashboard();
}

/**
 * Cadastra um aluno novo na tabela students.
 */
async function createStudent(formData) {
  const payload = {
    name: formData.get("name"),
    email: formData.get("email") || null,
    phone: formData.get("phone") || null
  };

  await runQuery(db.from("students").insert(payload).select(), "Não foi possível cadastrar aluno.");
  showToast("Aluno cadastrado.");
  await fetchStudents();
}

/**
 * Atualiza observações do aluno selecionado.
 */
async function updateStudentNotes(notes) {
  if (!state.selectedStudentId) return;
  await runQuery(
    db.from("students").update({ notes }).eq("id", state.selectedStudentId).select(),
    "Não foi possível salvar observações."
  );
  showToast("Observações salvas.");
  await fetchStudents();
  await selectStudent(state.selectedStudentId);
}

/**
 * Busca avaliações físicas do aluno selecionado.
 */
async function fetchAssessments(studentId) {
  return runQuery(
    db.from("assessments").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
    "Não foi possível buscar avaliações."
  );
}

/**
 * Busca medidas corporais do aluno selecionado.
 */
async function fetchMeasurements(studentId) {
  return runQuery(
    db.from("body_measurements").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
    "Não foi possível buscar medidas."
  );
}

/**
 * Busca exercícios cadastrados na tabela exercise_library.
 */
async function fetchExercises() {
  state.exercises = await runQuery(
    db.from("exercise_library").select("*").order("name", { ascending: true }),
    "Não foi possível buscar exercícios."
  );
  renderExercises();
  renderMuscleGroups();
  renderExerciseSelect();
  renderDashboard();
}

/**
 * Busca treinos com os dados básicos do aluno relacionado.
 */
async function fetchWorkouts() {
  state.workouts = await runQuery(
    db.from("workouts").select("*").order("created_at", { ascending: false }),
    "Não foi possível buscar treinos."
  );
  renderDashboard();
  renderStudentSelects();
}

/**
 * Busca o histórico de treinos realizados do aluno.
 */
async function fetchWorkoutLogs(studentId) {
  return runQuery(
    db.from("workout_logs").select("*").eq("student_id", studentId).order("completed_at", { ascending: false }),
    "Não foi possível buscar histórico de treinos."
  );
}

/**
 * Busca os treinos de um aluno específico.
 */
async function fetchStudentWorkouts(studentId) {
  return runQuery(
    db.from("workouts").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
    "Não foi possível buscar treinos do aluno."
  );
}

/**
 * Busca exercícios vinculados a um treino.
 */
async function fetchWorkoutExercises(workoutId) {
  if (!workoutId) return [];
  return runQuery(
    db
      .from("workout_exercises")
      .select("*")
      .eq("workout_id", workoutId)
      .order("order_index", { ascending: true }),
    "Não foi possível buscar exercícios do treino."
  );
}

/**
 * Cria um treino para o aluno selecionado.
 */
async function createWorkout(formData) {
  if (!state.selectedStudentId) {
    showToast("Selecione um aluno antes de criar o treino.", "error");
    return;
  }

  const payload = {
    student_id: state.selectedStudentId,
    title: formData.get("title"),
    goal: formData.get("goal") || null,
    notes: formData.get("notes") || null,
    status: "active"
  };

  const created = await runQuery(db.from("workouts").insert(payload).select(), "Não foi possível criar treino.");
  state.selectedWorkoutId = created[0]?.id || null;
  showToast("Treino criado.");
  await fetchWorkouts();
  await selectStudent(state.selectedStudentId);
}

/**
 * Adiciona um exercício da biblioteca a um treino.
 */
async function addExerciseToWorkout() {
  const workoutId = selectors.workoutSelect.value;
  const exerciseId = selectors.workoutExerciseSelect.value;

  if (!workoutId || !exerciseId) {
    showToast("Selecione treino e exercício.", "error");
    return;
  }

  const payload = {
    workout_id: workoutId,
    exercise_id: exerciseId,
    sets: Number(document.querySelector("#sets-input").value) || null,
    reps: document.querySelector("#reps-input").value || null,
    rest_seconds: Number(document.querySelector("#rest-input").value) || null,
    order_index: state.profileData.workoutExercises.length + 1
  };

  await runQuery(db.from("workout_exercises").insert(payload).select(), "Não foi possível adicionar exercício.");
  showToast("Exercício adicionado ao treino.");
  state.selectedWorkoutId = workoutId;
  await renderSelectedWorkoutExercises();
}

/**
 * Registra a conclusão do treino atual na tabela workout_logs.
 */
async function completeCurrentWorkout() {
  const workout = getCurrentWorkoutForStudent(state.studentAreaId);

  if (!workout) {
    showToast("Nenhum treino atual encontrado para este aluno.", "error");
    return;
  }

  await runQuery(
    db
      .from("workout_logs")
      .insert({
        workout_id: workout.id,
        student_id: state.studentAreaId,
        completed_at: new Date().toISOString()
      })
      .select(),
    "Não foi possível registrar treino concluído."
  );
  showToast("Treino marcado como concluído.");
  await renderStudentArea();
}

/**
 * Seleciona um aluno e carrega todos os dados do perfil.
 */
async function selectStudent(studentId) {
  state.selectedStudentId = studentId;
  const student = state.students.find((item) => String(item.id) === String(studentId));

  if (!student) return;

  selectors.selectedStudentTitle.textContent = valueOf(student, ["name", "full_name"], "Aluno");
  selectors.studentNotes.value = valueOf(student, ["notes", "observations"], "");
  selectors.studentProfile.classList.add("is-hidden");
  selectors.studentProfileContent.classList.remove("is-hidden");

  const [assessments, measurements, logs, workouts] = await Promise.all([
    fetchAssessments(studentId),
    fetchMeasurements(studentId),
    fetchWorkoutLogs(studentId),
    fetchStudentWorkouts(studentId)
  ]);

  state.profileData.assessments = assessments;
  state.profileData.measurements = measurements;
  state.profileData.logs = logs;
  state.profileData.studentWorkouts = workouts;
  state.selectedWorkoutId = state.selectedWorkoutId || workouts[0]?.id || null;

  renderProfileLists();
  renderWorkoutSelect(workouts);
  await renderSelectedWorkoutExercises();
  drawEvolutionCharts(studentId);
}

/**
 * Define qual treino aparece como treino atual do aluno.
 */
function getCurrentWorkoutForStudent(studentId) {
  return state.workouts.find((workout) => String(workout.student_id) === String(studentId) && valueOf(workout, ["status"], "active") !== "archived");
}

/**
 * Renderiza os cards resumidos do dashboard.
 */
function renderDashboard() {
  document.querySelector("#metric-students").textContent = state.students.length;
  document.querySelector("#metric-workouts").textContent = state.workouts.length;
  document.querySelector("#metric-exercises").textContent = state.exercises.length;

  const recentWorkouts = state.workouts.slice(0, 5);
  document.querySelector("#recent-workouts").innerHTML = recentWorkouts.length
    ? recentWorkouts.map(renderWorkoutListItem).join("")
    : emptyState("Nenhum treino encontrado.");

  const recentStudents = state.students.slice(0, 5);
  document.querySelector("#recent-students").innerHTML = recentStudents.length
    ? recentStudents.map(renderStudentSummary).join("")
    : emptyState("Nenhum aluno cadastrado.");

  loadLogsMetric();
  lucide.createIcons();
}

/**
 * Atualiza o total de treinos concluídos no dashboard.
 */
async function loadLogsMetric() {
  if (!db) return;
  const { count, error } = await db.from("workout_logs").select("id", { count: "exact", head: true });
  document.querySelector("#metric-logs").textContent = error ? "0" : count || 0;
}

/**
 * Renderiza a lista principal de alunos do treinador.
 */
function renderStudents() {
  selectors.studentsList.innerHTML = state.students.length
    ? state.students
        .map((student) => {
          const name = valueOf(student, ["name", "full_name"], "Aluno sem nome");
          const email = valueOf(student, ["email"], "Sem e-mail");
          return `
            <button class="list-item student-row" data-student-id="${escapeHtml(student.id)}" type="button">
              <span class="avatar">${escapeHtml(name.charAt(0).toUpperCase())}</span>
              <span>
                <strong>${escapeHtml(name)}</strong>
                <small>${escapeHtml(email)}</small>
              </span>
              <i data-lucide="chevron-right"></i>
            </button>
          `;
        })
        .join("")
    : emptyState("Nenhum aluno cadastrado no Supabase.");

  lucide.createIcons();
}

/**
 * Renderiza um resumo compacto de aluno para o dashboard.
 */
function renderStudentSummary(student) {
  const name = valueOf(student, ["name", "full_name"], "Aluno sem nome");
  return `
    <div class="list-item">
      <span class="avatar">${escapeHtml(name.charAt(0).toUpperCase())}</span>
      <span>
        <strong>${escapeHtml(name)}</strong>
        <small>${escapeHtml(valueOf(student, ["email", "phone"], "Contato não informado"))}</small>
      </span>
    </div>
  `;
}

/**
 * Renderiza um item compacto de treino.
 */
function renderWorkoutListItem(workout) {
  const title = valueOf(workout, ["title", "name"], "Treino sem nome");
  const student = state.students.find((item) => String(item.id) === String(workout.student_id));
  const studentName = valueOf(student, ["name", "full_name"], "Aluno");
  return `
    <div class="list-item">
      <i data-lucide="dumbbell"></i>
      <span>
        <strong>${escapeHtml(title)}</strong>
        <small>${escapeHtml(studentName)} • ${formatDate(valueOf(workout, ["created_at", "date"]))}</small>
      </span>
    </div>
  `;
}

/**
 * Renderiza as listas do perfil: avaliações, medidas e histórico.
 */
function renderProfileLists() {
  document.querySelector("#student-assessments").innerHTML = state.profileData.assessments.length
    ? state.profileData.assessments.map(renderAssessment).join("")
    : emptyState("Nenhuma avaliação física registrada.");

  document.querySelector("#student-measurements").innerHTML = state.profileData.measurements.length
    ? state.profileData.measurements.map(renderMeasurement).join("")
    : emptyState("Nenhuma medida corporal registrada.");

  document.querySelector("#student-workout-history").innerHTML = state.profileData.logs.length
    ? state.profileData.logs.map(renderWorkoutLog).join("")
    : emptyState("Nenhum treino realizado ainda.");

  lucide.createIcons();
}

/**
 * Renderiza uma avaliação física.
 */
function renderAssessment(assessment) {
  return `
    <article class="data-card">
      <strong>${formatDate(valueOf(assessment, ["assessed_at", "assessment_date", "created_at"]))}</strong>
      <div class="data-grid">
        <span>Peso: ${escapeHtml(valueOf(assessment, ["weight", "weight_kg"], "-"))}</span>
        <span>Gordura: ${escapeHtml(valueOf(assessment, ["body_fat_percentage", "body_fat", "fat_percentage"], "-"))}%</span>
        <span>IMC: ${escapeHtml(valueOf(assessment, ["bmi"], "-"))}</span>
      </div>
      <small>${escapeHtml(valueOf(assessment, ["notes"], ""))}</small>
    </article>
  `;
}

/**
 * Renderiza uma medição corporal.
 */
function renderMeasurement(measurement) {
  return `
    <article class="data-card">
      <strong>${formatDate(valueOf(measurement, ["measured_at", "measurement_date", "created_at"]))}</strong>
      <div class="data-grid">
        <span>Cintura: ${escapeHtml(valueOf(measurement, ["waist", "waist_cm"], "-"))}</span>
        <span>Quadril: ${escapeHtml(valueOf(measurement, ["hip", "hip_cm"], "-"))}</span>
        <span>Peito: ${escapeHtml(valueOf(measurement, ["chest", "chest_cm"], "-"))}</span>
        <span>Braço: ${escapeHtml(valueOf(measurement, ["arm", "arm_cm"], "-"))}</span>
        <span>Coxa: ${escapeHtml(valueOf(measurement, ["thigh", "thigh_cm"], "-"))}</span>
      </div>
    </article>
  `;
}

/**
 * Renderiza um registro de treino concluído.
 */
function renderWorkoutLog(log) {
  const workout = state.workouts.find((item) => String(item.id) === String(log.workout_id));
  const title = valueOf(workout, ["title", "name"], "Treino");
  return `
    <article class="data-card">
      <strong>${escapeHtml(title)}</strong>
      <small>Concluído em ${formatDate(valueOf(log, ["completed_at", "created_at"]))}</small>
      <p>${escapeHtml(valueOf(log, ["notes"], ""))}</p>
    </article>
  `;
}

/**
 * Renderiza a biblioteca de exercícios com busca e filtro.
 */
function renderExercises() {
  const search = selectors.exerciseSearch.value.toLowerCase().trim();
  const muscle = selectors.muscleFilter.value;
  const filteredExercises = state.exercises.filter((exercise) => {
    const name = valueOf(exercise, ["name", "title"]).toLowerCase();
    const group = valueOf(exercise, ["muscle_group", "primary_muscle", "group"]);
    return (!search || name.includes(search)) && (!muscle || group === muscle);
  });

  selectors.exerciseList.innerHTML = filteredExercises.length
    ? filteredExercises.map(renderExerciseCard).join("")
    : emptyState("Nenhum exercício encontrado.");

  lucide.createIcons();
}

/**
 * Renderiza um card de exercício com equipamento, nível e instruções.
 */
function renderExerciseCard(exercise) {
  return `
    <article class="exercise-card">
      <div>
        <p class="eyebrow">${escapeHtml(valueOf(exercise, ["muscle_group", "primary_muscle", "group"], "Grupo não informado"))}</p>
        <h3>${escapeHtml(valueOf(exercise, ["name", "title"], "Exercício"))}</h3>
      </div>
      <div class="tag-row">
        <span><i data-lucide="wrench"></i>${escapeHtml(valueOf(exercise, ["equipment"], "Sem equipamento"))}</span>
        <span><i data-lucide="signal"></i>${escapeHtml(valueOf(exercise, ["difficulty_level", "difficulty", "level"], "Nível não informado"))}</span>
      </div>
      <p>${escapeHtml(valueOf(exercise, ["instructions", "description"], "Sem instruções cadastradas."))}</p>
    </article>
  `;
}

/**
 * Renderiza as opções únicas de grupos musculares.
 */
function renderMuscleGroups() {
  const groups = [...new Set(state.exercises.map((exercise) => valueOf(exercise, ["muscle_group", "primary_muscle", "group"])).filter(Boolean))];
  selectors.muscleFilter.innerHTML = `<option value="">Todos</option>${groups
    .map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`)
    .join("")}`;
}

/**
 * Renderiza selects usados nas áreas aluno e evolução.
 */
function renderStudentSelects() {
  const options = state.students
    .map((student) => `<option value="${escapeHtml(student.id)}">${escapeHtml(valueOf(student, ["name", "full_name"], "Aluno"))}</option>`)
    .join("");

  selectors.studentAreaSelect.innerHTML = `<option value="">Selecione</option>${options}`;
  selectors.evolutionStudentSelect.innerHTML = `<option value="">Selecione</option>${options}`;

  state.studentAreaId = state.studentAreaId || state.students[0]?.id || "";
  state.evolutionStudentId = state.evolutionStudentId || state.students[0]?.id || "";
  selectors.studentAreaSelect.value = state.studentAreaId;
  selectors.evolutionStudentSelect.value = state.evolutionStudentId;

  renderStudentArea();
  drawEvolutionCharts(state.evolutionStudentId);
}

/**
 * Renderiza o select de exercícios para montar treinos.
 */
function renderExerciseSelect() {
  selectors.workoutExerciseSelect.innerHTML = state.exercises.length
    ? state.exercises
        .map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(valueOf(exercise, ["name", "title"], "Exercício"))}</option>`)
        .join("")
    : `<option value="">Sem exercícios cadastrados</option>`;
}

/**
 * Renderiza o select de treinos do aluno selecionado.
 */
function renderWorkoutSelect(workouts) {
  selectors.workoutSelect.innerHTML = workouts.length
    ? workouts
        .map((workout) => `<option value="${escapeHtml(workout.id)}">${escapeHtml(valueOf(workout, ["title", "name"], "Treino"))}</option>`)
        .join("")
    : `<option value="">Crie um treino primeiro</option>`;

  selectors.workoutSelect.value = state.selectedWorkoutId || workouts[0]?.id || "";
}

/**
 * Renderiza os exercícios vinculados ao treino selecionado.
 */
async function renderSelectedWorkoutExercises() {
  const workoutId = selectors.workoutSelect.value || state.selectedWorkoutId;
  state.profileData.workoutExercises = await fetchWorkoutExercises(workoutId);
  document.querySelector("#selected-workout-exercises").innerHTML = state.profileData.workoutExercises.length
    ? state.profileData.workoutExercises.map(renderWorkoutExercise).join("")
    : emptyState("Nenhum exercício adicionado a este treino.");
  lucide.createIcons();
}

/**
 * Renderiza uma linha de exercício dentro de um treino.
 */
function renderWorkoutExercise(item) {
  const exercise = state.exercises.find((record) => String(record.id) === String(item.exercise_id)) || {};
  return `
    <article class="data-card workout-exercise">
      <strong>${escapeHtml(valueOf(exercise, ["name", "title"], "Exercício"))}</strong>
      <div class="data-grid">
        <span>Séries: ${escapeHtml(valueOf(item, ["sets"], "-"))}</span>
        <span>Reps: ${escapeHtml(valueOf(item, ["reps"], "-"))}</span>
        <span>Descanso: ${escapeHtml(valueOf(item, ["rest_seconds"], "-"))}s</span>
      </div>
      <small>${escapeHtml(valueOf(exercise, ["equipment"], ""))}</small>
    </article>
  `;
}

/**
 * Renderiza a área do aluno com treino atual e histórico.
 */
async function renderStudentArea() {
  if (!state.studentAreaId || !db) {
    selectors.currentWorkout.innerHTML = emptyState("Selecione um aluno.");
    return;
  }

  const workout = getCurrentWorkoutForStudent(state.studentAreaId);
  const logs = await fetchWorkoutLogs(state.studentAreaId);
  const exercises = workout ? await fetchWorkoutExercises(workout.id) : [];

  selectors.currentWorkout.innerHTML = workout
    ? `
      <article class="data-card featured">
        <strong>${escapeHtml(valueOf(workout, ["title", "name"], "Treino atual"))}</strong>
        <small>${escapeHtml(valueOf(workout, ["goal"], "Objetivo não informado"))}</small>
      </article>
      ${exercises.length ? exercises.map(renderWorkoutExercise).join("") : emptyState("Treino sem exercícios cadastrados.")}
    `
    : emptyState("Nenhum treino ativo encontrado.");

  document.querySelector("#student-area-history").innerHTML = logs.length
    ? logs.map(renderWorkoutLog).join("")
    : emptyState("Nenhum treino concluído.");
  selectors.completeWorkoutButton.disabled = !workout;
  lucide.createIcons();
}

/**
 * Desenha todos os gráficos de evolução do aluno.
 */
async function drawEvolutionCharts(studentId) {
  if (!studentId || !db) {
    clearChart("weight-chart", "Selecione um aluno");
    clearChart("fat-chart", "Selecione um aluno");
    clearChart("measurements-chart", "Selecione um aluno");
    return;
  }

  const [assessments, measurements] = await Promise.all([fetchAssessments(studentId), fetchMeasurements(studentId)]);
  const orderedAssessments = assessments.slice().reverse();
  const orderedMeasurements = measurements.slice().reverse();

  drawLineChart("weight-chart", orderedAssessments, ["weight", "weight_kg"], "#16a34a", "Peso");
  drawLineChart("fat-chart", orderedAssessments, ["body_fat_percentage", "body_fat", "fat_percentage"], "#0f766e", "Gordura");
  drawMultiLineChart("measurements-chart", orderedMeasurements);
}

/**
 * Limpa um canvas e mostra uma mensagem central.
 */
function clearChart(canvasId, message) {
  const canvas = document.querySelector(`#${canvasId}`);
  const context = canvas.getContext("2d");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#64748b";
  context.font = "14px Inter, sans-serif";
  context.textAlign = "center";
  context.fillText(message, canvas.width / 2, canvas.height / 2);
}

/**
 * Ajusta o canvas ao tamanho visual antes de desenhar.
 */
function resizeCanvas(canvas) {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = Number(canvas.getAttribute("height"));
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const context = canvas.getContext("2d");
  context.scale(ratio, ratio);
  return { context, width, height };
}

/**
 * Desenha um gráfico de linha simples para peso ou gordura.
 */
function drawLineChart(canvasId, records, keys, color, label) {
  const canvas = document.querySelector(`#${canvasId}`);
  const { context, width, height } = resizeCanvas(canvas);
  const points = records.map((record) => Number(valueOf(record, keys, NaN))).filter((value) => !Number.isNaN(value));

  if (!points.length) {
    clearChart(canvasId, `Sem dados de ${label.toLowerCase()}`);
    return;
  }

  drawChartFrame(context, width, height);
  drawSeries(context, points, width, height, color);
  context.fillStyle = color;
  context.font = "600 13px Inter, sans-serif";
  context.fillText(`${label}: ${points.at(-1)}`, 22, 28);
}

/**
 * Desenha o gráfico com múltiplas medidas corporais.
 */
function drawMultiLineChart(canvasId, records) {
  const canvas = document.querySelector(`#${canvasId}`);
  const { context, width, height } = resizeCanvas(canvas);
  const series = [
    { label: "Cintura", keys: ["waist", "waist_cm"], color: "#16a34a" },
    { label: "Quadril", keys: ["hip", "hip_cm"], color: "#2563eb" },
    { label: "Peito", keys: ["chest", "chest_cm"], color: "#db2777" },
    { label: "Braço", keys: ["arm", "arm_cm"], color: "#f59e0b" },
    { label: "Coxa", keys: ["thigh", "thigh_cm"], color: "#7c3aed" }
  ].map((item) => ({
    ...item,
    values: records.map((record) => Number(valueOf(record, item.keys, NaN))).filter((value) => !Number.isNaN(value))
  }));

  if (!series.some((item) => item.values.length)) {
    clearChart(canvasId, "Sem medidas corporais");
    return;
  }

  drawChartFrame(context, width, height);
  series.forEach((item, index) => {
    if (item.values.length) {
      drawSeries(context, item.values, width, height, item.color);
      context.fillStyle = item.color;
      context.fillText(item.label, 22 + index * 80, 28);
    }
  });
}

/**
 * Desenha grade e eixos mínimos do gráfico.
 */
function drawChartFrame(context, width, height) {
  context.clearRect(0, 0, width, height);
  context.strokeStyle = "#e2e8f0";
  context.lineWidth = 1;

  for (let index = 1; index < 5; index += 1) {
    const y = (height / 5) * index;
    context.beginPath();
    context.moveTo(18, y);
    context.lineTo(width - 18, y);
    context.stroke();
  }
}

/**
 * Desenha uma série de valores no canvas.
 */
function drawSeries(context, values, width, height, color) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const left = 22;
  const right = width - 22;
  const top = 44;
  const bottom = height - 24;

  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 3;
  context.beginPath();

  values.forEach((value, index) => {
    const x = values.length === 1 ? (left + right) / 2 : left + ((right - left) / (values.length - 1)) * index;
    const y = bottom - ((value - min) / range) * (bottom - top);

    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });

  context.stroke();

  values.forEach((value, index) => {
    const x = values.length === 1 ? (left + right) / 2 : left + ((right - left) / (values.length - 1)) * index;
    const y = bottom - ((value - min) / range) * (bottom - top);
    context.beginPath();
    context.arc(x, y, 4, 0, Math.PI * 2);
    context.fill();
  });
}

/**
 * Alterna a tela principal exibida.
 */
function navigate(route) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("is-visible"));
  document.querySelector(`#view-${route}`).classList.add("is-visible");
  document.querySelectorAll(".nav-item").forEach((button) => button.classList.toggle("is-active", button.dataset.route === route));
  selectors.pageTitle.textContent = document.querySelector(`#view-${route}`).dataset.title;
  history.replaceState(null, "", `#${route}`);
}

/**
 * Alterna as abas do perfil do aluno.
 */
function switchProfileTab(tab) {
  document.querySelectorAll("[data-profile-tab]").forEach((button) => button.classList.toggle("is-active", button.dataset.profileTab === tab));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("is-visible"));
  document.querySelector(`#profile-tab-${tab}`).classList.add("is-visible");
}

/**
 * Registra os eventos da interface.
 */
function bindEvents() {
  document.querySelectorAll("[data-route]").forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.route));
  });

  document.querySelector("#student-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await createStudent(new FormData(event.currentTarget));
    event.currentTarget.reset();
  });

  document.querySelector("#student-notes-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await updateStudentNotes(selectors.studentNotes.value);
  });

  document.querySelector("#workout-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await createWorkout(new FormData(event.currentTarget));
    event.currentTarget.reset();
  });

  selectors.studentsList.addEventListener("click", (event) => {
    const row = event.target.closest("[data-student-id]");
    if (row) selectStudent(row.dataset.studentId);
  });

  document.querySelectorAll("[data-profile-tab]").forEach((button) => {
    button.addEventListener("click", () => switchProfileTab(button.dataset.profileTab));
  });

  document.querySelector("#add-exercise-button").addEventListener("click", addExerciseToWorkout);
  selectors.workoutSelect.addEventListener("change", renderSelectedWorkoutExercises);
  selectors.exerciseSearch.addEventListener("input", renderExercises);
  selectors.muscleFilter.addEventListener("change", renderExercises);
  document.querySelector("#refresh-students").addEventListener("click", fetchStudents);
  document.querySelector("#refresh-exercises").addEventListener("click", fetchExercises);
  selectors.studentAreaSelect.addEventListener("change", (event) => {
    state.studentAreaId = event.target.value;
    renderStudentArea();
  });
  selectors.evolutionStudentSelect.addEventListener("change", (event) => {
    state.evolutionStudentId = event.target.value;
    drawEvolutionCharts(event.target.value);
  });
  selectors.completeWorkoutButton.addEventListener("click", completeCurrentWorkout);

  document.querySelector("#config-form").addEventListener("submit", (event) => {
    event.preventDefault();
    window.GymSupabase.saveSupabaseConfig(Object.fromEntries(new FormData(event.currentTarget)));
    location.reload();
  });

  window.addEventListener("resize", () => drawEvolutionCharts(state.evolutionStudentId));
}

/**
 * Preenche o formulário de configuração com valores já salvos.
 */
function hydrateConfigForm() {
  const config = window.GymSupabase.getSupabaseConfig();
  document.querySelector("#supabase-url").value = config.url.includes("COLE_AQUI") ? "" : config.url;
  document.querySelector("#supabase-key").value = config.anonKey.includes("COLE_AQUI") ? "" : config.anonKey;
}

/**
 * Carrega os dados iniciais reais do Supabase.
 */
async function loadInitialData() {
  if (!db) {
    renderConnectionStatus();
    renderDashboard();
    renderStudents();
    renderExercises();
    return;
  }

  try {
    await Promise.all([fetchStudents(), fetchExercises(), fetchWorkouts()]);
    renderConnectionStatus();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Inicializa o aplicativo.
 */
function init() {
  hydrateConfigForm();
  renderConnectionStatus();
  bindEvents();
  loadInitialData();
  navigate(location.hash.replace("#", "") || "dashboard");
  lucide.createIcons();
}

init();
