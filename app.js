// Senhas temporárias apenas para o MVP. Futuramente substituir por autenticação real com Supabase Auth.
const TRAINER_TEMP_PASSWORD = "123ac";
const ADMIN_TEMP_PASSWORD = "ac741";
const EXECUTION_DRAFT_PREFIX = "gympulse_execution_draft";
const PENDING_WORKOUT_LOGS_KEY = "gympulse_pending_workout_logs";
const APP_PUBLIC_URL = "https://ananunes1807-cell.github.io/app-treino-supabase/";
const REQUIRED_TABLES = [
  "app_profiles",
  "profiles",
  "student_invites",
  "trainer_students",
  "students",
  "assessments",
  "body_measurements",
  "exercise_library",
  "workouts",
  "workout_exercises",
  "workout_logs"
];
const EXPECTED_RLS_POLICIES = [
  ["app_profiles", "SELECT authenticated", "app_profiles_read_own_or_admin"],
  ["app_profiles", "ALL admin", "app_profiles_admin_write"],
  ["students", "SELECT anon", "mvp_anon_select_students"],
  ["students", "INSERT anon", "mvp_anon_insert_students"],
  ["students", "UPDATE anon", "mvp_anon_update_students"],
  ["students", "DELETE anon", "mvp_anon_all_students ou mvp_anon_delete_students"],
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
  ["exercise_library", "DELETE anon", "mvp_anon_all_exercise_library"],
  ["workouts", "SELECT anon", "mvp_anon_select_workouts"],
  ["workouts", "INSERT anon", "mvp_anon_insert_workouts"],
  ["workouts", "UPDATE anon", "mvp_anon_update_workouts"],
  ["workouts", "DELETE anon", "mvp_anon_delete_workouts"],
  ["workout_exercises", "SELECT anon", "mvp_anon_select_workout_exercises"],
  ["workout_exercises", "INSERT anon", "mvp_anon_insert_workout_exercises"],
  ["workout_exercises", "UPDATE anon", "mvp_anon_update_workout_exercises"],
  ["workout_exercises", "DELETE anon", "mvp_anon_delete_workout_exercises"],
  ["workout_logs", "SELECT anon", "mvp_anon_select_workout_logs"],
  ["workout_logs", "INSERT anon", "mvp_anon_insert_workout_logs"],
  ["workout_logs", "DELETE anon", "mvp_anon_all_workout_logs"]
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
const DELETE_CONFIRMATION = "Tem certeza que deseja excluir? Esta acao nao podera ser desfeita.";

const state = {
  authUser: null,
  authProfile: null,
  selectedAdminStudentId: "",
  preferredLoginRole: "student",
  passwordRecoveryMode: false,
  inviteToken: "",
  pendingInvite: null,
  students: [],
  exercises: [],
  workouts: [],
  workoutExercises: [],
  workoutLogs: [],
  selectedStudentId: "",
  selectedWorkoutId: "",
  trainerActiveTab: "profile",
  trainerWorkoutFilter: "active",
  trainerAssessmentsCache: [],
  trainerMeasurementsCache: [],
  studentAreaId: "",
  studentExerciseExecution: {},
  studentExerciseIndex: 0,
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
  trainerWorkoutFilter: document.querySelector("#trainer-workout-filter"),
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
  adminRlsPolicies: document.querySelector("#admin-rls-policies"),
  adminMaintenanceLog: document.querySelector("#admin-maintenance-log"),
  authLoginForm: document.querySelector("#auth-login-form"),
  authRegisterForm: document.querySelector("#auth-register-form"),
  authModeTabs: document.querySelector(".auth-mode-tabs"),
  registerStatus: document.querySelector("#register-status"),
  forgotPasswordButton: document.querySelector("#forgot-password-button"),
  authEmail: document.querySelector("#auth-email"),
  authPassword: document.querySelector("#auth-password"),
  authLogoutButton: document.querySelector("#auth-logout-button"),
  bootstrapAdminButton: document.querySelector("#bootstrap-admin-button"),
  authStatus: document.querySelector("#auth-status"),
  loginRolePicker: document.querySelector("#login-role-picker"),
  loginHelperTitle: document.querySelector("#login-helper-title"),
  loginHelperDescription: document.querySelector("#login-helper-description"),
  firstAccessForm: document.querySelector("#first-access-form"),
  passwordFlowSubtitle: document.querySelector("#password-flow-subtitle"),
  passwordFlowTitle: document.querySelector("#password-flow-title"),
  passwordFlowDescription: document.querySelector("#password-flow-description"),
  studentAccessResult: document.querySelector("#student-access-result")
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
 * Le JSON do localStorage com fallback seguro.
 */
function readLocalJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.error("[GymPulse] Erro ao ler localStorage:", error);
    return fallback;
  }
}

/**
 * Salva JSON no localStorage para preservar execucoes offline.
 */
function writeLocalJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error("[GymPulse] Erro ao salvar localStorage:", error);
  }
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

  const accessibleStudents = getAccessibleStudents();
  if (isStudent() && state.authProfile?.student_id) state.studentAreaId = state.authProfile.student_id;
  if (!state.studentAreaId && accessibleStudents[0]) state.studentAreaId = accessibleStudents[0].id;
  if (!accessibleStudents.some((student) => String(student.id) === String(state.studentAreaId))) {
    state.studentAreaId = accessibleStudents[0]?.id || "";
  }
  if (!state.selectedStudentId && accessibleStudents[0]) state.selectedStudentId = accessibleStudents[0].id;
  if (!canManageStudent(state.selectedStudentId)) {
    state.selectedStudentId = accessibleStudents[0]?.id || "";
  }
  loadCurrentExecutionDraft();

  const hasBlockingError = Boolean(state.tableErrors.students || state.tableErrors.exercise_library);
  setConnectionStatus(hasBlockingError ? "Conexao parcial" : "Supabase conectado", !hasBlockingError);
  if (!hasBlockingError) {
    syncPendingWorkoutLogs();
  }
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
  const students = getAccessibleStudents();
  el.studentAreaSelect.innerHTML = `<option value="">Selecione um aluno</option>${students.map(renderStudentOption).join("")}`;
  el.studentAreaSelect.value = state.studentAreaId;
  el.studentAreaSelect.disabled = isStudent() && Boolean(state.authProfile?.student_id);
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
    const status = normalizeWorkoutStatus(pick(workout, ["status"], "ativo"));
    return String(workout.student_id) === String(studentId) && status === "ativo";
  });
}

/**
 * Renderiza um treino com seus exercícios cadastrados.
 */
function renderWorkoutWithExercises(workout) {
  const exercises = state.workoutExercises.filter((item) => String(item.workout_id) === String(workout.id));
  const safeIndex = Math.min(Math.max(state.studentExerciseIndex, 0), Math.max(exercises.length - 1, 0));
  state.studentExerciseIndex = safeIndex;
  const currentExercise = exercises[safeIndex];

  return `
    <article class="list-item workout-highlight student-workout-start">
      <div>
        <small>Treino do dia</small>
        <strong>${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino sem nome"))}</strong>
        <span>${escapeHtml(pick(workout, ["goal", "description", "notes"], "Objetivo não informado"))}</span>
      </div>
    </article>
    ${exercises.length ? renderStudentExerciseStep(currentExercise, safeIndex, exercises.length) : emptyMessage("Este treino ainda não possui exercícios.")}
  `;
}

/**
 * Renderiza um exercício vinculado a um treino.
 */
function renderStudentExerciseStep(exercise, index, total) {
  return `
    <div class="student-exercise-progress">
      <strong>Exercicio ${index + 1} de ${total}</strong>
      <span>Faca na ordem que preferir. Os dados ficam salvos no aparelho.</span>
    </div>
    ${renderWorkoutExerciseItem(exercise)}
    <div class="student-exercise-nav">
      <button class="secondary-button" type="button" data-student-exercise-nav="prev" ${index === 0 ? "disabled" : ""}>Anterior</button>
      <button class="primary-button" type="button" data-student-exercise-nav="next" ${index >= total - 1 ? "disabled" : ""}>Proximo exercicio</button>
    </div>
  `;
}

function getExecutionDraftKey(workoutId = getCurrentWorkout(state.studentAreaId)?.id) {
  return workoutId && state.studentAreaId
    ? `${EXECUTION_DRAFT_PREFIX}:${state.studentAreaId}:${workoutId}`
    : "";
}

function loadCurrentExecutionDraft() {
  const key = getExecutionDraftKey();
  state.studentExerciseExecution = key ? readLocalJson(key, {}) : {};
}

function saveCurrentExecutionDraft() {
  const key = getExecutionDraftKey();
  if (!key) return;
  writeLocalJson(key, state.studentExerciseExecution);
}

function getStudentExerciseExecution(exerciseId) {
  const key = String(exerciseId);
  if (!(key in state.studentExerciseExecution)) {
    state.studentExerciseExecution[key] = {
      completed: true,
      skipped: false,
      actual_weight: "",
      actual_reps: "",
      actual_sets: "",
      pain_level: "",
      difficulty: "",
      notes: ""
    };
  }

  return state.studentExerciseExecution[key];
}

function serializeExerciseExecution(exerciseId) {
  const execution = getStudentExerciseExecution(exerciseId);
  return {
    completed: Boolean(execution.completed),
    skipped: Boolean(execution.skipped),
    actual_weight: execution.actual_weight || null,
    actual_reps: execution.actual_reps || null,
    actual_sets: execution.actual_sets || null,
    pain_level: execution.pain_level === "" ? null : numberOrNull(execution.pain_level),
    difficulty: execution.difficulty || null,
    notes: execution.notes || null
  };
}

function renderWorkoutExerciseItem(item) {
  const exercise = state.exercises.find((record) => String(record.id) === String(item.exercise_id));
  const exerciseName = pick(item, ["exercise_name"], pick(exercise, ["name", "title", "nome"], "Exercicio"));
  const execution = getStudentExerciseExecution(item.id);
  const fastDone = execution.completed && !execution.skipped ? "active" : "";
  const fastSkipped = execution.skipped ? "active" : "";
  const fastPain = execution.pain_level !== "" ? "active" : "";

  return `
    <article class="simple-item workout-execution-item">
      <div class="exercise-execution-main">
        <small>Exercicio atual</small>
        <strong>${escapeHtml(exerciseName)}</strong>
      <span>Planejado: Series: ${escapeHtml(pick(item, ["sets"], "-"))} | Reps: ${escapeHtml(pick(item, ["reps"], "-"))} | Carga: ${escapeHtml(pick(item, ["weight"], "-"))} | Descanso: ${escapeHtml(pick(item, ["rest_seconds"], "-"))}s</span>
        <div class="quick-actions">
          <button class="quick-button ${fastDone}" type="button" data-workout-exercise-quick="done" data-workout-exercise-id="${escapeHtml(item.id)}">Feito</button>
          <button class="quick-button" type="button" data-workout-exercise-quick="less" data-workout-exercise-id="${escapeHtml(item.id)}">Fiz menos</button>
          <button class="quick-button ${fastSkipped}" type="button" data-workout-exercise-quick="skip" data-workout-exercise-id="${escapeHtml(item.id)}">Pulei</button>
          <button class="quick-button ${fastPain}" type="button" data-workout-exercise-quick="pain" data-workout-exercise-id="${escapeHtml(item.id)}">Senti dor</button>
        </div>
        <div class="exercise-execution-grid">
          <label>Carga usada<input data-workout-exercise-field="actual_weight" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.actual_weight)}" /></label>
          <label>Reps feitas<input data-workout-exercise-field="actual_reps" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.actual_reps)}" /></label>
          <label>Series feitas<input data-workout-exercise-field="actual_sets" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.actual_sets)}" /></label>
          <label>Dor 0-10<input data-workout-exercise-field="pain_level" data-workout-exercise-id="${escapeHtml(item.id)}" type="number" min="0" max="10" value="${escapeHtml(execution.pain_level)}" /></label>
          <label>Dificuldade<input data-workout-exercise-field="difficulty" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.difficulty)}" /></label>
          <label>Observacao<input data-workout-exercise-field="notes" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.notes)}" /></label>
        </div>
      </div>
      <label class="exercise-complete-toggle">
        <input type="checkbox" data-workout-exercise-field="completed" data-workout-exercise-id="${escapeHtml(item.id)}" ${execution.completed ? "checked" : ""} />
        Feito
      </label>
      <label class="exercise-complete-toggle">
        <input type="checkbox" data-workout-exercise-field="skipped" data-workout-exercise-id="${escapeHtml(item.id)}" ${execution.skipped ? "checked" : ""} />
        Pulado
      </label>
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
  const completed = "completed" in exercise ? Boolean(exercise.completed) : true;
  const skipped = Boolean(exercise.skipped);
  return `
    <div class="exercise-history-card">
      <strong>${index + 1}. ${escapeHtml(pick(exercise, ["exercise_name"], "Exercicio"))}</strong>
      <span>Planejado: Series: ${escapeHtml(formatNumber(pick(exercise, ["planned_sets", "sets"], "-")))} | Reps: ${escapeHtml(pick(exercise, ["planned_reps", "reps"], "-"))} | Carga: ${escapeHtml(pick(exercise, ["planned_weight", "weight"], "-"))} | Descanso: ${escapeHtml(formatNumber(pick(exercise, ["planned_rest_seconds", "rest_seconds"], "-")))}s</span>
      <span>Realizado: Series: ${escapeHtml(pick(exercise, ["actual_sets"], "-"))} | Reps: ${escapeHtml(pick(exercise, ["actual_reps"], "-"))} | Carga: ${escapeHtml(pick(exercise, ["actual_weight"], "-"))}</span>
      <span>Feito: ${completed ? "Sim" : "Nao"}</span>
      <span>Pulado: ${skipped ? "Sim" : "Nao"}</span>
      ${pick(exercise, ["pain_level"], "") !== "" ? `<span>Dor: ${escapeHtml(pick(exercise, ["pain_level"], ""))}/10</span>` : ""}
      ${pick(exercise, ["difficulty"], "") ? `<span>Dificuldade: ${escapeHtml(pick(exercise, ["difficulty"], ""))}</span>` : ""}
      ${pick(exercise, ["notes"], "") ? `<span>Obs: ${escapeHtml(pick(exercise, ["notes"], ""))}</span>` : ""}
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
  const students = getAccessibleStudents().filter((student) => {
    const name = pick(student, ["name", "full_name", "nome"], "").toLowerCase();
    const email = pick(student, ["email"], "").toLowerCase();
    const objective = pick(student, ["objective"], "").toLowerCase();
    return !search || name.includes(search) || email.includes(search) || objective.includes(search);
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
    const allWorkouts = getStudentWorkouts(state.selectedStudentId);
    const workouts = getFilteredTrainerWorkouts(allWorkouts);

    el.trainerAssessments.innerHTML = assessments.length
      ? assessments.map(renderAssessmentItem).join("")
      : emptyMessage("Nenhuma avaliação encontrada.");
    el.trainerMeasurements.innerHTML = measurements.length
      ? measurements.map(renderMeasurementItem).join("")
      : emptyMessage("Nenhuma medida corporal encontrada.");
    el.trainerWorkouts.innerHTML = workouts.length
      ? workouts.map(renderWorkoutItem).join("")
      : emptyMessage("Nenhum treino criado para este aluno.");
    renderTrainerWorkoutFilter();
    renderTrainerWorkoutSelect(allWorkouts.filter((workout) => {
      const status = normalizeWorkoutStatus(pick(workout, ["status"], "ativo"));
      return status !== "arquivado" && status !== "excluido";
    }));
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

function normalizeWorkoutStatus(status) {
  const value = normalizeText(status || "ativo");
  if (value === "active") return "ativo";
  if (value === "archived") return "arquivado";
  if (value === "draft") return "rascunho";
  if (value === "deleted") return "excluido";
  if (value === "not_done") return "rascunho";
  if (value === "incomplete") return "rascunho";
  return value || "ativo";
}

function isWorkoutVisibleToStudent(workout) {
  return normalizeWorkoutStatus(pick(workout, ["status"], "ativo")) === "ativo";
}

function getFilteredTrainerWorkouts(workouts) {
  if (state.trainerWorkoutFilter === "archived") {
    return workouts.filter((workout) => normalizeWorkoutStatus(pick(workout, ["status"], "ativo")) === "arquivado");
  }

  if (state.trainerWorkoutFilter === "active") {
    return workouts.filter((workout) => isWorkoutVisibleToStudent(workout));
  }

  return workouts.filter((workout) => normalizeWorkoutStatus(pick(workout, ["status"], "ativo")) !== "excluido");
}

function renderTrainerWorkoutFilter() {
  if (!el.trainerWorkoutFilter) return;
  el.trainerWorkoutFilter.querySelectorAll("[data-workout-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.workoutFilter === state.trainerWorkoutFilter);
  });
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
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const responsibleProfileId = (isTrainer() || isAdmin()) ? (state.authProfile?.id || null) : null;
  const fullPayload = {
    name: formData.get("name"),
    email,
    phone: formData.get("phone") || null,
    telefone: formData.get("phone") || null,
    birth_date: formData.get("birth_date") || null,
    height_cm: numberOrNull(formData.get("height_cm")),
    objective: formData.get("objective") || null,
    difficulties: formData.get("difficulties") || null,
    restrictions: formData.get("restrictions") || null,
    notes: formData.get("notes") || null,
    status: "ativo",
    status_usuario: "pendente_convite",
    primeiro_acesso_obrigatorio: false,
    senha_temporaria: false,
    personal_id: responsibleProfileId,
    trainer_id: responsibleProfileId || state.authUser?.id || null,
    created_by: state.authUser?.id || null
  };

  try {
    const created = await insertStudentWithFallback(fullPayload);
    const createdStudent = created[0];
    state.selectedStudentId = createdStudent?.id || state.selectedStudentId;
    const accessResult = await createStudentInvite(createdStudent, email);
    form.reset();
    showToast("Aluno adicionado com sucesso.");
    renderStudentAccessResult(email, accessResult);
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function generateInviteToken() {
  const random = crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return random.replaceAll("-", "");
}

function buildInviteLink(token) {
  return `${APP_PUBLIC_URL}?invite=${encodeURIComponent(token)}`;
}

async function createStudentInvite(student, email) {
  if (!student?.id || !email) {
    return { ok: false, message: "Aluno salvo, mas e-mail nao informado para criar convite." };
  }

  try {
    const token = generateInviteToken();
    const trainerId = state.authProfile?.id || null;
    const invitePayload = {
      student_id: student.id,
      name: pick(student, ["name"], ""),
      email,
      trainer_id: trainerId,
      token,
      status: "pendente",
      created_by: state.authUser?.id || null
    };

    await insertWithSchemaFallback("student_invites", invitePayload, "Erro ao criar convite do aluno");

    return {
      ok: true,
      inviteLink: buildInviteLink(token),
      message: "Convite criado. Envie o link para o aluno finalizar o cadastro."
    };
  } catch (error) {
    console.warn("[GymPulse] Aluno salvo, mas convite nao foi criado.", error);
    return { ok: false, message: `Aluno salvo. Convite nao criado: ${error.message}` };
  }
}

function renderStudentAccessResult(email, result) {
  if (!el.studentAccessResult) return;
  el.studentAccessResult.classList.remove("hidden");
  const link = result.inviteLink || "";
  el.studentAccessResult.innerHTML = `
    <strong>Convite do aluno</strong>
    <span>E-mail: ${escapeHtml(email || "Nao informado")}</span>
    ${link ? `<span>Link: <b>${escapeHtml(link)}</b></span>` : ""}
    <small>${escapeHtml(result.message)}</small>
  `;
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

function normalizeRole(role) {
  const value = normalizeText(role || "");
  if (["admin", "admin_ti", "ti", "controle"].includes(value)) return "admin";
  if (["owner", "gestor", "gestor_academia"].includes(value)) return "owner";
  if (["personal", "trainer", "treinador"].includes(value)) return "trainer";
  if (["student", "aluno"].includes(value)) return "student";
  return "";
}

function toDatabaseRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "admin_ti";
  if (normalized === "owner") return "gestor_academia";
  if (normalized === "trainer") return "personal";
  return "aluno";
}

function getDefaultRoleForEmail(email, requestedRole = "aluno") {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (normalizedEmail === "ananunes1807@gmail.com") return "admin_ti";
  return toDatabaseRole(requestedRole);
}

function getCurrentRole() {
  return normalizeRole(state.authProfile?.role) || normalizeRole(state.accessRole);
}

function isAdmin() {
  return getCurrentRole() === "admin";
}

function isOwner() {
  return getCurrentRole() === "owner";
}

function isTrainer() {
  return getCurrentRole() === "trainer";
}

function isStudent() {
  return getCurrentRole() === "student";
}

function getProfileOwnerIds() {
  return [
    state.authProfile?.id,
    state.authProfile?.user_id,
    state.authProfile?.trainer_id,
    state.authUser?.id
  ].filter(Boolean).map(String);
}

function getEntityStatus(record) {
  return normalizeWorkoutStatus(pick(record, ["status"], "ativo"));
}

function isDeletedRecord(record) {
  return getEntityStatus(record) === "excluido";
}

function getAccessibleStudents() {
  const visibleStudents = isAdmin() || isOwner()
    ? state.students
    : state.students.filter((student) => !isDeletedRecord(student));

  if (isStudent()) {
    const studentId = state.authProfile?.student_id || state.studentAreaId;
    return visibleStudents.filter((student) => String(student.id) === String(studentId));
  }

  if (isTrainer()) {
    const ownerIds = getProfileOwnerIds();
    const hasOwnershipColumns = state.students.some((student) => (
      pick(student, ["personal_id", "trainer_id", "owner_id", "created_by"], "") !== ""
    ));

    if (!hasOwnershipColumns) return visibleStudents;

    return visibleStudents.filter((student) => ownerIds.includes(String(pick(student, ["personal_id", "trainer_id", "owner_id", "created_by"], ""))));
  }

  return visibleStudents;
}

function canManageStudent(studentId) {
  if (isAdmin()) return true;
  if (isOwner()) return false;
  return getAccessibleStudents().some((student) => String(student.id) === String(studentId));
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
    status: "ativo"
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
      if (["app_profiles", "profiles", "student_invites", "trainer_students", "students", "assessments", "body_measurements", "workouts", "workout_exercises"].includes(tableName)) {
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

async function insertWorkoutLog(payload) {
  return runQuery(
    supabaseClient
      .from("workout_logs")
      .insert(payload)
      .select(),
    "Erro ao marcar treino como concluido"
  );
}

function enqueuePendingWorkoutLog(payload) {
  const pending = readLocalJson(PENDING_WORKOUT_LOGS_KEY, []);
  pending.push({ ...payload, pending_id: crypto.randomUUID?.() || String(Date.now()) });
  writeLocalJson(PENDING_WORKOUT_LOGS_KEY, pending);
}

async function syncPendingWorkoutLogs() {
  const pending = readLocalJson(PENDING_WORKOUT_LOGS_KEY, []);
  if (!pending.length) return;

  const failed = [];
  for (const item of pending) {
    const { pending_id: _pendingId, ...payload } = item;
    try {
      await insertWorkoutLog(payload);
    } catch (error) {
      console.error("[GymPulse] Erro ao sincronizar log pendente:", error);
      failed.push(item);
    }
  }

  writeLocalJson(PENDING_WORKOUT_LOGS_KEY, failed);
  if (failed.length < pending.length) {
    showToast("Treinos pendentes sincronizados.");
  }
}

/**
 * Monta o snapshot completo da execucao atual.
 */
function buildWorkoutExecutionSnapshot(workoutId, exercisesSource = state.workoutExercises) {
  return exercisesSource
    .filter((exercise) => String(exercise.workout_id) === String(workoutId))
    .map((exercise) => ({
      exercise_name: pick(exercise, ["exercise_name"], "Exercicio"),
      sets: numberOrNull(pick(exercise, ["sets"], "")),
      reps: pick(exercise, ["reps"], null),
      weight: pick(exercise, ["weight"], null),
      rest_seconds: numberOrNull(pick(exercise, ["rest_seconds"], "")),
      planned_sets: numberOrNull(pick(exercise, ["sets"], "")),
      planned_reps: pick(exercise, ["reps"], null),
      planned_weight: pick(exercise, ["weight"], null),
      planned_rest_seconds: numberOrNull(pick(exercise, ["rest_seconds"], "")),
      ...serializeExerciseExecution(exercise.id)
    }));
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
    const exercisesSnapshot = buildWorkoutExecutionSnapshot(workout.id, workoutExercises);
    console.log("[GymPulse] workout_logs exercises_snapshot:", exercisesSnapshot);

    await insertWorkoutLog({
      workout_id: workout.id,
      student_id: state.studentAreaId,
      completed_at: new Date().toISOString(),
      exercises_snapshot: exercisesSnapshot
    });
    localStorage.removeItem(getExecutionDraftKey(workout.id));
    state.studentExerciseExecution = {};
    showToast("Treino marcado como concluído.");
    await loadSupabaseData();
  } catch (error) {
    const isNetworkError = !navigator.onLine || String(error.message).toLowerCase().includes("failed to fetch");
    if (isNetworkError) {
      const fallbackExercises = buildWorkoutExecutionSnapshot(workout.id);

      enqueuePendingWorkoutLog({
        workout_id: workout.id,
        student_id: state.studentAreaId,
        completed_at: new Date().toISOString(),
        exercises_snapshot: fallbackExercises
      });
      showToast("Sem conexao. Treino salvo como pendente de sincronizacao.", "error");
      return;
    }

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
    app_profiles: state.authProfile ? "perfil autenticado carregado" : 0,
    students: state.students.length,
    exercise_library: state.exercises.length,
    workouts: state.workouts.length,
    workout_exercises: state.workoutExercises.length,
    workout_logs: state.workoutLogs.length
  };

  if (tableName === "assessments" || tableName === "body_measurements") {
    return state.tableErrors[tableName] || "Consultada por aluno no perfil";
  }

  const value = map[tableName] ?? 0;
  return state.tableErrors[tableName] || (typeof value === "number" ? `${value} registros carregados` : value);
}

/**
 * Renderiza aluno dentro do painel admin.
 */
function renderAdminStudentItem(student) {
  const status = getEntityStatus(student);
  const selected = String(student.id) === String(state.selectedAdminStudentId) ? " active" : "";
  const archiveAction = status === "arquivado"
    ? `<button class="tiny-button" type="button" data-admin-student-action="restore" data-student-id="${escapeHtml(student.id)}">Restaurar</button>`
    : `<button class="tiny-button" type="button" data-admin-student-action="archive" data-student-id="${escapeHtml(student.id)}">Arquivar</button>`;

  return `
    <article class="simple-item stacked admin-student-item${selected}">
      <strong>${escapeHtml(pick(student, ["name", "full_name", "nome"], "Aluno"))}</strong>
      <span>${escapeHtml(pick(student, ["objective", "email"], "Sem objetivo informado"))}</span>
      <small>Status: ${escapeHtml(formatWorkoutStatus(status))}</small>
      <div class="record-actions">
        <button class="tiny-button" type="button" data-admin-student-action="select" data-student-id="${escapeHtml(student.id)}">Ver registros</button>
        <button class="tiny-button" type="button" data-admin-student-action="edit" data-student-id="${escapeHtml(student.id)}">Editar</button>
        <button class="tiny-button" type="button" data-admin-student-action="clear-logs" data-student-id="${escapeHtml(student.id)}">Excluir sessoes</button>
        <button class="tiny-button" type="button" data-admin-student-action="clear-workouts" data-student-id="${escapeHtml(student.id)}">Excluir treinos</button>
        <button class="tiny-button" type="button" data-admin-student-action="reset" data-student-id="${escapeHtml(student.id)}">Resetar perfil</button>
        ${archiveAction}
        <button class="tiny-button danger" type="button" data-admin-student-action="delete" data-student-id="${escapeHtml(student.id)}">Excluir</button>
      </div>
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
function renderAdminMaintenanceLog(message) {
  if (!el.adminMaintenanceLog) return;
  el.adminMaintenanceLog.innerHTML = `
    <article class="simple-item stacked">
      <strong>Resultado</strong>
      <span>${escapeHtml(message)}</span>
    </article>
  `;
}

function getSelectedAdminStudentId() {
  return state.selectedAdminStudentId || state.selectedStudentId || state.students[0]?.id || "";
}

async function updateStudentStatus(id, status) {
  if (!id) throw new Error("Selecione um aluno antes de alterar status.");
  try {
    await updateWithSchemaFallback("students", id, { status }, "Erro ao atualizar status do aluno");
  } catch (error) {
    const rpcByStatus = {
      excluido: "admin_soft_delete_student",
      arquivado: "admin_archive_student",
      ativo: "admin_restore_student"
    };
    if (!isAdmin() || !rpcByStatus[status]) throw error;
    await runAdminMaintenanceRpc(rpcByStatus[status], id, error.message);
  }
}

async function updateStudentWorkoutsStatus(studentId, status) {
  if (!studentId) throw new Error("Selecione um aluno antes de alterar treinos.");
  const workouts = state.workouts.filter((workout) => String(workout.student_id) === String(studentId));
  try {
    for (const workout of workouts) {
      await updateWithSchemaFallback("workouts", workout.id, { status }, "Erro ao atualizar treinos do aluno");
    }
  } catch (error) {
    if (!isAdmin() || status !== "excluido") throw error;
    await runAdminMaintenanceRpc("admin_clear_student_workouts", studentId, error.message);
  }
  return workouts.length;
}

async function clearStudentLogs(studentId) {
  if (!studentId) throw new Error("Selecione um aluno antes de limpar sessoes.");
  try {
    await deleteByColumn("workout_logs", "student_id", studentId, "Erro ao excluir sessoes do aluno");
  } catch (error) {
    if (!isAdmin()) throw error;
    await runAdminMaintenanceRpc("admin_clear_student_sessions", studentId, error.message);
  }
}

async function clearStudentMeasurements(studentId) {
  if (!studentId) throw new Error("Selecione um aluno antes de limpar medidas.");
  try {
    await deleteByColumn("body_measurements", "student_id", studentId, "Erro ao excluir medidas do aluno");
  } catch (error) {
    if (!isAdmin()) throw error;
    await runAdminMaintenanceRpc("admin_clear_student_measurements", studentId, error.message);
  }
}

async function clearStudentAssessments(studentId) {
  if (!studentId) throw new Error("Selecione um aluno antes de limpar avaliacoes.");
  await deleteByColumn("assessments", "student_id", studentId, "Erro ao excluir avaliacoes do aluno");
}

async function resetStudentData(studentId) {
  try {
    await clearStudentLogs(studentId);
    await clearStudentMeasurements(studentId);
    await clearStudentAssessments(studentId);
    await updateStudentWorkoutsStatus(studentId, "arquivado");
  } catch (error) {
    if (!isAdmin()) throw error;
    await runAdminMaintenanceRpc("admin_reset_student_for_tests", studentId, error.message);
  }
}

async function runAdminMaintenanceRpc(functionName, studentId, originalMessage) {
  const { error } = await supabaseClient.rpc(functionName, { target_student_id: studentId });
  if (error) {
    console.error(`[GymPulse] Erro RPC ${functionName}:`, error);
    throw new Error(`${originalMessage}. RPC ${functionName}: ${error.message}`);
  }
}

function renderAdminStudentRecords(studentId) {
  const student = state.students.find((item) => String(item.id) === String(studentId));
  const logs = state.workoutLogs.filter((log) => String(log.student_id) === String(studentId));
  const workouts = state.workouts.filter((workout) => String(workout.student_id) === String(studentId));

  renderAdminMaintenanceLog(`${pick(student, ["name"], "Aluno")}: ${workouts.length} treinos e ${logs.length} sessoes registradas.`);
}

async function handleAdminStudentAction(action, studentId) {
  if (!isAdmin()) {
    showToast("Apenas Admin TI pode executar esta acao.", "error");
    return;
  }

  state.selectedAdminStudentId = studentId;

  try {
    if (action === "select") {
      renderAdminArea();
      renderAdminStudentRecords(studentId);
      return;
    }

    if (action === "edit") {
      state.selectedStudentId = studentId;
      renderTrainerStudents();
      await renderTrainerProfile();
      changeScreen("trainer-area");
      switchTrainerTab("profile");
      return;
    }

    if (!window.confirm(DELETE_CONFIRMATION)) return;

    if (action === "clear-logs") {
      await clearStudentLogs(studentId);
      renderAdminMaintenanceLog("Sessoes do aluno excluidas.");
    }

    if (action === "clear-workouts") {
      const count = await updateStudentWorkoutsStatus(studentId, "excluido");
      renderAdminMaintenanceLog(`Treinos ocultados como excluidos: ${count}.`);
    }

    if (action === "reset") {
      await resetStudentData(studentId);
      renderAdminMaintenanceLog("Aluno resetado para estado inicial.");
    }

    if (action === "archive") {
      await updateStudentStatus(studentId, "arquivado");
      renderAdminMaintenanceLog("Aluno arquivado.");
    }

    if (action === "restore") {
      await updateStudentStatus(studentId, "ativo");
      renderAdminMaintenanceLog("Aluno restaurado.");
    }

    if (action === "delete") {
      await updateStudentStatus(studentId, "excluido");
      await updateStudentWorkoutsStatus(studentId, "excluido");
      renderAdminMaintenanceLog("Aluno marcado como excluido.");
    }

    await loadSupabaseData({ silent: true });
    renderAdminArea();
  } catch (error) {
    console.error("[GymPulse] Erro na acao Admin aluno:", error);
    showToast(error.message, "error");
  }
}

function isTestRecord(record, fields) {
  const text = fields.map((field) => pick(record, [field], "")).join(" ");
  const normalized = normalizeText(text);
  return ["teste", "test", "demo", "exemplo"].some((word) => normalized.includes(word));
}

async function handleAdminMaintenance(action) {
  if (!state.adminUnlocked || state.accessRole !== "admin") {
    showToast("Manutencao permitida apenas para TI/Admin.", "error");
    return;
  }

  if (!window.confirm(DELETE_CONFIRMATION)) return;

  try {
    let result = "";

    if (action === "test-data") {
      const studentsRemoved = await removeTestStudents();
      const workoutsRemoved = await removeTestWorkouts();
      result = `Dados de teste removidos. Alunos: ${studentsRemoved}. Treinos: ${workoutsRemoved}.`;
    }

    if (action === "test-students") {
      const removed = await removeTestStudents();
      result = `Usuarios de teste removidos: ${removed}.`;
    }

    if (action === "test-workouts") {
      const removed = await removeTestWorkouts();
      result = `Treinos de teste removidos: ${removed}.`;
    }

    if (action === "duplicates") {
      const removed = await removeDuplicateExercises();
      result = `Exercicios duplicados removidos: ${removed}.`;
    }

    if (action === "orphans") {
      const removed = await removeOrphanWorkoutData();
      result = `Dados orfaos removidos: ${removed}.`;
    }

    if (action === "selected-sessions") {
      const studentId = getSelectedAdminStudentId();
      await clearStudentLogs(studentId);
      result = "Sessoes do aluno selecionado excluidas.";
    }

    if (action === "selected-measurements") {
      const studentId = getSelectedAdminStudentId();
      await clearStudentMeasurements(studentId);
      result = "Medidas do aluno selecionado excluidas.";
    }

    if (action === "selected-workouts") {
      const studentId = getSelectedAdminStudentId();
      const count = await updateStudentWorkoutsStatus(studentId, "excluido");
      result = `Treinos do aluno selecionado ocultados: ${count}.`;
    }

    if (action === "selected-reset") {
      const studentId = getSelectedAdminStudentId();
      await resetStudentData(studentId);
      result = "Aluno selecionado resetado para estado inicial.";
    }

    await loadSupabaseData({ silent: true });
    renderAdminArea();
    renderAdminMaintenanceLog(result || "Nenhuma rotina executada.");
    showToast(result || "Manutencao concluida.");
  } catch (error) {
    console.error("[GymPulse] Erro na manutencao Admin:", error);
    renderAdminMaintenanceLog(error.message);
    showToast(error.message, "error");
  }
}

async function removeTestStudents() {
  const testStudents = state.students.filter((student) => (
    isTestRecord(student, ["name", "nickname", "objective", "notes"])
  ));

  for (const student of testStudents) {
    await deleteStudentPermanently(student.id);
  }

  return testStudents.length;
}

async function removeTestWorkouts() {
  const testWorkouts = state.workouts.filter((workout) => (
    isTestRecord(workout, ["name", "title", "goal", "notes", "description"])
  ));

  for (const workout of testWorkouts) {
    await deleteWorkoutPermanently(workout.id, { removeLogs: true });
  }

  return testWorkouts.length;
}

async function removeDuplicateExercises() {
  const seen = new Set();
  const duplicates = [];

  for (const exercise of state.exercises) {
    const key = getExerciseKey(exercise);
    if (!key || key === "::") continue;
    if (seen.has(key)) {
      duplicates.push(exercise);
      continue;
    }
    seen.add(key);
  }

  for (const exercise of duplicates) {
    await deleteById("exercise_library", exercise.id, "Erro ao remover exercicio duplicado");
  }

  return duplicates.length;
}

async function removeOrphanWorkoutData() {
  const workoutIds = new Set(state.workouts.map((workout) => String(workout.id)));
  const studentIds = new Set(state.students.map((student) => String(student.id)));
  const orphanExercises = state.workoutExercises.filter((item) => !workoutIds.has(String(item.workout_id)));
  const orphanLogs = state.workoutLogs.filter((log) => (
    !workoutIds.has(String(log.workout_id)) || !studentIds.has(String(log.student_id))
  ));

  for (const item of orphanExercises) {
    await deleteById("workout_exercises", item.id, "Erro ao remover exercicio orfao");
  }

  for (const log of orphanLogs) {
    await deleteById("workout_logs", log.id, "Erro ao remover log orfao");
  }

  return orphanExercises.length + orphanLogs.length;
}

async function deleteStudentPermanently(id) {
  const workoutIds = state.workouts
    .filter((workout) => String(workout.student_id) === String(id))
    .map((workout) => workout.id)
    .filter(Boolean);

  for (const workoutId of workoutIds) {
    await deleteWorkoutPermanently(workoutId, { removeLogs: true });
  }

  await deleteByColumn("workout_logs", "student_id", id, "Erro ao excluir logs do aluno");
  await deleteByColumn("assessments", "student_id", id, "Erro ao excluir avaliacoes do aluno");
  await deleteByColumn("body_measurements", "student_id", id, "Erro ao excluir medidas do aluno");
  await deleteById("students", id, "Erro ao excluir aluno");
}

async function deleteWorkoutPermanently(id, options = {}) {
  if (options.removeLogs) {
    await deleteByColumn("workout_logs", "workout_id", id, "Erro ao excluir logs do treino");
  }
  await deleteByColumn("workout_exercises", "workout_id", id, "Erro ao excluir exercicios do treino");
  await deleteById("workouts", id, "Erro ao excluir treino");
}

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
    const allWorkouts = getStudentWorkouts(state.selectedStudentId);
    const workouts = getFilteredTrainerWorkouts(allWorkouts);

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
    renderTrainerWorkoutFilter();
    renderTrainerWorkoutSelect(allWorkouts.filter((workout) => {
      const status = normalizeWorkoutStatus(pick(workout, ["status"], "ativo"));
      return status !== "arquivado" && status !== "excluido";
    }));
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
  const status = pick(workout, ["status"], "ativo");
  const hasLogs = workoutHasLogs(workout.id);

  return `
    <article class="workout-card" data-workout-id="${escapeHtml(workout.id)}">
      <div class="record-title">
        <div>
          <strong>${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino sem nome"))}</strong>
          <span>${escapeHtml(pick(workout, ["goal", "description", "notes"], "Objetivo nao informado"))}</span>
          <small>Status: ${escapeHtml(formatWorkoutStatus(status))}${hasLogs ? " | possui historico" : ""}</small>
          <small>Criado em ${formatDate(pick(workout, ["created_at", "start_date"]))}</small>
        </div>
        ${renderWorkoutActions(workout, hasLogs)}
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
    status: "ativo",
    personal_id: state.authProfile?.id || null,
    created_by: state.authUser?.id || null
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
  if (!window.confirm(DELETE_CONFIRMATION)) return;
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
  if (!window.confirm(DELETE_CONFIRMATION)) return;
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
  if (!window.confirm(DELETE_CONFIRMATION)) return;
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
  if (!isAdmin()) {
    showToast("Exclusao permanente de treinos e permitida apenas para TI/Admin. Use arquivar ou desativar.", "error");
    return;
  }

  if (!window.confirm(DELETE_CONFIRMATION)) return;
  console.log("[GymPulse] deleteWorkout(id):", id);

  try {
    if (workoutHasLogs(id) && !window.confirm("Este treino possui historico. Como Admin TI, deseja excluir tambem os logs deste treino?")) {
      return;
    }
    await deleteWorkoutPermanently(id, { removeLogs: workoutHasLogs(id) });
    if (String(state.selectedWorkoutId) === String(id)) state.selectedWorkoutId = "";
    showToast("Treino excluido.");
    await reloadAfterDelete();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Atualiza status do treino sem apagar historico.
 */
async function updateWorkoutStatus(id, status) {
  const labels = {
    ativo: "ativo",
    rascunho: "rascunho",
    arquivado: "arquivado",
    excluido: "excluido"
  };
  const label = labels[status] || status;

  if (!window.confirm(`Marcar treino como ${label}?`)) return;

  try {
    await updateWithSchemaFallback("workouts", id, { status }, "Erro ao atualizar status do treino");
    if (String(state.selectedWorkoutId) === String(id) && status !== "ativo") {
      state.selectedWorkoutId = "";
    }
    showToast(`Treino marcado como ${label}.`);
    await loadSupabaseData({ silent: true });
    await renderTrainerProfile();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Exclui aluno selecionado e limpa o perfil.
 */
async function deleteStudent(id = state.selectedStudentId) {
  if (!isAdmin()) {
    showToast("Exclusao permanente de alunos e permitida apenas para TI/Admin.", "error");
    return;
  }

  if (!id) {
    showToast("Selecione um aluno antes de excluir.", "error");
    return;
  }

  if (!window.confirm(DELETE_CONFIRMATION)) return;
  console.log("[GymPulse] deleteStudent(id):", id);

  try {
    await updateStudentStatus(id, "excluido");
    await updateStudentWorkoutsStatus(id, "excluido");

    state.selectedStudentId = "";
    state.selectedWorkoutId = "";
    showToast("Aluno marcado como excluido.");
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
  renderTrainerWorkoutSelect(getStudentWorkouts(state.selectedStudentId).filter((workout) => {
    const status = normalizeWorkoutStatus(pick(workout, ["status"], "ativo"));
    return status !== "arquivado" && status !== "excluido";
  }));
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
  if (action === "status-workout") updateWorkoutStatus(id, button.dataset.status);
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
    "first-access": "Primeiro acesso",
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
  state.authProfile = state.authProfile || { role };
  el.sidebar.classList.remove("hidden");
  document.body.dataset.role = role;
  renderAuthStatus();

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

function updateLoginRoleHelper(role) {
  state.preferredLoginRole = role;
  const helpers = {
    student: {
      title: "Area do aluno",
      description: "Acesse seus treinos, registre exercicios, cargas, repeticoes e observacoes."
    },
    trainer: {
      title: "Area do personal",
      description: "Cadastre alunos, monte treinos, acompanhe evolucao e visualize historicos."
    },
    admin: {
      title: "Area administrativa",
      description: "Gerencie usuarios, permissoes, dados de teste, exclusoes e manutencao do sistema."
    }
  };
  const content = helpers[role] || helpers.student;

  el.loginRolePicker.querySelectorAll("[data-login-role]").forEach((button) => {
    button.classList.toggle("active", button.dataset.loginRole === role);
  });
  el.loginHelperTitle.textContent = content.title;
  el.loginHelperDescription.textContent = content.description;
  el.bootstrapAdminButton.classList.toggle("hidden", role !== "admin" || Boolean(state.authUser));
}

function switchAuthMode(mode) {
  const isRegister = mode === "register";
  el.authLoginForm.classList.toggle("hidden", isRegister);
  el.authRegisterForm.classList.toggle("hidden", !isRegister);
  const roleInput = document.querySelector("#register-role");
  const emailInput = document.querySelector("#register-email");
  if (roleInput && !state.pendingInvite) roleInput.disabled = false;
  if (emailInput && !state.pendingInvite) emailInput.readOnly = false;
  el.authModeTabs.querySelectorAll("[data-auth-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authMode === mode);
  });
  el.authStatus.textContent = isRegister
    ? "Crie cadastro de Personal, Admin TI ou Gestor. Aluno entra somente por convite."
    : "Use o login criado no Supabase Auth.";
}

function isExistingEmailSignUpResult(data, error) {
  const text = normalizeText([
    error?.message,
    error?.code,
    error?.name
  ].filter(Boolean).join(" "));

  if (text.includes("already") || text.includes("registered") || text.includes("exists")) return true;

  const identities = data?.user?.identities;
  return Array.isArray(identities) && identities.length === 0;
}

function getProfilePayload(user, requestedRole = "aluno", name = "") {
  const email = String(user?.email || "").trim().toLowerCase();
  const role = getDefaultRoleForEmail(email, requestedRole || user?.user_metadata?.role || "aluno");
  const fullName = name || user?.user_metadata?.nome || user?.user_metadata?.name || email;

  return {
    user_id: user.id,
    role,
    full_name: fullName,
    nome: fullName,
    email,
    status_usuario: "ativo",
    primeiro_acesso_obrigatorio: false,
    senha_temporaria: false
  };
}

async function syncCanonicalProfile(user, profilePayload) {
  if (!user?.id) return;

  const payload = {
    id: user.id,
    auth_user_id: user.id,
    nome: profilePayload.nome || profilePayload.full_name || user.email,
    full_name: profilePayload.full_name || profilePayload.nome || user.email,
    email: profilePayload.email || user.email,
    role: profilePayload.role,
    status_usuario: profilePayload.status_usuario || "ativo"
  };

  try {
    const { error } = await supabaseClient.from("profiles").upsert(payload).select();
    if (error) throw error;
  } catch (error) {
    console.warn("[GymPulse] profiles canonico ainda nao disponivel.", error);
  }
}

async function fetchInviteByToken(token) {
  if (!token) return null;

  const rpcResult = await supabaseClient.rpc("get_student_invite_by_token", { invite_token: token });
  if (!rpcResult.error) {
    return Array.isArray(rpcResult.data) ? (rpcResult.data[0] || null) : rpcResult.data;
  }

  const { data, error } = await supabaseClient
    .from("student_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pendente")
    .maybeSingle();

  if (error) throw rpcResult.error || error;
  return data || null;
}

function hydrateInviteRegisterForm(invite) {
  if (!invite) return;
  switchAuthMode("register");
  const nameInput = document.querySelector("#register-name");
  const emailInput = document.querySelector("#register-email");
  const roleInput = document.querySelector("#register-role");
  if (nameInput) nameInput.value = pick(invite, ["name", "nome"], "");
  if (emailInput) {
    emailInput.value = pick(invite, ["email"], "");
    emailInput.readOnly = true;
  }
  if (roleInput) {
    if (![...roleInput.options].some((option) => option.value === "aluno")) {
      roleInput.add(new Option("Aluno convidado", "aluno"));
    }
    roleInput.value = "aluno";
    roleInput.disabled = true;
  }
  el.registerStatus.textContent = "Convite encontrado. Crie sua senha para finalizar o cadastro de aluno.";
}

async function loadInviteFromUrl() {
  const token = getInviteTokenFromUrl();
  state.inviteToken = token;
  if (!token) return;

  try {
    const invite = await fetchInviteByToken(token);
    if (!invite) {
      showToast("Convite invalido, expirado ou ja utilizado.", "error");
      return;
    }
    state.pendingInvite = invite;
    hydrateInviteRegisterForm(invite);
  } catch (error) {
    console.error("[GymPulse] Erro ao carregar convite:", error);
    showToast(`Erro ao carregar convite: ${error.message}`, "error");
  }
}

function isDuplicateDatabaseError(error) {
  const text = normalizeText(error?.message || "");
  return text.includes("duplicate") || text.includes("unique");
}

async function completeInviteForUser(user, invite = state.pendingInvite) {
  if (!user?.id || !invite?.id) return null;

  const inviteEmail = String(invite.email || "").trim().toLowerCase();
  const userEmail = String(user.email || "").trim().toLowerCase();
  if (inviteEmail && userEmail && inviteEmail !== userEmail) {
    throw new Error("Este convite pertence a outro e-mail.");
  }

  const profilePayload = {
    user_id: user.id,
    role: "aluno",
    full_name: pick(invite, ["name", "nome"], user.email),
    nome: pick(invite, ["name", "nome"], user.email),
    email: userEmail,
    student_id: invite.student_id,
    status_usuario: "ativo",
    primeiro_acesso_obrigatorio: false,
    senha_temporaria: false
  };

  const existing = await fetchAuthProfile(user, { createIfMissing: false });
  if (existing?.id && normalizeRole(existing.role) !== "student") {
    throw new Error("Este e-mail ja possui outro perfil. O Admin TI deve corrigir o vinculo manualmente.");
  }

  if (existing?.id) {
    await updateWithSchemaFallback("app_profiles", existing.id, profilePayload, "Erro ao atualizar perfil do aluno convidado");
  } else {
    await insertWithSchemaFallback("app_profiles", profilePayload, "Erro ao criar perfil do aluno convidado");
  }
  await syncCanonicalProfile(user, profilePayload);

  if (invite.student_id) {
    await updateWithSchemaFallback("students", invite.student_id, {
      auth_user_id: user.id,
      status: "ativo",
      status_usuario: "ativo",
      personal_id: invite.trainer_id || null,
      trainer_id: invite.trainer_id || null
    }, "Erro ao vincular aluno ao usuario");
  }

  try {
    await insertWithSchemaFallback("trainer_students", {
      trainer_id: invite.trainer_id,
      student_id: invite.student_id,
      student_user_id: user.id,
      status: "ativo",
      invite_id: invite.id
    }, "Erro ao vincular aluno ao personal");
  } catch (error) {
    if (!isDuplicateDatabaseError(error)) throw error;
  }

  await updateWithSchemaFallback("student_invites", invite.id, {
    status: "aceito",
    accepted_at: new Date().toISOString(),
    accepted_user_id: user.id
  }, "Erro ao marcar convite como aceito");

  state.pendingInvite = null;
  state.inviteToken = "";
  clearAuthUrlParams();
  return fetchAuthProfile(user, { createIfMissing: false });
}

async function ensureAuthProfile(user, requestedRole = "aluno", name = "") {
  if (!user?.id) return null;

  const existing = await fetchAuthProfile(user, { createIfMissing: false });
  if (existing?.id || existing?.user_id) return existing;

  const payload = getProfilePayload(user, requestedRole, name);
  if (payload.role === "aluno" && !state.pendingInvite) {
    showToast("Aluno precisa de convite do personal para finalizar cadastro.", "error");
    return null;
  }

  try {
    const created = await insertWithSchemaFallback("app_profiles", payload, "Erro ao vincular perfil existente");
    return created?.[0] || payload;
  } catch (error) {
    console.warn("[GymPulse] Nao foi possivel criar app_profiles automaticamente.", error);
    showToast(`Login feito, mas o perfil nao foi vinculado: ${error.message}`, "error");
    return {
      user_id: user.id,
      role: payload.role,
      email: payload.email,
      nome: payload.nome
    };
  }
}

async function fetchAuthProfile(user, options = {}) {
  if (!user) return null;

  try {
    const { data, error } = await supabaseClient
      .from("app_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;
    if (options.createIfMissing === false) return null;
    return {
      user_id: user.id,
      role: user.user_metadata?.role || "",
      student_id: user.user_metadata?.student_id || null
    };
  } catch (error) {
    console.warn("[GymPulse] app_profiles indisponivel. Usando metadados do Auth.", error);
    state.lastError = error.message;
    if (options.createIfMissing === false) return null;
    return {
      user_id: user.id,
      role: user.user_metadata?.role || "",
      student_id: user.user_metadata?.student_id || null
    };
  }
}

function renderAuthStatus() {
  if (!el.authStatus) return;
  const role = getCurrentRole();
  const email = state.authUser?.email;
  el.authStatus.textContent = email
    ? `Logado como ${email} (${formatRoleLabel(role)})`
    : "Use o login criado no Supabase Auth.";
  el.bootstrapAdminButton.classList.toggle("hidden", state.preferredLoginRole !== "admin" || Boolean(state.authUser));
}

function formatSupabaseAuthError(error) {
  if (!error) return "erro desconhecido";

  const details = [
    error.message ? `message=${error.message}` : "",
    error.status ? `status=${error.status}` : "",
    error.code ? `code=${error.code}` : "",
    error.name ? `name=${error.name}` : ""
  ].filter(Boolean);

  return details.join(" | ") || String(error);
}

function showAuthError(context, error) {
  const formatted = formatSupabaseAuthError(error);
  console.error(`[GymPulse] ${context}:`, {
    message: error?.message || null,
    status: error?.status || null,
    code: error?.code || null,
    name: error?.name || null,
    error
  });
  el.authStatus.textContent = `${context}: ${formatted}`;
  showToast(`${context}: ${formatted}`, "error");
}

function isEmailConfirmationAuthError(error) {
  const text = [
    error?.message,
    error?.code,
    error?.name
  ].filter(Boolean).join(" ").toLowerCase();

  return text.includes("email not confirmed")
    || text.includes("email_not_confirmed")
    || text.includes("not confirmed");
}

function showEmailConfirmationDevelopmentHelp(error) {
  const formatted = formatSupabaseAuthError(error);
  const message = `Supabase bloqueou por confirmacao de e-mail. Erro real: ${formatted}. Para desenvolvimento, desative Confirm email em Authentication > Providers > Email ou confirme novamente o usuario no painel Auth.`;
  console.warn("[GymPulse] Login bloqueado pelo Supabase Auth:", message);
  el.authStatus.textContent = message;
  showToast(message, "error");
}

function formatRoleLabel(role) {
  const labels = {
    admin: "Admin TI",
    trainer: "Personal",
    student: "Aluno",
    owner: "Gestor academia",
    personal: "Personal",
    aluno: "Aluno",
    admin_ti: "Admin TI",
    gestor_academia: "Gestor academia"
  };
  return labels[normalizeRole(role)] || "perfil nao definido";
}

function needsFirstAccessPasswordChange() {
  const status = normalizeText(state.authProfile?.status_usuario || "");
  return Boolean(
    state.authUser
    && isStudent()
    && (
      state.authProfile?.primeiro_acesso_obrigatorio === true
      || state.authProfile?.senha_temporaria === true
      || status === "pendente_primeiro_acesso"
    )
  );
}

function getSupabaseUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  hashParams.forEach((value, key) => {
    if (!params.has(key)) params.set(key, value);
  });

  return params;
}

function getInviteTokenFromUrl() {
  return String(getSupabaseUrlParams().get("invite") || "").trim();
}

function urlIndicatesPasswordRecovery() {
  const params = getSupabaseUrlParams();
  const type = normalizeText(params.get("type") || "");
  const href = normalizeText(window.location.href || "");
  return type === "recovery" || href.includes("type=recovery");
}

function getAuthUrlError() {
  const params = getSupabaseUrlParams();
  const code = params.get("error_code") || params.get("error") || "";
  const description = params.get("error_description") || "";
  if (!code && !description) return null;
  return {
    code,
    description: description.replaceAll("+", " ")
  };
}

function showAuthUrlErrorIfPresent() {
  const error = getAuthUrlError();
  if (!error) return false;

  const isExpired = normalizeText(error.code).includes("otp_expired")
    || normalizeText(error.description).includes("expired");
  const message = isExpired
    ? "Link de e-mail expirado ou ja utilizado. Solicite um novo link de recuperacao ou um novo convite."
    : `Erro no link de autenticacao: ${error.description || error.code}`;

  el.authStatus.textContent = message;
  showToast(message, "error");
  changeScreen("access");
  return true;
}

function clearAuthUrlParams() {
  window.history.replaceState({}, document.title, `${window.location.origin}${window.location.pathname}`);
}

function renderPasswordFlowText() {
  const isRecovery = state.passwordRecoveryMode;
  el.passwordFlowSubtitle.textContent = isRecovery ? "Recuperacao de senha" : "Primeiro acesso";
  el.passwordFlowTitle.textContent = isRecovery ? "Criar nova senha" : "Crie sua nova senha";
  el.passwordFlowDescription.textContent = isRecovery
    ? "Informe uma nova senha para recuperar seu acesso ao app."
    : "Sua senha temporaria precisa ser substituida antes de usar o app.";
}

async function applyAuthenticatedSession(session) {
  if (!session?.user) return;

  state.authUser = session.user;
  const metadataInviteToken = session.user.user_metadata?.invite_token || "";
  if (!state.pendingInvite && metadataInviteToken) {
    state.pendingInvite = await fetchInviteByToken(metadataInviteToken);
  }

  if (state.pendingInvite) {
    state.authProfile = await completeInviteForUser(session.user, state.pendingInvite);
    showToast("Convite aceito e aluno vinculado ao personal.");
  }

  state.authProfile = await ensureAuthProfile(
    session.user,
    session.user.user_metadata?.role || state.preferredLoginRole || "aluno",
    session.user.user_metadata?.nome || session.user.user_metadata?.name || ""
  );

  if (state.passwordRecoveryMode) {
    renderPasswordFlowText();
    el.sidebar.classList.add("hidden");
    document.body.dataset.role = "";
    renderAuthStatus();
    changeScreen("first-access");
    return;
  }

  const role = getCurrentRole();

  if (!role) {
    showToast("Usuario sem perfil. Configure app_profiles no Supabase.", "error");
    renderAuthStatus();
    return;
  }

  state.accessRole = role;
  state.adminUnlocked = role === "admin";
  document.body.dataset.role = role;
  el.sidebar.classList.remove("hidden");

  if (role === "admin") {
    el.adminLock.classList.add("hidden");
    el.adminPanel.classList.remove("hidden");
    hydrateAdminConfigForm();
  }

  if (role === "student" && state.authProfile?.student_id) {
    state.studentAreaId = state.authProfile.student_id;
  }

  await loadSupabaseData({ silent: true });
  renderAuthStatus();

  if (needsFirstAccessPasswordChange()) {
    renderPasswordFlowText();
    changeScreen("first-access");
    return;
  }

  if (role === "student") changeScreen("student-area");
  if (role === "trainer") changeScreen("trainer-area");
  if (role === "admin") changeScreen("admin-area");
  if (role === "owner") changeScreen("trainer-area");
}

async function handleAuthLogin(form) {
  const formData = new FormData(form);
  const email = String(formData.get("email") || "").trim().toLowerCase();
  setFormLoading(form, true);
  el.authStatus.textContent = "Entrando...";

  try {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: formData.get("password")
    });

    if (error) {
      showAuthError("Erro exato do Supabase Auth no login", error);
      if (isEmailConfirmationAuthError(error)) {
        showEmailConfirmationDevelopmentHelp(error);
      }
      return;
    }
    await applyAuthenticatedSession(data.session);
    showToast("Login realizado.");
  } catch (error) {
    showAuthError("Excecao capturada no login", error);
  } finally {
    setFormLoading(form, false);
  }
}

async function handleAuthRegister(form) {
  const formData = new FormData(form);
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");
  const role = state.pendingInvite ? "aluno" : String(formData.get("role") || "");

  if (!name || !email || !password) {
    showToast("Preencha nome, e-mail e senha.", "error");
    return;
  }

  if (password.length < 6) {
    showToast("A senha precisa ter pelo menos 6 caracteres.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showToast("As senhas nao conferem.", "error");
    return;
  }

  if (normalizeRole(role) === "admin" && email !== "ananunes1807@gmail.com") {
    showToast("O perfil Admin TI principal e reservado para ananunes1807@gmail.com.", "error");
    return;
  }

  if (normalizeRole(role) === "student" && !state.pendingInvite) {
    showToast("Aluno nao cria conta livremente. Solicite convite ao personal.", "error");
    return;
  }

  if (state.pendingInvite && email !== String(state.pendingInvite.email || "").trim().toLowerCase()) {
    showToast("O e-mail informado nao corresponde ao convite.", "error");
    return;
  }

  setFormLoading(form, true);
  el.registerStatus.textContent = "Criando cadastro...";

  try {
    const databaseRole = getDefaultRoleForEmail(email, role);
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          nome: name,
          name,
          role: databaseRole,
          invite_token: state.pendingInvite?.token || null
        }
      }
    });

    if (isExistingEmailSignUpResult(data, error)) {
      throw new Error(state.pendingInvite
        ? "Este e-mail ja existe. Entre com sua senha usando este mesmo link para aceitar o convite."
        : "Este e-mail ja esta cadastrado. Entre ou recupere sua senha.");
    }

    if (error) throw error;

    if (data.session?.user) {
      state.authUser = data.session.user;
      if (state.pendingInvite) {
        state.authProfile = await completeInviteForUser(data.session.user, state.pendingInvite);
      } else {
        state.authProfile = await ensureAuthProfile(data.session.user, databaseRole, name);
      }
      form.reset();
      el.registerStatus.textContent = "Cadastro criado. Voce ja pode usar o app.";
      showToast("Cadastro criado com sucesso.");
      await applyAuthenticatedSession(data.session);
      return;
    }

    form.reset();
    el.registerStatus.textContent = "Cadastro criado. Verifique seu e-mail para confirmar o acesso.";
    showToast("Cadastro criado. Confirme o e-mail antes de entrar.");
    switchAuthMode("login");
  } catch (error) {
    const message = error.message || "Erro ao criar cadastro.";
    el.registerStatus.textContent = message;
    showToast(message, "error");
    console.error("[GymPulse] Erro ao criar cadastro:", error);
  } finally {
    setFormLoading(form, false);
  }
}

async function handleForgotPassword() {
  const email = window.prompt("Informe o e-mail cadastrado para receber o link de recuperacao:");
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) return;

  try {
    const { error } = await supabaseClient.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: getAuthRedirectUrl()
    });

    if (error) throw error;

    el.authStatus.textContent = "Enviamos um link de recuperacao para o seu e-mail.";
    showToast("Link de recuperacao enviado.");
  } catch (error) {
    showAuthError("Erro ao enviar recuperacao de senha", error);
  }
}

async function handleBootstrapAdmin() {
  const email = String(el.authEmail.value || "").trim().toLowerCase();
  const password = String(el.authPassword.value || "");

  if (!email || !password) {
    showToast("Informe e-mail e senha para criar o primeiro Admin TI.", "error");
    return;
  }

  if (password.length < 6) {
    showToast("A senha precisa ter pelo menos 6 caracteres.", "error");
    return;
  }

  if (!window.confirm("Criar este e-mail como primeiro Admin TI responsavel pelo sistema?")) return;

  setFormLoading(el.authLoginForm, true);

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: getAuthRedirectUrl(),
        data: {
          role: "admin_ti",
          primeiro_admin_ti: true
        }
      }
    });

    if (error) throw error;

    if (!data.session) {
      showToast("Usuario criado. Confirme o e-mail ou desative confirmacao de e-mail no Supabase para concluir o primeiro acesso.", "error");
      return;
    }

    await insertWithSchemaFallback("app_profiles", {
      user_id: data.user.id,
      role: "admin_ti",
      full_name: "Admin TI",
      nome: "Admin TI",
      email,
      status_usuario: "ativo",
      primeiro_acesso_obrigatorio: false,
      senha_temporaria: false
    }, "Erro ao criar primeiro perfil Admin TI");

    await applyAuthenticatedSession(data.session);
    showToast("Primeiro Admin TI criado com sucesso.");
  } catch (error) {
    showToast(`Erro ao criar Admin TI: ${error.message}`, "error");
  } finally {
    setFormLoading(el.authLoginForm, false);
    renderAuthStatus();
  }
}

async function handleAuthLogout() {
  await supabaseClient.auth.signOut();
  state.authUser = null;
  state.authProfile = null;
  state.accessRole = "";
  state.adminUnlocked = false;
  state.studentAreaId = "";
  state.selectedStudentId = "";
  state.selectedWorkoutId = "";
  document.body.dataset.role = "";
  el.sidebar.classList.add("hidden");
  el.adminLock.classList.remove("hidden");
  el.adminPanel.classList.add("hidden");
  renderAuthStatus();
  changeScreen("access");
  showToast("Sessao encerrada.");
}

async function handleFirstAccessPasswordChange(form) {
  const formData = new FormData(form);
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  if (password.length < 6) {
    showToast("A nova senha precisa ter pelo menos 6 caracteres.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showToast("As senhas nao conferem.", "error");
    return;
  }

  setFormLoading(form, true);

  try {
    const { data: sessionData } = await supabaseClient.auth.getSession();
    if (!sessionData.session) {
      throw new Error("Sessao de recuperacao nao encontrada. Abra novamente o link enviado por e-mail.");
    }

    const { error } = await supabaseClient.auth.updateUser({ password });
    if (error) throw error;

    if (state.passwordRecoveryMode) {
      form.reset();
      state.passwordRecoveryMode = false;
      clearAuthUrlParams();
      await supabaseClient.auth.signOut();
      state.authUser = null;
      state.authProfile = null;
      state.accessRole = "";
      document.body.dataset.role = "";
      el.sidebar.classList.add("hidden");
      renderAuthStatus();
      showToast("Senha alterada com sucesso. Entre novamente com e-mail e senha.");
      changeScreen("access");
      return;
    }

    const profilePayload = {
      status_usuario: "ativo",
      primeiro_acesso_obrigatorio: false,
      senha_temporaria: false
    };

    if (state.authProfile?.id) {
      await updateWithSchemaFallback("app_profiles", state.authProfile.id, profilePayload, "Erro ao atualizar primeiro acesso");
    }

    if (state.authProfile?.student_id) {
      await updateWithSchemaFallback("students", state.authProfile.student_id, profilePayload, "Erro ao ativar aluno");
    }

    state.authProfile = { ...state.authProfile, ...profilePayload };
    form.reset();
    showToast("Senha atualizada. Bem-vindo ao app.");
    await loadSupabaseData({ silent: true });
    changeScreen("student-area");
  } catch (error) {
    showToast(`Erro ao trocar senha: ${error.message}`, "error");
  } finally {
    setFormLoading(form, false);
  }
}

async function initAuthSession() {
  renderAuthStatus();
  showAuthUrlErrorIfPresent();
  state.passwordRecoveryMode = urlIndicatesPasswordRecovery();
  renderPasswordFlowText();

  try {
    const { data } = await supabaseClient.auth.getSession();
    if (data.session) {
      await applyAuthenticatedSession(data.session);
      return;
    }
  } catch (error) {
    console.warn("[GymPulse] Nao foi possivel restaurar sessao Auth.", error);
  }

  if (state.passwordRecoveryMode) {
    changeScreen("first-access");
  }

  await loadSupabaseData({ silent: true });
}

function bindAuthRecoveryEvents() {
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event !== "PASSWORD_RECOVERY") return;
    state.passwordRecoveryMode = true;
    renderPasswordFlowText();
    if (session?.user) {
      state.authUser = session.user;
      state.authProfile = await fetchAuthProfile(session.user);
    }
    showToast("Link de recuperacao validado. Crie sua nova senha.");
    changeScreen("first-access");
  });
}

/**
 * Garante que cada perfil veja apenas sua propria area.
 */
function canAccessScreen(screenName) {
  if (screenName === "access") return true;
  if (screenName === "first-access") return state.passwordRecoveryMode || needsFirstAccessPasswordChange();
  if (state.accessRole === "student") return screenName === "student-area";
  if (state.accessRole === "trainer") return screenName === "trainer-area";
  if (state.accessRole === "owner") return screenName === "trainer-area";
  if (state.accessRole === "admin") return ["admin-area", "trainer-area", "student-area"].includes(screenName);
  return false;
}

/**
 * Atualiza o status individual de conclusao de um exercicio no treino atual.
 */
function handleStudentWorkoutExecutionChange(event) {
  const input = event.target.closest("[data-workout-exercise-field]");
  if (!input) return;

  const execution = getStudentExerciseExecution(input.dataset.workoutExerciseId);
  const field = input.dataset.workoutExerciseField;
  execution[field] = input.type === "checkbox" ? input.checked : input.value;

  if (field === "skipped" && input.checked) {
    execution.completed = false;
  }

  if (field === "completed" && input.checked) {
    execution.skipped = false;
  }

  saveCurrentExecutionDraft();
  if (event.type === "change") {
    renderStudentArea();
  }
}

/**
 * Aplica atalhos de execucao mobile do aluno.
 */
function handleStudentWorkoutQuickAction(event) {
  const navButton = event.target.closest("[data-student-exercise-nav]");
  if (navButton) {
    const direction = navButton.dataset.studentExerciseNav;
    state.studentExerciseIndex += direction === "next" ? 1 : -1;
    renderStudentArea();
    return;
  }

  const button = event.target.closest("[data-workout-exercise-quick]");
  if (!button) return;

  const execution = getStudentExerciseExecution(button.dataset.workoutExerciseId);
  const action = button.dataset.workoutExerciseQuick;

  if (action === "done") {
    execution.completed = true;
    execution.skipped = false;
  }

  if (action === "less") {
    execution.completed = true;
    execution.skipped = false;
    execution.difficulty = execution.difficulty || "Fiz menos que o planejado";
  }

  if (action === "skip") {
    execution.completed = false;
    execution.skipped = true;
  }

  if (action === "pain") {
    execution.pain_level = execution.pain_level || "5";
    execution.notes = execution.notes || "Senti dor durante o exercicio";
  }

  saveCurrentExecutionDraft();
  renderStudentArea();
}

/**
 * Registra eventos de interface.
 */
function bindEvents() {
  el.authLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleAuthLogin(event.currentTarget);
  });
  el.authRegisterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleAuthRegister(event.currentTarget);
  });
  el.authModeTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-auth-mode]");
    if (!button) return;
    switchAuthMode(button.dataset.authMode);
  });
  el.forgotPasswordButton.addEventListener("click", handleForgotPassword);
  el.authLogoutButton.addEventListener("click", handleAuthLogout);
  el.bootstrapAdminButton.addEventListener("click", handleBootstrapAdmin);
  el.firstAccessForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleFirstAccessPasswordChange(event.currentTarget);
  });
  el.loginRolePicker.addEventListener("click", (event) => {
    const button = event.target.closest("[data-login-role]");
    if (!button) return;
    updateLoginRoleHelper(button.dataset.loginRole);
  });

  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.dataset.screen === "access") {
        state.accessRole = "";
        if (!state.authUser) state.authProfile = null;
        document.body.dataset.role = "";
        el.sidebar.classList.add("hidden");
        renderAuthStatus();
      }
      changeScreen(button.dataset.screen);
    });
  });

  document.querySelectorAll("[data-access-role]").forEach((button) => {
    button.addEventListener("click", () => setAccessRole(button.dataset.accessRole));
  });

  el.studentAreaSelect.addEventListener("change", (event) => {
    state.studentAreaId = event.target.value;
    loadCurrentExecutionDraft();
    renderStudentArea();
  });

  el.completeWorkoutButton.addEventListener("click", completeCurrentWorkout);
  el.studentCurrentWorkout.addEventListener("change", handleStudentWorkoutExecutionChange);
  el.studentCurrentWorkout.addEventListener("input", handleStudentWorkoutExecutionChange);
  el.studentCurrentWorkout.addEventListener("click", handleStudentWorkoutQuickAction);

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

  el.trainerWorkoutFilter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-workout-filter]");
    if (!button) return;
    state.trainerWorkoutFilter = button.dataset.workoutFilter;
    renderTrainerProfile();
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
  el.adminMaintenanceLog.closest(".card").addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-maintenance]");
    if (!button) return;
    handleAdminMaintenance(button.dataset.adminMaintenance);
  });
  el.adminStudentsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-student-action]");
    if (!button) return;
    handleAdminStudentAction(button.dataset.adminStudentAction, button.dataset.studentId);
  });
  window.addEventListener("online", syncPendingWorkoutLogs);
}

/**
 * Traduz status do treino para exibicao.
 */
function formatWorkoutStatus(status) {
  const normalized = normalizeWorkoutStatus(status);
  const labels = {
    ativo: "Ativo",
    rascunho: "Rascunho",
    arquivado: "Arquivado",
    excluido: "Excluido"
  };
  return labels[normalized] || normalized || "Ativo";
}

/**
 * Verifica se um treino ja tem registros realizados.
 */
function workoutHasLogs(workoutId) {
  return state.workoutLogs.some((log) => String(log.workout_id) === String(workoutId));
}

/**
 * Renderiza acoes do treino preservando historico ja realizado.
 */
function renderWorkoutActions(workout, hasLogs) {
  const id = escapeHtml(workout.id);
  const status = normalizeWorkoutStatus(pick(workout, ["status"], "ativo"));
  const activateButton = status === "ativo"
    ? ""
    : `<button class="tiny-button" type="button" data-action="status-workout" data-status="ativo" data-id="${id}">Ativar</button>`;
  const archiveButton = status === "arquivado"
    ? ""
    : `<button class="tiny-button" type="button" data-action="status-workout" data-status="arquivado" data-id="${id}">Arquivar</button>`;
  const draftButton = status === "rascunho"
    ? ""
    : `<button class="tiny-button" type="button" data-action="status-workout" data-status="rascunho" data-id="${id}">Desativar</button>`;
  const deleteButton = state.accessRole === "admin"
    ? `<button class="tiny-button danger" type="button" data-action="delete-workout" data-id="${id}">Excluir definitivo</button>`
    : "";

  return `
    <div class="record-actions workout-actions">
      <button class="tiny-button" type="button" data-action="edit-workout" data-id="${id}">Editar</button>
      ${activateButton}
      ${draftButton}
      ${archiveButton}
      ${deleteButton}
      ${hasLogs ? `<small>Historico preservado</small>` : ""}
    </div>
  `;
}

/**
 * Inicializa o app com Supabase Auth e fallback temporario de MVP.
 */
async function init() {
  bindEvents();
  bindAuthRecoveryEvents();
  hydrateAdminConfigForm();
  updateLoginRoleHelper(state.preferredLoginRole);
  await loadInviteFromUrl();
  await initAuthSession();
}

init();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./service-worker.js")
      .catch((error) => console.error("[GymPulse] Erro ao registrar service worker:", error));
  });
}
