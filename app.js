// Senhas temporárias apenas para o MVP. Futuramente substituir por autenticação real com Supabase Auth.
const TRAINER_TEMP_PASSWORD = "123ac";
const ADMIN_TEMP_PASSWORD = "ac741";
const REQUIRED_TABLES = [
  "students",
  "assessments",
  "body_measurements",
  "exercise_library",
  "workouts",
  "workout_exercises",
  "workout_logs"
];
const EXPECTED_RLS_POLICIES = [
  ["students", "SELECT anon", "mvp_anon_select_students"],
  ["students", "INSERT anon", "mvp_anon_insert_students"],
  ["students", "UPDATE anon", "mvp_anon_update_students"],
  ["assessments", "SELECT anon", "mvp_anon_select_assessments"],
  ["assessments", "INSERT anon", "mvp_anon_insert_assessments"],
  ["assessments", "UPDATE anon", "mvp_anon_update_assessments"],
  ["assessments", "DELETE anon", "mvp_anon_delete_assessments"],
  ["body_measurements", "SELECT anon", "mvp_anon_select_body_measurements"],
  ["body_measurements", "INSERT anon", "mvp_anon_insert_body_measurements"],
  ["body_measurements", "UPDATE anon", "mvp_anon_update_body_measurements"],
  ["body_measurements", "DELETE anon", "mvp_anon_delete_body_measurements"],
  ["exercise_library", "SELECT anon", "mvp_anon_select_exercise_library"],
  ["exercise_library", "INSERT anon", "mvp_anon_insert_exercise_library"],
  ["workouts", "SELECT anon", "mvp_anon_select_workouts"],
  ["workouts", "INSERT anon", "mvp_anon_insert_workouts"],
  ["workouts", "UPDATE anon", "mvp_anon_update_workouts"],
  ["workouts", "DELETE anon", "mvp_anon_delete_workouts"],
  ["workout_exercises", "SELECT anon", "mvp_anon_select_workout_exercises"],
  ["workout_exercises", "INSERT anon", "mvp_anon_insert_workout_exercises"],
  ["workout_exercises", "UPDATE anon", "mvp_anon_update_workout_exercises"],
  ["workout_exercises", "DELETE anon", "mvp_anon_delete_workout_exercises"],
  ["workout_logs", "SELECT anon", "mvp_anon_select_workout_logs"],
  ["workout_logs", "INSERT anon", "mvp_anon_insert_workout_logs"]
];
const DEFAULT_EXERCISES = [
  ["Agachamento livre", "Pernas", "Barra livre", "Intermediario", "Manter tronco firme, descer com controle e subir empurrando o chao."],
  ["Leg press 45", "Pernas", "Leg press", "Iniciante", "Flexionar os joelhos com controle e manter os pes firmes na plataforma."],
  ["Cadeira extensora", "Pernas", "Maquina", "Iniciante", "Estender os joelhos sem perder o controle do movimento."],
  ["Supino reto", "Peitoral", "Barra livre", "Intermediario", "Descer a barra ate a linha do peito e subir com controle."],
  ["Crucifixo na maquina", "Peitoral", "Maquina", "Iniciante", "Aproximar os bracos mantendo leve flexao dos cotovelos."],
  ["Puxada frontal", "Dorsal", "Pulley", "Iniciante", "Puxar a barra em direcao ao peito mantendo o tronco firme."],
  ["Remada baixa", "Dorsal", "Cabo", "Iniciante", "Trazer o puxador ao abdomen contraindo as costas."],
  ["Rosca direta", "Bracos", "Barra", "Iniciante", "Flexionar os cotovelos sem balancar o tronco."],
  ["Triceps pulley", "Bracos", "Cabo", "Iniciante", "Estender os cotovelos mantendo os bracos proximos ao corpo."],
  ["Mesa flexora", "Posterior", "Maquina", "Iniciante", "Flexionar os joelhos contraindo posterior de coxa."],
  ["Stiff", "Posterior", "Barra ou halteres", "Intermediario", "Descer com quadril para tras e coluna neutra."],
  ["Elevacao pelvica", "Gluteo", "Banco e barra", "Intermediario", "Elevar o quadril contraindo gluteos no topo."],
  ["Cadeira abdutora", "Gluteo", "Maquina", "Iniciante", "Abrir as pernas com controle e sem impulso."],
  ["Prancha abdominal", "Abdominal", "Peso corporal", "Iniciante", "Manter o corpo alinhado e abdomen contraido."],
  ["Abdominal crunch", "Abdominal", "Peso corporal", "Iniciante", "Flexionar o tronco com controle sem puxar o pescoco."],
  ["Desenvolvimento com halteres", "Ombro", "Halteres", "Intermediario", "Empurrar os halteres acima da cabeca com controle."],
  ["Elevacao lateral", "Ombro", "Halteres", "Iniciante", "Elevar os bracos ate a linha dos ombros."],
  ["Face pull", "Ombro", "Cabo", "Iniciante", "Puxar a corda em direcao ao rosto contraindo deltoide posterior."]
];

const state = {
  students: [],
  exercises: [],
  workouts: [],
  workoutExercises: [],
  workoutLogs: [],
  selectedStudentId: "",
  selectedWorkoutId: "",
  trainerActiveTab: "profile",
  trainerAssessmentsCache: [],
  trainerMeasurementsCache: [],
  studentAreaId: "",
  studentSearch: "",
  exerciseSearch: "",
  exerciseGroupFilter: "",
  accessRole: "",
  adminUnlocked: false,
  lastError: "",
  tableErrors: {}
};

const el = {
  pageTitle: document.querySelector("#page-title"),
  sidebar: document.querySelector("#sidebar"),
  connectionStatus: document.querySelector("#connection-status"),
  toast: document.querySelector("#toast"),
  totalStudents: document.querySelector("#total-students"),
  totalExercises: document.querySelector("#total-exercises"),
  totalWorkouts: document.querySelector("#total-workouts"),
  totalLogs: document.querySelector("#total-logs"),
  studentAreaSelect: document.querySelector("#student-area-select"),
  studentCurrentWorkout: document.querySelector("#student-current-workout"),
  studentHistory: document.querySelector("#student-history"),
  studentEvolution: document.querySelector("#student-evolution"),
  studentAssessments: document.querySelector("#student-assessments"),
  studentMeasurements: document.querySelector("#student-measurements"),
  completeWorkoutButton: document.querySelector("#complete-workout-button"),
  trainerStudentsList: document.querySelector("#trainer-students-list"),
  trainerProfileTitle: document.querySelector("#trainer-profile-title"),
  trainerProfileSummary: document.querySelector("#trainer-profile-summary"),
  trainerAssessments: document.querySelector("#trainer-assessments"),
  trainerMeasurements: document.querySelector("#trainer-measurements"),
  trainerWorkoutSelect: document.querySelector("#trainer-workout-select"),
  trainerExerciseSelect: document.querySelector("#trainer-exercise-select"),
  trainerExerciseLibrary: document.querySelector("#trainer-exercise-library"),
  trainerTabs: document.querySelector("#trainer-tabs"),
  trainerHistory: document.querySelector("#trainer-history"),
  editStudentForm: document.querySelector("#edit-student-form"),
  exerciseSearch: document.querySelector("#exercise-search"),
  exerciseGroupFilter: document.querySelector("#exercise-group-filter"),
  trainerWorkouts: document.querySelector("#trainer-workouts"),
  studentSearch: document.querySelector("#student-search"),
  addExerciseButton: document.querySelector("#add-exercise-to-workout"),
  deleteStudentButton: document.querySelector("#delete-student-button"),
  setsInput: document.querySelector("#sets-input"),
  repsInput: document.querySelector("#reps-input"),
  loadInput: document.querySelector("#load-input"),
  restInput: document.querySelector("#rest-input"),
  exerciseNotesInput: document.querySelector("#exercise-notes-input"),
  adminLock: document.querySelector("#admin-lock"),
  adminPanel: document.querySelector("#admin-panel"),
  adminConnectionStatus: document.querySelector("#admin-connection-status"),
  adminSupabaseUrl: document.querySelector("#admin-supabase-url"),
  adminSupabaseKey: document.querySelector("#admin-supabase-key"),
  adminTablesList: document.querySelector("#admin-tables-list"),
  adminStudentsList: document.querySelector("#admin-students-list"),
  adminExercisesList: document.querySelector("#admin-exercises-list"),
  adminDiagnostics: document.querySelector("#admin-diagnostics"),
  adminErrorsList: document.querySelector("#admin-errors-list"),
  adminRlsPolicies: document.querySelector("#admin-rls-policies")
};

/**
 * Retorna o primeiro valor preenchido entre nomes de coluna equivalentes.
 */
function pick(record, keys, fallback = "") {
  for (const key of keys) {
    if (record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== "") {
      return record[key];
    }
  }
  return fallback;
}

/**
 * Escapa textos vindos do banco antes de montar HTML.
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
 * Formata datas do Supabase para exibicao em pt-BR.
 */
function formatDate(value) {
  if (!value) return "Sem data";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

/**
 * Exibe mensagem de sucesso ou erro.
 */
function showToast(message, type = "success") {
  el.toast.textContent = message;
  el.toast.dataset.type = type;
  el.toast.classList.add("visible");
  window.setTimeout(() => el.toast.classList.remove("visible"), 3500);
}

/**
 * Retorna HTML padrão para estados vazios.
 */
function emptyMessage(message) {
  return `<p class="empty">${escapeHtml(message)}</p>`;
}

/**
 * Executa uma consulta Supabase e padroniza o tratamento de erro.
 */
async function runQuery(query, fallbackMessage) {
  const { data, error } = await query;

  if (error) {
    console.error("[GymPulse] Erro Supabase:", error);
    state.lastError = error.message;
    throw new Error(`${fallbackMessage}: ${error.message}`);
  }

  return data || [];
}

/**
 * Busca uma tabela sem travar o app inteiro caso ela falhe.
 */
async function safeFetchTable(tableName, options = {}) {
  try {
    const data = await fetchTable(tableName, options);
    delete state.tableErrors[tableName];
    return data;
  } catch (error) {
    console.error(error);
    state.lastError = error.message;
    state.tableErrors[tableName] = error.message;
    return [];
  }
}

/**
 * Busca uma tabela inteira, com ordenacao opcional.
 */
async function fetchTable(tableName, options = {}) {
  let query = supabaseClient.from(tableName).select("*");

  if (options.eq) {
    query = query.eq(options.eq.column, options.eq.value);
  }

  if (options.orderBy) {
    query = query.order(options.orderBy, { ascending: options.ascending ?? false });
  }

  return runQuery(query, `Erro ao carregar ${tableName}`);
}

/**
 * Carrega dados reais do Supabase usados pelas areas Aluno, Treinador e Admin.
 */
async function loadSupabaseData(options = {}) {
  setConnectionStatus("Conectando...", false);

  const [students, exercises, workouts, workoutExercises, workoutLogs] = await Promise.all([
    safeFetchTable("students", { orderBy: "created_at" }),
    safeFetchTable("exercise_library", { orderBy: "name", ascending: true }),
    safeFetchTable("workouts", { orderBy: "created_at" }),
    safeFetchTable("workout_exercises"),
    safeFetchTable("workout_logs", { orderBy: "created_at" })
  ]);

  state.students = students;
  state.exercises = exercises;
  state.workouts = workouts;
  state.workoutExercises = workoutExercises;
  state.workoutLogs = workoutLogs;

  if (!state.studentAreaId && students[0]) state.studentAreaId = students[0].id;
  if (!state.selectedStudentId && students[0]) state.selectedStudentId = students[0].id;

  const hasBlockingError = Boolean(state.tableErrors.students || state.tableErrors.exercise_library);
  setConnectionStatus(hasBlockingError ? "Conexao parcial" : "Supabase conectado", !hasBlockingError);
  renderAll();

  if (options.silent) return;

  if (hasBlockingError) {
    showToast(state.tableErrors.students || state.tableErrors.exercise_library, "error");
  } else if (!students.length) {
    showToast("Conexao OK, mas nenhum aluno foi retornado pela anon key.", "error");
  } else {
    showToast("Dados carregados do Supabase.");
  }
}

/**
 * Atualiza o status visual da conexão.
 */
function setConnectionStatus(message, online) {
  el.connectionStatus.textContent = message;
  el.connectionStatus.classList.toggle("online", online);
  el.adminConnectionStatus.textContent = message;
  el.adminConnectionStatus.classList.toggle("online", online);
}

/**
 * Renderiza todas as areas dependentes do estado atual.
 */
function renderAll() {
  renderMetrics();
  renderStudentAreaSelect();
  renderStudentArea();
  renderTrainerStudents();
  renderTrainerProfile();
  renderExerciseSelect();
  renderExerciseLibrary();
  renderAdminArea();
}

/**
 * Renderiza os indicadores da area Treinador.
 */
function renderMetrics() {
  el.totalStudents.textContent = state.students.length;
  el.totalExercises.textContent = state.exercises.length;
  el.totalWorkouts.textContent = state.workouts.length;
  el.totalLogs.textContent = state.workoutLogs.length;
}

/**
 * Preenche o seletor da area Aluno.
 */
function renderStudentAreaSelect() {
  el.studentAreaSelect.innerHTML = `<option value="">Selecione um aluno</option>${state.students.map(renderStudentOption).join("")}`;
  el.studentAreaSelect.value = state.studentAreaId;
}

/**
 * Cria uma opcao de aluno para selects.
 */
function renderStudentOption(student) {
  const name = pick(student, ["name", "full_name", "nome"], "Aluno sem nome");
  return `<option value="${escapeHtml(student.id)}">${escapeHtml(name)}</option>`;
}

/**
 * Renderiza treino atual, histórico e evolução da Área Aluno.
 */
function renderStudentArea() {
  if (!state.studentAreaId) {
    el.studentCurrentWorkout.innerHTML = emptyMessage("Selecione um aluno para visualizar o treino atual.");
    el.studentHistory.innerHTML = emptyMessage("Selecione um aluno para visualizar o histórico.");
    el.studentEvolution.innerHTML = emptyMessage("Selecione um aluno para visualizar a evolução.");
    el.studentAssessments.innerHTML = emptyMessage("Selecione um aluno para visualizar suas avaliações.");
    el.studentMeasurements.innerHTML = emptyMessage("Selecione um aluno para visualizar suas medidas.");
    el.completeWorkoutButton.disabled = true;
    return;
  }

  const currentWorkout = getCurrentWorkout(state.studentAreaId);
  const logs = state.workoutLogs.filter((log) => String(log.student_id) === String(state.studentAreaId));

  el.studentCurrentWorkout.innerHTML = currentWorkout
    ? renderWorkoutWithExercises(currentWorkout)
    : emptyMessage("Nenhum treino atual encontrado para este aluno.");

  el.studentHistory.innerHTML = logs.length
    ? logs.map(renderWorkoutLogItem).join("")
    : emptyMessage("Nenhum treino concluído encontrado.");

  el.completeWorkoutButton.disabled = !currentWorkout;
  renderStudentDetails();
}

/**
 * Busca o primeiro treino ativo do aluno.
 */
function getCurrentWorkout(studentId) {
  return state.workouts.find((workout) => {
    const status = pick(workout, ["status"], "active");
    return String(workout.student_id) === String(studentId) && status !== "archived";
  });
}

/**
 * Renderiza um treino com seus exercícios cadastrados.
 */
function renderWorkoutWithExercises(workout) {
  const exercises = state.workoutExercises.filter((item) => String(item.workout_id) === String(workout.id));

  return `
    <article class="list-item workout-highlight">
      <div>
        <strong>${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino sem nome"))}</strong>
        <span>${escapeHtml(pick(workout, ["goal", "description", "notes"], "Objetivo não informado"))}</span>
      </div>
    </article>
    ${exercises.length ? exercises.map(renderWorkoutExerciseItem).join("") : emptyMessage("Este treino ainda não possui exercícios.")}
  `;
}

/**
 * Renderiza um exercício vinculado a um treino.
 */
function renderWorkoutExerciseItem(item) {
  const exercise = state.exercises.find((record) => String(record.id) === String(item.exercise_id));
  const exerciseName = pick(item, ["exercise_name"], pick(exercise, ["name", "title", "nome"], "Exercicio"));

  return `
    <article class="simple-item">
      <strong>${escapeHtml(exerciseName)}</strong>
      <span>Séries: ${escapeHtml(pick(item, ["sets"], "-"))} | Reps: ${escapeHtml(pick(item, ["reps"], "-"))} | Carga: ${escapeHtml(pick(item, ["weight"], "-"))} | Descanso: ${escapeHtml(pick(item, ["rest_seconds"], "-"))}s</span>
    </article>
  `;
}

/**
 * Renderiza histórico de treinos concluídos.
 */
function renderWorkoutLogItem(log) {
  const workout = state.workouts.find((item) => String(item.id) === String(log.workout_id));
  const snapshot = normalizeExercisesSnapshot(pick(log, ["exercises_snapshot"], []));

  return `
    <article class="history-card">
      <strong>${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino"))}</strong>
      <span>Concluído em ${formatDate(pick(log, ["completed_at", "created_at"]))}</span>
      ${snapshot.length ? `<div class="history-exercises"><b>Exercicios:</b>${snapshot.map(renderSnapshotExerciseItem).join("")}</div>` : `<small>Nenhum exercicio salvo neste historico.</small>`}
    </article>
  `;
}

/**
 * Normaliza o snapshot salvo no workout_logs para exibicao segura.
 */
function normalizeExercisesSnapshot(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("[GymPulse] Erro ao ler exercises_snapshot:", error);
    return [];
  }
}

/**
 * Renderiza um exercicio salvo dentro do snapshot do historico.
 */
function renderSnapshotExerciseItem(exercise, index) {
  return `
    <div class="exercise-history-card">
      <strong>${index + 1}. ${escapeHtml(pick(exercise, ["exercise_name"], "Exercicio"))}</strong>
      <span>Series: ${escapeHtml(formatNumber(pick(exercise, ["sets"], "-")))} | Reps: ${escapeHtml(pick(exercise, ["reps"], "-"))} | Carga: ${escapeHtml(pick(exercise, ["weight"], "-"))} | Descanso: ${escapeHtml(formatNumber(pick(exercise, ["rest_seconds"], "-")))}s</span>
    </div>
  `;
}

/**
 * Renderiza evolução, avaliações e medidas do aluno.
 */
async function renderStudentDetails() {
  if (!state.studentAreaId) return;

  try {
    const [assessments, measurements] = await Promise.all([
      fetchTable("assessments", { eq: { column: "student_id", value: state.studentAreaId }, orderBy: "created_at" }),
      fetchTable("body_measurements", { eq: { column: "student_id", value: state.studentAreaId }, orderBy: "created_at" })
    ]);

    const latestAssessment = assessments[0] || {};
    const latestMeasurement = measurements[0] || {};

    el.studentEvolution.innerHTML = `
      ${renderEvolutionCard("Peso", pick(latestAssessment, ["weight", "weight_kg", "peso"], "Sem dado"))}
      ${renderEvolutionCard("Gordura corporal", pick(latestAssessment, ["body_fat", "body_fat_percentage", "body_fat_percent", "gordura_corporal"], "Sem dado"))}
      ${renderEvolutionCard("Massa muscular", pick(latestAssessment, ["muscle_mass", "lean_mass", "muscle_mass_kg", "massa_muscular"], "Sem dado"))}
      ${renderEvolutionCard("Cintura", pick(latestMeasurement, ["waist", "waist_cm", "cintura"], "Sem dado"))}
    `;
    el.studentAssessments.innerHTML = assessments.length
      ? assessments.map(renderAssessmentReadOnlyItem).join("")
      : emptyMessage("Nenhuma avaliação encontrada.");
    el.studentMeasurements.innerHTML = measurements.length
      ? measurements.map(renderMeasurementReadOnlyItem).join("")
      : emptyMessage("Nenhuma medida corporal encontrada.");
  } catch (error) {
    console.error(error);
    el.studentEvolution.innerHTML = emptyMessage(error.message);
    el.studentAssessments.innerHTML = emptyMessage(error.message);
    el.studentMeasurements.innerHTML = emptyMessage(error.message);
  }
}

/**
 * Renderiza um indicador simples de evolucao.
 */
function renderEvolutionCard(label, value) {
  return `
    <article class="mini-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

/**
 * Filtra e renderiza alunos reais da tabela students na area Treinador.
 */
function renderTrainerStudents() {
  const search = state.studentSearch.toLowerCase().trim();
  const students = state.students.filter((student) => {
    const name = pick(student, ["name", "full_name", "nome"], "").toLowerCase();
    const email = pick(student, ["email"], "").toLowerCase();
    return !search || name.includes(search) || email.includes(search);
  });

  el.trainerStudentsList.innerHTML = students.length
    ? students.map(renderTrainerStudentButton).join("")
    : emptyMessage(state.tableErrors.students || "Nenhum aluno encontrado na tabela students. Verifique se há dados no projeto correto e se o RLS permite SELECT para anon.");
}

/**
 * Renderiza botao de aluno para selecao do treinador.
 */
function renderTrainerStudentButton(student) {
  const name = pick(student, ["name", "full_name", "nome"], "Aluno sem nome");
  const detail = pick(student, ["objective", "email", "difficulties"], "Sem objetivo informado");
  const active = String(student.id) === String(state.selectedStudentId) ? " active" : "";

  return `
    <button class="list-item selectable${active}" type="button" data-student-id="${escapeHtml(student.id)}">
      <div class="avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div>
      <div>
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
    </button>
  `;
}

/**
 * Renderiza perfil, avaliacoes, medidas e treinos do aluno selecionado.
 */
async function renderTrainerProfile() {
  const student = state.students.find((item) => String(item.id) === String(state.selectedStudentId));

  if (!student) {
    el.trainerProfileSummary.innerHTML = emptyMessage("Selecione um aluno para visualizar o perfil.");
    el.trainerAssessments.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    el.trainerMeasurements.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    el.trainerWorkouts.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    renderTrainerWorkoutSelect([]);
    return;
  }

  const name = pick(student, ["name", "full_name", "nome"], "Aluno sem nome");
  el.trainerProfileTitle.textContent = name;
  el.trainerProfileSummary.innerHTML = `
    <div class="profile-card">
      <div class="avatar large">${escapeHtml(name.charAt(0).toUpperCase())}</div>
      <div>
        <strong>${escapeHtml(name)}</strong>
        <span>Objetivo: ${escapeHtml(pick(student, ["objective", "email"], "Não informado"))}</span>
        <small>Dificuldades: ${escapeHtml(pick(student, ["difficulties"], "Não informado"))}</small>
        <small>Restrições: ${escapeHtml(pick(student, ["restrictions"], "Não informado"))}</small>
      </div>
    </div>
  `;

  try {
    const [assessments, measurements] = await Promise.all([
      fetchTable("assessments", { eq: { column: "student_id", value: state.selectedStudentId }, orderBy: "created_at" }),
      fetchTable("body_measurements", { eq: { column: "student_id", value: state.selectedStudentId }, orderBy: "created_at" })
    ]);
    const workouts = getStudentWorkouts(state.selectedStudentId);

    el.trainerAssessments.innerHTML = assessments.length
      ? assessments.map(renderAssessmentItem).join("")
      : emptyMessage("Nenhuma avaliação encontrada.");
    el.trainerMeasurements.innerHTML = measurements.length
      ? measurements.map(renderMeasurementItem).join("")
      : emptyMessage("Nenhuma medida corporal encontrada.");
    el.trainerWorkouts.innerHTML = workouts.length
      ? workouts.map(renderWorkoutItem).join("")
      : emptyMessage("Nenhum treino criado para este aluno.");
    renderTrainerWorkoutSelect(workouts);
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Retorna treinos do aluno selecionado.
 */
function getStudentWorkouts(studentId) {
  return state.workouts.filter((workout) => String(workout.student_id) === String(studentId));
}

/**
 * Renderiza uma avaliação física.
 */
function renderAssessmentItem(assessment) {
  return `
    <article class="data-record">
      <strong>${formatDate(pick(assessment, ["assessment_date", "assessed_at", "created_at"]))}</strong>
      <span><b>Peso:</b> ${escapeHtml(formatNumber(pick(assessment, ["weight", "weight_kg"], "-")))} kg</span>
      <span><b>Altura:</b> ${escapeHtml(formatNumber(pick(assessment, ["height", "height_cm"], "-")))} cm</span>
      <span><b>Gordura corporal:</b> ${escapeHtml(formatNumber(pick(assessment, ["body_fat", "body_fat_percentage"], "-")))}</span>
      <span><b>Massa muscular:</b> ${escapeHtml(formatNumber(pick(assessment, ["muscle_mass", "lean_mass", "muscle_mass_kg"], "-")))}</span>
    </article>
  `;
}

/**
 * Renderiza uma medida corporal.
 */
function renderMeasurementItem(measurement) {
  return `
    <article class="data-record">
      <strong>${formatDate(pick(measurement, ["measurement_date", "measured_at", "created_at"]))}</strong>
      <span><b>Cintura:</b> ${escapeHtml(formatNumber(pick(measurement, ["waist", "waist_cm"], "-")))} cm</span>
      <span><b>Abdômen:</b> ${escapeHtml(formatNumber(pick(measurement, ["abdomen", "abdomen_cm"], "-")))} cm</span>
      <span><b>Quadril:</b> ${escapeHtml(formatNumber(pick(measurement, ["hip", "hip_cm"], "-")))} cm</span>
      <span><b>Braços:</b> ${escapeHtml(formatNumber(pick(measurement, ["arm", "arms", "arm_cm"], "-")))} cm</span>
      <span><b>Coxas:</b> ${escapeHtml(formatNumber(pick(measurement, ["thigh", "thighs", "thigh_cm"], "-")))} cm</span>
      <span><b>Panturrilhas:</b> ${escapeHtml(formatNumber(pick(measurement, ["calf", "calves", "calf_cm"], "-")))} cm</span>
    </article>
  `;
}

/**
 * Renderiza um treino simples.
 */
function renderWorkoutItem(workout) {
  return `
    <article class="list-item">
      <div>
        <strong>${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino sem nome"))}</strong>
        <span>${escapeHtml(pick(workout, ["goal", "description", "notes"], "Objetivo não informado"))}</span>
        <small>Criado em ${formatDate(pick(workout, ["created_at", "start_date"]))}</small>
      </div>
    </article>
  `;
}

/**
 * Preenche o select de treinos do aluno para adicionar exercícios.
 */
function renderTrainerWorkoutSelect(workouts) {
  el.trainerWorkoutSelect.innerHTML = workouts.length
    ? workouts.map((workout) => `<option value="${escapeHtml(workout.id)}">${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino"))}</option>`).join("")
    : `<option value="">Crie um treino primeiro</option>`;

  if (state.selectedWorkoutId && workouts.some((workout) => String(workout.id) === String(state.selectedWorkoutId))) {
    el.trainerWorkoutSelect.value = state.selectedWorkoutId;
  }
}

/**
 * Preenche o select com exercícios reais da exercise_library.
 */
function renderExerciseSelect() {
  el.trainerExerciseSelect.innerHTML = state.exercises.length
    ? state.exercises.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercício"))}</option>`).join("")
    : `<option value="">Nenhum exercício encontrado</option>`;
}

/**
 * Renderiza a biblioteca de exercícios completa para o treinador.
 */
function renderExerciseLibrary() {
  const search = state.exerciseSearch.toLowerCase().trim();
  const exercises = state.exercises.filter((exercise) => {
    const name = pick(exercise, ["name", "title", "nome"], "").toLowerCase();
    const group = pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "").toLowerCase();
    return !search || name.includes(search) || group.includes(search);
  });

  el.trainerExerciseLibrary.innerHTML = exercises.length
    ? exercises.map(renderExerciseLibraryItem).join("")
    : emptyMessage(state.tableErrors.exercise_library || "Nenhum exercício encontrado na tabela exercise_library. Rode o seed da biblioteca ou verifique o RLS.");
}

/**
 * Renderiza um item da biblioteca de exercícios.
 */
function renderExerciseLibraryItem(exercise) {
  return `
    <article class="simple-item stacked">
      <strong>${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercício"))}</strong>
      <span>${escapeHtml(pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "Grupo não informado"))}</span>
      <span>${escapeHtml(pick(exercise, ["equipment", "equipamento"], "Equipamento não informado"))} | ${escapeHtml(pick(exercise, ["difficulty", "difficulty_level", "nivel"], "Nível não informado"))}</span>
      <small>${escapeHtml(pick(exercise, ["instructions", "description", "instrucoes"], "Sem instruções cadastradas."))}</small>
    </article>
  `;
}

/**
 * Insere novo aluno na tabela students e atualiza a lista automaticamente.
 */
async function createStudent(form) {
  const formData = new FormData(form);
  const fullPayload = {
    name: formData.get("name"),
    height_cm: numberOrNull(formData.get("height_cm")),
    objective: formData.get("objective") || null,
    difficulties: formData.get("difficulties") || null,
    restrictions: formData.get("restrictions") || null
  };

  try {
    const created = await insertStudentWithFallback(fullPayload);
    state.selectedStudentId = created[0]?.id || state.selectedStudentId;
    form.reset();
    showToast("Aluno adicionado com sucesso.");
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Cadastra aluno adaptando o payload ao schema real do banco.
 */
async function insertStudentWithFallback(payload) {
  return insertWithSchemaFallback("students", payload, "Erro ao adicionar aluno");
}

/**
 * Adiciona avaliação física para o aluno selecionado.
 */
async function createAssessmentLegacy(form) {
  if (!state.selectedStudentId) {
    showToast("Selecione um aluno antes de salvar a avaliação.", "error");
    return;
  }

  const formData = new FormData(form);
  const payload = {
    student_id: state.selectedStudentId,
    weight: numberOrNull(formData.get("weight")),
    height: numberOrNull(formData.get("height")),
    body_fat: numberOrNull(formData.get("body_fat")),
    muscle_mass: numberOrNull(formData.get("muscle_mass")),
    notes: formData.get("notes") || null
  };
  setFormLoading(form, true);

  try {
    await insertWithSchemaFallback("assessments", payload, "Erro ao salvar avaliação");
    form.reset();
    showToast("Avaliação salva com sucesso.");
    await refreshSelectedStudentProfile();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setFormLoading(form, false);
  }
}

/**
 * Adiciona medidas corporais para o aluno selecionado.
 */
async function createMeasurementLegacy(form) {
  if (!state.selectedStudentId) {
    showToast("Selecione um aluno antes de salvar medidas.", "error");
    return;
  }

  const formData = new FormData(form);
  const payload = {
    student_id: state.selectedStudentId,
    waist: numberOrNull(formData.get("waist")),
    abdomen: numberOrNull(formData.get("abdomen")),
    hip: numberOrNull(formData.get("hip")),
    chest: numberOrNull(formData.get("chest")),
    arm: numberOrNull(formData.get("arm")),
    thigh: numberOrNull(formData.get("thigh")),
    calf: numberOrNull(formData.get("calf")),
    notes: formData.get("notes") || null
  };
  setFormLoading(form, true);

  try {
    await insertWithSchemaFallback("body_measurements", payload, "Erro ao salvar medidas");
    form.reset();
    showToast("Medidas salvas com sucesso.");
    await refreshSelectedStudentProfile();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setFormLoading(form, false);
  }
}

/**
 * Converte campos numericos opcionais em numero ou null.
 */
function numberOrNull(value) {
  const normalized = normalizeNumberInput(value);
  if (normalized === "") return null;
  return Number(normalized);
}

/**
 * Le o primeiro campo existente no FormData.
 */
function getFormValue(formData, names) {
  for (const name of names) {
    const value = formData.get(name);
    if (value !== null && value !== undefined && value !== "") return value;
  }
  return "";
}

/**
 * Normaliza entrada numerica pt-BR e remove zeros a esquerda.
 */
function normalizeNumberInput(value) {
  if (value === null || value === undefined) return "";
  const cleaned = String(value).trim().replace(",", ".");
  if (!cleaned) return "";
  const number = Number(cleaned);
  return Number.isNaN(number) ? "" : String(number);
}

/**
 * Exibe numeros salvos sem zeros a esquerda.
 */
function formatNumber(value) {
  if (value === null || value === undefined || value === "" || value === "-") return value || "-";
  const number = Number(value);
  return Number.isNaN(number) ? value : String(number);
}

/**
 * Evita duplo envio enquanto uma operacao de formulario esta em andamento.
 */
function setFormLoading(form, loading) {
  form.querySelectorAll("button, input, select").forEach((element) => {
    element.disabled = loading;
  });
}

/**
 * Atualiza perfil do treinador e detalhes do aluno sem duplicar itens.
 */
async function refreshSelectedStudentProfile() {
  await renderTrainerProfile();
  if (String(state.studentAreaId) === String(state.selectedStudentId)) {
    await renderStudentDetails();
  }
}

/**
 * Cria um treino para o aluno selecionado.
 */
async function createWorkoutLegacy(form) {
  if (!state.selectedStudentId) {
    showToast("Selecione um aluno antes de criar o treino.", "error");
    return;
  }

  const formData = new FormData(form);
  const payload = {
    student_id: state.selectedStudentId,
    title: formData.get("title"),
    goal: formData.get("goal") || null,
    notes: formData.get("notes") || null,
    status: "active"
  };

  try {
    const created = await insertWithSchemaFallback("workouts", payload, "Erro ao criar treino");
    state.selectedWorkoutId = created[0]?.id || "";
    form.reset();
    showToast("Treino criado com sucesso.");
    await loadSupabaseData();
    await renderTrainerProfile();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Adiciona exercício da exercise_library ao treino selecionado.
 */
async function addExerciseToWorkoutLegacy() {
  const workoutId = el.trainerWorkoutSelect.value;
  const exerciseId = el.trainerExerciseSelect.value;
  const selectedExercise = state.exercises.find((exercise) => String(exercise.id) === String(exerciseId));
  const exerciseName = pick(selectedExercise, ["name", "title", "nome"], "");

  if (!workoutId || !exerciseId) {
    showToast("Selecione treino e exercício.", "error");
    return;
  }

  const payload = {
    workout_id: workoutId,
    exercise_name: exerciseName,
    sets: Number(document.querySelector("#sets-input").value) || null,
    reps: document.querySelector("#reps-input").value || null,
    weight: document.querySelector("#load-input").value || null,
    rest_seconds: Number(document.querySelector("#rest-input").value) || null,
    instructions: document.querySelector("#exercise-notes-input").value || null
  };

  try {
    await insertWorkoutExerciseWithFallback(payload);
    showToast("Exercício adicionado ao treino.");
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Tenta inserir com order_index e, se a coluna não existir, repete sem ela.
 */
async function insertWorkoutExerciseWithFallback(payload) {
  return insertWithSchemaFallback("workout_exercises", payload, "Erro ao adicionar exercício ao treino");
}

/**
 * Remove automaticamente colunas que não existem no schema real e tenta inserir novamente.
 */
async function insertWithSchemaFallback(tableName, payload, fallbackMessage) {
  let currentPayload = { ...payload };
  const maxAttempts = Object.keys(currentPayload).length + 2;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      if (["students", "assessments", "body_measurements", "workouts", "workout_exercises"].includes(tableName)) {
        console.log(`[GymPulse] INSERT final em ${tableName}:`, currentPayload);
      }
      return await runQuery(supabaseClient.from(tableName).insert(currentPayload).select(), fallbackMessage);
    } catch (error) {
      const missingColumn = getMissingColumnFromError(error.message);

      if (!missingColumn || !(missingColumn in currentPayload)) {
        throw error;
      }

      const { [missingColumn]: _removed, ...nextPayload } = currentPayload;
      currentPayload = nextPayload;
    }
  }

  throw new Error(`${fallbackMessage}: não foi possível adaptar o payload ao schema.`);
}

/**
 * Extrai o nome de coluna ausente das mensagens do PostgREST.
 */
function getMissingColumnFromError(message) {
  const text = String(message);
  const quotedMatch = text.match(/'([^']+)' column/);
  if (quotedMatch) return quotedMatch[1];

  const columnMatch = text.match(/column [^.]+\.([a-zA-Z0-9_]+) does not exist/);
  if (columnMatch) return columnMatch[1];

  return "";
}

/**
 * Marca o treino atual do aluno como concluido em workout_logs.
 */
async function completeCurrentWorkout() {
  const workout = getCurrentWorkout(state.studentAreaId);

  if (!workout) {
    showToast("Nenhum treino atual para concluir.", "error");
    return;
  }

  try {
    const workoutExercises = await fetchTable("workout_exercises", {
      eq: { column: "workout_id", value: workout.id },
      orderBy: "created_at"
    });
    const exercisesSnapshot = workoutExercises.map((exercise) => ({
      exercise_name: pick(exercise, ["exercise_name"], "Exercicio"),
      sets: numberOrNull(pick(exercise, ["sets"], "")),
      reps: pick(exercise, ["reps"], null),
      weight: pick(exercise, ["weight"], null),
      rest_seconds: numberOrNull(pick(exercise, ["rest_seconds"], ""))
    }));
    console.log("[GymPulse] workout_logs exercises_snapshot:", exercisesSnapshot);

    await runQuery(
      supabaseClient
        .from("workout_logs")
        .insert({
          workout_id: workout.id,
          student_id: state.studentAreaId,
          completed_at: new Date().toISOString(),
          exercises_snapshot: exercisesSnapshot
        })
        .select(),
      "Erro ao marcar treino como concluido"
    );
    showToast("Treino marcado como concluído.");
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Libera a area TI/Admin com senha simples provisoria.
 */
function unlockAdminArea(password) {
  if (password !== ADMIN_TEMP_PASSWORD) {
    showToast("Senha TI/Admin incorreta.", "error");
    return;
  }

  state.adminUnlocked = true;
  el.adminLock.classList.add("hidden");
  el.adminPanel.classList.remove("hidden");
  hydrateAdminConfigForm();
  renderAdminArea();
  showToast("Área TI/Admin liberada.");
}

/**
 * Preenche os campos de configuracao do Supabase dentro do TI/Admin.
 */
function hydrateAdminConfigForm() {
  const config = getSupabaseConfig();
  el.adminSupabaseUrl.value = config.url;
  el.adminSupabaseKey.value = config.anonKey;
}

/**
 * Salva configuracao Supabase pelo TI/Admin e recria o client.
 */
async function saveAdminSupabaseConfig(form) {
  const formData = new FormData(form);
  saveSupabaseConfig({
    url: formData.get("url"),
    anonKey: formData.get("anonKey")
  });
  supabaseClient = createSupabaseClient();
  showToast("Configuracao Supabase salva.");
  await loadSupabaseData();
}

/**
 * Testa conexão lendo um registro da tabela students.
 */
async function testConnection() {
  try {
    setConnectionStatus("Testando...", false);
    await runQuery(supabaseClient.from("students").select("id").limit(1), "Erro ao testar conexão");
    setConnectionStatus("Supabase conectado", true);
    showToast("Conexão testada com sucesso.");
  } catch (error) {
    setConnectionStatus("Erro na conexão", false);
    showToast(error.message, "error");
  }
}

/**
 * Renderiza area TI/Admin: tabelas, dados e diagnostico.
 */
function renderAdminArea() {
  if (!state.adminUnlocked) return;

  el.adminTablesList.innerHTML = REQUIRED_TABLES.map((tableName) => {
    const status = getTableStatus(tableName);
    return `
      <article class="simple-item">
        <strong>${tableName}</strong>
        <span>${status}</span>
      </article>
    `;
  }).join("");

  el.adminStudentsList.innerHTML = state.students.length
    ? state.students.map(renderAdminStudentItem).join("")
    : emptyMessage("Nenhum aluno encontrado.");

  el.adminExercisesList.innerHTML = state.exercises.length
    ? state.exercises.slice(0, 20).map(renderAdminExerciseItem).join("")
    : emptyMessage("Nenhum exercício encontrado.");

  el.adminDiagnostics.innerHTML = `
    ${renderDiagnostic("Status", el.connectionStatus.textContent)}
    ${renderDiagnostic("Alunos carregados", state.students.length)}
    ${renderDiagnostic("Exercícios carregados", state.exercises.length)}
    ${renderDiagnostic("Treinos carregados", state.workouts.length)}
    ${renderDiagnostic("Logs carregados", state.workoutLogs.length)}
    ${renderDiagnostic("Ultimo erro", state.lastError || "Nenhum")}
    ${renderDiagnostic("Erros por tabela", Object.keys(state.tableErrors).length ? Object.values(state.tableErrors).join(" | ") : "Nenhum")}
  `;

  renderAdminErrors();
  renderExpectedRlsPolicies();
}

/**
 * Retorna status simples de carregamento por tabela.
 */
function getTableStatus(tableName) {
  const map = {
    students: state.students.length,
    exercise_library: state.exercises.length,
    workouts: state.workouts.length,
    workout_exercises: state.workoutExercises.length,
    workout_logs: state.workoutLogs.length
  };

  if (tableName === "assessments" || tableName === "body_measurements") {
    return state.tableErrors[tableName] || "Consultada por aluno no perfil";
  }

  return state.tableErrors[tableName] || `${map[tableName] ?? 0} registros carregados`;
}

/**
 * Renderiza aluno dentro do painel admin.
 */
function renderAdminStudentItem(student) {
  return `
    <article class="simple-item">
      <strong>${escapeHtml(pick(student, ["name", "full_name", "nome"], "Aluno"))}</strong>
      <span>${escapeHtml(pick(student, ["objective", "email"], "Sem objetivo informado"))}</span>
    </article>
  `;
}

/**
 * Renderiza exercício dentro do painel admin.
 */
function renderAdminExerciseItem(exercise) {
  return `
    <article class="simple-item">
      <strong>${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercício"))}</strong>
      <span>${escapeHtml(pick(exercise, ["muscle_group", "primary_muscle"], "Grupo não informado"))}</span>
    </article>
  `;
}

/**
 * Renderiza erros atuais retornados pelo Supabase.
 */
function renderAdminErrors() {
  const errors = Object.entries(state.tableErrors);

  if (state.lastError && !errors.some(([, message]) => message === state.lastError)) {
    errors.push(["ultima_operacao", state.lastError]);
  }

  el.adminErrorsList.innerHTML = errors.length
    ? errors.map(([source, message]) => `
      <article class="simple-item stacked">
        <strong>${escapeHtml(source)}</strong>
        <span>${escapeHtml(message)}</span>
      </article>
    `).join("")
    : emptyMessage("Nenhum erro Supabase registrado nesta sessao.");
}

/**
 * Mostra as politicas RLS que devem existir no banco para o MVP.
 */
function renderExpectedRlsPolicies() {
  el.adminRlsPolicies.innerHTML = EXPECTED_RLS_POLICIES.map(([tableName, action, policyName]) => `
    <article class="simple-item stacked">
      <strong>${escapeHtml(tableName)} - ${escapeHtml(action)}</strong>
      <span>${escapeHtml(policyName)}</span>
    </article>
  `).join("");
}

/**
 * Insere a biblioteca padrão de exercícios no Supabase pelo TI/Admin.
 */
async function seedExerciseLibrary() {
  const payload = DEFAULT_EXERCISES.map(([name, muscle_group, equipment, difficulty, instructions]) => ({
    name,
    muscle_group,
    equipment,
    difficulty,
    instructions
  }));

  try {
    const existingExercises = await safeFetchTable("exercise_library");
    const existingNames = new Set(
      existingExercises.map((exercise) => getExerciseKey(exercise))
    );
    const missingPayload = payload.filter((exercise) => !existingNames.has(getExerciseKey(exercise)));

    if (!missingPayload.length) {
      showToast("Biblioteca padrão já está cadastrada.");
      return;
    }

    await runQuery(supabaseClient.from("exercise_library").insert(missingPayload).select(), "Erro ao inserir biblioteca padrão");
    showToast("Biblioteca padrão inserida.");
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Normaliza texto para comparacao local sem usar ON CONFLICT.
 */
function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Cria chave local para evitar repetição por nome + grupo muscular.
 */
function getExerciseKey(exercise) {
  return `${normalizeText(pick(exercise, ["name", "title", "nome"]))}::${normalizeText(pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"]))}`;
}

/**
 * Retorna o aluno atualmente selecionado pelo treinador.
 */
function getSelectedStudent() {
  return state.students.find((item) => String(item.id) === String(state.selectedStudentId));
}

/**
 * Troca a aba visivel da Area Treinador.
 */
function switchTrainerTab(tabName) {
  state.trainerActiveTab = tabName || "profile";
  document.querySelectorAll("[data-trainer-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.trainerTab === state.trainerActiveTab);
  });
  document.querySelectorAll(".trainer-tab").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `trainer-tab-${state.trainerActiveTab}`);
  });
}

/**
 * Normaliza data para campos input[type=date].
 */
function formatInputDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

/**
 * Calcula idade a partir de birth_date sem salvar idade no banco.
 */
function calculateAgeFromBirthDate(value) {
  if (!value) return "";
  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return "";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age >= 0 ? age : "";
}

/**
 * Preenche o formulario de edicao do perfil do aluno.
 */
function fillStudentProfileForm(student) {
  if (!el.editStudentForm) return;
  el.editStudentForm.reset();
  if (!student) return;

  el.editStudentForm.elements.name.value = pick(student, ["name", "full_name", "nome"], "");
  el.editStudentForm.elements.nickname.value = pick(student, ["nickname", "apelido"], "");
  el.editStudentForm.elements.birth_date.value = formatInputDate(pick(student, ["birth_date", "date_of_birth"], ""));
  el.editStudentForm.elements.height_cm.value = normalizeNumberInput(pick(student, ["height_cm", "height"], ""));
  el.editStudentForm.elements.objective.value = pick(student, ["objective"], "");
  el.editStudentForm.elements.difficulties.value = pick(student, ["difficulties"], "");
  el.editStudentForm.elements.restrictions.value = pick(student, ["restrictions"], "");
  el.editStudentForm.elements.notes.value = pick(student, ["notes", "observations"], "");
}

/**
 * Renderiza o perfil do aluno selecionado e hidrata as abas do treinador.
 */
async function renderTrainerProfile() {
  const student = getSelectedStudent();

  if (!student) {
    el.trainerProfileTitle.textContent = "Selecione um aluno na lista.";
    el.trainerProfileSummary.innerHTML = emptyMessage("Selecione um aluno para visualizar o perfil.");
    el.trainerAssessments.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    el.trainerMeasurements.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    el.trainerWorkouts.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    el.trainerHistory.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    fillStudentProfileForm(null);
    renderTrainerWorkoutSelect([]);
    return;
  }

  const name = pick(student, ["name", "full_name", "nome"], "Aluno sem nome");
  const birthDate = pick(student, ["birth_date"], "");
  const age = calculateAgeFromBirthDate(birthDate);
  el.trainerProfileTitle.textContent = name;
  el.trainerProfileSummary.innerHTML = `
    <div class="profile-card">
      <div class="avatar large">${escapeHtml(name.charAt(0).toUpperCase())}</div>
      <div>
        <strong>${escapeHtml(name)}</strong>
        <span>Apelido: ${escapeHtml(pick(student, ["nickname", "apelido"], "Nao informado"))}</span>
        <span>Nascimento: ${escapeHtml(birthDate ? formatDate(birthDate) : "Nao informado")}</span>
        <span>Idade: ${escapeHtml(age !== "" ? `${age} anos` : "Nao informada")}</span>
        <span>Altura: ${escapeHtml(formatNumber(pick(student, ["height_cm", "height"], "-")))} cm</span>
        <small>Objetivo: ${escapeHtml(pick(student, ["objective", "email"], "Nao informado"))}</small>
        <small>Dificuldades: ${escapeHtml(pick(student, ["difficulties"], "Nao informado"))}</small>
        <small>Restricoes: ${escapeHtml(pick(student, ["restrictions"], "Nao informado"))}</small>
      </div>
    </div>
  `;
  fillStudentProfileForm(student);

  try {
    const [assessments, measurements] = await Promise.all([
      fetchTable("assessments", { eq: { column: "student_id", value: state.selectedStudentId }, orderBy: "created_at" }),
      fetchTable("body_measurements", { eq: { column: "student_id", value: state.selectedStudentId }, orderBy: "created_at" })
    ]);
    const workouts = getStudentWorkouts(state.selectedStudentId);

    state.trainerAssessmentsCache = assessments;
    state.trainerMeasurementsCache = measurements;

    el.trainerAssessments.innerHTML = assessments.length
      ? assessments.map(renderAssessmentItem).join("")
      : emptyMessage("Nenhuma avaliacao encontrada.");
    el.trainerMeasurements.innerHTML = measurements.length
      ? measurements.map(renderMeasurementItem).join("")
      : emptyMessage("Nenhuma medida corporal encontrada.");
    el.trainerWorkouts.innerHTML = workouts.length
      ? workouts.map(renderWorkoutItem).join("")
      : emptyMessage("Nenhum treino criado para este aluno.");
    renderTrainerWorkoutSelect(workouts);
    renderTrainerHistory();
    switchTrainerTab(state.trainerActiveTab);
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Renderiza uma avaliacao fisica compacta com acoes.
 */
function renderAssessmentItem(assessment) {
  const notes = pick(assessment, ["notes", "observations"], "");
  return `
    <article class="data-record" data-assessment-id="${escapeHtml(assessment.id)}">
      <div class="record-title">
        <strong>${formatDate(pick(assessment, ["assessment_date", "assessed_at", "created_at"]))}</strong>
        ${renderRecordActions("assessment", assessment.id)}
      </div>
      <span><b>Peso:</b> ${escapeHtml(formatNumber(pick(assessment, ["weight", "weight_kg", "peso"], "-")))} kg</span>
      <span><b>Altura:</b> ${escapeHtml(formatNumber(pick(assessment, ["height", "height_cm", "altura"], "-")))} cm</span>
      <span><b>Gordura corporal:</b> ${escapeHtml(formatNumber(pick(assessment, ["body_fat", "body_fat_percentage", "body_fat_percent", "gordura_corporal"], "-")))}</span>
      <span><b>Massa muscular:</b> ${escapeHtml(formatNumber(pick(assessment, ["muscle_mass", "lean_mass", "muscle_mass_kg", "massa_muscular"], "-")))}</span>
      <span><b>Gordura visceral:</b> ${escapeHtml(formatNumber(pick(assessment, ["visceral_fat", "gordura_visceral"], "-")))}</span>
      <span><b>Agua corporal:</b> ${escapeHtml(formatNumber(pick(assessment, ["body_water_percent", "body_water", "body_water_percentage", "agua_corporal"], "-")))}</span>
      <span><b>IMC:</b> ${escapeHtml(formatNumber(pick(assessment, ["bmi", "imc"], "-")))}</span>
      ${notes ? `<span class="record-notes"><b>Obs:</b> ${escapeHtml(notes)}</span>` : ""}
    </article>
  `;
}

/**
 * Renderiza uma medida corporal compacta com acoes.
 */
function renderMeasurementItem(measurement) {
  const notes = pick(measurement, ["notes", "observations"], "");
  return `
    <article class="data-record" data-measurement-id="${escapeHtml(measurement.id)}">
      <div class="record-title">
        <strong>${formatDate(pick(measurement, ["measurement_date", "measured_at", "created_at"]))}</strong>
        ${renderRecordActions("measurement", measurement.id)}
      </div>
      <span><b>Pescoco:</b> ${escapeHtml(formatNumber(pick(measurement, ["neck_cm"], "-")))} cm</span>
      <span><b>Peitoral:</b> ${escapeHtml(formatNumber(pick(measurement, ["chest_cm", "chest"], "-")))} cm</span>
      <span><b>Cintura:</b> ${escapeHtml(formatNumber(pick(measurement, ["waist_cm", "waist", "cintura"], "-")))} cm</span>
      <span><b>Abdomen:</b> ${escapeHtml(formatNumber(pick(measurement, ["abdomen", "abdomen_cm", "abdome"], "-")))} cm</span>
      <span><b>Quadril:</b> ${escapeHtml(formatNumber(pick(measurement, ["hip", "hip_cm", "quadril"], "-")))} cm</span>
      <span><b>Bracos:</b> ${escapeHtml(formatNumber(pick(measurement, ["right_arm_cm", "left_arm_cm", "arm", "arms", "arm_cm", "arms_cm", "bracos"], "-")))} cm</span>
      <span><b>Coxas:</b> ${escapeHtml(formatNumber(pick(measurement, ["right_thigh_cm", "left_thigh_cm", "thigh", "thighs", "thigh_cm", "thighs_cm", "coxas"], "-")))} cm</span>
      <span><b>Panturrilhas:</b> ${escapeHtml(formatNumber(pick(measurement, ["right_calf_cm", "left_calf_cm", "calf", "calves", "calf_cm", "calves_cm", "panturrilhas"], "-")))} cm</span>
      ${notes ? `<span class="record-notes"><b>Obs:</b> ${escapeHtml(notes)}</span>` : ""}
    </article>
  `;
}

/**
 * Renderiza avaliacao na Area Aluno sem acoes de treinador.
 */
function renderAssessmentReadOnlyItem(assessment) {
  return renderAssessmentItem(assessment).replace(/<div class="record-actions">[\s\S]*?<\/div>/, "");
}

/**
 * Renderiza medida corporal na Area Aluno sem acoes de treinador.
 */
function renderMeasurementReadOnlyItem(measurement) {
  return renderMeasurementItem(measurement).replace(/<div class="record-actions">[\s\S]*?<\/div>/, "");
}

/**
 * Renderiza botoes compactos de edicao e exclusao.
 */
function renderRecordActions(type, id) {
  return `
    <div class="record-actions">
      <button class="tiny-button" type="button" data-action="edit-${escapeHtml(type)}" data-id="${escapeHtml(id)}">Editar</button>
      <button class="tiny-button danger" type="button" data-action="delete-${escapeHtml(type)}" data-id="${escapeHtml(id)}">Excluir</button>
    </div>
  `;
}

/**
 * Renderiza um treino com exercicios e acoes.
 */
function renderWorkoutItem(workout) {
  const exercises = getWorkoutExercises(workout.id);

  return `
    <article class="workout-card" data-workout-id="${escapeHtml(workout.id)}">
      <div class="record-title">
        <div>
          <strong>${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino sem nome"))}</strong>
          <span>${escapeHtml(pick(workout, ["goal", "description", "notes"], "Objetivo nao informado"))}</span>
          <small>Criado em ${formatDate(pick(workout, ["created_at", "start_date"]))}</small>
        </div>
        ${renderRecordActions("workout", workout.id)}
      </div>
      <div class="workout-exercises">
        ${exercises.length ? exercises.map(renderTrainerWorkoutExerciseItem).join("") : emptyMessage("Nenhum exercicio neste treino.")}
      </div>
    </article>
  `;
}

/**
 * Retorna exercicios vinculados a um treino.
 */
function getWorkoutExercises(workoutId) {
  return state.workoutExercises.filter((item) => String(item.workout_id) === String(workoutId));
}

/**
 * Renderiza exercicio dentro do treino do treinador.
 */
function renderTrainerWorkoutExerciseItem(item) {
  const exercise = state.exercises.find((record) => String(record.id) === String(item.exercise_id));

  return `
    <article class="exercise-row" data-workout-exercise-id="${escapeHtml(item.id)}">
      <div>
        <strong>${escapeHtml(pick(item, ["exercise_name"], pick(exercise, ["name", "title", "nome"], "Exercicio")))}</strong>
        <span>Series: ${escapeHtml(formatNumber(pick(item, ["sets"], "-")))} | Reps: ${escapeHtml(pick(item, ["reps"], "-"))} | Carga: ${escapeHtml(pick(item, ["weight"], "-"))} | Descanso: ${escapeHtml(formatNumber(pick(item, ["rest_seconds"], "-")))}s</span>
        <small>${escapeHtml(pick(item, ["instructions"], ""))}</small>
      </div>
      <div class="record-actions">
        <button class="tiny-button" type="button" data-action="edit-workout-exercise" data-id="${escapeHtml(item.id)}">Editar</button>
        <button class="tiny-button danger" type="button" data-action="delete-workout-exercise" data-id="${escapeHtml(item.id)}">Remover</button>
      </div>
    </article>
  `;
}

/**
 * Preenche o select com exercicios unicos da exercise_library.
 */
function renderExerciseSelect() {
  const exercises = getUniqueExercises();
  el.trainerExerciseSelect.innerHTML = exercises.length
    ? exercises.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercicio"))}</option>`).join("")
    : `<option value="">Nenhum exercicio encontrado</option>`;
}

/**
 * Renderiza a biblioteca de exercicios apenas na aba Biblioteca.
 */
function renderExerciseLibrary() {
  if (!el.trainerExerciseLibrary) return;
  const search = state.exerciseSearch.toLowerCase().trim();
  renderExerciseGroupFilter();
  const exercises = getUniqueExercises().filter((exercise) => {
    const name = pick(exercise, ["name", "title", "nome"], "").toLowerCase();
    const group = pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "").toLowerCase();
    const matchesSearch = !search || name.includes(search) || group.includes(search);
    const matchesGroup = !state.exerciseGroupFilter || group === state.exerciseGroupFilter.toLowerCase();
    return matchesSearch && matchesGroup;
  });

  el.trainerExerciseLibrary.innerHTML = exercises.length
    ? exercises.map(renderExerciseLibraryItem).join("")
    : emptyMessage(state.tableErrors.exercise_library || "Nenhum exercicio encontrado na tabela exercise_library.");
}

/**
 * Remove duplicados visuais usando nome + grupo muscular.
 */
function getUniqueExercises() {
  const map = new Map();
  state.exercises.forEach((exercise) => {
    const key = getExerciseKey(exercise);
    if (!map.has(key)) map.set(key, exercise);
  });
  return Array.from(map.values());
}

/**
 * Preenche o filtro de grupo muscular.
 */
function renderExerciseGroupFilter() {
  if (!el.exerciseGroupFilter) return;
  const current = el.exerciseGroupFilter.value;
  const groups = Array.from(new Set(getUniqueExercises()
    .map((exercise) => pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], ""))
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  el.exerciseGroupFilter.innerHTML = `<option value="">Todos os grupos</option>${groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("")}`;
  el.exerciseGroupFilter.value = groups.includes(current) ? current : "";
  state.exerciseGroupFilter = el.exerciseGroupFilter.value;
}

/**
 * Renderiza um item da biblioteca de exercicios.
 */
function renderExerciseLibraryItem(exercise) {
  return `
    <article class="simple-item stacked library-item">
      <strong>${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercicio"))}</strong>
      <span>${escapeHtml(pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "Grupo nao informado"))}</span>
      <span>${escapeHtml(pick(exercise, ["equipment", "equipamento"], "Equipamento nao informado"))} | ${escapeHtml(pick(exercise, ["difficulty", "difficulty_level", "nivel"], "Nivel nao informado"))}</span>
      <small>${escapeHtml(pick(exercise, ["instructions", "description", "instrucoes"], "Sem instrucoes cadastradas."))}</small>
    </article>
  `;
}

/**
 * Atualiza perfil do aluno adaptando colunas ao schema real.
 */
async function updateStudentProfile(form) {
  if (!state.selectedStudentId) {
    showToast("Selecione um aluno antes de editar o perfil.", "error");
    return;
  }

  const formData = new FormData(form);
  const payload = {
    name: formData.get("name") || null,
    nickname: formData.get("nickname") || null,
    birth_date: formData.get("birth_date") || null,
    height_cm: numberOrNull(formData.get("height_cm")),
    objective: formData.get("objective") || null,
    difficulties: formData.get("difficulties") || null,
    restrictions: formData.get("restrictions") || null,
    notes: formData.get("notes") || null
  };
  console.log("[GymPulse] updateStudent(id, payload):", {
    id: state.selectedStudentId,
    payload
  });

  setFormLoading(form, true);
  try {
    await updateWithSchemaFallback("students", state.selectedStudentId, payload, "Erro ao atualizar perfil");
    showToast("Perfil atualizado com sucesso.");
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setFormLoading(form, false);
  }
}

/**
 * Insere ou edita avaliacao fisica com campos numericos normalizados.
 */
async function createAssessment(form) {
  if (!state.selectedStudentId) {
    showToast("Selecione um aluno antes de salvar a avaliacao.", "error");
    return;
  }

  const formData = new FormData(form);
  const weight = numberOrNull(getFormValue(formData, ["weight_kg", "weight"]));
  const height = numberOrNull(formData.get("height"));
  const bodyFat = numberOrNull(getFormValue(formData, ["body_fat_percent", "body_fat"]));
  const muscleMass = numberOrNull(getFormValue(formData, ["muscle_mass_kg", "muscle_mass"]));
  const visceralFat = numberOrNull(formData.get("visceral_fat"));
  const bodyWater = numberOrNull(getFormValue(formData, ["body_water_percent", "body_water"]));
  const imc = numberOrNull(getFormValue(formData, ["imc", "bmi"]));
  const payload = {
    student_id: state.selectedStudentId,
    weight,
    weight_kg: weight,
    peso: weight,
    height,
    height_cm: height,
    altura: height,
    body_fat: bodyFat,
    body_fat_percentage: bodyFat,
    body_fat_percent: bodyFat,
    gordura_corporal: bodyFat,
    muscle_mass: muscleMass,
    lean_mass: muscleMass,
    muscle_mass_kg: muscleMass,
    massa_muscular: muscleMass,
    visceral_fat: visceralFat,
    gordura_visceral: visceralFat,
    body_water: bodyWater,
    body_water_percent: bodyWater,
    body_water_percentage: bodyWater,
    agua_corporal: bodyWater,
    bmi: imc,
    imc,
    notes: formData.get("notes") || null
  };
  const editId = form.dataset.editId;
  console.log("[GymPulse] Enviando assessment para Supabase:", {
    mode: editId ? "update" : "insert",
    id: editId || null,
    payload
  });
  setFormLoading(form, true);

  try {
    if (editId) {
      await updateWithSchemaFallback("assessments", editId, payload, "Erro ao editar avaliacao");
      form.dataset.editId = "";
      form.querySelector("button[type='submit']").textContent = "Salvar avaliacao";
      showToast("Avaliacao atualizada.");
    } else {
      await insertWithSchemaFallback("assessments", payload, "Erro ao salvar avaliacao");
      showToast("Avaliacao salva com sucesso.");
    }
    form.reset();
    await refreshSelectedStudentProfile();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setFormLoading(form, false);
  }
}

/**
 * Insere ou edita medidas corporais com campos numericos normalizados.
 */
async function createMeasurement(form) {
  if (!state.selectedStudentId) {
    showToast("Selecione um aluno antes de salvar medidas.", "error");
    return;
  }

  const formData = new FormData(form);
  const neck = numberOrNull(formData.get("neck_cm"));
  const chest = numberOrNull(formData.get("chest_cm"));
  const waist = numberOrNull(getFormValue(formData, ["waist_cm", "waist"]));
  const abdomen = numberOrNull(getFormValue(formData, ["abdomen_cm", "abdomen"]));
  const hip = numberOrNull(getFormValue(formData, ["hip_cm", "hip"]));
  const arm = numberOrNull(getFormValue(formData, ["arm_cm", "arm"]));
  const thigh = numberOrNull(getFormValue(formData, ["thigh_cm", "thigh"]));
  const calf = numberOrNull(getFormValue(formData, ["calf_cm", "calf"]));
  const payload = {
    student_id: state.selectedStudentId,
    neck_cm: neck,
    chest_cm: chest,
    waist,
    waist_cm: waist,
    cintura: waist,
    abdomen,
    abdomen_cm: abdomen,
    abdome: abdomen,
    hip,
    hip_cm: hip,
    quadril: hip,
    right_arm_cm: arm,
    left_arm_cm: arm,
    arm,
    arm_cm: arm,
    arms_cm: arm,
    arms: arm,
    bracos: arm,
    right_thigh_cm: thigh,
    left_thigh_cm: thigh,
    thigh,
    thigh_cm: thigh,
    thighs_cm: thigh,
    thighs: thigh,
    coxas: thigh,
    right_calf_cm: calf,
    left_calf_cm: calf,
    calf,
    calf_cm: calf,
    calves_cm: calf,
    calves: calf,
    panturrilhas: calf,
    notes: formData.get("notes") || null
  };
  const editId = form.dataset.editId;
  console.log("[GymPulse] Enviando body_measurement para Supabase:", {
    mode: editId ? "update" : "insert",
    id: editId || null,
    payload
  });
  setFormLoading(form, true);

  try {
    if (editId) {
      await updateWithSchemaFallback("body_measurements", editId, payload, "Erro ao editar medidas");
      form.dataset.editId = "";
      form.querySelector("button[type='submit']").textContent = "Salvar medidas";
      showToast("Medidas atualizadas.");
    } else {
      await insertWithSchemaFallback("body_measurements", payload, "Erro ao salvar medidas");
      showToast("Medidas salvas com sucesso.");
    }
    form.reset();
    await refreshSelectedStudentProfile();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setFormLoading(form, false);
  }
}

/**
 * Cria ou edita treino do aluno selecionado.
 */
async function createWorkout(form) {
  if (!state.selectedStudentId) {
    showToast("Selecione um aluno antes de criar o treino.", "error");
    return;
  }

  const formData = new FormData(form);
  const workoutName = String(getFormValue(formData, ["name", "title"]) || "").trim();

  if (!workoutName) {
    showToast("Informe o nome do treino.", "error");
    return;
  }

  const payload = {
    student_id: state.selectedStudentId,
    name: workoutName,
    title: workoutName,
    goal: formData.get("goal") || null,
    description: formData.get("goal") || null,
    notes: formData.get("notes") || null,
    status: "active"
  };
  const editId = form.dataset.editId;
  console.log("[GymPulse] Enviando workout para Supabase:", {
    mode: editId ? "update" : "insert",
    id: editId || null,
    payload
  });
  setFormLoading(form, true);

  try {
    if (editId) {
      await updateWithSchemaFallback("workouts", editId, payload, "Erro ao editar treino");
      state.selectedWorkoutId = editId;
      form.dataset.editId = "";
      form.querySelector("button[type='submit']").textContent = "Criar treino";
      showToast("Treino atualizado.");
    } else {
      const created = await insertWithSchemaFallback("workouts", payload, "Erro ao criar treino");
      state.selectedWorkoutId = created[0]?.id || "";
      showToast("Treino criado com sucesso.");
    }
    form.reset();
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    setFormLoading(form, false);
  }
}

/**
 * Adiciona ou edita exercicio da exercise_library dentro de um treino.
 */
async function addExerciseToWorkout() {
  const workoutId = el.trainerWorkoutSelect.value;
  const exerciseId = el.trainerExerciseSelect.value;
  const selectedExercise = state.exercises.find((exercise) => String(exercise.id) === String(exerciseId));
  const exerciseName = pick(selectedExercise, ["name", "title", "nome"], "");

  if (!workoutId || !exerciseId) {
    showToast("Selecione treino e exercicio.", "error");
    return;
  }

  if (!exerciseName) {
    showToast("Exercicio selecionado nao possui nome cadastrado.", "error");
    return;
  }

  const payload = {
    workout_id: workoutId,
    exercise_name: exerciseName,
    sets: numberOrNull(el.setsInput.value),
    reps: el.repsInput.value || null,
    weight: el.loadInput.value || null,
    rest_seconds: numberOrNull(el.restInput.value),
    instructions: el.exerciseNotesInput.value || null
  };
  const editId = el.addExerciseButton.dataset.editId;
  console.log("[GymPulse] addExerciseToWorkout(payload):", {
    mode: editId ? "update" : "insert",
    id: editId || null,
    payload
  });

  try {
    if (editId) {
      await updateWithSchemaFallback("workout_exercises", editId, payload, "Erro ao editar exercicio do treino");
      el.addExerciseButton.dataset.editId = "";
      el.addExerciseButton.textContent = "Adicionar exercicio";
      showToast("Exercicio atualizado no treino.");
    } else {
      await insertWorkoutExerciseWithFallback(payload);
      showToast("Exercicio adicionado ao treino.");
    }
    clearWorkoutExerciseForm();
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Limpa os campos do formulario de exercicio do treino.
 */
function clearWorkoutExerciseForm() {
  el.setsInput.value = "";
  el.repsInput.value = "";
  el.loadInput.value = "";
  el.restInput.value = "";
  el.exerciseNotesInput.value = "";
}

/**
 * Atualiza registros removendo colunas que nao existam no schema atual.
 */
async function updateWithSchemaFallback(tableName, id, payload, fallbackMessage) {
  let currentPayload = { ...payload };
  const maxAttempts = Object.keys(currentPayload).length + 2;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      if (["students", "assessments", "body_measurements", "workouts", "workout_exercises"].includes(tableName)) {
        console.log(`[GymPulse] UPDATE final em ${tableName}:`, { id, payload: currentPayload });
      }
      return await runQuery(supabaseClient.from(tableName).update(currentPayload).eq("id", id).select(), fallbackMessage);
    } catch (error) {
      const missingColumn = getMissingColumnFromError(error.message);

      if (!missingColumn || !(missingColumn in currentPayload)) {
        throw error;
      }

      const { [missingColumn]: _removed, ...nextPayload } = currentPayload;
      currentPayload = nextPayload;
    }
  }

  throw new Error(`${fallbackMessage}: nao foi possivel adaptar o payload ao schema.`);
}

/**
 * Exclui registros do Supabase sem depender de retorno select.
 */
async function deleteById(tableName, id, fallbackMessage) {
  if (!id || id === "undefined") {
    throw new Error(`${fallbackMessage}: id nao informado.`);
  }

  console.log(`[GymPulse] DELETE em ${tableName}:`, { id });
  const { error } = await supabaseClient.from(tableName).delete().eq("id", id);
  if (error) {
    console.error(`[GymPulse] Erro DELETE em ${tableName}:`, error);
    state.lastError = error.message;
    throw new Error(`${fallbackMessage}: ${error.message}`);
  }
}

/**
 * Recarrega dados e atualiza o perfil selecionado depois de uma exclusao.
 */
async function reloadAfterDelete() {
  await loadSupabaseData({ silent: true });
  await renderTrainerProfile();
}

/**
 * Exclui uma avaliacao pelo id.
 */
async function deleteAssessment(id) {
  if (!window.confirm("Tem certeza que deseja excluir?")) return;
  console.log("[GymPulse] deleteAssessment(id):", id);

  try {
    await deleteById("assessments", id, "Erro ao excluir avaliacao");
    showToast("Avaliacao excluida.");
    await reloadAfterDelete();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Exclui uma medida corporal pelo id.
 */
async function deleteBodyMeasurement(id) {
  if (!window.confirm("Tem certeza que deseja excluir?")) return;
  console.log("[GymPulse] deleteBodyMeasurement(id):", id);

  try {
    await deleteById("body_measurements", id, "Erro ao excluir medida");
    showToast("Medida excluida.");
    await reloadAfterDelete();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Exclui exercicio dentro de treino pelo id.
 */
async function deleteWorkoutExercise(id) {
  if (!window.confirm("Tem certeza que deseja excluir?")) return;
  console.log("[GymPulse] deleteWorkoutExercise(id):", id);

  try {
    await deleteById("workout_exercises", id, "Erro ao remover exercicio do treino");
    showToast("Exercicio removido do treino.");
    await reloadAfterDelete();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Exclui treino pelo id e remove seus exercicios caso nao exista cascade.
 */
async function deleteWorkout(id) {
  if (!window.confirm("Tem certeza que deseja excluir?")) return;
  console.log("[GymPulse] deleteWorkout(id):", id);

  try {
    await deleteByColumn("workout_exercises", "workout_id", id, "Erro ao excluir exercicios do treino");
    await deleteById("workouts", id, "Erro ao excluir treino");
    if (String(state.selectedWorkoutId) === String(id)) state.selectedWorkoutId = "";
    showToast("Treino excluido.");
    await reloadAfterDelete();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Exclui aluno selecionado e limpa o perfil.
 */
async function deleteStudent(id = state.selectedStudentId) {
  if (!id) {
    showToast("Selecione um aluno antes de excluir.", "error");
    return;
  }

  if (!window.confirm("Tem certeza que deseja excluir?")) return;
  console.log("[GymPulse] deleteStudent(id):", id);

  try {
    const studentWorkouts = getStudentWorkouts(id);
    const workoutIds = studentWorkouts.map((workout) => workout.id).filter(Boolean);
    if (workoutIds.length) {
      const { error } = await supabaseClient.from("workout_exercises").delete().in("workout_id", workoutIds);
      if (error) {
        console.error("[GymPulse] Erro DELETE em workout_exercises do aluno:", error);
        throw new Error(`Erro ao excluir exercicios do aluno: ${error.message}`);
      }
    }
    await deleteByColumn("workout_logs", "student_id", id, "Erro ao excluir logs do aluno");
    await deleteByColumn("assessments", "student_id", id, "Erro ao excluir avaliacoes do aluno");
    await deleteByColumn("body_measurements", "student_id", id, "Erro ao excluir medidas do aluno");
    await deleteByColumn("workouts", "student_id", id, "Erro ao excluir treinos do aluno");
    await deleteById("students", id, "Erro ao excluir aluno");

    state.selectedStudentId = "";
    state.selectedWorkoutId = "";
    showToast("Aluno excluido.");
    await loadSupabaseData();
    state.selectedStudentId = "";
    renderTrainerStudents();
    await renderTrainerProfile();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Exclui registros por uma coluna especifica e mostra erro real do Supabase.
 */
async function deleteByColumn(tableName, column, value, fallbackMessage) {
  console.log(`[GymPulse] DELETE em ${tableName} por ${column}:`, value);
  const { error } = await supabaseClient.from(tableName).delete().eq(column, value);
  if (error) {
    console.error(`[GymPulse] Erro DELETE em ${tableName}:`, error);
    state.lastError = error.message;
    throw new Error(`${fallbackMessage}: ${error.message}`);
  }
}

/**
 * Preenche formulario de avaliacao para edicao.
 */
function editAssessment(id) {
  const record = state.trainerAssessmentsCache.find((item) => String(item.id) === String(id));
  const form = document.querySelector("#new-assessment-form");
  if (!record || !form) return;

  form.dataset.editId = id;
  form.elements.weight_kg.value = normalizeNumberInput(pick(record, ["weight_kg", "weight", "peso"], ""));
  form.elements.height.value = normalizeNumberInput(pick(record, ["height", "height_cm", "altura"], ""));
  form.elements.body_fat_percent.value = normalizeNumberInput(pick(record, ["body_fat_percent", "body_fat", "body_fat_percentage", "gordura_corporal"], ""));
  form.elements.muscle_mass_kg.value = normalizeNumberInput(pick(record, ["muscle_mass_kg", "muscle_mass", "lean_mass", "massa_muscular"], ""));
  form.elements.visceral_fat.value = normalizeNumberInput(pick(record, ["visceral_fat", "gordura_visceral"], ""));
  form.elements.body_water_percent.value = normalizeNumberInput(pick(record, ["body_water_percent", "body_water", "body_water_percentage", "agua_corporal"], ""));
  form.elements.imc.value = normalizeNumberInput(pick(record, ["imc", "bmi"], ""));
  form.elements.notes.value = pick(record, ["notes", "observations"], "");
  form.querySelector("button[type='submit']").textContent = "Atualizar avaliacao";
  switchTrainerTab("assessments");
}

/**
 * Preenche formulario de medidas para edicao.
 */
function editMeasurement(id) {
  const record = state.trainerMeasurementsCache.find((item) => String(item.id) === String(id));
  const form = document.querySelector("#new-measurement-form");
  if (!record || !form) return;

  form.dataset.editId = id;
  form.elements.neck_cm.value = normalizeNumberInput(pick(record, ["neck_cm"], ""));
  form.elements.chest_cm.value = normalizeNumberInput(pick(record, ["chest_cm", "chest"], ""));
  form.elements.waist_cm.value = normalizeNumberInput(pick(record, ["waist_cm", "waist", "cintura"], ""));
  form.elements.abdomen_cm.value = normalizeNumberInput(pick(record, ["abdomen_cm", "abdomen", "abdome"], ""));
  form.elements.hip_cm.value = normalizeNumberInput(pick(record, ["hip_cm", "hip", "quadril"], ""));
  form.elements.arm_cm.value = normalizeNumberInput(pick(record, ["right_arm_cm", "left_arm_cm", "arm_cm", "arms_cm", "arm", "arms", "bracos"], ""));
  form.elements.thigh_cm.value = normalizeNumberInput(pick(record, ["right_thigh_cm", "left_thigh_cm", "thigh_cm", "thighs_cm", "thigh", "thighs", "coxas"], ""));
  form.elements.calf_cm.value = normalizeNumberInput(pick(record, ["right_calf_cm", "left_calf_cm", "calf_cm", "calves_cm", "calf", "calves", "panturrilhas"], ""));
  form.elements.notes.value = pick(record, ["notes", "observations"], "");
  form.querySelector("button[type='submit']").textContent = "Atualizar medidas";
  switchTrainerTab("measurements");
}

/**
 * Preenche formulario de treino para edicao.
 */
function editWorkout(id) {
  const record = state.workouts.find((item) => String(item.id) === String(id));
  const form = document.querySelector("#new-workout-form");
  if (!record || !form) return;

  form.dataset.editId = id;
  form.elements.name.value = pick(record, ["name", "title", "nome"], "");
  form.elements.goal.value = pick(record, ["goal", "description"], "");
  form.elements.notes.value = pick(record, ["notes"], "");
  form.querySelector("button[type='submit']").textContent = "Atualizar treino";
  state.selectedWorkoutId = id;
  renderTrainerWorkoutSelect(getStudentWorkouts(state.selectedStudentId));
  switchTrainerTab("workouts");
}

/**
 * Preenche formulario de exercicio do treino para edicao.
 */
function editWorkoutExercise(id) {
  const record = state.workoutExercises.find((item) => String(item.id) === String(id));
  if (!record) return;

  state.selectedWorkoutId = record.workout_id;
  el.trainerWorkoutSelect.value = record.workout_id;
  const exerciseByName = state.exercises.find((exercise) => pick(exercise, ["name", "title", "nome"], "") === pick(record, ["exercise_name"], ""));
  el.trainerExerciseSelect.value = record.exercise_id || exerciseByName?.id || "";
  el.setsInput.value = normalizeNumberInput(pick(record, ["sets"], ""));
  el.repsInput.value = pick(record, ["reps"], "");
  el.loadInput.value = pick(record, ["weight"], "");
  el.restInput.value = normalizeNumberInput(pick(record, ["rest_seconds"], ""));
  el.exerciseNotesInput.value = pick(record, ["instructions"], "");
  el.addExerciseButton.dataset.editId = id;
  el.addExerciseButton.textContent = "Atualizar exercicio";
  switchTrainerTab("workouts");
}

/**
 * Executa a acao clicada nas listas do treinador.
 */
function handleTrainerListAction(event) {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;

  if (action === "edit-assessment") editAssessment(id);
  if (action === "delete-assessment") deleteAssessment(id);
  if (action === "edit-measurement") editMeasurement(id);
  if (action === "delete-measurement") deleteBodyMeasurement(id);
  if (action === "edit-workout") editWorkout(id);
  if (action === "delete-workout") deleteWorkout(id);
  if (action === "edit-workout-exercise") editWorkoutExercise(id);
  if (action === "delete-workout-exercise") deleteWorkoutExercise(id);
}

/**
 * Renderiza o historico comparativo do aluno.
 */
function renderTrainerHistory() {
  const workouts = getStudentWorkouts(state.selectedStudentId);
  const logs = state.workoutLogs.filter((log) => String(log.student_id) === String(state.selectedStudentId));
  const firstAssessment = state.trainerAssessmentsCache.at(-1);
  const latestAssessment = state.trainerAssessmentsCache[0];
  const firstMeasurement = state.trainerMeasurementsCache.at(-1);
  const latestMeasurement = state.trainerMeasurementsCache[0];

  const blocks = [
    renderHistoryBlock("Inicio", [
      `Peso inicial: ${formatNumber(pick(firstAssessment, ["weight", "weight_kg", "peso"], "-"))} kg`,
      `Cintura inicial: ${formatNumber(pick(firstMeasurement, ["waist", "waist_cm", "cintura"], "-"))} cm`,
      `Primeiro treino: ${escapeHtml(pick(workouts.at(-1), ["title", "name", "nome"], "-"))}`
    ]),
    renderHistoryBlock("Agora", [
      `Peso atual: ${formatNumber(pick(latestAssessment, ["weight", "weight_kg", "peso"], "-"))} kg`,
      `Cintura atual: ${formatNumber(pick(latestMeasurement, ["waist", "waist_cm", "cintura"], "-"))} cm`,
      `Treino atual: ${escapeHtml(pick(workouts[0], ["title", "name", "nome"], "-"))}`
    ]),
    renderHistoryBlock("Treinos concluidos", logs.length
      ? logs.slice(0, 8).map((log) => `${formatDate(pick(log, ["completed_at", "created_at"]))} - ${escapeHtml(pick(state.workouts.find((workout) => String(workout.id) === String(log.workout_id)), ["title", "name", "nome"], "Treino"))}`)
      : ["Nenhum treino concluido ainda."]),
    renderHistoryBlock("Evolucao de exercicios", renderExerciseEvolution(workouts))
  ];

  el.trainerHistory.innerHTML = blocks.join("");
}

/**
 * Monta um bloco compacto do historico.
 */
function renderHistoryBlock(title, lines) {
  return `
    <article class="simple-item stacked history-block">
      <strong>${escapeHtml(title)}</strong>
      ${lines.map((line) => `<span>${line}</span>`).join("")}
    </article>
  `;
}

/**
 * Lista a evolucao de carga, series e repeticoes por treino.
 */
function renderExerciseEvolution(workouts) {
  const lines = [];
  workouts.forEach((workout) => {
    getWorkoutExercises(workout.id).forEach((item) => {
      const exercise = state.exercises.find((record) => String(record.id) === String(item.exercise_id));
      const exerciseName = pick(item, ["exercise_name"], pick(exercise, ["name", "title", "nome"], "Exercicio"));
      lines.push(`${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino"))}: ${escapeHtml(exerciseName)} - ${formatNumber(pick(item, ["sets"], "-"))}x${escapeHtml(pick(item, ["reps"], "-"))} - ${escapeHtml(pick(item, ["weight"], "-"))}`);
    });
  });
  return lines.length ? lines.slice(0, 12) : ["Nenhum exercicio cadastrado nos treinos."];
}

/**
 * Renderiza um item do diagnostico.
 */
function renderDiagnostic(label, value) {
  return `
    <article class="mini-card">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

/**
 * Alterna a area visivel do sistema.
 */
function changeScreen(screenName) {
  if (!canAccessScreen(screenName)) {
    showToast("Acesso visual indisponível para este perfil.", "error");
    return;
  }

  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === `screen-${screenName}`);
  });

  document.querySelectorAll(".menu-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screenName);
  });

  const labels = {
    access: "Como deseja acessar?",
    "student-area": "Área Aluno",
    "trainer-area": "Área Treinador",
    "admin-area": "Controle do Sistema"
  };
  el.pageTitle.textContent = labels[screenName] || "GymPulse";

  if (screenName === "trainer-area") {
    loadSupabaseData();
  }
}

/**
 * Define o papel visual escolhido na tela inicial.
 */
function setAccessRole(role) {
  if (role === "trainer" && !validateTemporaryPassword(TRAINER_TEMP_PASSWORD, "Senha do Treinador")) {
    return;
  }

  if (role === "admin" && !validateTemporaryPassword(ADMIN_TEMP_PASSWORD, "Senha TI/Admin")) {
    return;
  }

  state.accessRole = role;
  el.sidebar.classList.remove("hidden");
  document.body.dataset.role = role;

  if (role === "admin") {
    state.adminUnlocked = true;
    el.adminLock.classList.add("hidden");
    el.adminPanel.classList.remove("hidden");
    hydrateAdminConfigForm();
  }

  if (role === "student") {
    changeScreen("student-area");
    return;
  }

  if (role === "trainer") {
    changeScreen("trainer-area");
    return;
  }

  changeScreen("admin-area");
}

/**
 * Solicita senha temporária antes de abrir áreas restritas.
 */
function validateTemporaryPassword(expectedPassword, label) {
  const password = window.prompt(label);

  if (password !== expectedPassword) {
    showToast("Senha incorreta.", "error");
    return false;
  }

  return true;
}

/**
 * Garante que cada perfil veja apenas sua propria area.
 */
function canAccessScreen(screenName) {
  if (screenName === "access") return true;
  if (state.accessRole === "student") return screenName === "student-area";
  if (state.accessRole === "trainer") return screenName === "trainer-area";
  if (state.accessRole === "admin") return screenName === "admin-area";
  return false;
}

/**
 * Registra eventos de interface.
 */
function bindEvents() {
  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.screen === "access") {
        state.accessRole = "";
        document.body.dataset.role = "";
        el.sidebar.classList.add("hidden");
      }
      changeScreen(button.dataset.screen);
    });
  });

  document.querySelectorAll("[data-access-role]").forEach((button) => {
    button.addEventListener("click", () => setAccessRole(button.dataset.accessRole));
  });

  el.studentAreaSelect.addEventListener("change", (event) => {
    state.studentAreaId = event.target.value;
    renderStudentArea();
  });

  el.completeWorkoutButton.addEventListener("click", completeCurrentWorkout);

  el.studentSearch.addEventListener("input", (event) => {
    state.studentSearch = event.target.value;
    renderTrainerStudents();
  });

  el.exerciseSearch.addEventListener("input", (event) => {
    state.exerciseSearch = event.target.value;
    renderExerciseLibrary();
  });

  el.exerciseGroupFilter.addEventListener("change", (event) => {
    state.exerciseGroupFilter = event.target.value;
    renderExerciseLibrary();
  });

  el.trainerTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trainer-tab]");
    if (!button) return;
    switchTrainerTab(button.dataset.trainerTab);
  });

  el.trainerStudentsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-student-id]");
    if (!button) return;
    state.selectedStudentId = button.dataset.studentId;
    renderTrainerStudents();
    renderTrainerProfile();
  });

  document.querySelector("#reload-trainer-data").addEventListener("click", loadSupabaseData);
  document.querySelector("#new-student-form").addEventListener("submit", (event) => {
    event.preventDefault();
    createStudent(event.currentTarget);
  });
  document.querySelector("#edit-student-form").addEventListener("submit", (event) => {
    event.preventDefault();
    updateStudentProfile(event.currentTarget);
  });
  el.deleteStudentButton.addEventListener("click", () => deleteStudent());
  document.querySelector("#new-workout-form").addEventListener("submit", (event) => {
    event.preventDefault();
    createWorkout(event.currentTarget);
  });
  document.querySelector("#new-assessment-form").addEventListener("submit", (event) => {
    event.preventDefault();
    createAssessment(event.currentTarget);
  });
  document.querySelector("#new-measurement-form").addEventListener("submit", (event) => {
    event.preventDefault();
    createMeasurement(event.currentTarget);
  });
  document.querySelector("#add-exercise-to-workout").addEventListener("click", addExerciseToWorkout);

  el.trainerAssessments.addEventListener("click", handleTrainerListAction);
  el.trainerMeasurements.addEventListener("click", handleTrainerListAction);
  el.trainerWorkouts.addEventListener("click", handleTrainerListAction);

  document.querySelector("#admin-login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    unlockAdminArea(document.querySelector("#admin-password").value);
  });

  document.querySelector("#supabase-config-form").addEventListener("submit", (event) => {
    event.preventDefault();
    saveAdminSupabaseConfig(event.currentTarget);
  });

  document.querySelector("#test-connection-button").addEventListener("click", testConnection);
  document.querySelector("#admin-reload-data").addEventListener("click", loadSupabaseData);
  document.querySelector("#seed-exercise-library").addEventListener("click", seedExerciseLibrary);
}

/**
 * Inicializa o app sem login publico.
 */
function init() {
  bindEvents();
  hydrateAdminConfigForm();
  loadSupabaseData();
}

init();
