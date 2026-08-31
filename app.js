const EXECUTION_DRAFT_PREFIX = "Alion Treinos_execution_draft";
const STORAGE_NAMESPACE = "alion_treinos_v1";
const PENDING_WORKOUT_LOGS_KEY = `${STORAGE_NAMESPACE}:pending_workout_logs`;
const THEME_STORAGE_KEY = `${STORAGE_NAMESPACE}:theme`;
const THEME_VALUES = ["system", "light", "dark"];
const THEME_COLORS = {
  light: "#f4f7fb",
  dark: "#160822"
};
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
  ["app_profiles", "SELF / trusted Admin", "alion_app_profiles_select + identity trigger"],
  ["profiles", "SELF / trusted Admin", "alion_profiles_select + identity trigger"],
  ["students", "OWNERSHIP", "alion_students_* + students_protect_ownership"],
  ["student_invites", "PERSONAL OWNER", "alion_student_invites_* + ownership trigger"],
  ["trainer_students", "READ OWN / RPC WRITE", "alion_trainer_students_*"],
  ["assessments", "STUDENT OWNER", "alion_assessments_*"],
  ["body_measurements", "STUDENT OWNER", "alion_body_measurements_*"],
  ["exercise_library", "PUBLIC READ / PERSONAL WRITE", "alion_exercise_library_*"],
  ["workouts", "STUDENT OWNER", "alion_workouts_* + assignment trigger"],
  ["workout_exercises", "WORKOUT OWNER", "alion_workout_exercises_*"],
  ["workout_logs", "STUDENT + WORKOUT", "alion_workout_logs_*"]
];
const DEFAULT_EXERCISES = [
  ["Agachamento livre", "Pernas", "Barra livre", "Intermediario", "Manter tronco firme, descer com controle e subir empurrando o chao."],
  ["Leg press 45", "Pernas", "Leg press", "Iniciante", "Flexionar os joelhos com controle e manter os pes firmes na plataforma."],
  ["Cadeira extensora", "Pernas", "Maquina", "Iniciante", "Estender os joelhos sem perder o controle do movimento."],
  ["Supino reto", "Peitoral", "Barra livre", "Intermediario", "Descer a barra ate a linha do peito e subir com controle."],
  ["Crucifixo na maquina", "Peitoral", "Maquina", "Iniciante", "Aproximar os bracos mantendo leve flexao dos cotovelos."],
  ["Puxada frontal", "Dorsal", "Pulley", "Iniciante", "Puxar a barra em direcao ao peito mantendo o tronco firme."],
  ["Remada baixa", "Dorsal", "Cabo", "Iniciante", "Trazer o puxador ao abdomen contraindo as costas."],
  ["Rosca direta", "Braços", "Barra", "Iniciante", "Flexionar os cotovelos sem balancar o tronco."],
  ["Triceps pulley", "Braços", "Cabo", "Iniciante", "Estender os cotovelos mantendo os bracos proximos ao corpo."],
  ["Mesa flexora", "Posterior", "Maquina", "Iniciante", "Flexionar os joelhos contraindo posterior de coxa."],
  ["Stiff", "Posterior", "Barra ou halteres", "Intermediario", "Descer com quadril para tras e coluna neutra."],
  ["Elevacao pelvica", "Glúteo", "Banco e barra", "Intermediario", "Elevar o quadril contraindo gluteos no topo."],
  ["Cadeira abdutora", "Glúteo", "Maquina", "Iniciante", "Abrir as pernas com controle e sem impulso."],
  ["Prancha abdominal", "Abdominal", "Peso corporal", "Iniciante", "Manter o corpo alinhado e abdomen contraido."],
  ["Abdominal crunch", "Abdominal", "Peso corporal", "Iniciante", "Flexionar o tronco com controle sem puxar o pescoco."],
  ["Desenvolvimento com halteres", "Ombro", "Halteres", "Intermediario", "Empurrar os halteres acima da cabeca com controle."],
  ["Elevacao lateral", "Ombro", "Halteres", "Iniciante", "Elevar os bracos ate a linha dos ombros."],
  ["Face pull", "Ombro", "Cabo", "Iniciante", "Puxar a corda em direcao ao rosto contraindo deltoide posterior."]
];
const REQUIRED_EXERCISE_GROUPS = ["Pernas", "Peitoral", "Dorsal", "Braços", "Posterior", "Glúteo", "Abdominal", "Ombro"];
const DELETE_CONFIRMATION = "Tem certeza que deseja excluir? Esta acao nao podera ser desfeita.";

const state = {
  authUser: null,
  authProfile: null,
  selectedAdminStudentId: "",
  preferredLoginRole: "student",
  passwordRecoveryMode: false,
  inviteToken: "",
  pendingInvite: null,
  pendingStudentInviteOffer: null,
  pendingInviteType: "",
  inviteSessionConflict: false,
  students: [],
  exercises: [],
  studentInvites: [],
  trainerStudents: [],
  appProfiles: [],
  trainerInvites: [],
  trashRecords: [],
  workouts: [],
  workoutExercises: [],
  workoutLogs: [],
  selectedStudentId: "",
  selectedWorkoutId: "",
  studentPdfWorkoutId: "all",
  trainerPdfWorkoutId: "all",
  studentMode: localStorage.getItem("alion-student-mode") || "easy",
  restTimers: {},
  restTimerIntervals: {},
  easyWorkoutCompletionInProgress: false,
  easySeriesActionsInProgress: new Set(),
  pendingLogSyncInProgress: false,
  workoutAudioContext: null,
  workoutAudioUnlocked: false,
  themePreference: getStoredThemePreference(),
  pendingConfirmExerciseId: "",
  awaitingFeedbackExerciseId: "",
  revealedInviteIds: new Set(),
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
  adminExerciseSearch: "",
  adminExerciseGroupFilter: "",
  pendingAdminConfirmation: null,
  accessRole: "",
  adminUnlocked: false,
  trustedAdmin: false,
  lastError: "",
  tableErrors: {}
};

let activeAuthReconciliation = null;
let activeAccountStatusCheck = null;
let suspensionHandlingPromise = null;

const el = {
  pageTitle: document.querySelector("#page-title"),
  sidebar: document.querySelector("#sidebar"),
  connectionStatus: document.querySelector("#connection-status"),
  themeSelect: document.querySelector("#theme-select"),
  toast: document.querySelector("#toast"),
  totalStudents: document.querySelector("#total-students"),
  totalExercises: document.querySelector("#total-exercises"),
  totalWorkouts: document.querySelector("#total-workouts"),
  totalLogs: document.querySelector("#total-logs"),
  studentScreen: document.querySelector("#screen-student-area"),
  studentAreaSelect: document.querySelector("#student-area-select"),
  studentPdfControls: document.querySelector("#student-pdf-controls"),
  studentPdfWorkoutSelect: document.querySelector("#student-pdf-workout-select"),
  studentDownloadWorkoutPdf: document.querySelector("#student-download-workout-pdf"),
  studentCharacterPreferenceForm: document.querySelector("#student-character-preference-form"),
  studentCurrentWorkout: document.querySelector("#student-current-workout"),
  studentHistory: document.querySelector("#student-history"),
  studentEvolution: document.querySelector("#student-evolution"),
  studentAssessments: document.querySelector("#student-assessments"),
  studentMeasurements: document.querySelector("#student-measurements"),
  completeWorkoutButton: document.querySelector("#complete-workout-button"),
  studentModeToggle: document.querySelector("#student-mode-toggle"),
  trainerStudentsList: document.querySelector("#trainer-students-list"),
  trainerProfileTitle: document.querySelector("#trainer-profile-title"),
  trainerProfileSummary: document.querySelector("#trainer-profile-summary"),
  trainerAssessments: document.querySelector("#trainer-assessments"),
  trainerAssessmentComparison: document.querySelector("#trainer-assessment-comparison"),
  trainerMeasurements: document.querySelector("#trainer-measurements"),
  trainerWorkoutSelect: document.querySelector("#trainer-workout-select"),
  trainerPdfControls: document.querySelector("#trainer-pdf-controls"),
  trainerPdfWorkoutSelect: document.querySelector("#trainer-pdf-workout-select"),
  trainerDownloadWorkoutPdf: document.querySelector("#trainer-download-workout-pdf"),
  workoutTemplateModal: document.querySelector("#workout-template-modal"),
  openWorkoutTemplate: document.querySelector("#open-workout-template"),
  workoutTemplateClose: document.querySelector("#workout-template-close"),
  workoutTemplateCancel: document.querySelector("#workout-template-cancel"),
  workoutTemplateDownload: document.querySelector("#workout-template-download"),
  workoutTemplateVersion: document.querySelector("#workout-template-version"),
  workoutTemplateCount: document.querySelector("#workout-template-count"),
  workoutTemplateExercises: document.querySelector("#workout-template-exercises"),
  workoutTemplateStudentMode: document.querySelector("#workout-template-student-mode"),
  trainerExerciseSelect: document.querySelector("#trainer-exercise-select"),
  trainerExerciseLibrary: document.querySelector("#trainer-exercise-library"),
  trainerTabs: document.querySelector("#trainer-tabs"),
  trainerHistory: document.querySelector("#trainer-history"),
  trainerInvitesList: document.querySelector("#trainer-invites-list"),
  trainerTrashList: document.querySelector("#trainer-trash-list"),
  editStudentForm: document.querySelector("#edit-student-form"),
  exerciseSearch: document.querySelector("#exercise-search"),
  exerciseGroupFilter: document.querySelector("#exercise-group-filter"),
  adminExerciseSearch: document.querySelector("#admin-exercise-search"),
  adminExerciseGroupFilter: document.querySelector("#admin-exercise-group-filter"),
  adminConfirmModal: document.querySelector("#admin-confirm-modal"),
  adminConfirmTitle: document.querySelector("#admin-confirm-title"),
  adminConfirmDescription: document.querySelector("#admin-confirm-description"),
  adminConfirmExpected: document.querySelector("#admin-confirm-expected"),
  adminConfirmInput: document.querySelector("#admin-confirm-input"),
  adminConfirmCancel: document.querySelector("#admin-confirm-cancel"),
  adminConfirmSubmit: document.querySelector("#admin-confirm-submit"),
  copySupabaseUrl: document.querySelector("#copy-supabase-url"),
  copySupabaseKey: document.querySelector("#copy-supabase-key"),
  exerciseLibraryForm: document.querySelector("#exercise-library-form"),
  adminExerciseLibraryForm: document.querySelector("#admin-exercise-library-form"),
  cancelLibraryExerciseEdit: document.querySelector("#cancel-library-exercise-edit"),
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
  adminPersonalsList: document.querySelector("#admin-personals-list"),
  adminStudentsList: document.querySelector("#admin-students-list"),
  adminExercisesList: document.querySelector("#admin-exercises-list"),
  adminDownloadExerciseLibraryPdf: document.querySelector("#admin-download-exercise-library-pdf"),
  adminDiagnostics: document.querySelector("#admin-diagnostics"),
  adminErrorsList: document.querySelector("#admin-errors-list"),
  adminRlsPolicies: document.querySelector("#admin-rls-policies"),
  adminMaintenanceLog: document.querySelector("#admin-maintenance-log"),
  adminTrainerInviteForm: document.querySelector("#admin-trainer-invite-form"),
  adminTrainerInvitesList: document.querySelector("#admin-trainer-invites-list"),
  adminTrashList: document.querySelector("#admin-trash-list"),
  authLoginForm: document.querySelector("#auth-login-form"),
  authRegisterForm: document.querySelector("#auth-register-form"),
  registerStatus: document.querySelector("#register-status"),
  googleLoginButton: document.querySelector("#google-login-button"),
  forgotPasswordButton: document.querySelector("#forgot-password-button"),
  inviteRegisterButton: document.querySelector("#invite-register-button"),
  inviteExistingAuthActions: document.querySelector("#invite-existing-auth-actions"),
  inviteExistingAuthLogin: document.querySelector("#invite-existing-auth-login"),
  inviteExistingAuthCancel: document.querySelector("#invite-existing-auth-cancel"),
  inviteSessionConflict: document.querySelector("#invite-session-conflict"),
  inviteConflictLogout: document.querySelector("#invite-conflict-logout"),
  inviteConflictCancel: document.querySelector("#invite-conflict-cancel"),
  authEmail: document.querySelector("#auth-email"),
  authPassword: document.querySelector("#auth-password"),
  authLogoutButton: document.querySelector("#auth-logout-button"),
  authStatus: document.querySelector("#auth-status"),
  loginRolePicker: document.querySelector("#login-role-picker"),
  loginHelperTitle: document.querySelector("#login-helper-title"),
  loginHelperDescription: document.querySelector("#login-helper-description"),
  firstAccessForm: document.querySelector("#first-access-form"),
  passwordFlowSubtitle: document.querySelector("#password-flow-subtitle"),
  passwordFlowTitle: document.querySelector("#password-flow-title"),
  passwordFlowDescription: document.querySelector("#password-flow-description"),
  studentAccessResult: document.querySelector("#student-access-result"),
  studentAccessPanel: document.querySelector("#student-access-panel")
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

function getWorkoutName(workout, fallback = "") {
  return window.AlionWorkoutData.getWorkoutName(workout, fallback);
}

function getWorkoutObjective(workout, fallback = "") {
  return window.AlionWorkoutData.getWorkoutObjective(workout, fallback);
}

function getWorkoutNotes(workout, fallback = "") {
  return window.AlionWorkoutData.getWorkoutNotes(workout, fallback);
}

function buildWorkoutFields(fields) {
  return window.AlionWorkoutData.buildWorkoutFields(fields);
}

function assertPersistedWorkout(result, expectedFields, fallbackMessage) {
  return window.AlionWorkoutData.assertPersistedWorkout(result, expectedFields, fallbackMessage);
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

const AVATAR_COLOR_CLASSES = ["color-1", "color-2", "color-3", "color-4", "color-5"];

/**
 * Gera uma classe de cor estavel para o avatar com base no nome.
 */
function getAvatarColor(name) {
  const text = String(name || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % AVATAR_COLOR_CLASSES.length;
  }
  return AVATAR_COLOR_CLASSES[Math.abs(hash) % AVATAR_COLOR_CLASSES.length];
}

/**
 * Formata datas do Supabase para exibicao em pt-BR.
 */
function formatDate(value) {
  if (!value) return "Sem data";
  const dateOnly = parseDateOnly(value);
  if (dateOnly) return `${dateOnly.day}/${dateOnly.month}/${dateOnly.year}`;
  return new Intl.DateTimeFormat("pt-BR").format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

/**
 * Le datas puras YYYY-MM-DD sem aplicar fuso horario.
 */
function parseDateOnly(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return {
    year: match[1],
    month: match[2],
    day: match[3]
  };
}

/**
 * Exibe mensagem de sucesso ou erro.
 */
function showToast(message, type = "success", { celebrate = false } = {}) {
  el.toast.textContent = message;
  el.toast.dataset.type = type;
  el.toast.classList.add("visible");
  el.toast.classList.toggle("celebrate", celebrate);
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
    console.error("[Alion Treinos] Erro ao ler localStorage:", error);
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
    console.error("[Alion Treinos] Erro ao salvar localStorage:", error);
  }
}

/**
 * Executa uma consulta Supabase e padroniza o tratamento de erro.
 */
async function runQuery(query, fallbackMessage) {
  await assertCurrentAccountActive();
  const { data, error } = await query;

  if (error) {
    console.error("[Alion Treinos] Erro Supabase:", error);
    state.lastError = error.message;
    throw new Error(`${fallbackMessage}: ${error.message}`);
  }

  return data || [];
}

async function fetchCurrentAccountActiveStatus() {
  if (!state.authUser?.id) return null;
  if (activeAccountStatusCheck) return activeAccountStatusCheck;

  activeAccountStatusCheck = (async () => {
    const { data, error } = await supabaseClient.rpc("is_current_user_active");
    if (error) {
      console.warn("[Alion Treinos] Nao foi possivel confirmar o status atual da conta.", error);
      return null;
    }
    return data === true;
  })();

  try {
    return await activeAccountStatusCheck;
  } finally {
    activeAccountStatusCheck = null;
  }
}

async function handleSuspendedAccount() {
  if (suspensionHandlingPromise) return suspensionHandlingPromise;
  suspensionHandlingPromise = (async () => {
    const message = "Sua conta está suspensa. Procure o administrador.";
    try {
      await handleAuthLogout({ skipConfirmation: true, silent: true });
    } finally {
      el.authStatus.textContent = message;
      showToast(message, "error");
      changeScreen("access");
    }
  })();

  try {
    await suspensionHandlingPromise;
  } finally {
    suspensionHandlingPromise = null;
  }
}

async function assertCurrentAccountActive() {
  if (!state.authUser?.id || suspensionHandlingPromise) return;
  const active = await fetchCurrentAccountActiveStatus();
  if (active !== false) return;

  await handleSuspendedAccount();
  const error = new Error("Sua conta está suspensa. Procure o administrador.");
  error.code = "ACCOUNT_SUSPENDED";
  throw error;
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
  if (!state.authUser?.id) {
    state.students = [];
    state.studentInvites = [];
    state.trainerStudents = [];
    state.workouts = [];
    state.workoutExercises = [];
    state.workoutLogs = [];
    state.appProfiles = [];
    state.trainerInvites = [];
    state.trashRecords = [];
    setConnectionStatus("Faça login para carregar seus dados", false);
    return;
  }

  setConnectionStatus("Conectando...", false);

  const role = getCurrentRole();
  const canLoadInvites = ["trainer", "admin"].includes(role);
  const canLoadProfiles = role === "admin";
  const [
    students,
    exercises,
    studentInvites,
    trainerStudents,
    workouts,
    workoutExercises,
    workoutLogs,
    appProfiles,
    trainerInvites,
    trashRecords
  ] = await Promise.all([
    safeFetchTable("students", { orderBy: "created_at" }),
    safeFetchTable("exercise_library", { orderBy: "name", ascending: true }),
    canLoadInvites ? safeFetchTable("student_invites", { orderBy: "created_at" }) : Promise.resolve([]),
    canLoadInvites ? safeFetchTable("trainer_students", { orderBy: "created_at" }) : Promise.resolve([]),
    safeFetchTable("workouts", { orderBy: "created_at" }),
    safeFetchTable("workout_exercises"),
    safeFetchTable("workout_logs", { orderBy: "created_at" }),
    canLoadProfiles ? safeFetchTable("app_profiles", { orderBy: "created_at" }) : Promise.resolve([]),
    canLoadProfiles ? safeFetchTable("trainer_invites", { orderBy: "created_at" }) : Promise.resolve([]),
    ["trainer", "admin"].includes(role) ? safeFetchTable("alion_trash_records", { orderBy: "deleted_at" }) : Promise.resolve([])
  ]);

  state.students = students;
  state.exercises = exercises;
  state.studentInvites = studentInvites;
  state.trainerStudents = trainerStudents;
  state.workouts = workouts;
  state.workoutExercises = workoutExercises;
  state.workoutLogs = workoutLogs;
  state.appProfiles = appProfiles;
  state.trainerInvites = trainerInvites;
  state.trashRecords = trashRecords.filter((record) => !record.restored_at && !record.permanently_deleted_at);

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
  if (!hasBlockingError) state.lastError = "";
  setConnectionStatus(hasBlockingError ? "Conexao parcial" : "Supabase conectado", !hasBlockingError);
  if (!hasBlockingError) syncPendingWorkoutLogs();
  renderAll();

  if (options.silent) return;
  if (hasBlockingError) {
    showToast(state.tableErrors.students || state.tableErrors.exercise_library, "error");
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
  const role = getCurrentRole();
  if (["trainer", "admin"].includes(role)) {
    renderMetrics();
    renderTrainerStudents();
    renderExerciseSelect();
    renderExerciseLibrary();
    renderTrainerProfile();
    renderInvites();
    renderTrash();
  }
  if (role === "student") {
    renderStudentAreaSelect();
    renderStudentArea();
  }
  if (role === "admin") renderAdminArea();
}

/**
 * Renderiza os indicadores da area Treinador.
 */
function renderMetrics() {
  const metrics = window.AlionTrainerDataRules.calculateTrainerMetrics({
    students: getAccessibleStudents(),
    exercises: getUniqueExercises(),
    workouts: state.workouts,
    logs: state.workoutLogs
  });
  setKpiValue(el.totalStudents, metrics.students);
  setKpiValue(el.totalExercises, metrics.exercises);
  setKpiValue(el.totalWorkouts, metrics.workouts);
  setKpiValue(el.totalLogs, metrics.completed);
}

function setKpiValue(element, value) {
  if (!element) return;
  const number = Number(value || 0);
  element.textContent = number;
  element.classList.toggle("positive", number > 0);
}

/**
 * Preenche o seletor da area Aluno.
 */
function renderStudentAreaSelect() {
  const students = getAccessibleStudents();
  el.studentAreaSelect.innerHTML = `<option value="">Selecione um aluno</option>${students.map(renderStudentOption).join("")}`;
  el.studentAreaSelect.value = state.studentAreaId;
  const lockedToOwnProfile = isStudent() && Boolean(state.authProfile?.student_id);
  el.studentAreaSelect.disabled = lockedToOwnProfile;
  el.studentAreaSelect.classList.toggle("hidden", lockedToOwnProfile);
  const helperText = el.studentAreaSelect.closest(".section-title")?.querySelector("p");
  if (helperText) {
    helperText.textContent = lockedToOwnProfile
      ? "Acesse seu treino, histórico e evolução."
      : "Escolha seu nome para visualizar treino, histórico e evolução.";
  }
}

/**
 * Cria uma opcao de aluno para selects.
 */
function renderStudentOption(student) {
  const name = pick(student, ["name", "full_name", "nome"], "Aluno sem nome");
  return `<option value="${escapeHtml(student.id)}">${escapeHtml(name)}</option>`;
}

function clearStudentAreaContainers() {
  [
    el.studentCurrentWorkout,
    el.studentHistory,
    el.studentEvolution,
    el.studentAssessments,
    el.studentMeasurements
  ].forEach((container) => {
    if (container) container.innerHTML = "";
  });
}

function clearStudentAdvancedContainers() {
  [
    el.studentHistory,
    el.studentEvolution,
    el.studentAssessments,
    el.studentMeasurements
  ].forEach((container) => {
    if (container) container.innerHTML = "";
  });
}

function renderStudentArea() {
  updateStudentModeUi();
  clearStudentAreaContainers();
  renderStudentPdfControls();
  renderStudentCharacterPreference();

  if (!state.studentAreaId) {
    el.studentCurrentWorkout.innerHTML = emptyMessage("Selecione um aluno para visualizar o treino atual.");
    if (state.studentMode === "advanced") {
      el.studentHistory.innerHTML = emptyMessage("Selecione um aluno para visualizar o histórico.");
      el.studentEvolution.innerHTML = emptyMessage("Selecione um aluno para visualizar a evolução.");
      el.studentAssessments.innerHTML = emptyMessage("Selecione um aluno para visualizar suas avaliações.");
      el.studentMeasurements.innerHTML = emptyMessage("Selecione um aluno para visualizar suas medidas.");
    }
    el.completeWorkoutButton.disabled = true;
    el.completeWorkoutButton.classList.add("hidden");
    return;
  }

  const logs = getAllWorkoutLogs().filter((log) => String(log.student_id) === String(state.studentAreaId));
  const todayLog = window.AlionWorkoutRotation.findTodayLog(logs, state.studentAreaId);
  const currentWorkout = getCurrentWorkout(state.studentAreaId);
  el.completeWorkoutButton.classList.toggle("hidden", !currentWorkout);

  if (state.studentMode === "easy") {
    if (todayLog) {
      el.studentCurrentWorkout.innerHTML = renderEasyWorkoutCelebration(todayLog, currentWorkout);
      el.completeWorkoutButton.classList.add("hidden");
      el.completeWorkoutButton.disabled = true;
    } else {
      el.studentCurrentWorkout.innerHTML = currentWorkout
        ? renderEasyStudentWorkout(currentWorkout, logs)
        : emptyMessage("Nenhum treino atual encontrado para este aluno.");
    }
  } else {
    el.studentCurrentWorkout.innerHTML = currentWorkout
      ? renderWorkoutWithExercises(currentWorkout)
      : emptyMessage("Nenhum treino atual encontrado para este aluno.");
    el.studentHistory.innerHTML = logs.length
      ? `${renderStudentProgressMessage(logs)}${renderMobileProgressDetails()}${logs.map(renderWorkoutLogItem).join("")}`
      : `${renderStudentProgressMessage(logs)}${emptyMessage("Nenhum treino concluido encontrado.")}`;
  }

  updateCompleteWorkoutButtonState(currentWorkout);
  if (state.studentMode === "advanced") renderStudentDetails();
}

function hasCurrentWorkoutExecutionProgress(workout) {
  if (!workout) return false;
  const workoutExerciseIds = new Set(
    state.workoutExercises
      .filter((item) => String(item.workout_id) === String(workout.id))
      .map((item) => String(item.id))
  );

  return Object.entries(state.studentExerciseExecution).some(([exerciseId, execution]) => {
    if (!workoutExerciseIds.has(String(exerciseId))) return false;
    return Boolean(
      execution.completed
      || execution.skipped
      || Number(execution.completed_sets || 0) > 0
      || String(execution.actual_weight || "").trim()
      || String(execution.actual_reps || "").trim()
      || String(execution.actual_sets || "").trim()
      || String(execution.pain_level || "").trim()
      || String(execution.difficulty || "").trim()
      || String(execution.notes || "").trim()
    );
  });
}

function updateCompleteWorkoutButtonState(workout = getCurrentWorkout(state.studentAreaId)) {
  if (!el.completeWorkoutButton) return;
  el.completeWorkoutButton.disabled = !workout || !hasCurrentWorkoutExecutionProgress(workout);
}

function updateStudentModeUi() {
  document.body.dataset.studentMode = state.studentMode;
  el.studentScreen?.classList.toggle("student-mode-easy", state.studentMode === "easy");
  el.studentScreen?.classList.toggle("student-mode-advanced", state.studentMode === "advanced");
  el.studentModeToggle?.querySelectorAll("[data-student-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.studentMode === state.studentMode);
  });
}

/**
 * Seleciona o treino ativo seguinte ao último treino concluído pelo aluno.
 */
function getCurrentWorkout(studentId) {
  return window.AlionWorkoutRotation.selectCurrentWorkout(
    state.workouts,
    getAllWorkoutLogs(),
    studentId
  );
}

function getNextWorkout(studentId, currentWorkoutId) {
  const active = window.AlionWorkoutRotation.getActiveWorkouts(state.workouts, studentId);
  if (!active.length) return null;
  const currentIndex = active.findIndex((workout) => String(workout.id) === String(currentWorkoutId));
  if (currentIndex < 0) return active[0];
  return active[(currentIndex + 1) % active.length];
}

function getPendingWorkoutLogs() {
  if (!state.authUser?.id) return [];
  return readLocalJson(`${PENDING_WORKOUT_LOGS_KEY}:${state.authUser.id}`, []);
}

function renderStudentCharacterPreference() {
  const form = el.studentCharacterPreferenceForm;
  if (!form) return;
  const student = getStudentForExerciseMedia(state.studentAreaId);
  const canEditOwnPreference = isStudent()
    && String(state.authProfile?.student_id || "") === String(student?.id || "");
  form.classList.toggle("hidden", !canEditOwnPreference);
  if (!canEditOwnPreference) return;
  const preference = getStudentCharacterPreference(student);
  const input = form.querySelector(`input[name="preference"][value="${preference}"]`);
  if (input) input.checked = true;
}

async function saveStudentCharacterPreference(form) {
  const preference = new FormData(form).get("preference");
  if (!window.AlionExerciseMedia?.normalizeCharacterPreference(preference)) {
    showToast("Escolha Masculino, Feminino ou Aleatório.", "error");
    return;
  }
  setFormLoading(form, true);
  try {
    const { data, error } = await supabaseClient.rpc("update_my_exercise_character_preference", {
      selected_preference: preference
    });
    if (error) throw error;
    const student = getStudentForExerciseMedia(state.studentAreaId);
    if (student) student.exercise_character_preference = data || preference;
    showToast("Preferência visual atualizada.");
    renderStudentArea();
  } catch (error) {
    showToast(`Não foi possível salvar a preferência: ${error.message}`, "error");
  } finally {
    setFormLoading(form, false);
  }
}

function savePendingWorkoutLogs(logs) {
  if (!state.authUser?.id) return;
  const sensitiveFields = new Set(["pain_level", "pain_location", "feedback", "notes", "observations", "observacoes"]);
  const scrub = (value) => {
    if (Array.isArray(value)) return value.map(scrub);
    if (!value || typeof value !== "object") return value;
    return Object.fromEntries(Object.entries(value)
      .filter(([key]) => !sensitiveFields.has(key))
      .map(([key, nested]) => [key, scrub(nested)]));
  };
  writeLocalJson(`${PENDING_WORKOUT_LOGS_KEY}:${state.authUser.id}`, scrub(logs));
}

function getAllWorkoutLogs() {
  return [...state.workoutLogs, ...getPendingWorkoutLogs()];
}

function getStudentSyncStatus() {
  if (!navigator.onLine) return { label: "Aguardando internet", className: "waiting" };
  if (state.pendingLogSyncInProgress) return { label: "Sincronizando", className: "syncing" };
  const pendingCount = getPendingWorkoutLogs().length;
  if (pendingCount) return { label: `${pendingCount} pendente(s) de sincronização`, className: "local" };
  if (state.lastError) return { label: "Não foi possível sincronizar", className: "error" };
  return { label: "Sincronizado", className: "synced" };
}

function renderEasyWorkoutCelebration(todayLog, nextWorkout) {
  const completedWorkout = state.workouts.find((workout) => String(workout.id) === String(todayLog.workout_id));
  return `
    <article class="easy-celebration-card" role="status" aria-live="polite">
      <span class="easy-celebration-icon" aria-hidden="true">✓</span>
      <h2>Parabéns!</h2>
      <strong>Treino concluído por hoje.</strong>
      <p>Seu progresso foi salvo.</p>
      <small>Treino realizado: ${escapeHtml(getWorkoutName(completedWorkout, "Treino"))}</small>
      <span>Próximo treino: ${escapeHtml(getWorkoutName(nextWorkout, "Aguardando novo treino"))}.</span>
    </article>
  `;
}

function renderEasyStudentWorkout(workout, logs) {
  const student = state.students.find((item) => String(item.id) === String(state.studentAreaId));
  const exercises = getWorkoutExercisesInStableOrder(workout.id);
  const nextWorkout = getNextWorkout(state.studentAreaId, workout.id);
  const lastLog = logs[0];
  const workoutObjective = getWorkoutObjective(workout, "Objetivo não informado");
  const personalNotes = getWorkoutNotes(workout, "");
  const summary = getWorkoutExecutionSummary(workout.id);
  const progressPercent = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;
  const exerciseIds = exercises.map((item) => String(item.id));
  const requestedIndex = state.awaitingFeedbackExerciseId
    ? exercises.findIndex((item) => String(item.id) === String(state.awaitingFeedbackExerciseId))
    : state.studentExerciseIndex;
  const currentIndex = state.awaitingFeedbackExerciseId && requestedIndex >= 0
    ? requestedIndex
    : window.AlionEasyWorkoutFlow.getCurrentExerciseIndex(
      exerciseIds,
      state.studentExerciseExecution,
      Math.max(0, requestedIndex)
    );
  const currentExercise = currentIndex >= 0 ? exercises[currentIndex] : null;
  const syncStatus = getStudentSyncStatus();
  state.studentExerciseIndex = Math.max(0, currentIndex);

  return `
    <article class="easy-summary-card">
      <span class="student-sync-status ${syncStatus.className}" role="status">● ${escapeHtml(syncStatus.label)}</span>
      <small>${escapeHtml(pick(student, ["name", "nome"], "Aluno"))}</small>
      <strong>${escapeHtml(getWorkoutName(workout, "Treino de hoje"))}</strong>
      <span>Objetivo: ${escapeHtml(workoutObjective)}</span>
      <span>Próximo treino: ${escapeHtml(getWorkoutName(nextWorkout, "Não informado"))}</span>
      <span>Último treino feito: ${escapeHtml(lastLog ? formatDate(pick(lastLog, ["completed_at", "created_at"], "")) : "Ainda não registrado")}</span>
      ${personalNotes ? `<small>Observações do treino: ${escapeHtml(personalNotes)}</small>` : ""}
      ${summary.total ? `
        <div class="workout-progress">
          <div class="workout-progress-label">
            <span>Progresso do treino</span>
            <span>${summary.completed} de ${summary.total}</span>
          </div>
          <div class="workout-progress-bar">
            <div class="workout-progress-fill" style="width: ${progressPercent}%"></div>
          </div>
        </div>
      ` : ""}
    </article>
    <div class="easy-exercise-list" aria-live="polite">
      ${currentExercise ? renderEasyExerciseCard(currentExercise, currentIndex, exercises.length) : emptyMessage("Este treino ainda não possui exercícios.")}
    </div>
  `;
}

function renderEasyExerciseCard(item, exerciseIndex = 0, exerciseTotal = 1) {
  const exercise = getLibraryExerciseForWorkoutItem(item);
  const exerciseName = pick(item, ["exercise_name"], pick(exercise, ["name", "title", "nome"], "Exercício"));
  const student = getStudentForExerciseMedia();
  const imageUrl = getExerciseMediaByGender(exercise, student, "image");
  const image = renderEasyExerciseThumb(imageUrl, exerciseName);
  const execution = getStudentExerciseExecution(item.id);
  const doneClass = execution.completed && !execution.skipped ? " done" : "";
  const restLeft = Math.max(0, Number(state.restTimers[item.id] || 0));
  const isConfirming = String(state.pendingConfirmExerciseId) === String(item.id);
  const plannedSets = getPlannedSets(item);
  const completedSets = Math.min(plannedSets, Math.max(0, Number(execution.completed_sets || 0)));
  const currentSet = Math.min(plannedSets, completedSets + 1);
  const reps = pick(item, ["reps"], "-");
  const restSeconds = pick(item, ["rest_seconds"], "0");
  const plannedWeight = pick(item, ["weight"], "-");
  const doneButtonDisabled = execution.completed && !execution.skipped ? " disabled" : "";
  const currentDisplay = execution.completed ? `${plannedSets} de ${plannedSets}` : `${currentSet} de ${plannedSets}`;
  const nextDisplay = completedSets >= plannedSets ? "Concluído" : `${Math.min(plannedSets, currentSet + 1)} de ${plannedSets}`;
  const restLabel = restLeft ? "Descanso em andamento" : `Descanso: ${restSeconds}s`;
  const instructionParts = window.AlionExerciseMedia?.instructionParts(exercise) || [];
  const shortInstruction = pick(exercise, ["instructions", "description", "instrucoes"], pick(item, ["instructions"], ""));
  const isAwaitingFeedback = String(state.awaitingFeedbackExerciseId) === String(item.id);
  const feedback = window.AlionEasyWorkoutFlow.normalizeFeedback(execution.feedback);

  return `
    <article class="easy-exercise-card${doneClass}" data-easy-exercise-card-id="${escapeHtml(item.id)}">
      <p class="easy-exercise-counter">Exercício ${exerciseIndex + 1} de ${exerciseTotal}</p>
      <div class="easy-exercise-main">
        <div class="easy-exercise-info">
          <strong>${escapeHtml(exerciseName)}</strong>
          <div class="easy-plan-list">
            <span><b class="easy-plan-icon">↻</b> Séries: ${escapeHtml(plannedSets)}</span>
            <span><b class="easy-plan-icon">⟳</b> Repetições: ${escapeHtml(reps)}</span>
            <span><b class="easy-plan-icon">▣</b> Carga prevista: ${escapeHtml(plannedWeight)}</span>
          </div>
        </div>
        <button class="easy-image-button" type="button" data-expand-exercise-image="${escapeHtml(getExerciseMediaUrl(imageUrl, "image") || window.AlionExerciseMedia.PLACEHOLDER)}" data-exercise-image-alt="${escapeHtml(exerciseName)}" aria-label="Ampliar imagem de ${escapeHtml(exerciseName)}">${image}</button>
      </div>
      ${shortInstruction ? `<p class="easy-short-instruction">${escapeHtml(shortInstruction)}</p>` : ""}
      <div class="easy-support-actions">
        <button class="secondary-button" type="button" data-workout-exercise-quick="speak" data-workout-exercise-id="${escapeHtml(item.id)}">🔊 Ouvir instrução</button>
        <button class="ghost-button" type="button" data-workout-exercise-quick="stop-speech" data-workout-exercise-id="${escapeHtml(item.id)}">Parar leitura</button>
      </div>
      ${instructionParts.length ? `
        <details class="easy-how-to">
          <summary>Como fazer</summary>
          ${instructionParts.map(([label, value]) => `<section><strong>${escapeHtml(label)}</strong><p>${escapeHtml(value)}</p></section>`).join("")}
        </details>
      ` : ""}
      <span class="easy-rest-status">${escapeHtml(restLabel)}</span>
      <label>Carga usada hoje
        <input class="easy-big-input" data-workout-exercise-field="actual_weight" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.actual_weight)}" placeholder="Ex: 10 kg" />
      </label>
      <label>Observação
        <input data-workout-exercise-field="notes" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.notes)}" placeholder="Opcional" />
      </label>
      <div class="easy-rest-row">
        <button class="secondary-button easy-rest-button" type="button" data-workout-exercise-quick="rest" data-workout-exercise-id="${escapeHtml(item.id)}">▷ Iniciar descanso</button>
        <strong class="rest-timer">${restLeft ? `${restLeft}s` : `${escapeHtml(restSeconds)}s`}</strong>
      </div>
      <button class="primary-button easy-done-button" type="button" data-workout-exercise-quick="confirm-done" data-workout-exercise-id="${escapeHtml(item.id)}"${doneButtonDisabled}>
        ${execution.completed && !execution.skipped ? "✓ Exercício concluído" : "Concluir série"}
      </button>
      <div class="series-progress">
        <div class="series-side">
          <small>Série atual</small>
          <strong>${escapeHtml(currentDisplay)}</strong>
        </div>
        <div class="series-progress-bar" aria-label="Progresso das séries">
          ${renderSeriesSegments(plannedSets, completedSets)}
        </div>
        <div class="series-side right">
          <small>Próxima série</small>
          <strong>${escapeHtml(nextDisplay)}</strong>
        </div>
      </div>
      ${isConfirming ? `
        <div class="easy-confirm-box">
          <strong>Concluir esta série?</strong>
          <div class="easy-confirm-actions">
            <button class="primary-button" type="button" data-workout-exercise-quick="confirm-yes" data-workout-exercise-id="${escapeHtml(item.id)}">Sim, concluir série</button>
            <button class="secondary-button" type="button" data-workout-exercise-quick="confirm-back" data-workout-exercise-id="${escapeHtml(item.id)}">Voltar</button>
          </div>
        </div>
      ` : ""}
      ${isAwaitingFeedback ? `
        <section class="exercise-feedback" aria-labelledby="feedback-title-${escapeHtml(item.id)}">
          <strong id="feedback-title-${escapeHtml(item.id)}">Como foi este exercício?</strong>
          <div class="feedback-options">
            ${[["facil", "Fácil"], ["adequado", "Adequado"], ["dificil", "Difícil"], ["dor", "Senti dor"]].map(([value, label]) => `
              <button class="quick-button${feedback === value ? " active" : ""}" type="button" data-workout-exercise-quick="feedback" data-feedback-value="${value}" data-workout-exercise-id="${escapeHtml(item.id)}">${label}</button>
            `).join("")}
          </div>
          ${feedback === "dor" ? `
            <div class="pain-feedback-fields">
              <label>Local da dor<input data-workout-exercise-field="pain_location" data-workout-exercise-id="${escapeHtml(item.id)}" value="${escapeHtml(execution.pain_location || "")}" /></label>
              <label>Intensidade de 1 a 10<input type="number" min="1" max="10" data-workout-exercise-field="pain_level" data-workout-exercise-id="${escapeHtml(item.id)}" value="${escapeHtml(execution.pain_level || "")}" /></label>
              <label>Observação<input data-workout-exercise-field="notes" data-workout-exercise-id="${escapeHtml(item.id)}" value="${escapeHtml(execution.notes || "")}" /></label>
            </div>
            <p class="pain-safety-note">Interrompa o exercício e converse com seu personal ou profissional de saúde. Este registro não substitui avaliação profissional.</p>
          ` : ""}
          <button class="primary-button" type="button" data-workout-exercise-quick="save-feedback" data-workout-exercise-id="${escapeHtml(item.id)}" ${feedback ? "" : "disabled"}>Salvar feedback e continuar</button>
        </section>
      ` : ""}
    </article>
  `;
}

function renderSeriesSegments(plannedSets, completedSets) {
  return Array.from({ length: plannedSets }, (_, index) => {
    const activeClass = index < completedSets ? " active" : "";
    return `<span class="series-segment${activeClass}"></span>`;
  }).join("");
}

function renderStudentProgressMessage(logs) {
  if (logs.length < 2) {
    return `<article class="simple-item stacked progress-message"><strong>Ainda não há histórico suficiente para comparar.</strong></article>`;
  }

  const currentSnapshot = normalizeExercisesSnapshot(pick(logs[0], ["exercises_snapshot"], []));
  const previousSnapshot = normalizeExercisesSnapshot(pick(logs[1], ["exercises_snapshot"], []));
  const currentTotal = currentSnapshot.reduce((sum, item) => sum + (Number(item.actual_weight || item.weight || 0) || 0) + (Number(item.actual_reps || item.reps || 0) || 0), 0);
  const previousTotal = previousSnapshot.reduce((sum, item) => sum + (Number(item.actual_weight || item.weight || 0) || 0) + (Number(item.actual_reps || item.reps || 0) || 0), 0);
  const message = currentTotal >= previousTotal
    ? "Boa! Voce evoluiu em relacao ao treino anterior."
    : "Hoje foi mais dificil, mas isso tambem faz parte do processo.";
  return `<article class="simple-item stacked progress-message"><strong>${escapeHtml(message)}</strong></article>`;
}

function renderMobileProgressDetails() {
  const completedCount = state.workoutLogs.filter((log) => String(log.student_id) === String(state.studentAreaId)).length;
  return `
    <div class="mobile-progress-details">
      <details><summary>Ver evolução de carga</summary><div class="mini-card"><span>Cargas anteriores aparecem no histórico do treino.</span></div></details>
      <details><summary>Ver evolução de repetições</summary><div class="mini-card"><span>Compare as repetições registradas nos treinos concluídos.</span></div></details>
      <details><summary>Ver frequencia de treinos</summary><div class="mini-card"><span>Treinos concluidos: ${escapeHtml(completedCount)}</span></div></details>
    </div>
  `;
}

/**
 * Renderiza um treino com seus exercícios cadastrados.
 */
function renderWorkoutWithExercises(workout) {
  const exercises = state.workoutExercises.filter((item) => String(item.workout_id) === String(workout.id));
  const safeIndex = Math.min(Math.max(state.studentExerciseIndex, 0), Math.max(exercises.length - 1, 0));
  state.studentExerciseIndex = safeIndex;
  const currentExercise = exercises[safeIndex];
  const workoutNotes = getWorkoutNotes(workout, "");

  return `
    <article class="list-item workout-highlight student-workout-start">
      <div>
        <small>Treino do dia</small>
        <strong>${escapeHtml(getWorkoutName(workout, "Treino sem nome"))}</strong>
        <span>Objetivo: ${escapeHtml(getWorkoutObjective(workout, "Objetivo não informado"))}</span>
        ${workoutNotes ? `<small>Observações: ${escapeHtml(workoutNotes)}</small>` : ""}
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
      <strong>Exercício ${index + 1} de ${total}</strong>
      <span>Faca na ordem que preferir. Os dados ficam salvos no aparelho.</span>
    </div>
    ${renderWorkoutExerciseItem(exercise)}
    <div class="student-exercise-nav">
      <button class="secondary-button" type="button" data-student-exercise-nav="prev" ${index === 0 ? "disabled" : ""}>Anterior</button>
      <button class="primary-button" type="button" data-student-exercise-nav="next" ${index >= total - 1 ? "disabled" : ""}>Próximo exercício</button>
    </div>
  `;
}

function getExecutionDraftKey(workoutId = getCurrentWorkout(state.studentAreaId)?.id) {
  return state.authUser?.id && workoutId && state.studentAreaId
    ? `${EXECUTION_DRAFT_PREFIX}:${state.authUser.id}:${state.studentAreaId}:${workoutId}`
    : "";
}

function loadCurrentExecutionDraft() {
  state.studentExerciseExecution = {};
}

function saveCurrentExecutionDraft() {
  // Dados de execução podem conter informações de saúde e permanecem apenas em memória.
}

function getPlannedSets(exercise) {
  return Math.max(1, Number(numberOrNull(pick(exercise, ["sets"], "")) || 1));
}

function getStudentExerciseExecution(exerciseId) {
  const key = String(exerciseId);
  if (!(key in state.studentExerciseExecution)) {
    state.studentExerciseExecution[key] = {
      completed: false,
      skipped: false,
      completed_sets: 0,
      actual_weight: "",
      actual_reps: "",
      actual_sets: "",
      pain_level: "",
      pain_location: "",
      feedback: "",
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
    actual_sets: execution.actual_sets || (execution.completed_sets ? String(execution.completed_sets) : null),
    pain_level: execution.pain_level === "" ? null : numberOrNull(execution.pain_level),
    pain_location: execution.pain_location || null,
    feedback: window.AlionEasyWorkoutFlow.normalizeFeedback(execution.feedback) || null,
    difficulty: execution.difficulty || null,
    notes: execution.notes || null
  };
}

function renderWorkoutExerciseItem(item) {
  const exercise = getLibraryExerciseForWorkoutItem(item);
  const student = getStudentForExerciseMedia(state.studentAreaId);
  const exerciseName = pick(item, ["exercise_name"], pick(exercise, ["name", "title", "nome"], "Exercício"));
  const group = pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "");
  const imageUrl = getExerciseMediaByGender(exercise, student, "image");
  const videoUrl = getExerciseMediaByGender(exercise, student, "video");
  const instructions = pick(exercise, ["instructions", "description", "instrucoes"], pick(item, ["instructions"], ""));
  const commonMistakes = pick(exercise, ["common_mistakes"], "");
  const execution = getStudentExerciseExecution(item.id);
  const fastDone = execution.completed && !execution.skipped ? "active" : "";
  const fastSkipped = execution.skipped ? "active" : "";
  const fastPain = execution.pain_level !== "" ? "active" : "";

  return `
    <article class="simple-item workout-execution-item">
      <div class="exercise-execution-main">
        <small>Exercício atual</small>
        <strong>${escapeHtml(exerciseName)}</strong>
        ${group ? `<span>Grupo muscular: ${escapeHtml(group)}</span>` : ""}
      <span>Planejado: Séries: ${escapeHtml(pick(item, ["sets"], "-"))} | Reps: ${escapeHtml(pick(item, ["reps"], "-"))} | Carga: ${escapeHtml(pick(item, ["weight"], "-"))} | Descanso: ${escapeHtml(pick(item, ["rest_seconds"], "-"))}s</span>
        ${renderExerciseImage(imageUrl, exerciseName)}
        ${renderExerciseVideoButton(videoUrl)}
        ${instructions ? `<small><b>Instrucoes:</b> ${escapeHtml(instructions)}</small>` : ""}
        ${commonMistakes ? `<small><b>Erros comuns:</b> ${escapeHtml(commonMistakes)}</small>` : ""}
        <div class="quick-actions">
          <button class="quick-button ${fastDone}" type="button" data-workout-exercise-quick="done" data-workout-exercise-id="${escapeHtml(item.id)}">Feito</button>
          <button class="quick-button" type="button" data-workout-exercise-quick="less" data-workout-exercise-id="${escapeHtml(item.id)}">Fiz menos</button>
          <button class="quick-button ${fastSkipped}" type="button" data-workout-exercise-quick="skip" data-workout-exercise-id="${escapeHtml(item.id)}">Pulei</button>
          <button class="quick-button ${fastPain}" type="button" data-workout-exercise-quick="pain" data-workout-exercise-id="${escapeHtml(item.id)}">Senti dor</button>
        </div>
        <div class="exercise-execution-grid">
          <label>Carga usada<input data-workout-exercise-field="actual_weight" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.actual_weight)}" /></label>
          <label>Reps feitas<input data-workout-exercise-field="actual_reps" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.actual_reps)}" /></label>
          <label>Séries feitas<input data-workout-exercise-field="actual_sets" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.actual_sets)}" /></label>
          <label>Dor 0-10<input data-workout-exercise-field="pain_level" data-workout-exercise-id="${escapeHtml(item.id)}" type="number" min="0" max="10" value="${escapeHtml(execution.pain_level)}" /></label>
          <label>Dificuldade<input data-workout-exercise-field="difficulty" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.difficulty)}" /></label>
          <label>Observação<input data-workout-exercise-field="notes" data-workout-exercise-id="${escapeHtml(item.id)}" type="text" value="${escapeHtml(execution.notes)}" /></label>
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
      <strong>${escapeHtml(getWorkoutName(workout, "Treino"))}</strong>
      <span>Concluído em ${formatDate(pick(log, ["completed_at", "created_at"]))}</span>
      ${snapshot.length ? `<div class="history-exercises"><b>Exercícios:</b>${snapshot.map(renderSnapshotExerciseItem).join("")}</div>` : `<small>Nenhum exercício salvo neste histórico.</small>`}
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
    console.error("[Alion Treinos] Erro ao ler exercises_snapshot:", error);
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
      <strong>${index + 1}. ${escapeHtml(pick(exercise, ["exercise_name"], "Exercício"))}</strong>
      <span>Planejado: Séries: ${escapeHtml(formatNumber(pick(exercise, ["planned_sets", "sets"], "-")))} | Reps: ${escapeHtml(pick(exercise, ["planned_reps", "reps"], "-"))} | Carga: ${escapeHtml(pick(exercise, ["planned_weight", "weight"], "-"))} | Descanso: ${escapeHtml(formatNumber(pick(exercise, ["planned_rest_seconds", "rest_seconds"], "-")))}s</span>
      <span>Realizado: Séries: ${escapeHtml(pick(exercise, ["actual_sets"], "-"))} | Reps: ${escapeHtml(pick(exercise, ["actual_reps"], "-"))} | Carga: ${escapeHtml(pick(exercise, ["actual_weight"], "-"))}</span>
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
  if (state.studentMode !== "advanced") {
    clearStudentAdvancedContainers();
    return;
  }

  const renderedStudentId = state.studentAreaId;

  try {
    const [assessments, measurements] = await Promise.all([
      fetchTable("assessments", { eq: { column: "student_id", value: state.studentAreaId }, orderBy: "created_at" }),
      fetchTable("body_measurements", { eq: { column: "student_id", value: state.studentAreaId }, orderBy: "created_at" })
    ]);

    if (state.studentMode !== "advanced" || String(renderedStudentId) !== String(state.studentAreaId)) return;

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
  const detail = pick(student, ["objective", "difficulties"], "Sem objetivo informado");
  const invite = getLatestInviteForStudent(student.id);
  const inviteStatusRaw = invite ? pick(invite, ["status"], "") : "";
  const inviteStatus = invite ? formatInviteStatus(inviteStatusRaw) : "Sem convite";
  const inviteStatusClass = getInviteStatusClass(inviteStatusRaw);
  const active = String(student.id) === String(state.selectedStudentId) ? " active" : "";

  return `
    <button class="list-item selectable student-list-card${active}" type="button" data-student-id="${escapeHtml(student.id)}">
      <div class="avatar student-avatar ${getAvatarColor(name)}">${escapeHtml(name.charAt(0).toUpperCase())}</div>
      <div class="student-list-info">
        <strong>${escapeHtml(name)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
      <small class="invite-badge ${escapeHtml(inviteStatusClass)}">${escapeHtml(inviteStatus)}</small>
    </button>
  `;
}

function renderEasyExerciseThumb(imageUrl, exerciseName) {
  const url = getExerciseMediaUrl(imageUrl, "image");
  return `
    <img class="easy-exercise-thumb" src="${escapeHtml(url || window.AlionExerciseMedia.PLACEHOLDER)}" alt="${escapeHtml(url ? exerciseName : `Imagem ainda não adicionada para ${exerciseName}`)}" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${window.AlionExerciseMedia.PLACEHOLDER}';" />
  `;
}

function getLibraryExerciseForWorkoutItem(item) {
  return state.exercises.find((record) => String(record.id) === String(item.exercise_id))
    || state.exercises.find((record) => normalizeText(pick(record, ["name", "title", "nome"], "")) === normalizeText(pick(item, ["exercise_name"], "")))
    || null;
}

function getHttpUrl(value) {
  const url = String(value || "").trim();
  return /^https?:\/\//i.test(url) ? url : "";
}

function isLocalExerciseAssetUrl(value, type = "image") {
  const url = String(value || "").trim().replace(/^\.?\//, "");
  const folder = type === "video" ? "videos" : "imagens";
  const extension = type === "video" ? /\.mp4$/i : /\.(webp|png|jpg|jpeg|gif)$/i;
  return url.startsWith(`assets/exercicios/${folder}/`) && extension.test(url);
}

function getExerciseMediaUrl(value, type = "image") {
  return window.AlionExerciseMedia?.safeUrl(value, type) || "";
}

function normalizeStudentGender(student) {
  const value = normalizeStudentGenderValue(pick(student, ["genero", "gender"], ""));
  if (value === "masculino" || value === "feminino") return value;
  return "aleatorio";
}

function normalizeStudentGenderValue(value) {
  const normalized = normalizeText(value);
  if (!normalized) return "";
  if (["masculino", "male", "homem", "m", "masc"].includes(normalized)) return "masculino";
  if (["feminino", "female", "mulher", "f", "fem"].includes(normalized)) return "feminino";
  if (["nao_binario", "nao-binario", "não binário", "não-binário", "non_binary", "non-binary", "nb"].includes(normalized)) return "nao_binario";
  if (["prefiro_nao_informar", "prefiro-nao-informar", "prefiro não informar", "nao_informar", "não informar"].includes(normalized)) return "prefiro_nao_informar";
  if (["outro", "other"].includes(normalized)) return "outro";
  return "";
}

function formatStudentGender(value) {
  const normalized = normalizeStudentGenderValue(value);
  const labels = {
    masculino: "Masculino",
    feminino: "Feminino",
    nao_binario: "Não binário",
    prefiro_nao_informar: "Prefiro não informar",
    outro: "Outro"
  };
  return labels[normalized] || "Não informado";
}

function getStudentForExerciseMedia(studentId = state.studentAreaId || state.selectedStudentId) {
  return state.students.find((student) => String(student.id) === String(studentId)) || null;
}

function getStudentCharacterPreference(student) {
  return window.AlionExerciseMedia?.resolveCharacterPreference(
    pick(student, ["exercise_character_preference"], ""),
    pick(student, ["genero", "gender"], "")
  ) || "random";
}

function getExerciseMediaByGender(exercise, student, type = "image") {
  if (type === "image") {
    return window.AlionExerciseMedia?.resolveExerciseImage({
      exercise,
      preference: pick(student, ["exercise_character_preference"], ""),
      gender: pick(student, ["genero", "gender"], ""),
      studentId: student?.id,
      exerciseId: exercise?.id
    }) || window.AlionExerciseMedia?.PLACEHOLDER || "";
  }

  const preference = getStudentCharacterPreference(student);
  const stableVariant = preference === "random"
    ? window.AlionExerciseMedia?.getStableCharacterVariant(student?.id, exercise?.id)
    : preference;
  const variant = stableVariant === "masculine" ? "masculino" : "feminino";
  const genderField = type === "video"
    ? (variant === "masculino" ? "video_url_masculino" : "video_url_feminino")
    : (variant === "masculino" ? "image_url_masculino" : "image_url_feminino");
  const legacyField = type === "video" ? "video_url" : "image_url";
  return pick(exercise, [genderField, legacyField], "");
}

function renderExerciseImage(imageUrl, altText, compact = false) {
  const url = getExerciseMediaUrl(imageUrl, "image");
  if (!url) {
    return `<div class="exercise-image-placeholder${compact ? " compact" : ""}">Imagem demonstrativa</div>`;
  }

  return `
    <div class="exercise-media-frame${compact ? " compact" : ""}">
      <img class="exercise-media-image${compact ? " compact" : ""}" src="${escapeHtml(url)}" alt="${escapeHtml(altText)}" loading="lazy" onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');" />
      <div class="exercise-image-placeholder hidden${compact ? " compact" : ""}">Imagem nao encontrada</div>
    </div>
  `;
}

function renderExerciseVideoButton(videoUrl) {
  const url = getExerciseMediaUrl(videoUrl, "video");
  return url
    ? `<button class="exercise-video-link" type="button" data-exercise-video-url="${escapeHtml(url)}">Assistir video</button>`
    : "";
}

function getLatestInviteForStudent(studentId) {
  return state.studentInvites
    .filter((invite) => String(invite.student_id) === String(studentId))
    .sort((a, b) => String(pick(b, ["created_at"], "")).localeCompare(String(pick(a, ["created_at"], ""))))[0] || null;
}

function formatInviteStatus(status) {
  const normalized = normalizeText(status || "");
  const labels = {
    pendente: "Pendente",
    aceito: "Aceito",
    aprovado: "Aprovado",
    recusado: "Recusado",
    expirado: "Expirado",
    cancelado: "Cancelado"
  };
  return labels[normalized] || "Não informado";
}

function getInviteStatusClass(status) {
  const normalized = normalizeText(status || "");
  if (["pendente"].includes(normalized)) return "pending";
  if (["aceito", "aprovado"].includes(normalized)) return "accepted";
  if (["expirado", "cancelado", "recusado"].includes(normalized)) return "expired";
  return "neutral";
}

function getStudentAccessState(student) {
  const invite = getLatestInviteForStudent(student?.id);
  if (!invite) return { key: "none", label: "Sem convite", invite: null };
  const status = normalizeText(invite.status);
  if (status === "pendente" && invite.expires_at && new Date(invite.expires_at) <= new Date()) {
    return { key: "expired", label: "Convite expirado", invite };
  }
  if (status === "pendente") return { key: "pending", label: "Convite pendente", invite };
  if (["aceito", "aprovado"].includes(status)) return { key: "accepted", label: "Conta vinculada", invite };
  if (["cancelado", "recusado"].includes(status)) return { key: "cancelled", label: "Convite cancelado", invite };
  if (status === "expirado") return { key: "expired", label: "Convite expirado", invite };
  return { key: status || "none", label: formatInviteStatus(status), invite };
}

function renderStudentAccessPanel(student) {
  if (!el.studentAccessPanel) return;
  if (!student) {
    el.studentAccessPanel.innerHTML = `<h3>Acesso ao Alion</h3>${emptyMessage("Selecione um aluno para consultar ou gerenciar o acesso.")}`;
    return;
  }

  const access = getStudentAccessState(student);
  const email = String(pick(student, ["email"], "")).trim();
  let actions = "";
  if (access.key === "none") {
    actions = email
      ? `<button class="tiny-button" type="button" data-student-access-action="generate">Gerar convite</button>`
      : `<small>Adicione um e-mail ao perfil para gerar o convite.</small>`;
  } else if (access.key === "pending") {
    actions = `
      <button class="tiny-button" type="button" data-student-access-action="copy" data-id="${escapeHtml(access.invite.id)}">Copiar link</button>
      <button class="tiny-button" type="button" data-student-access-action="share" data-id="${escapeHtml(access.invite.id)}">Compartilhar</button>
      <button class="tiny-button danger" type="button" data-student-access-action="cancel" data-id="${escapeHtml(access.invite.id)}">Cancelar convite</button>`;
  } else if (["expired", "cancelled"].includes(access.key)) {
    actions = email
      ? `<button class="tiny-button" type="button" data-student-access-action="generate-new">Gerar novo convite</button>`
      : `<small>Adicione um e-mail ao perfil para gerar um novo convite.</small>`;
  }

  el.studentAccessPanel.innerHTML = `
    <h3>Acesso ao Alion</h3>
    <strong>${escapeHtml(access.label)}</strong>
    <small>${escapeHtml(email || "E-mail não informado")}</small>
    ${access.key === "accepted" ? `<small>A identidade Auth existente está vinculada a este aluno.</small>` : ""}
    <div class="record-actions">${actions}</div>`;
}

/**
 * Implementacao legada mantida temporariamente para compatibilidade de leitura.
 */
async function renderTrainerProfileLegacyUnused() {
  const student = state.students.find((item) => String(item.id) === String(state.selectedStudentId));

  if (!student) {
    el.trainerProfileSummary.innerHTML = emptyMessage("Selecione um aluno para visualizar o perfil.");
    renderStudentAccessPanel(null);
    el.trainerAssessments.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    el.trainerMeasurements.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    el.trainerWorkouts.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    renderTrainerWorkoutSelect([]);
    return;
  }

  const name = pick(student, ["name", "full_name", "nome"], "Aluno sem nome");
  el.trainerProfileTitle.textContent = name;
  renderStudentAccessPanel(student);
  el.trainerProfileSummary.innerHTML = `
    <div class="profile-card">
      <div class="avatar large ${getAvatarColor(name)}">${escapeHtml(name.charAt(0).toUpperCase())}</div>
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

function getPdfEligibleWorkouts(studentId) {
  if (!window.AlionWorkoutPdf) return [];
  return window.AlionWorkoutPdf.getActiveStudentWorkouts(state.workouts, studentId);
}

function canExportWorkoutPdfForStudent(studentId) {
  if (!window.AlionWorkoutPdf || !studentId) return false;
  const role = getCurrentRole();
  return window.AlionWorkoutPdf.canExportStudent({
    role,
    trustedAdmin: state.trustedAdmin,
    selectedStudentId: studentId,
    ownStudentId: state.authProfile?.student_id || (role === "student" ? state.studentAreaId : ""),
    accessibleStudentIds: getAccessibleStudents().map((student) => student.id)
  });
}

function renderWorkoutPdfSelect(select, workouts, selectedValue) {
  if (!select) return "all";
  const options = [
    `<option value="all">Plano completo (${workouts.length} treino${workouts.length === 1 ? "" : "s"})</option>`,
    ...workouts.map((workout) => (
      `<option value="${escapeHtml(workout.id)}">${escapeHtml(getWorkoutName(workout, "Treino"))}</option>`
    ))
  ];
  select.innerHTML = options.join("");
  const validValue = selectedValue === "all" || workouts.some((workout) => String(workout.id) === String(selectedValue))
    ? String(selectedValue || "all")
    : "all";
  select.value = validValue;
  select.disabled = workouts.length === 0;
  return validValue;
}

function renderStudentPdfControls() {
  if (!el.studentPdfControls) return;
  const allowed = canExportWorkoutPdfForStudent(state.studentAreaId);
  const workouts = allowed ? getPdfEligibleWorkouts(state.studentAreaId) : [];
  el.studentPdfControls.classList.toggle("hidden", !allowed && Boolean(state.studentAreaId));
  state.studentPdfWorkoutId = renderWorkoutPdfSelect(el.studentPdfWorkoutSelect, workouts, state.studentPdfWorkoutId);
  if (el.studentDownloadWorkoutPdf) el.studentDownloadWorkoutPdf.disabled = !allowed || workouts.length === 0;
}

function renderTrainerPdfControls() {
  if (!el.trainerPdfControls) return;
  const allowed = canExportWorkoutPdfForStudent(state.selectedStudentId);
  const workouts = allowed ? getPdfEligibleWorkouts(state.selectedStudentId) : [];
  el.trainerPdfControls.classList.toggle("hidden", !allowed && Boolean(state.selectedStudentId));
  state.trainerPdfWorkoutId = renderWorkoutPdfSelect(el.trainerPdfWorkoutSelect, workouts, state.trainerPdfWorkoutId);
  if (el.trainerDownloadWorkoutPdf) el.trainerDownloadWorkoutPdf.disabled = !allowed || workouts.length === 0;
}

function resolveWorkoutPdfPersonalName(student, workouts) {
  const ownerId = [
    ...workouts.map((workout) => pick(workout, ["personal_id", "trainer_id", "owner_id"], "")),
    pick(student, ["personal_id", "trainer_id", "owner_id"], "")
  ].find(Boolean);
  const ownerProfile = state.appProfiles.find((profile) => (
    [profile.id, profile.user_id, profile.trainer_id].filter(Boolean).map(String).includes(String(ownerId || ""))
  ));
  const explicitName = workouts.map((workout) => (
    pick(workout, ["personal_name", "trainer_name", "professor_responsavel"], "")
  )).find(Boolean) || pick(student, ["personal_name", "trainer_name", "professor_responsavel"], "");
  const authenticatedTrainerName = getCurrentRole() === "trainer"
    ? pick(state.authProfile, ["name", "full_name", "nome"], "")
    : "";
  return pick(ownerProfile, ["name", "full_name", "nome"], explicitName || authenticatedTrainerName || "Personal responsável");
}

async function generateWorkoutPdf(studentId, selection = "all") {
  try {
    if (!window.AlionWorkoutPdf || !window.AlionExerciseMedia) {
      throw new Error("O gerador de PDF não foi carregado. Atualize a página e tente novamente.");
    }
    if (!canExportWorkoutPdfForStudent(studentId)) {
      throw new Error("Você não tem permissão para gerar a ficha deste aluno.");
    }
    const student = state.students.find((item) => String(item.id) === String(studentId));
    if (!student) throw new Error("Aluno não encontrado nesta sessão.");
    const eligibleWorkouts = getPdfEligibleWorkouts(studentId);
    const selectedWorkouts = window.AlionWorkoutPdf.resolveWorkoutSelection(eligibleWorkouts, selection);
    if (!selectedWorkouts.length) throw new Error("Nenhum treino ativo disponível para gerar a ficha.");

    const plan = window.AlionWorkoutPdf.buildPlan({
      student,
      personalName: resolveWorkoutPdfPersonalName(student, selectedWorkouts),
      workouts: selectedWorkouts,
      workoutExercises: state.workoutExercises,
      exerciseLibrary: state.exercises,
      selectExerciseImage: window.AlionExerciseMedia.selectExerciseImage
    });
    showToast("Preparando a ficha de treino...");
    await window.AlionWorkoutPdf.printPlan(plan, { baseUrl: document.baseURI });
    showToast("Ficha pronta. Escolha “Salvar como PDF” na tela de impressão.");
  } catch (error) {
    console.error("[Alion Treinos] Erro ao gerar ficha em PDF:", error);
    showToast(error.message || "Não foi possível gerar a ficha em PDF.", "error");
  }
}

function openWorkoutTemplateModal() {
  if (getCurrentRole() !== "trainer") return showToast("Somente o Personal pode gerar a Ficha Padrão Alion.", "error");
  const student = state.students.find((item) => String(item.id) === String(state.selectedStudentId));
  if (el.workoutTemplateStudentMode) {
    el.workoutTemplateStudentMode.disabled = !student || !canManageStudent(student.id);
    if (el.workoutTemplateStudentMode.disabled && el.workoutTemplateStudentMode.checked) {
      document.querySelector('input[name="workout-template-mode"][value="blank"]')?.click();
    }
  }
  el.workoutTemplateModal?.classList.remove("hidden");
}

function closeWorkoutTemplateModal() {
  el.workoutTemplateModal?.classList.add("hidden");
}

async function downloadWorkoutTemplate() {
  try {
    const version = Number(el.workoutTemplateVersion?.value || 2);
    const generator = version === 2 ? window.AlionWorkoutTemplateV2 : window.AlionWorkoutTemplateV1;
    if (!generator) throw new Error("O gerador da Ficha Alion não foi carregado.");
    const mode = document.querySelector('input[name="workout-template-mode"]:checked')?.value || "blank";
    const student = mode === "student"
      ? state.students.find((item) => String(item.id) === String(state.selectedStudentId))
      : null;
    if (mode === "student" && (!student || !canManageStudent(student.id))) throw new Error("Selecione um aluno autorizado ou gere uma ficha em branco.");
    const trainerName = pick(state.authProfile, ["name", "full_name", "nome"], "");
    el.workoutTemplateDownload.disabled = true;
    showToast("Gerando a Ficha Padrão Alion...");
    const templateOptions = {
      workoutCount: Number(el.workoutTemplateCount?.value || 1),
      exercisesPerWorkout: Number(el.workoutTemplateExercises?.value || 6),
      studentName: student ? pick(student, ["name", "full_name", "nome"], "") : "",
      trainerName: student ? trainerName : "",
      objective: student ? pick(student, ["objective"], "") : "",
      generatorVersion: `alion-web-template-v${version}`
    };
    if (version === 1) await window.AlionWorkoutTemplateV1.download(templateOptions);
    else await window.AlionWorkoutTemplateV2.download(templateOptions);
    closeWorkoutTemplateModal();
    showToast("Ficha preenchível baixada. O arquivo não foi armazenado pelo Alion.", "success");
  } catch (error) {
    console.error("[Alion Treinos] Erro ao gerar Ficha Padrão:", error);
    showToast(error.message || "Não foi possível gerar a Ficha Padrão Alion.", "error");
  } finally {
    if (el.workoutTemplateDownload) el.workoutTemplateDownload.disabled = false;
  }
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
  const workoutNotes = getWorkoutNotes(workout, "");
  return `
    <article class="list-item">
      <div>
        <strong>${escapeHtml(getWorkoutName(workout, "Treino sem nome"))}</strong>
        <span>Objetivo: ${escapeHtml(getWorkoutObjective(workout, "Objetivo não informado"))}</span>
        ${workoutNotes ? `<small>Observações: ${escapeHtml(workoutNotes)}</small>` : ""}
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
    ? workouts.map((workout) => `<option value="${escapeHtml(workout.id)}">${escapeHtml(getWorkoutName(workout, "Treino"))}</option>`).join("")
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

  try {
    const responsibleProfile = (isTrainer() || isAdmin())
      ? await fetchAppProfileByUserId(state.authUser?.id)
      : null;
    const responsibleProfileId = responsibleProfile?.id || null;

    if ((isTrainer() || isAdmin()) && !responsibleProfileId) {
      throw new Error("Perfil do Personal/Admin nao encontrado em app_profiles. Faca logout/login e tente novamente.");
    }

    const fullPayload = {
      name: formData.get("name"),
      email,
      ...buildStudentContactPayload(formData.get("whatsapp") || formData.get("phone")),
      birth_date: formData.get("birth_date") || null,
      genero: normalizeStudentGenderValue(formData.get("genero")) || null,
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
      trainer_id: responsibleProfileId,
      academy_id: null,
      academy_status: "independente"
    };

    const created = await insertStudentWithFallback(fullPayload);
    const createdStudent = created[0];
    state.selectedStudentId = createdStudent?.id || state.selectedStudentId;
    form.reset();
    showToast("Aluno adicionado com sucesso.");
    state.pendingStudentInviteOffer = { student: createdStudent, email };
    renderStudentInviteOffer(createdStudent, email);
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

function getPendingInviteForStudent(studentId) {
  return state.studentInvites
    .filter((invite) => (
      String(invite.student_id) === String(studentId)
      && normalizeText(pick(invite, ["status"], "")) === "pendente"
    ))
    .sort((a, b) => String(pick(b, ["created_at"], "")).localeCompare(String(pick(a, ["created_at"], ""))))[0] || null;
}

function getInviteExpirationDate(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

async function createStudentInvite(student, email, options = {}) {
  if (!student?.id || !email) {
    return { ok: false, message: "Aluno salvo, mas e-mail nao informado para criar convite." };
  }

  try {
    const existingPending = getPendingInviteForStudent(student.id);
    if (existingPending && !options.forceNew) {
      return {
        ok: true,
        invite: existingPending,
        inviteLink: buildInviteLink(pick(existingPending, ["token"], "")),
        message: "Ja existia convite pendente. Use o link salvo na area Convites."
      };
    }

    const { data, error } = await supabaseClient.rpc("create_or_get_student_invite", {
      target_student_id: student.id,
      target_email: email,
      replace_pending: options.forceNew === true
    });
    if (error) throw new Error(`Erro ao criar convite do aluno: ${error.message}`);

    const createdInvite = Array.isArray(data) ? data[0] : data;
    if (!createdInvite?.token) throw new Error("O banco nao retornou um convite valido.");
    const reusedPending = existingPending && String(existingPending.id) === String(createdInvite.id);

    return {
      ok: true,
      invite: createdInvite,
      inviteLink: buildInviteLink(createdInvite.token),
      reusedPending,
      message: reusedPending
        ? "Este aluno ja possui um convite pendente. O link existente foi preservado."
        : "Convite criado. Envie o link para o aluno finalizar o cadastro."
    };
  } catch (error) {
    console.warn("[Alion Treinos] Aluno salvo, mas convite nao foi criado.", error);
    return { ok: false, message: `Aluno salvo. Convite nao criado: ${error.message}` };
  }
}

function renderStudentAccessResult(email, result) {
  if (!el.studentAccessResult) return;
  el.studentAccessResult.classList.remove("hidden");
  const link = result.inviteLink || "";
  el.studentAccessResult.innerHTML = `
    <strong>Convite do aluno</strong>
    <span>E-mail: ${escapeHtml(email || "Não informado")}</span>
    ${link ? `<span>Link: <b>${escapeHtml(link)}</b></span>` : ""}
    <small>${escapeHtml(result.message)}</small>
    ${link ? `<div class="record-actions">
      <button class="tiny-button" type="button" data-student-invite-link="copy" data-link="${escapeHtml(link)}">Copiar link</button>
      <button class="tiny-button" type="button" data-student-invite-link="share" data-link="${escapeHtml(link)}">Compartilhar</button>
      <small>Validade: ${escapeHtml(formatDateTime(result.invite?.expires_at))}</small>
    </div>` : ""}
  `;
}

function normalizePhoneForWhatsApp(value) {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length >= 12) return digits;
  if (digits.length >= 10) return `55${digits}`;
  return digits;
}

function buildInviteWhatsAppUrl(invite, student) {
  const link = buildInviteLink(pick(invite, ["token"], ""));
  const phone = normalizePhoneForWhatsApp(pick(student, ["whatsapp", "contact", "phone", "telefone"], ""));
  const message = `Olá, aqui é o Carlos. Este é seu convite para acessar seus treinos no Alion Treinos: ${link}`;
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://wa.me/?text=${encodeURIComponent(message)}`;
}

function buildInviteEmailUrl(invite, student) {
  const name = pick(student, ["name", "nome"], pick(invite, ["name"], "Aluno"));
  const email = pick(student, ["email"], pick(invite, ["email"], ""));
  const token = pick(invite, ["token"], "");
  const link = buildInviteLink(token);
  const subject = "Convite para acessar o Alion Treinos";
  const body = `Olá, ${name}. Você recebeu um convite para acessar seus treinos no Alion Treinos.\n\nAcesse pelo link:\n${link}\n\nSe não conseguir abrir, copie este token:\n${token}`;
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function getInviteStudent(invite) {
  return state.students.find((student) => String(student.id) === String(invite.student_id)) || null;
}

function getVisibleInvites() {
  const students = getAccessibleStudents();
  const visibleStudentIds = new Set(students.map((student) => String(student.id)));
  return state.studentInvites
    .filter((invite) => visibleStudentIds.has(String(invite.student_id)) || isAdmin())
    .sort((a, b) => String(pick(b, ["created_at"], "")).localeCompare(String(pick(a, ["created_at"], ""))));
}

function renderInviteCard(invite) {
  const student = getInviteStudent(invite) || {};
  const token = pick(invite, ["token"], "");
  const link = buildInviteLink(token);
  const status = normalizeText(pick(invite, ["status"], ""));
  const expiresAt = pick(invite, ["expires_at"], "");
  const inviteId = String(invite.id);
  const isRevealed = state.revealedInviteIds.has(inviteId);
  const displayedLink = isRevealed
    ? link
    : (window.AlionTrainerDataRules?.maskInviteLink(link) || "Link protegido");
  const canRevoke = status === "pendente";

  return `
    <article class="simple-item stacked invite-card">
      <strong>${escapeHtml(pick(student, ["name", "nome"], pick(invite, ["name"], "Aluno")))}</strong>
      <span>Status: ${escapeHtml(formatInviteStatus(status))}</span>
      <small>Validade: ${escapeHtml(expiresAt ? formatDateTime(expiresAt) : "Sem data")}</small>
      <div class="record-actions">
        <button class="tiny-button" type="button" data-invite-action="copy" data-id="${escapeHtml(invite.id)}">Copiar link</button>
        <button class="tiny-button" type="button" data-invite-action="toggle" data-id="${escapeHtml(invite.id)}">${isRevealed ? "Ocultar link" : "Mostrar link"}</button>
        ${canRevoke ? `<button class="tiny-button danger" type="button" data-invite-action="cancel" data-id="${escapeHtml(invite.id)}">Revogar convite</button>` : ""}
      </div>
      <details class="invite-details">
        <summary>Ver detalhes</summary>
        <small>Criado em: ${escapeHtml(formatDateTime(pick(invite, ["created_at"], "")))}</small>
        <small>Link: ${escapeHtml(displayedLink)}</small>
      </details>
    </article>
  `;
}
function renderInvites() {
  if (el.trainerInvitesList) {
    const trainerInvites = getVisibleInvites();
    el.trainerInvitesList.innerHTML = trainerInvites.length
      ? trainerInvites.map(renderInviteCard).join("")
      : emptyMessage("Nenhum convite encontrado para seus alunos.");
  }
}

function renderStudentInviteOffer(student, email) {
  if (!el.studentAccessResult) return;
  el.studentAccessResult.classList.remove("hidden");
  const missingEmail = !String(email || "").trim();
  el.studentAccessResult.innerHTML = `
    <strong>Aluno cadastrado com sucesso.</strong>
    <span>${missingEmail ? "Adicione um e-mail ao aluno para gerar o convite de acesso." : "Deseja gerar o convite de acesso agora?"}</span>
    <div class="record-actions">
      ${missingEmail ? "" : `<button class="tiny-button" type="button" data-student-invite-offer="generate">Gerar convite</button>`}
      <button class="tiny-button" type="button" data-student-invite-offer="later">Agora não</button>
    </div>
  `;
}

async function handleStudentInviteOffer(action) {
  const pending = state.pendingStudentInviteOffer;
  if (action === "later") {
    state.pendingStudentInviteOffer = null;
    el.studentAccessResult?.classList.add("hidden");
    showToast("Aluno salvo. O convite pode ser gerado depois na ficha.");
    return;
  }
  if (action !== "generate" || !pending?.student?.id) return;
  const result = await createStudentInvite(pending.student, pending.email);
  renderStudentAccessResult(pending.email, result);
  if (result.ok) {
    state.pendingStudentInviteOffer = null;
    await loadSupabaseData({ silent: true });
    showToast(result.reusedPending ? "Convite pendente preservado." : "Convite criado com sucesso.");
  }
}

function renderTrashItem(record) {
  const typeLabels = { student: "Aluno", workout: "Treino", workout_exercise: "Exercício do treino", assessment: "Avaliação", body_measurement: "Medidas", exercise: "Exercício" };
  return `
    <article class="simple-item stacked">
      <strong>${escapeHtml(record.display_name || typeLabels[record.record_type] || "Registro")}</strong>
      <small>Tipo: ${escapeHtml(typeLabels[record.record_type] || record.record_type)}</small>
      <small>Excluído em: ${escapeHtml(formatDateTime(record.deleted_at))}</small>
      <small>Retenção até: ${escapeHtml(formatDateTime(record.purge_after))}</small>
      ${record.purge_blocked_reason ? `<small>${escapeHtml(record.purge_blocked_reason)}</small>` : ""}
      <div class="record-actions"><button class="tiny-button" type="button" data-trash-action="restore" data-id="${escapeHtml(record.id)}">Restaurar</button></div>
    </article>`;
}

function renderTrash() {
  const html = state.trashRecords.length ? state.trashRecords.map(renderTrashItem).join("") : emptyMessage("A lixeira está vazia.");
  if (el.trainerTrashList) el.trainerTrashList.innerHTML = html;
  if (el.adminTrashList) el.adminTrashList.innerHTML = html;
}

async function restoreTrashRecord(id) {
  const { error } = await supabaseClient.rpc("alion_restore_trash", { trash_record_id: id });
  if (error) throw error;
  showToast("Item restaurado com sucesso.");
  await loadSupabaseData({ silent: true });
}

function renderAdminTrainerInvites() {
  if (!el.adminTrainerInvitesList) return;
  el.adminTrainerInvitesList.innerHTML = state.trainerInvites.length ? state.trainerInvites.map((invite) => {
    const link = `${APP_PUBLIC_URL}?trainer_invite=${encodeURIComponent(invite.token)}`;
    return `<article class="simple-item stacked"><strong>Convite de Personal</strong><small>Status: ${escapeHtml(formatInviteStatus(invite.status))}</small><small>Validade: ${escapeHtml(formatDateTime(invite.expires_at))}</small>${invite.status === "pendente" ? `<button class="tiny-button" type="button" data-copy-trainer-invite="${escapeHtml(link)}">Copiar link</button>` : ""}</article>`;
  }).join("") : emptyMessage("Nenhum convite de Personal criado.");
}

async function createTrainerInvite(form) {
  if (!await requireAdminTi()) return;
  const data = new FormData(form);
  const { data: invite, error } = await supabaseClient.rpc("admin_create_trainer_invite", {
    invited_name: String(data.get("name") || "").trim(),
    invited_email: String(data.get("email") || "").trim().toLowerCase()
  });
  if (error) throw error;
  form.reset();
  await copyTextToClipboard(`${APP_PUBLIC_URL}?trainer_invite=${encodeURIComponent(invite.token)}`);
  showToast("Convite criado e link copiado.");
  await loadSupabaseData({ silent: true });
}

async function copyTextToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (error) {
    const input = document.createElement("textarea");
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.focus();
    input.select();
    document.execCommand("copy");
    document.body.removeChild(input);
  }
}

async function handleInviteAction(action, inviteId) {
  const invite = state.studentInvites.find((item) => String(item.id) === String(inviteId));
  if (!invite) {
    showToast("Convite nao encontrado.", "error");
    return;
  }

  const student = getInviteStudent(invite) || {};
  const link = buildInviteLink(pick(invite, ["token"], ""));

  if (action === "toggle") {
    const normalizedId = String(inviteId);
    if (state.revealedInviteIds.has(normalizedId)) state.revealedInviteIds.delete(normalizedId);
    else state.revealedInviteIds.add(normalizedId);
    renderInvites();
    return;
  }

  try {
    if (action === "copy" || action === "resend") {
      await copyTextToClipboard(link);
      showToast(action === "resend" ? "Link copiado para reenviar." : "Link copiado.");
      return;
    }

    if (action === "whatsapp") {
      window.open(buildInviteWhatsAppUrl(invite, student), "_blank", "noopener,noreferrer");
      return;
    }

    if (action === "email") {
      window.location.href = buildInviteEmailUrl(invite, student);
      return;
    }

    if (action === "cancel") {
      if (!window.confirm("Cancelar este convite?")) return;
      await updateWithSchemaFallback("student_invites", invite.id, {
        status: "cancelado",
        canceled_at: new Date().toISOString(),
        canceled_by: state.authUser?.id || null,
        updated_at: new Date().toISOString()
      }, "Erro ao cancelar convite");
      state.revealedInviteIds.delete(String(inviteId));
      showToast("Convite cancelado.");
      await loadSupabaseData({ silent: true });
      return;
    }

    if (action === "new") {
      if (!window.confirm("Gerar um novo convite e cancelar o pendente anterior?")) return;
      await createStudentInvite(student, pick(student, ["email"], pick(invite, ["email"], "")), { forceNew: true });
      showToast("Novo convite gerado.");
      await loadSupabaseData({ silent: true });
    }
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

function boolFromForm(formData, name) {
  return formData.get(name) === "on";
}

function calculateImc(weightKg, heightCm) {
  if (!weightKg || !heightCm) return null;
  const heightM = Number(heightCm) / 100;
  if (!heightM) return null;
  return Number((Number(weightKg) / (heightM * heightM)).toFixed(2));
}

function calculateIcq(waistCm, hipCm) {
  if (!waistCm || !hipCm) return null;
  return Number((Number(waistCm) / Number(hipCm)).toFixed(2));
}

function getLatestMeasurementForStudent(studentId) {
  return state.trainerMeasurementsCache
    .filter((measurement) => String(measurement.student_id) === String(studentId))
    .sort((a, b) => String(pick(b, ["measurement_date", "measured_at", "created_at"], "")).localeCompare(String(pick(a, ["measurement_date", "measured_at", "created_at"], ""))))[0] || null;
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

function dateInputValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const dateOnly = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  return dateOnly ? dateOnly[1] : "";
}

function setFormTitle(form, title) {
  const heading = form?.querySelector("h3");
  if (heading) heading.textContent = title;
}

function setSubmitLabel(form, label) {
  const button = form?.querySelector("button[type='submit']");
  if (button) button.textContent = label;
}

function setFormControlValue(form, field, value) {
  const control = form?.elements?.[field];
  if (!control) return;
  control.value = value ?? "";
}

function setFormControlChecked(form, field, value) {
  const control = form?.elements?.[field];
  if (!control) return;
  control.checked = Boolean(value);
}

function resetAssessmentEditMode(form) {
  if (!form) return;
  form.dataset.editId = "";
  setFormTitle(form, "Adicionar avaliação física");
  setSubmitLabel(form, "Salvar avaliação");
}

function resetMeasurementEditMode(form) {
  if (!form) return;
  form.dataset.editId = "";
  setFormTitle(form, "Adicionar perimetria");
  setSubmitLabel(form, "Salvar medidas");
}

async function handleStudentAccessAction(action, inviteId) {
  const student = state.students.find((item) => String(item.id) === String(state.selectedStudentId));
  if (!student) return;
  const email = String(pick(student, ["email"], "")).trim().toLowerCase();

  if (["generate", "generate-new"].includes(action)) {
    const result = await createStudentInvite(student, email, { forceNew: action === "generate-new" });
    if (!result.ok) throw new Error(result.message);
    showToast(result.reusedPending ? "Convite pendente preservado." : "Convite criado com sucesso.");
    await loadSupabaseData({ silent: true });
    return;
  }

  const invite = state.studentInvites.find((item) => String(item.id) === String(inviteId));
  if (!invite) throw new Error("Convite nao encontrado.");
  if (action === "share") {
    const link = buildInviteLink(pick(invite, ["token"], ""));
    if (navigator.share) await navigator.share({ title: "Convite Alion Treinos", url: link });
    else {
      await copyTextToClipboard(link);
      showToast("Link copiado para compartilhar.");
    }
    return;
  }
  await handleInviteAction(action, inviteId);
  renderStudentAccessPanel(student);
}

function cancelTrainerEditModes() {
  const assessmentForm = document.querySelector("#new-assessment-form");
  const measurementForm = document.querySelector("#new-measurement-form");
  const workoutForm = document.querySelector("#new-workout-form");

  [assessmentForm, measurementForm, workoutForm].forEach((form) => form?.reset());
  resetAssessmentEditMode(assessmentForm);
  resetMeasurementEditMode(measurementForm);
  if (workoutForm) {
    workoutForm.dataset.editId = "";
    setSubmitLabel(workoutForm, "Criar treino");
  }
  if (el.addExerciseButton) {
    el.addExerciseButton.dataset.editId = "";
    el.addExerciseButton.textContent = "Adicionar exercício";
  }
  clearWorkoutExerciseForm();
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

function normalizeOptionalUrl(value, fieldLabel) {
  const url = String(value || "").trim();
  if (!url) return null;
  const isImageField = normalizeText(fieldLabel).includes("imagem");
  const type = isImageField ? "image" : "video";
  if (!/^https?:\/\//i.test(url) && !isLocalExerciseAssetUrl(url, type)) {
    const expectedPath = type === "video"
      ? "assets/exercicios/videos/nome-do-exercicio.mp4"
      : "assets/exercicios/imagens/nome-do-exercicio.webp";
    throw new Error(`${fieldLabel} deve ser http/https ou ${expectedPath}.`);
  }
  return url.replace(/^\.?\//, "");
}

function normalizeRole(role) {
  const value = normalizeText(role || "");
  if (["admin", "admin_ti", "ti", "controle"].includes(value)) return "admin";
  if (["personal", "trainer", "treinador"].includes(value)) return "trainer";
  if (["student", "aluno"].includes(value)) return "student";
  return "";
}

function toDatabaseRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === "admin") return "admin_ti";
  if (normalized === "trainer") return "personal";
  return "aluno";
}

function getDefaultRoleForEmail(_email, requestedRole = "aluno") {
  return toDatabaseRole(requestedRole);
}

function getCurrentRole() {
  if (state.authUser?.id && state.trustedAdmin) return "admin";
  const profileRole = normalizeRole(state.authProfile?.role);
  if (profileRole === "admin") return "";
  return profileRole || normalizeRole(state.accessRole);
}

function isAuthenticatedAdminTi() {
  return Boolean(state.authUser?.id && state.trustedAdmin);
}

function isAdmin() {
  return isAuthenticatedAdminTi();
}

function isTrainer() {
  return getCurrentRole() === "trainer";
}

function isStudent() {
  return getCurrentRole() === "student";
}

function getCurrentTrainerProfileId() {
  return state.authProfile?.id || state.authProfile?.trainer_id || "";
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
  const visibleStudents = isAdmin()
    ? state.students
    : state.students.filter((student) => !isDeletedRecord(student));

  if (isStudent()) {
    const studentId = state.authProfile?.student_id || state.studentAreaId;
    return visibleStudents.filter((student) => String(student.id) === String(studentId));
  }

  if (isTrainer()) {
    const ownerIds = getProfileOwnerIds();
    return visibleStudents.filter((student) => ownerIds.includes(String(pick(student, ["personal_id", "trainer_id"], ""))));
  }

  return visibleStudents;
}

function canManageStudent(studentId) {
  if (isAdmin()) return true;
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
  if (state.studentMode === "advanced" && String(state.studentAreaId) === String(state.selectedStudentId)) {
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
  const workoutName = String(getFormValue(formData, ["name", "title"]) || "").trim();
  const workoutInput = {
    name: workoutName,
    objective: getFormValue(formData, ["objective", "goal"]),
    notes: formData.get("notes")
  };
  const payload = {
    student_id: state.selectedStudentId,
    ...buildWorkoutFields(workoutInput),
    status: "ativo"
  };

  try {
    const created = await insertWithSchemaFallback("workouts", payload, "Erro ao criar treino");
    const savedWorkout = assertPersistedWorkout(created, workoutInput, "Erro ao criar treino");
    state.selectedWorkoutId = savedWorkout.id || "";
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
    exercise_id: exerciseId,
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
 * Adapta apenas aliases legados. Campos canonicos protegidos nunca sao descartados.
 */
async function insertWithSchemaFallback(tableName, payload, fallbackMessage) {
  return window.AlionWorkoutData.runWithSchemaFallback({
    tableName,
    payload,
    fallbackMessage,
    execute: async (currentPayload) => {
      if (["app_profiles", "profiles", "student_invites", "trainer_students", "students", "assessments", "body_measurements", "exercise_library", "workouts", "workout_exercises"].includes(tableName)) {
        console.info(`[Alion Treinos] Salvando registro em ${tableName}.`);
      }
      return await runQuery(supabaseClient.from(tableName).insert(currentPayload).select(), fallbackMessage);
    }
  });
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
  const pending = getPendingWorkoutLogs();
  const payloadDay = window.AlionWorkoutRotation.localDateKey(payload.completed_at);
  const duplicate = pending.some((item) => (
    String(item.student_id) === String(payload.student_id)
    && String(item.workout_id) === String(payload.workout_id)
    && window.AlionWorkoutRotation.localDateKey(item.completed_at) === payloadDay
  ));
  if (duplicate) return;
  pending.push({
    ...payload,
    queued_by_user_id: state.authUser?.id,
    pending_id: crypto.randomUUID?.() || String(Date.now())
  });
  savePendingWorkoutLogs(pending);
}

async function syncPendingWorkoutLogs() {
  if (state.pendingLogSyncInProgress) return;
  const pending = getPendingWorkoutLogs();
  if (!pending.length) return;
  state.pendingLogSyncInProgress = true;
  renderStudentArea();

  const failed = [];
  try {
    for (const item of pending) {
      if (String(item.queued_by_user_id) !== String(state.authUser?.id)) {
        failed.push(item);
        continue;
      }
      const { pending_id: _pendingId, queued_by_user_id: _queuedByUserId, ...payload } = item;
      const alreadySynced = state.workoutLogs.some((log) => (
        String(log.student_id) === String(payload.student_id)
        && String(log.workout_id) === String(payload.workout_id)
        && window.AlionWorkoutRotation.localDateKey(pick(log, ["completed_at", "created_at"], ""))
          === window.AlionWorkoutRotation.localDateKey(payload.completed_at)
      ));
      if (alreadySynced) continue;

      try {
        await insertWorkoutLog(payload);
      } catch (error) {
        console.error("[Alion Treinos] Erro ao sincronizar log pendente:", error);
        failed.push(item);
      }
    }

    savePendingWorkoutLogs(failed);
    if (failed.length < pending.length) showToast("Treinos pendentes sincronizados.");
  } finally {
    state.pendingLogSyncInProgress = false;
    renderStudentArea();
  }
}

/**
 * Monta o snapshot completo da execucao atual.
 */
function buildWorkoutExecutionSnapshot(workoutId, exercisesSource = state.workoutExercises) {
  const student = getStudentForExerciseMedia(state.studentAreaId);
  return exercisesSource
    .filter((exercise) => String(exercise.workout_id) === String(workoutId))
    .map((exercise) => {
      const libraryExercise = getLibraryExerciseForWorkoutItem(exercise);
      const imageUrl = getExerciseMediaByGender(libraryExercise, student, "image");
      const videoUrl = getExerciseMediaByGender(libraryExercise, student, "video");
      return {
        exercise_id: pick(exercise, ["exercise_id"], null),
        exercise_name: pick(exercise, ["exercise_name"], "Exercício"),
        muscle_group: pick(libraryExercise, ["muscle_group", "primary_muscle", "grupo_muscular"], null),
        image_url: getExerciseMediaUrl(imageUrl, "image") || null,
        video_url: getExerciseMediaUrl(videoUrl, "video") || null,
        instructions: pick(libraryExercise, ["instructions", "description", "instrucoes"], pick(exercise, ["instructions"], null)),
        common_mistakes: pick(libraryExercise, ["common_mistakes"], null),
        sets: numberOrNull(pick(exercise, ["sets"], "")),
        reps: pick(exercise, ["reps"], null),
        weight: pick(exercise, ["weight"], null),
        rest_seconds: numberOrNull(pick(exercise, ["rest_seconds"], "")),
        planned_sets: numberOrNull(pick(exercise, ["sets"], "")),
        planned_reps: pick(exercise, ["reps"], null),
        planned_weight: pick(exercise, ["weight"], null),
        planned_rest_seconds: numberOrNull(pick(exercise, ["rest_seconds"], "")),
        ...serializeExerciseExecution(exercise.id)
      };
    });
}

/**
 * Verifica a conclusão diária considerando servidor e fila offline.
 */
function getTodayWorkoutLog(studentId = state.studentAreaId) {
  return window.AlionWorkoutRotation.findTodayLog(getAllWorkoutLogs(), studentId);
}

function stopExerciseRestTimer(exerciseId) {
  const key = String(exerciseId);
  if (state.restTimerIntervals[key]) {
    window.clearInterval(state.restTimerIntervals[key]);
    delete state.restTimerIntervals[key];
  }
  state.restTimers[key] = 0;
}

function stopWorkoutRestTimers(workoutId) {
  state.workoutExercises
    .filter((exercise) => String(exercise.workout_id) === String(workoutId))
    .forEach((exercise) => stopExerciseRestTimer(exercise.id));
}

function applyCompletedWorkoutLocally(workout, payload, savedOffline = false) {
  stopWorkoutRestTimers(workout.id);
  localStorage.removeItem(getExecutionDraftKey(workout.id));
  state.studentExerciseExecution = {};
  state.studentExerciseIndex = 0;
  state.pendingConfirmExerciseId = "";
  state.awaitingFeedbackExerciseId = "";

  const existsInMemory = state.workoutLogs.some((log) => (
    String(log.student_id) === String(payload.student_id)
    && String(log.workout_id) === String(payload.workout_id)
    && window.AlionWorkoutRotation.localDateKey(pick(log, ["completed_at", "created_at"], ""))
      === window.AlionWorkoutRotation.localDateKey(payload.completed_at)
  ));
  if (!savedOffline && !existsInMemory) state.workoutLogs.unshift({ ...payload, id: `local-${Date.now()}` });
}

async function persistWorkoutCompletion(workout, { automatic = false } = {}) {
  if (state.easyWorkoutCompletionInProgress) return false;

  const todayLog = getTodayWorkoutLog();
  if (todayLog) {
    renderStudentArea();
    showToast("Treino de hoje já concluído.");
    return false;
  }

  state.easyWorkoutCompletionInProgress = true;
  const payload = {
    workout_id: workout.id,
    student_id: state.studentAreaId,
    completed_at: new Date().toISOString(),
    exercises_snapshot: buildWorkoutExecutionSnapshot(workout.id)
  };

  let savedOffline = false;
  try {
    try {
      await insertWorkoutLog(payload);
    } catch (error) {
      const isNetworkError = !navigator.onLine || String(error.message).toLowerCase().includes("failed to fetch");
      if (!isNetworkError) throw error;
      enqueuePendingWorkoutLog(payload);
      savedOffline = true;
    }

    applyCompletedWorkoutLocally(workout, payload, savedOffline);
    speakWorkoutMessage("Parabéns! Treino concluído por hoje.", { force: true });
    vibrateDevice([180, 80, 180, 80, 280]);
    showToast(
      savedOffline ? "Treino concluído e salvo para sincronizar." : "🎉 Treino concluído! Bom trabalho.",
      "success",
      { celebrate: true }
    );
    renderStudentArea();

    if (!savedOffline) await loadSupabaseData({ silent: automatic });
    return true;
  } finally {
    state.easyWorkoutCompletionInProgress = false;
  }
}

/**
 * Mantém a finalização manual usada principalmente pelo Modo Avançado.
 */
async function completeCurrentWorkout() {
  const workout = getCurrentWorkout(state.studentAreaId);
  if (!workout) {
    showToast("Nenhum treino atual para concluir.", "error");
    return;
  }
  if (getTodayWorkoutLog()) {
    renderStudentArea();
    showToast("Treino de hoje já concluído.");
    return;
  }
  if (!hasCurrentWorkoutExecutionProgress(workout)) {
    showToast("Registre pelo menos um exercício antes de finalizar o treino.", "error");
    updateCompleteWorkoutButtonState(workout);
    return;
  }
  const summary = getWorkoutExecutionSummary(workout.id);
  const confirmMessage = [
    "Finalizar o treino completo?",
    "",
    `Exercícios concluídos: ${summary.completed} de ${summary.total}.`,
    "O histórico será salvo com os exercícios feitos e não feitos.",
    "",
    "Para finalizar apenas um exercício, use o botão Concluir série dentro do card."
  ].join("\n");

  if (!window.confirm(confirmMessage)) return;

  try {
    await persistWorkoutCompletion(workout);
  } catch (error) {
    showToast(error.message, "error");
  }
}

function getWorkoutExecutionSummary(workoutId) {
  const exercises = state.workoutExercises.filter((item) => String(item.workout_id) === String(workoutId));
  const completed = exercises.filter((item) => {
    const execution = getStudentExerciseExecution(item.id);
    return Boolean(execution.completed && !execution.skipped);
  }).length;

  return {
    total: exercises.length,
    completed
  };
}

/**
 * Garante que a area TI/Admin so abra para usuarios autenticados com role admin_ti.
 */
function enforceAdminAccess() {
  const allowed = isAdmin();
  state.adminUnlocked = allowed;
  el.adminLock?.classList.toggle("hidden", allowed);
  el.adminPanel?.classList.toggle("hidden", !allowed);

  if (allowed) {
    hydrateAdminConfigForm();
    return true;
  }

  return false;
}

function unlockAdminArea(_password) {
  if (!enforceAdminAccess()) {
    changeScreen("access");
    return;
  }

  renderAdminArea();
  showToast("Área do sistema liberada.");
}

/**
 * Preenche os campos de configuracao do Supabase dentro do TI/Admin.
 */
function hydrateAdminConfigForm() {
  const config = getSupabaseConfig();
  if (el.adminSupabaseUrl) el.adminSupabaseUrl.value = maskSupabaseUrl(config.url);
  if (el.adminSupabaseKey) el.adminSupabaseKey.value = maskSecret(config.anonKey);
}

function maskSupabaseUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname;
    return `${parsed.protocol}//${host.slice(0, 8)}...${host.slice(-14)}`;
  } catch (_error) {
    const value = String(url || "");
    return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-8)}` : "Não configurado";
  }
}

function maskSecret(value) {
  const text = String(value || "");
  if (!text) return "Não configurado";
  return `${text.slice(0, 4)}••••••••••••${text.slice(-4)}`;
}

async function copySupabaseConfigValue(kind) {
  if (!await requireAdminTi()) return;
  const config = getSupabaseConfig();
  const value = kind === "url" ? config.url : config.anonKey;
  await navigator.clipboard.writeText(value);
  showToast(kind === "url" ? "URL copiada." : "Chave copiada.");
}

async function requireAdminTi() {
  if (isAdmin()) return true;

  state.adminUnlocked = false;
  el.adminPanel?.classList.add("hidden");
  el.adminLock?.classList.remove("hidden");
  changeScreen("access");
  return false;
}

function getStudentConfirmName(studentId) {
  const student = state.students.find((item) => String(item.id) === String(studentId));
  return pick(student, ["name", "full_name", "nome"], "CONFIRMAR");
}

function requestStrongConfirmation({ title, description, expectedText }) {
  return new Promise((resolve) => {
    const expected = String(expectedText || "CONFIRMAR").trim();
    state.pendingAdminConfirmation = { resolve, expected };
    el.adminConfirmTitle.textContent = title || "Confirmar acao";
    el.adminConfirmDescription.textContent = description || "Esta acao nao podera ser desfeita.";
    el.adminConfirmExpected.textContent = expected;
    el.adminConfirmInput.value = "";
    el.adminConfirmSubmit.disabled = true;
    el.adminConfirmModal.classList.remove("hidden");
    el.adminConfirmInput.focus();
  });
}

function closeStrongConfirmation(result = false) {
  const pending = state.pendingAdminConfirmation;
  state.pendingAdminConfirmation = null;
  el.adminConfirmModal?.classList.add("hidden");
  if (pending?.resolve) pending.resolve(result);
}

async function confirmAdminDestructiveAction({ title, description, expectedText }) {
  if (!await requireAdminTi()) return false;
  return requestStrongConfirmation({ title, description, expectedText });
}

/**
 * Salva configuracao Supabase pelo TI/Admin e recria o client.
 */
async function saveAdminSupabaseConfig(form) {
  if (!await requireAdminTi()) return;
  const formData = new FormData(form);
  if (!formData.has("url") || !formData.has("anonKey")) {
    showToast("Credenciais protegidas. Use os botoes de copia.", "error");
    hydrateAdminConfigForm();
    return;
  }
  saveSupabaseConfig({
    url: formData.get("url"),
    anonKey: formData.get("anonKey")
  });
  supabaseClient = createSupabaseClient();
  showToast("Configuração do Supabase salva.");
  await loadSupabaseData();
}

/**
 * Testa conexão lendo um registro da tabela students.
 */
async function testConnection() {
  if (!await requireAdminTi()) return;
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
  if (!enforceAdminAccess()) return;

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

  const personalProfiles = state.appProfiles.filter((profile) => normalizeRole(profile.role) === "trainer");
  el.adminPersonalsList.innerHTML = personalProfiles.length
    ? personalProfiles.map(renderAdminPersonalItem).join("")
    : emptyMessage("Nenhum Personal encontrado.");
  renderAdminTrainerInvites();
  renderTrash();

  renderAdminExerciseGroupFilter();
  const adminExercises = getFilteredAdminExercises();
  el.adminExercisesList.innerHTML = adminExercises.length
    ? adminExercises.map(renderAdminExerciseLibraryItem).join("")
    : emptyMessage("Nenhum exercício encontrado.");

  el.adminDiagnostics.innerHTML = `
    ${renderDiagnostic("Status", el.connectionStatus.textContent)}
    ${renderDiagnostic("Alunos carregados", state.students.length)}
    ${renderDiagnostic("Exercícios carregados", state.exercises.length)}
    ${renderDiagnostic("Treinos carregados nesta sessão", state.workouts.length)}
    ${renderDiagnostic("Sessões concluídas carregadas", state.workoutLogs.length)}
    ${renderDiagnostic("Personals carregados", personalProfiles.length)}
    ${renderDiagnostic("Identidade Admin confiável", state.trustedAdmin ? "validada por UUID" : "não validada")}
    ${renderDiagnostic("Último erro", state.lastError || "Nenhum")}
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
    app_profiles: state.appProfiles.length
      ? `${state.appProfiles.length} registros visíveis nesta sessão`
      : (state.authProfile ? "Somente o perfil autenticado foi carregado" : "Não consultado"),
    profiles: "Não consultado diretamente nesta sessão",
    student_invites: state.studentInvites.length,
    trainer_students: state.trainerStudents.length,
    students: state.students.length,
    exercise_library: state.exercises.length,
    workouts: state.workouts.length,
    workout_exercises: state.workoutExercises.length,
    workout_logs: state.workoutLogs.length
  };

  if (tableName === "assessments" || tableName === "body_measurements") {
    return state.tableErrors[tableName] || "Consultada por aluno no perfil";
  }

  if (!(tableName in map)) return state.tableErrors[tableName] || "Não consultado nesta sessão";
  const value = map[tableName];
  return state.tableErrors[tableName]
    || (typeof value === "number" ? `${value} registros visíveis nesta sessão` : value);
}

/**
 * Renderiza aluno dentro do painel admin.
 */
function renderAdminStudentItem(student) {
  const status = getEntityStatus(student);
  const invite = getLatestInviteForStudent(student.id);
  const inviteStatus = invite ? formatInviteStatus(pick(invite, ["status"], "")) : "Sem convite";

  return `
    <article class="simple-item stacked admin-student-item">
      <strong>Aluno cadastrado</strong>
      <small>Convite: ${escapeHtml(inviteStatus)}</small>
      <small>Status: ${escapeHtml(formatWorkoutStatus(status))}</small>
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
function renderAdminExerciseLibraryItem(exercise) {
  const rawGroup = pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "");
  const group = window.AlionTrainerDataRules?.normalizeMuscleGroup(rawGroup) || rawGroup || "Grupo não informado";
  return `
    <article class="simple-item stacked">
      <strong>${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercício"))}</strong>
      <span>${escapeHtml(group)}</span>
      <div class="record-actions">
        <button class="tiny-button" type="button" data-admin-exercise-action="edit" data-id="${escapeHtml(exercise.id)}">Editar</button>
      </div>
    </article>
  `;
}

function printAdminExerciseLibraryPdf() {
  if (!isAdmin()) {
    showToast("Apenas o Admin técnico pode baixar a biblioteca em PDF.", "error");
    return;
  }
  if (!state.exercises.length) {
    showToast("A biblioteca de exercícios está vazia. Recarregue os dados e tente novamente.", "error");
    return;
  }

  const exercises = [...state.exercises].sort((first, second) => (
    String(pick(first, ["name", "title", "nome"], "")).localeCompare(
      String(pick(second, ["name", "title", "nome"], "")),
      "pt-BR"
    )
  ));
  const statusSymbol = (value) => String(value || "").trim() ? "✓" : "☐";
  const rows = exercises.map((exercise, index) => {
    const rawGroup = pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "");
    const group = window.AlionTrainerDataRules?.normalizeMuscleGroup(rawGroup) || rawGroup || "Não informado";
    return `
      <tr>
        <td class="number">${index + 1}</td>
        <td class="name">${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercício sem nome"))}</td>
        <td>${escapeHtml(group)}</td>
        <td>${escapeHtml(pick(exercise, ["equipment", "equipamento"], "Não informado"))}</td>
        <td class="status">${statusSymbol(exercise.image_url_masculino)}</td>
        <td class="status">${statusSymbol(exercise.image_url_feminino)}</td>
      </tr>
    `;
  }).join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    showToast("Permita pop-ups para abrir a biblioteca e salvar o PDF.", "error");
    return;
  }
  printWindow.opener = null;
  printWindow.document.open();
  printWindow.document.write(`<!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Biblioteca de exercícios - Alion Treinos</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { box-sizing: border-box; }
          body { margin: 0; color: #111; background: #fff; font-family: Arial, Helvetica, sans-serif; font-size: 9pt; }
          header { margin-bottom: 7mm; padding-bottom: 4mm; border-bottom: 2px solid #111; }
          h1 { margin: 0; font-size: 18pt; letter-spacing: .08em; }
          h2 { margin: 1.5mm 0 0; font-size: 12pt; }
          .meta { display: flex; justify-content: space-between; gap: 8mm; margin-top: 3mm; font-size: 8.5pt; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          thead { display: table-header-group; }
          tr { break-inside: avoid; page-break-inside: avoid; }
          th, td { border: 1px solid #555; padding: 2mm 1.5mm; vertical-align: middle; overflow-wrap: anywhere; }
          th { background: #eee; color: #000; text-align: left; font-size: 8pt; text-transform: uppercase; }
          .number { width: 7%; text-align: center; }
          .name { width: 28%; font-weight: 700; }
          th:nth-child(3), td:nth-child(3) { width: 18%; }
          th:nth-child(4), td:nth-child(4) { width: 19%; }
          th:nth-child(5), th:nth-child(6), .status { width: 14%; text-align: center; }
          .status { font-size: 14pt; font-weight: 700; }
          footer { margin-top: 5mm; padding-top: 2mm; border-top: 1px solid #555; text-align: center; font-size: 8pt; }
          @media print { body { print-color-adjust: economy; -webkit-print-color-adjust: economy; } }
        </style>
      </head>
      <body>
        <header>
          <h1>ALION TREINOS</h1>
          <h2>Biblioteca de exercícios - controle de imagens</h2>
          <div class="meta">
            <strong>Total de exercícios: ${exercises.length}</strong>
            <span>Gerado em: ${escapeHtml(formatDateTime(new Date().toISOString()))}</span>
          </div>
        </header>
        <table>
          <thead>
            <tr><th class="number">#</th><th class="name">Exercício</th><th>Grupo muscular</th><th>Equipamento</th><th>Masculino</th><th>Feminino</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <footer>✓ imagem cadastrada &nbsp; | &nbsp; ☐ imagem pendente</footer>
      </body>
    </html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.setTimeout(() => printWindow.print(), 250);
  showToast("Biblioteca pronta. Escolha “Salvar como PDF” na tela de impressão.");
}

function getFilteredAdminExercises() {
  const search = state.adminExerciseSearch.toLowerCase().trim();
  const groupFilter = state.adminExerciseGroupFilter.toLowerCase().trim();

  return getUniqueExercises().filter((exercise) => {
    const name = pick(exercise, ["name", "title", "nome"], "").toLowerCase();
    const rawGroup = pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "");
    const group = (window.AlionTrainerDataRules?.normalizeMuscleGroup(rawGroup) || rawGroup).toLowerCase();
    const equipment = pick(exercise, ["equipment", "equipamento"], "").toLowerCase();
    const matchesSearch = !search || name.includes(search) || group.includes(search) || equipment.includes(search);
    const matchesGroup = !groupFilter || group === groupFilter;
    return matchesSearch && matchesGroup;
  });
}

function renderAdminExerciseGroupFilter() {
  if (!el.adminExerciseGroupFilter) return;
  const current = el.adminExerciseGroupFilter.value;
  const normalizeGroup = (value) => window.AlionTrainerDataRules?.normalizeMuscleGroup(value) || value;
  const groups = Array.from(new Set([...REQUIRED_EXERCISE_GROUPS.map(normalizeGroup), ...getUniqueExercises()
    .map((exercise) => normalizeGroup(pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "")))
    .filter(Boolean)]))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  el.adminExerciseGroupFilter.innerHTML = `<option value="">Todos os grupos</option>${groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("")}`;
  el.adminExerciseGroupFilter.value = groups.includes(current) ? current : "";
  state.adminExerciseGroupFilter = el.adminExerciseGroupFilter.value;
}

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
    : `<p class="empty compact-empty">Nenhum erro do Supabase registrado.</p>`;
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

function getPossibleDuplicateExerciseGroups() {
  const groups = new Map();
  state.exercises.forEach((exercise) => {
    const name = pick(exercise, ["name", "title", "nome"], "");
    const normalizedName = window.AlionTrainerDataRules?.normalizeExerciseName(name) || normalizeText(name);
    if (!normalizedName) return;
    if (!groups.has(normalizedName)) groups.set(normalizedName, []);
    groups.get(normalizedName).push(exercise);
  });
  return Array.from(groups.entries()).filter(([, exercises]) => exercises.length > 1);
}

function renderDuplicateExerciseReport() {
  const duplicateGroups = getPossibleDuplicateExerciseGroups();
  if (!duplicateGroups.length) {
    renderAdminMaintenanceLog("Nenhuma possível duplicidade encontrada pelos nomes normalizados.");
    return;
  }

  el.adminMaintenanceLog.innerHTML = duplicateGroups.map(([normalizedName, exercises]) => `
    <article class="simple-item stacked">
      <strong>Possível duplicidade: ${escapeHtml(normalizedName)}</strong>
      ${exercises.map((exercise) => {
        const references = state.workoutExercises.filter((item) => (
          String(pick(item, ["exercise_id", "library_exercise_id"], "")) === String(exercise.id)
        )).length;
        const mediaCount = [
          pick(exercise, ["image_url"], ""),
          pick(exercise, ["image_url_masculino"], ""),
          pick(exercise, ["image_url_feminino"], ""),
          pick(exercise, ["video_url"], ""),
          pick(exercise, ["video_url_masculino"], ""),
          pick(exercise, ["video_url_feminino"], "")
        ].filter(Boolean).length;
        return `
          <span><b>${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercício"))}</b></span>
          <small>ID: ${escapeHtml(exercise.id)}</small>
          <small>Grupo: ${escapeHtml(pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "Não informado"))}</small>
          <small>Descrição: ${escapeHtml(pick(exercise, ["instructions", "description", "observations"], "Não informada"))}</small>
          <small>Usado em treinos: ${references} | Mídias: ${mediaCount} | Criado em: ${escapeHtml(formatDateTime(pick(exercise, ["created_at"], "")))}</small>
        `;
      }).join("")}
      <small>Nenhum registro foi excluído ou mesclado automaticamente.</small>
    </article>
  `).join("");
}

function getSelectedAdminStudentId() {
  return state.selectedAdminStudentId || state.selectedStudentId || state.students[0]?.id || "";
}

async function updateStudentStatus(id, status) {
  if (!id) throw new Error("Selecione um aluno antes de alterar status.");
  const rpcByStatus = {
    excluido: "admin_soft_delete_student",
    arquivado: "admin_archive_student",
    ativo: "admin_restore_student"
  };

  if (isAdmin() && rpcByStatus[status]) {
    await runAdminMaintenanceRpc(rpcByStatus[status], id, `Erro ao atualizar status do aluno para ${status}`);
    return;
  }

  try {
    await updateWithSchemaFallback("students", id, { status }, "Erro ao atualizar status do aluno");
  } catch (error) {
    if (!isAdmin() || !rpcByStatus[status]) throw error;
    await runAdminMaintenanceRpc(rpcByStatus[status], id, error.message);
  }
}

function buildStudentExclusionPayload(reason) {
  const now = new Date().toISOString();
  return {
    status: "excluido",
    status_usuario: "bloqueado",
    exclusion_reason: reason,
    deletion_reason: reason,
    motivo_exclusao: reason,
    exclusion_requested_by: state.authUser?.id || null,
    excluded_by: state.authUser?.id || null,
    exclusion_requested_at: now,
    excluded_at: now
  };
}

async function requestStudentDeletionByPersonal(id) {
  if (!id) throw new Error("Selecione um aluno antes de excluir.");
  const reason = window.prompt("Informe o motivo da exclusão deste aluno para o sistema:");
  const normalizedReason = String(reason || "").trim();

  if (!normalizedReason) {
    showToast("Informe o motivo para enviar a exclusão ao sistema.", "error");
    return false;
  }

  const student = state.students.find((item) => String(item.id) === String(id));
  await moveOwnedRecordToTrash("student", id, `${pick(student, ["name", "nome"], "Aluno")} — ${normalizedReason}`);
  return true;
}

async function updateStudentWorkoutsStatus(studentId, status) {
  if (!studentId) throw new Error("Selecione um aluno antes de alterar treinos.");
  if (isAdmin()) {
    await runAdminRpc("admin_clear_student_workouts", { target_student_id: studentId }, "Erro ao ocultar treinos do aluno");
    return null;
  }
  const workouts = state.workouts.filter((workout) => String(workout.student_id) === String(studentId));

  for (const workout of workouts) {
    await updateWithSchemaFallback("workouts", workout.id, { status }, "Erro ao atualizar treinos do aluno");
  }

  return workouts.length;
}

async function clearStudentLogs(studentId) {
  if (!studentId) throw new Error("Selecione um aluno antes de limpar sessoes.");
  if (isAdmin()) {
    await runAdminRpc("admin_clear_student_sessions", { target_student_id: studentId }, "Erro ao excluir sessoes do aluno");
    return;
  }
  await deleteByColumn("workout_logs", "student_id", studentId, "Erro ao excluir sessoes do aluno");
}

async function clearStudentMeasurements(studentId) {
  if (!studentId) throw new Error("Selecione um aluno antes de limpar medidas.");
  if (isAdmin()) {
    await runAdminRpc("admin_clear_student_measurements", { target_student_id: studentId }, "Erro ao excluir medidas do aluno");
    return;
  }
  await deleteByColumn("body_measurements", "student_id", studentId, "Erro ao excluir medidas do aluno");
}

async function clearStudentAssessments(studentId) {
  if (!studentId) throw new Error("Selecione um aluno antes de limpar avaliacoes.");
  if (isAdmin()) {
    await runAdminRpc("admin_clear_student_assessments", { target_student_id: studentId }, "Erro ao excluir avaliacoes do aluno");
    return;
  }

  await deleteByColumn("assessments", "student_id", studentId, "Erro ao excluir avaliacoes do aluno");
}

async function resetStudentData(studentId) {
  if (isAdmin()) {
    await runAdminRpc("admin_reset_student_for_tests", { target_student_id: studentId }, "Erro ao resetar aluno");
    return;
  }
  await clearStudentLogs(studentId);
  await clearStudentMeasurements(studentId);
  await clearStudentAssessments(studentId);
  await updateStudentWorkoutsStatus(studentId, "arquivado");
}

async function runAdminRpc(functionName, args = {}, originalMessage = "Erro na operacao administrativa") {
  if (!isAdmin()) throw new Error("Identidade Admin TI nao validada pelo servidor.");
  const { data, error } = await supabaseClient.rpc(functionName, args);
  if (error) {
    console.error(`[Alion Treinos] Erro RPC ${functionName}:`, error);
    throw new Error(`${originalMessage}. RPC ${functionName}: ${error.message}`);
  }
  return data;
}

async function runAdminMaintenanceRpc(functionName, studentId, originalMessage) {
  return runAdminRpc(functionName, { target_student_id: studentId }, originalMessage);
}

function renderAdminStudentRecords(studentId) {
  const student = state.students.find((item) => String(item.id) === String(studentId));
  const logs = state.workoutLogs.filter((log) => String(log.student_id) === String(studentId));
  const workouts = state.workouts.filter((workout) => String(workout.student_id) === String(studentId));

  renderAdminMaintenanceLog(`${pick(student, ["name"], "Aluno")}: ${workouts.length} treinos e ${logs.length} sessoes registradas.`);
}

async function handleAdminStudentAction(action, studentId) {
  if (!await requireAdminTi()) return;

  state.selectedAdminStudentId = studentId;

  try {
    if (action === "select") {
      renderAdminArea();
      renderAdminStudentRecords(studentId);
      return;
    }

    if (action === "edit") {
      if (String(state.selectedStudentId) !== String(studentId)) cancelTrainerEditModes();
      state.selectedStudentId = studentId;
      state.trainerPdfWorkoutId = "all";
      renderTrainerStudents();
      await renderTrainerProfile();
      changeScreen("trainer-area");
      switchTrainerTab("profile");
      return;
    }

    const destructiveLabels = {
      "clear-logs": "excluir sessoes",
      "clear-workouts": "ocultar treinos",
      reset: "resetar aluno",
      archive: "arquivar aluno",
      restore: "restaurar aluno",
      "delete-permanent": "excluir definitivo"
    };

    if (destructiveLabels[action]) {
      const confirmName = getStudentConfirmName(studentId);
      const preview = await runAdminRpc(
        "admin_preview_student_maintenance",
        { target_student_id: studentId },
        "Erro ao calcular previa do aluno"
      ) || {};
      const previewText = Object.entries(preview).map(([key, value]) => `${key}: ${value}`).join(" | ");
      const confirmed = await confirmAdminDestructiveAction({
        title: destructiveLabels[action],
        description: action === "clear-workouts"
          ? `Confirme para ocultar os treinos de ${confirmName}. O histórico e os exercícios não serão apagados. Prévia: ${previewText}.`
          : `Confirme para ${destructiveLabels[action]} de ${confirmName}. Prévia: ${previewText}.`,
        expectedText: confirmName
      });
      if (!confirmed) return;
    }

    if (action === "clear-logs") {
      await clearStudentLogs(studentId);
      renderAdminMaintenanceLog("Sessoes do aluno excluidas.");
    }

    if (action === "clear-workouts") {
      const count = await updateStudentWorkoutsStatus(studentId, "excluido");
      renderAdminMaintenanceLog(`Treinos ocultados sem apagar histórico: ${count}.`);
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

    if (action === "delete-permanent") {
      await deleteStudentPermanently(studentId);
      state.selectedAdminStudentId = "";
      if (String(state.selectedStudentId) === String(studentId)) state.selectedStudentId = "";
      if (String(state.studentAreaId) === String(studentId)) state.studentAreaId = "";
      renderAdminMaintenanceLog("Aluno removido definitivamente do banco.");
    }

    await loadSupabaseData({ silent: true });
    renderAdminArea();
  } catch (error) {
    console.error("[Alion Treinos] Erro na acao Admin aluno:", error);
    showToast(error.message, "error");
  }
}

function isTestRecord(record, fields) {
  const text = fields.map((field) => pick(record, [field], "")).join(" ");
  const normalized = normalizeText(text);
  return ["teste", "test", "demo", "exemplo"].some((word) => normalized.includes(word));
}

async function handleAdminMaintenance(action) {
  if (!await requireAdminTi()) return;

  if (action === "duplicates") {
    renderDuplicateExerciseReport();
    showToast("Relatório de possíveis duplicidades gerado sem alterar dados.");
    return;
  }

  const operationLabels = {
    "selected-sessions": "LIMPAR SESSOES",
    "selected-measurements": "LIMPAR MEDIDAS",
    "selected-workouts": "OCULTAR TREINOS",
    "selected-reset": "RESETAR ALUNO",
    "test-data": "LIMPAR TESTES",
    "test-students": "EXCLUIR TESTES",
    "test-workouts": "EXCLUIR TREINOS TESTE",
    orphans: "LIMPAR ORFAOS"
  };
  const expectedText = operationLabels[action] || "CONFIRMAR";
  const selectedStudentId = action.startsWith("selected-") ? getSelectedAdminStudentId() : "";
  let preview = {};
  try {
    if (selectedStudentId) {
      preview = await runAdminRpc(
        "admin_preview_student_maintenance",
        { target_student_id: selectedStudentId },
        "Erro ao calcular previa do aluno"
      ) || {};
    } else if (["test-students", "test-workouts", "orphans"].includes(action)) {
      preview = await runAdminRpc(
        "admin_preview_maintenance",
        { maintenance_action: action },
        "Erro ao calcular previa da manutencao"
      ) || {};
    } else if (action === "test-data") {
      const [studentsPreview, workoutsPreview] = await Promise.all([
        runAdminRpc("admin_preview_maintenance", { maintenance_action: "test-students" }),
        runAdminRpc("admin_preview_maintenance", { maintenance_action: "test-workouts" })
      ]);
      preview = { ...(studentsPreview || {}), ...(workoutsPreview || {}) };
    }
  } catch (error) {
    showToast(error.message, "error");
    return;
  }
  const previewText = Object.entries(preview)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
  const confirmed = await confirmAdminDestructiveAction({
    title: "Confirmar manutencao",
    description: action === "selected-workouts"
      ? `Esta rotina oculta os treinos do aluno sem apagar histórico ou exercícios. Prévia do banco: ${previewText || "sem registros"}.`
      : `Esta rotina pode remover ou ocultar dados do banco. Prévia do banco: ${previewText || "sem registros"}.`,
    expectedText
  });
  if (!confirmed) return;

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
      result = `Treinos do aluno selecionado ocultados sem apagar histórico: ${count}.`;
    }

    if (action === "selected-reset") {
      const studentId = getSelectedAdminStudentId();
      await resetStudentData(studentId);
      result = "Aluno selecionado resetado para estado inicial.";
    }

    await loadSupabaseData({ silent: true });
    renderAdminArea();
    renderAdminMaintenanceLog(result || "Nenhuma rotina executada.");
    showToast(result || "Manutenção concluída.");
  } catch (error) {
    console.error("[Alion Treinos] Erro na manutencao Admin:", error);
    renderAdminMaintenanceLog(error.message);
    showToast(error.message, "error");
  }
}

async function removeTestStudents() {
  return Number(await runAdminRpc("admin_delete_test_students", {}, "Erro ao excluir alunos de teste") || 0);
}

async function removeTestWorkouts() {
  return Number(await runAdminRpc("admin_delete_test_workouts", {}, "Erro ao excluir treinos de teste") || 0);
}

async function removeDuplicateExercises() {
  throw new Error("A mesclagem automática foi desativada. Revise referências e escolha manualmente o registro principal.");
}

async function removeOrphanWorkoutData() {
  const result = await runAdminRpc("admin_cleanup_orphan_workout_data", {}, "Erro ao excluir dados orfaos") || {};
  return Number(result.workout_exercises || 0) + Number(result.workout_logs || 0);
}

async function deleteStudentPermanently(id) {
  await runAdminRpc("admin_delete_student_permanently", { target_student_id: id }, "Erro ao excluir aluno definitivamente");
}

async function deleteWorkoutPermanently(id, _options = {}) {
  await runAdminRpc("admin_delete_workout_permanently", { target_workout_id: id }, "Erro ao excluir treino definitivamente");
}

async function seedExerciseLibrary() {
  if (!await requireAdminTi()) return;
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
  const rawGroup = pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"]);
  const group = window.AlionTrainerDataRules?.normalizeMuscleGroup(rawGroup) || normalizeText(rawGroup);
  return `${normalizeText(pick(exercise, ["name", "title", "nome"]))}::${normalizeText(group)}`;
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
  const dateOnly = parseDateOnly(String(value).slice(0, 10));
  if (!dateOnly) return "";

  const today = new Date();
  const birthYear = Number(dateOnly.year);
  const birthMonthIndex = Number(dateOnly.month) - 1;
  const birthDay = Number(dateOnly.day);
  let age = today.getFullYear() - birthYear;
  const monthDiff = today.getMonth() - birthMonthIndex;

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDay)) {
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
  if (el.editStudentForm.elements.email) el.editStudentForm.elements.email.value = pick(student, ["email"], "");
  if (el.editStudentForm.elements.phone) el.editStudentForm.elements.phone.value = pick(student, ["phone", "telefone", "contact", "whatsapp"], "");
  if (el.editStudentForm.elements.whatsapp) el.editStudentForm.elements.whatsapp.value = pick(student, ["whatsapp", "contact", "phone", "telefone"], "");
  el.editStudentForm.elements.birth_date.value = formatInputDate(pick(student, ["birth_date", "date_of_birth"], ""));
  if (el.editStudentForm.elements.genero) {
    el.editStudentForm.elements.genero.value = normalizeStudentGenderValue(pick(student, ["genero", "gender"], ""));
  }
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
  renderTrainerPdfControls();

  if (!student) {
    el.trainerProfileTitle.textContent = "Selecione um aluno na lista.";
    el.trainerProfileSummary.innerHTML = emptyMessage("Selecione um aluno para visualizar o perfil.");
    el.trainerAssessments.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    el.trainerMeasurements.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    el.trainerWorkouts.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    el.trainerHistory.innerHTML = emptyMessage("Nenhum aluno selecionado.");
    renderStudentAccessPanel(null);
    fillStudentProfileForm(null);
    renderTrainerWorkoutSelect([]);
    return;
  }

  const name = pick(student, ["name", "full_name", "nome"], "Aluno sem nome");
  const birthDate = pick(student, ["birth_date"], "");
  const age = calculateAgeFromBirthDate(birthDate);
  el.trainerProfileTitle.textContent = name;
  renderStudentAccessPanel(student);
  el.trainerProfileSummary.innerHTML = `
    <div class="profile-card">
      <div class="avatar large ${getAvatarColor(name)}">${escapeHtml(name.charAt(0).toUpperCase())}</div>
      <div>
        <strong>${escapeHtml(name)}</strong>
        <span>Apelido: ${escapeHtml(pick(student, ["nickname", "apelido"], "Não informado"))}</span>
        <span>Nascimento: ${escapeHtml(birthDate ? formatDate(birthDate) : "Não informado")}</span>
        <span>Idade: ${escapeHtml(age !== "" ? `${age} anos` : "Nao informada")}</span>
        <span>E-mail: ${escapeHtml(pick(student, ["email"], "Não informado"))}</span>
        <span>Telefone: ${escapeHtml(pick(student, ["phone", "telefone"], "Não informado"))}</span>
        <span>WhatsApp: ${escapeHtml(pick(student, ["whatsapp"], "Não informado"))}</span>
        <span>Gênero: ${escapeHtml(formatStudentGender(pick(student, ["genero", "gender"], "")))}</span>
        <span>Altura: ${escapeHtml(formatNumber(pick(student, ["height_cm", "height"], "-")))} cm</span>
        <small>Objetivo: ${escapeHtml(pick(student, ["objective"], "Não informado"))}</small>
        <small>Dificuldades: ${escapeHtml(pick(student, ["difficulties"], "Não informado"))}</small>
        <small>Restrições: ${escapeHtml(pick(student, ["restrictions"], "Não informado"))}</small>
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

    if (el.trainerAssessmentComparison) {
      el.trainerAssessmentComparison.innerHTML = renderAssessmentComparison(assessments, measurements);
    }

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
  const healthFlags = [
    ["Cardiopatia", assessment.cardiopatia],
    ["Hipertensao", assessment.has_hipertensao],
    ["Diabetes", assessment.diabetes],
    ["Labirintite", assessment.labirintite],
    ["Endocrino", assessment.endocrino],
    ["Cirurgia", assessment.cirurgia],
    ["SNC", assessment.snc],
    ["Respiratorio", assessment.respiratorio],
    ["Tabagismo", assessment.tabagismo],
    ["Osteomioarticular", assessment.osteomioarticular]
  ].filter(([, value]) => Boolean(value)).map(([label]) => label).join(", ");

  return `
    <article class="data-record" data-assessment-id="${escapeHtml(assessment.id)}">
      <div class="record-title">
        <strong>${formatDate(pick(assessment, ["assessment_date", "data_avaliacao", "assessed_at", "created_at"]))}</strong>
        ${renderRecordActions("assessment", assessment.id)}
      </div>
      <span><b>Objetivo:</b> ${escapeHtml(pick(assessment, ["objective", "objetivo"], "-"))}</span>
      <span><b>Reavaliacao:</b> ${escapeHtml(formatDate(pick(assessment, ["reassessment_date", "data_reavaliacao"], "")) || "-")}</span>
      <span><b>Professor:</b> ${escapeHtml(pick(assessment, ["professor_responsavel"], "-"))}</span>
      <span><b>Peso:</b> ${escapeHtml(formatNumber(pick(assessment, ["weight", "weight_kg", "peso"], "-")))} kg</span>
      <span><b>Estatura:</b> ${escapeHtml(formatNumber(pick(assessment, ["estatura_cm", "height", "height_cm", "altura"], "-")))} cm</span>
      <span><b>Peso ideal:</b> ${escapeHtml(formatNumber(pick(assessment, ["peso_ideal"], "-")))} kg</span>
      <span><b>Gordura atual:</b> ${escapeHtml(formatNumber(pick(assessment, ["percentual_gordura_atual", "body_fat", "body_fat_percentage", "body_fat_percent", "gordura_corporal"], "-")))}</span>
      <span><b>Gordura ideal:</b> ${escapeHtml(formatNumber(pick(assessment, ["percentual_gordura_ideal"], "-")))}</span>
      <span><b>Massa muscular:</b> ${escapeHtml(formatNumber(pick(assessment, ["muscle_mass", "lean_mass", "muscle_mass_kg", "massa_muscular"], "-")))}</span>
      <span><b>Gordura visceral:</b> ${escapeHtml(formatNumber(pick(assessment, ["visceral_fat", "gordura_visceral"], "-")))}</span>
      <span><b>Agua corporal:</b> ${escapeHtml(formatNumber(pick(assessment, ["body_water_percent", "body_water", "body_water_percentage", "agua_corporal"], "-")))}</span>
      <span><b>IMC:</b> ${escapeHtml(formatNumber(pick(assessment, ["bmi", "imc"], "-")))}</span>
      <span><b>ICQ:</b> ${escapeHtml(formatNumber(pick(assessment, ["icq"], "-")))}</span>
      <span><b>PA repouso:</b> ${escapeHtml(pick(assessment, ["pa_repouso"], "-"))}</span>
      <span><b>FC repouso:</b> ${escapeHtml(formatNumber(pick(assessment, ["fc_repouso"], "-")))}</span>
      <span><b>Zona treino:</b> ${escapeHtml(pick(assessment, ["zona_treino"], "-"))}</span>
      ${healthFlags ? `<span><b>Restricoes:</b> ${escapeHtml(healthFlags)}</span>` : ""}
      ${pick(assessment, ["outros"], "") ? `<span><b>Outros:</b> ${escapeHtml(pick(assessment, ["outros"], ""))}</span>` : ""}
      <span><b>Dobras:</b> Torax ${escapeHtml(formatNumber(pick(assessment, ["torax_dobra"], "-")))} | Axilar ${escapeHtml(formatNumber(pick(assessment, ["axilar_media"], "-")))} | Supra ${escapeHtml(formatNumber(pick(assessment, ["supra_iliaca"], "-")))} | Abdomen ${escapeHtml(formatNumber(pick(assessment, ["abdomen_dobra"], "-")))} | Coxa ${escapeHtml(formatNumber(pick(assessment, ["coxa_dobra"], "-")))}</span>
      <span><b>Protocolo:</b> ${escapeHtml(pick(assessment, ["protocolo"], "-"))}</span>
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
      <span><b>Torax:</b> ${escapeHtml(formatNumber(pick(measurement, ["torax", "chest_cm", "chest"], "-")))} cm</span>
      <span><b>Cintura:</b> ${escapeHtml(formatNumber(pick(measurement, ["waist_cm", "waist", "cintura"], "-")))} cm</span>
      <span><b>Abdomen:</b> ${escapeHtml(formatNumber(pick(measurement, ["abdomen", "abdomen_cm", "abdome"], "-")))} cm</span>
      <span><b>Quadril:</b> ${escapeHtml(formatNumber(pick(measurement, ["hip", "hip_cm", "quadril"], "-")))} cm</span>
      <span><b>Bracos:</b> D ${escapeHtml(formatNumber(pick(measurement, ["braco_d", "right_arm_cm", "arm", "arms", "arm_cm", "arms_cm", "bracos"], "-")))} | E ${escapeHtml(formatNumber(pick(measurement, ["braco_e", "left_arm_cm"], "-")))} cm</span>
      <span><b>Antebracos:</b> D ${escapeHtml(formatNumber(pick(measurement, ["antebraco_d"], "-")))} | E ${escapeHtml(formatNumber(pick(measurement, ["antebraco_e"], "-")))} cm</span>
      <span><b>Coxas:</b> D ${escapeHtml(formatNumber(pick(measurement, ["coxa_d", "right_thigh_cm", "thigh", "thighs", "thigh_cm", "thighs_cm", "coxas"], "-")))} | E ${escapeHtml(formatNumber(pick(measurement, ["coxa_e", "left_thigh_cm"], "-")))} cm</span>
      <span><b>Panturrilhas:</b> D ${escapeHtml(formatNumber(pick(measurement, ["panturrilha_d", "right_calf_cm", "calf", "calves", "calf_cm", "calves_cm", "panturrilhas"], "-")))} | E ${escapeHtml(formatNumber(pick(measurement, ["panturrilha_e", "left_calf_cm"], "-")))} cm</span>
      <span><b>Bi medidas:</b> Epicondilo ${escapeHtml(formatNumber(pick(measurement, ["bi_epicondilo"], "-")))} | Estiloide ${escapeHtml(formatNumber(pick(measurement, ["bi_estiloide"], "-")))} | Femoral ${escapeHtml(formatNumber(pick(measurement, ["bi_femoral"], "-")))} | Maleolar ${escapeHtml(formatNumber(pick(measurement, ["bi_maleolar"], "-")))}</span>
      <span><b>ICQ:</b> ${escapeHtml(formatNumber(pick(measurement, ["icq"], "-")))}</span>
      ${notes ? `<span class="record-notes"><b>Obs:</b> ${escapeHtml(notes)}</span>` : ""}
    </article>
  `;
}

function renderAssessmentComparison(assessments, measurements) {
  if (!assessments.length && !measurements.length) {
    return emptyMessage("Sem avaliacoes suficientes para comparar.");
  }

  const sortedAssessments = [...assessments].sort((a, b) => String(pick(b, ["assessment_date", "data_avaliacao", "created_at"], "")).localeCompare(String(pick(a, ["assessment_date", "data_avaliacao", "created_at"], ""))));
  const current = sortedAssessments[0] || {};
  const previous = sortedAssessments[1] || {};
  const sortedMeasurements = [...measurements].sort((a, b) => String(pick(b, ["measurement_date", "created_at"], "")).localeCompare(String(pick(a, ["measurement_date", "created_at"], ""))));
  const currentMeasurement = sortedMeasurements[0] || {};
  const previousMeasurement = sortedMeasurements[1] || {};

  return `
    <article class="data-record">
      <strong>Comparativo atual x anterior</strong>
      ${renderComparisonLine("Peso", pick(previous, ["weight", "weight_kg", "peso"], ""), pick(current, ["weight", "weight_kg", "peso"], ""), "kg")}
      ${renderComparisonLine("Gordura", pick(previous, ["percentual_gordura_atual", "body_fat_percent"], ""), pick(current, ["percentual_gordura_atual", "body_fat_percent"], ""), "%")}
      ${renderComparisonLine("IMC", pick(previous, ["imc", "bmi"], ""), pick(current, ["imc", "bmi"], ""), "")}
      ${renderComparisonLine("Cintura", pick(previousMeasurement, ["waist_cm", "waist"], ""), pick(currentMeasurement, ["waist_cm", "waist"], ""), "cm")}
      ${renderComparisonLine("Quadril", pick(previousMeasurement, ["hip_cm", "hip"], ""), pick(currentMeasurement, ["hip_cm", "hip"], ""), "cm")}
    </article>
  `;
}

function renderComparisonLine(label, previousValue, currentValue, suffix) {
  const previousNumber = Number(previousValue);
  const currentNumber = Number(currentValue);
  const diff = !Number.isNaN(previousNumber) && !Number.isNaN(currentNumber)
    ? formatNumber((currentNumber - previousNumber).toFixed(2))
    : "";
  return `<span><b>${escapeHtml(label)}:</b> anterior ${escapeHtml(formatNumber(previousValue || "-"))}${suffix} | atual ${escapeHtml(formatNumber(currentValue || "-"))}${suffix}${diff !== "" ? ` | Variacao: ${escapeHtml(diff)}${suffix}` : ""}</span>`;
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
  const workoutNotes = getWorkoutNotes(workout, "");

  return `
    <article class="workout-card" data-workout-id="${escapeHtml(workout.id)}">
      <div class="record-title">
        <div>
          <strong>${escapeHtml(getWorkoutName(workout, "Treino sem nome"))}</strong>
          <span>Objetivo: ${escapeHtml(getWorkoutObjective(workout, "Objetivo nao informado"))}</span>
          ${workoutNotes ? `<small>Observações: ${escapeHtml(workoutNotes)}</small>` : ""}
          <small>Status: ${escapeHtml(formatWorkoutStatus(status))}${hasLogs ? " | possui histórico" : ""}</small>
          <small>Criado em ${formatDate(pick(workout, ["created_at", "start_date"]))}</small>
        </div>
        ${renderWorkoutActions(workout, hasLogs)}
      </div>
      <div class="workout-exercises">
        ${exercises.length ? exercises.map(renderTrainerWorkoutExerciseItem).join("") : emptyMessage("Nenhum exercício neste treino.")}
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
        <strong>${escapeHtml(pick(item, ["exercise_name"], pick(exercise, ["name", "title", "nome"], "Exercício")))}</strong>
        <span>Séries: ${escapeHtml(formatNumber(pick(item, ["sets"], "-")))} | Reps: ${escapeHtml(pick(item, ["reps"], "-"))} | Carga: ${escapeHtml(pick(item, ["weight"], "-"))} | Descanso: ${escapeHtml(formatNumber(pick(item, ["rest_seconds"], "-")))}s</span>
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
    ? exercises.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercício"))}</option>`).join("")
    : `<option value="">Nenhum exercício encontrado</option>`;
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
    const rawGroup = pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "");
    const group = window.AlionTrainerDataRules?.normalizeMuscleGroup(rawGroup) || rawGroup;
    const matchesSearch = !search || name.includes(search) || group.toLowerCase().includes(search);
    const matchesGroup = !state.exerciseGroupFilter || group === state.exerciseGroupFilter;
    return matchesSearch && matchesGroup;
  });

  el.trainerExerciseLibrary.innerHTML = exercises.length
    ? exercises.map(renderExerciseLibraryItem).join("")
    : emptyMessage(state.tableErrors.exercise_library || "Nenhum exercício encontrado na biblioteca.");
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
  const normalizeGroup = (value) => window.AlionTrainerDataRules?.normalizeMuscleGroup(value) || value;
  const groups = Array.from(new Set([...REQUIRED_EXERCISE_GROUPS.map(normalizeGroup), ...getUniqueExercises()
    .map((exercise) => normalizeGroup(pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "")))
    .filter(Boolean)]))
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  el.exerciseGroupFilter.innerHTML = `<option value="">Todos os grupos</option>${groups.map((group) => `<option value="${escapeHtml(group)}">${escapeHtml(group)}</option>`).join("")}`;
  el.exerciseGroupFilter.value = groups.includes(current) ? current : "";
  state.exerciseGroupFilter = el.exerciseGroupFilter.value;
}

/**
 * Renderiza um item da biblioteca de exercicios.
 */
function renderExerciseLibraryItem(exercise) {
  const student = getStudentForExerciseMedia(state.selectedStudentId);
  const imageUrl = getExerciseMediaByGender(exercise, student, "image");
  const videoUrl = getExerciseMediaByGender(exercise, student, "video");
  const commonMistakes = pick(exercise, ["common_mistakes"], "");
  const exerciseName = pick(exercise, ["name", "title", "nome"], "Exercício");
  const rawGroup = pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "");
  const group = window.AlionTrainerDataRules?.normalizeMuscleGroup(rawGroup) || rawGroup || "Grupo não informado";

  return `
    <article class="simple-item stacked library-item">
      <strong>${escapeHtml(exerciseName)}</strong>
      <span>${escapeHtml(group)}</span>
      <span>${escapeHtml(pick(exercise, ["equipment", "equipamento"], "Equipamento nao informado"))} | ${escapeHtml(pick(exercise, ["difficulty", "difficulty_level", "nivel"], "Nivel nao informado"))}</span>
      ${renderExerciseImage(imageUrl, exerciseName, true)}
      ${renderExerciseVideoButton(videoUrl)}
      <small>${escapeHtml(pick(exercise, ["instructions", "description", "instrucoes"], "Sem instrucoes cadastradas."))}</small>
      ${commonMistakes ? `<small><b>Erros comuns:</b> ${escapeHtml(commonMistakes)}</small>` : ""}
      <div class="record-actions">
        <button class="tiny-button" type="button" data-library-exercise-action="edit" data-id="${escapeHtml(exercise.id)}">Editar</button>
      </div>
    </article>
  `;
}

function buildExerciseLibraryPayload(form) {
  const formData = new FormData(form);
  return {
    name: String(formData.get("name") || "").trim(),
    muscle_group: String(formData.get("muscle_group") || "").trim() || null,
    equipment: String(formData.get("equipment") || "").trim() || null,
    difficulty: String(formData.get("difficulty") || "").trim() || null,
    image_url: normalizeOptionalUrl(formData.get("image_url"), "URL da imagem"),
    video_url: normalizeOptionalUrl(formData.get("video_url"), "URL do video"),
    image_url_masculino: normalizeOptionalUrl(formData.get("image_url_masculino"), "URL da imagem masculina"),
    image_url_feminino: normalizeOptionalUrl(formData.get("image_url_feminino"), "URL da imagem feminina"),
    video_url_masculino: normalizeOptionalUrl(formData.get("video_url_masculino"), "URL do video masculino"),
    video_url_feminino: normalizeOptionalUrl(formData.get("video_url_feminino"), "URL do video feminino"),
    instructions: String(formData.get("instructions") || "").trim() || null,
    observations: String(formData.get("observations") || "").trim() || null,
    posture: String(formData.get("posture") || "").trim() || null,
    breathing: String(formData.get("breathing") || "").trim() || null,
    common_mistakes: String(formData.get("common_mistakes") || "").trim() || null,
    care_notes: String(formData.get("care_notes") || "").trim() || null
  };
}

async function saveExerciseLibraryItem(form) {
  try {
    const payload = buildExerciseLibraryPayload(form);
    if (!payload.name) {
      throw new Error("Informe o nome do exercício.");
    }

    const editId = form.dataset.editId || "";
    const normalizedName = window.AlionTrainerDataRules?.normalizeExerciseName(payload.name) || normalizeText(payload.name);
    const normalizedGroup = window.AlionTrainerDataRules?.normalizeMuscleGroup(payload.muscle_group) || normalizeText(payload.muscle_group);
    const normalizedEquipment = normalizeText(payload.equipment);
    const existingDuplicate = state.exercises.find((exercise) => (
      String(exercise.id) !== String(editId)
      && (window.AlionTrainerDataRules?.normalizeExerciseName(pick(exercise, ["name", "title", "nome"], "")) || normalizeText(pick(exercise, ["name", "title", "nome"], ""))) === normalizedName
      && (window.AlionTrainerDataRules?.normalizeMuscleGroup(pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "")) || normalizeText(pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], ""))) === normalizedGroup
      && normalizeText(pick(exercise, ["equipment", "equipamento"], "")) === normalizedEquipment
    ));
    if (existingDuplicate) {
      throw new Error(`Já existe um exercício equivalente: ${pick(existingDuplicate, ["name", "title", "nome"], "exercício existente")}. Edite o registro existente para preservar os vínculos.`);
    }
    if (editId) {
      await updateWithSchemaFallback("exercise_library", editId, payload, "Erro ao editar exercício da biblioteca");
      showToast("Exercício da biblioteca atualizado.");
    } else {
      await insertWithSchemaFallback("exercise_library", payload, "Erro ao cadastrar exercício na biblioteca");
      showToast("Exercício cadastrado na biblioteca.");
    }

    clearExerciseLibraryForm(form);
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

function editExerciseLibraryItem(id, form = el.exerciseLibraryForm) {
  const exercise = state.exercises.find((item) => String(item.id) === String(id));
  if (!exercise || !form) return;

  form.dataset.editId = id;
  form.elements.name.value = pick(exercise, ["name", "title", "nome"], "");
  form.elements.muscle_group.value = pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "");
  form.elements.equipment.value = pick(exercise, ["equipment", "equipamento"], "");
  form.elements.difficulty.value = pick(exercise, ["difficulty", "difficulty_level", "nivel"], "");
  form.elements.image_url.value = pick(exercise, ["image_url"], "");
  form.elements.video_url.value = pick(exercise, ["video_url"], "");
  if (form.elements.image_url_masculino) form.elements.image_url_masculino.value = pick(exercise, ["image_url_masculino"], "");
  if (form.elements.image_url_feminino) form.elements.image_url_feminino.value = pick(exercise, ["image_url_feminino"], "");
  if (form.elements.video_url_masculino) form.elements.video_url_masculino.value = pick(exercise, ["video_url_masculino"], "");
  if (form.elements.video_url_feminino) form.elements.video_url_feminino.value = pick(exercise, ["video_url_feminino"], "");
  form.elements.instructions.value = pick(exercise, ["instructions", "description", "instrucoes"], "");
  if (form.elements.observations) form.elements.observations.value = pick(exercise, ["observations"], "");
  if (form.elements.posture) form.elements.posture.value = pick(exercise, ["posture"], "");
  if (form.elements.breathing) form.elements.breathing.value = pick(exercise, ["breathing"], "");
  form.elements.common_mistakes.value = pick(exercise, ["common_mistakes"], "");
  if (form.elements.care_notes) form.elements.care_notes.value = pick(exercise, ["care_notes"], "");
  updateExerciseImagePreview(form);
  form.querySelector("button[type='submit']").textContent = "Atualizar exercício";
}

function clearExerciseLibraryForm(form = el.exerciseLibraryForm) {
  if (!form) return;
  form.reset();
  form.dataset.editId = "";
  form.dataset.pendingUploads = "0";
  form.querySelectorAll("[data-exercise-image-preview]").forEach((preview) => delete preview.dataset.localPreview);
  form.querySelectorAll("[data-upload-status]").forEach((status) => {
    status.textContent = "WEBP, PNG ou JPEG - até 2 MB";
  });
  form.querySelector("button[type='submit']").textContent = "Salvar exercício";
  form.querySelector("button[type='submit']").disabled = false;
  updateExerciseImagePreview(form);
}

function updateExerciseImagePreview(form) {
  const previews = [...(form?.querySelectorAll("[data-exercise-image-preview]") || [])];
  previews.forEach((preview) => {
    const field = preview.dataset.exerciseImagePreview || "image_url";
    const localUrl = preview.dataset.localPreview || "";
    const url = localUrl || getExerciseMediaUrl(form.elements[field]?.value, "image");
    preview.innerHTML = `
      <span>Prévia</span>
      <img src="${escapeHtml(url || window.AlionExerciseMedia.PLACEHOLDER)}" alt="Prévia da imagem do exercício" loading="lazy" decoding="async" onerror="this.onerror=null;this.src='${window.AlionExerciseMedia.PLACEHOLDER}';" />
      ${form.elements[field]?.value ? `<button class="ghost-button" type="button" data-remove-exercise-image="${escapeHtml(field)}">Remover imagem</button>` : ""}
    `;
  });
}

function setExerciseUploadPending(form, pending) {
  const current = Number(form.dataset.pendingUploads || 0);
  const next = Math.max(0, current + (pending ? 1 : -1));
  form.dataset.pendingUploads = String(next);
  const submit = form.querySelector("button[type='submit']");
  if (submit) submit.disabled = next > 0;
}

async function uploadExerciseLibraryImage(form, input) {
  const file = input.files?.[0];
  if (!file) return;
  const variant = input.dataset.exerciseImageFile;
  const card = input.closest("[data-image-variant]");
  const status = card?.querySelector("[data-upload-status]");
  const preview = card?.querySelector("[data-exercise-image-preview]");
  let localPreview = "";
  let pending = false;

  try {
    if (!isAuthenticatedAdminTi()) throw new Error("Somente o Admin legítimo pode enviar imagens.");
    if (!window.AlionExerciseUpload) throw new Error("O módulo de upload de imagens não foi carregado.");
    const exerciseName = String(form.elements.name?.value || "").trim();
    window.AlionExerciseUpload.validateImageFile(file);
    if (!exerciseName) throw new Error("Informe o nome do exercício antes de selecionar a imagem.");

    localPreview = URL.createObjectURL(file);
    if (preview) preview.dataset.localPreview = localPreview;
    updateExerciseImagePreview(form);
    if (status) status.textContent = "Enviando imagem...";
    setExerciseUploadPending(form, true);
    pending = true;

    const result = await window.AlionExerciseUpload.uploadExerciseImage({
      client: supabaseClient,
      file,
      exerciseName,
      variant,
      isAdmin: isAuthenticatedAdminTi()
    });
    form.elements[result.field].value = result.publicUrl;
    if (preview) delete preview.dataset.localPreview;
    updateExerciseImagePreview(form);
    if (status) status.textContent = "Upload concluído. URL preenchida automaticamente.";
    showToast("Imagem enviada com sucesso.");
  } catch (error) {
    if (preview) delete preview.dataset.localPreview;
    updateExerciseImagePreview(form);
    if (status) status.textContent = error.message || "Falha no upload.";
    input.value = "";
    showToast(error.message || "Não foi possível enviar a imagem.", "error");
  } finally {
    if (localPreview) URL.revokeObjectURL(localPreview);
    if (pending) setExerciseUploadPending(form, false);
  }
}

function updateAssessmentCalculatedFields(form) {
  if (!form) return;
  const formData = new FormData(form);
  const weight = numberOrNull(getFormValue(formData, ["weight_kg", "weight"]));
  const height = numberOrNull(formData.get("height"));
  const latestMeasurement = getLatestMeasurementForStudent(state.selectedStudentId);
  const waist = numberOrNull(pick(latestMeasurement, ["waist_cm", "waist", "cintura"], ""));
  const hip = numberOrNull(pick(latestMeasurement, ["hip_cm", "hip", "quadril"], ""));
  const imc = calculateImc(weight, height);
  const icq = calculateIcq(waist, hip);
  if (form.elements.imc) form.elements.imc.value = imc ?? "";
  if (form.elements.icq) form.elements.icq.value = icq ?? "";
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
    email: String(formData.get("email") || "").trim().toLowerCase() || null,
    ...buildStudentContactPayload(formData.get("whatsapp") || formData.get("phone")),
    birth_date: formData.get("birth_date") || null,
    genero: normalizeStudentGenderValue(formData.get("genero")) || null,
    height_cm: numberOrNull(formData.get("height_cm")),
    objective: formData.get("objective") || null,
    difficulties: formData.get("difficulties") || null,
    restrictions: formData.get("restrictions") || null,
    notes: formData.get("notes") || null
  };
  console.log("[Alion Treinos] updateStudent(id, payload):", {
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
  const latestMeasurement = getLatestMeasurementForStudent(state.selectedStudentId);
  const waist = numberOrNull(pick(latestMeasurement, ["waist_cm", "waist", "cintura"], ""));
  const hip = numberOrNull(pick(latestMeasurement, ["hip_cm", "hip", "quadril"], ""));
  const bodyFat = numberOrNull(getFormValue(formData, ["body_fat_percent", "body_fat"]));
  const muscleMass = numberOrNull(getFormValue(formData, ["muscle_mass_kg", "muscle_mass"]));
  const visceralFat = numberOrNull(formData.get("visceral_fat"));
  const bodyWater = numberOrNull(getFormValue(formData, ["body_water_percent", "body_water"]));
  const imc = calculateImc(weight, height) || numberOrNull(getFormValue(formData, ["imc", "bmi"]));
  const icq = calculateIcq(waist, hip) || numberOrNull(formData.get("icq"));
  const payload = {
    student_id: state.selectedStudentId,
    trainer_id: state.authProfile?.id || null,
    objective: formData.get("objective") || null,
    objetivo: formData.get("objective") || null,
    assessment_date: formData.get("assessment_date") || null,
    data_avaliacao: formData.get("assessment_date") || null,
    reassessment_date: formData.get("reassessment_date") || null,
    data_reavaliacao: formData.get("reassessment_date") || null,
    professor_responsavel: formData.get("professor_responsavel") || null,
    weight,
    weight_kg: weight,
    peso: weight,
    height,
    height_cm: height,
    altura: height,
    estatura_cm: height,
    peso_ideal: numberOrNull(formData.get("peso_ideal")),
    body_fat: bodyFat,
    body_fat_percentage: bodyFat,
    body_fat_percent: bodyFat,
    gordura_corporal: bodyFat,
    percentual_gordura_atual: bodyFat,
    percentual_gordura_ideal: numberOrNull(formData.get("percentual_gordura_ideal")),
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
    icq,
    pa_repouso: formData.get("pa_repouso") || null,
    fc_repouso: numberOrNull(formData.get("fc_repouso")),
    zona_treino: formData.get("zona_treino") || null,
    cardiopatia: boolFromForm(formData, "cardiopatia"),
    has_hipertensao: boolFromForm(formData, "has_hipertensao"),
    diabetes: boolFromForm(formData, "diabetes"),
    labirintite: boolFromForm(formData, "labirintite"),
    endocrino: boolFromForm(formData, "endocrino"),
    cirurgia: boolFromForm(formData, "cirurgia"),
    snc: boolFromForm(formData, "snc"),
    respiratorio: boolFromForm(formData, "respiratorio"),
    tabagismo: boolFromForm(formData, "tabagismo"),
    osteomioarticular: boolFromForm(formData, "osteomioarticular"),
    outros: formData.get("outros") || null,
    torax_dobra: numberOrNull(formData.get("torax_dobra")),
    axilar_media: numberOrNull(formData.get("axilar_media")),
    supra_iliaca: numberOrNull(formData.get("supra_iliaca")),
    abdomen_dobra: numberOrNull(formData.get("abdomen_dobra")),
    coxa_dobra: numberOrNull(formData.get("coxa_dobra")),
    subescapular: numberOrNull(formData.get("subescapular")),
    triceps: numberOrNull(formData.get("triceps")),
    biceps: numberOrNull(formData.get("biceps")),
    panturrilha_dobra: numberOrNull(formData.get("panturrilha_dobra")),
    protocolo: formData.get("protocolo") || null,
    notes: formData.get("notes") || null
  };
  const editId = form.dataset.editId;
  console.log("[Alion Treinos] Enviando assessment para Supabase:", {
    mode: editId ? "update" : "insert",
    id: editId || null,
    payload
  });
  setFormLoading(form, true);

  try {
    if (editId) {
      await updateWithSchemaFallback("assessments", editId, payload, "Erro ao editar avaliacao");
      resetAssessmentEditMode(form);
      showToast("Avaliação atualizada com sucesso");
    } else {
      await insertWithSchemaFallback("assessments", payload, "Erro ao salvar avaliacao");
      showToast("Avaliacao salva com sucesso.");
    }
    form.reset();
    await refreshSelectedStudentProfile();
  } catch (error) {
    console.error("[Alion Treinos] Erro ao salvar/editar avaliacao:", error);
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
  const torax = numberOrNull(getFormValue(formData, ["torax", "chest_cm"]));
  const waist = numberOrNull(getFormValue(formData, ["waist_cm", "waist"]));
  const abdomen = numberOrNull(getFormValue(formData, ["abdomen_cm", "abdomen"]));
  const hip = numberOrNull(getFormValue(formData, ["hip_cm", "hip"]));
  const bracoD = numberOrNull(getFormValue(formData, ["braco_d", "right_arm_cm", "arm_cm", "arm"]));
  const bracoE = numberOrNull(getFormValue(formData, ["braco_e", "left_arm_cm", "arm_cm", "arm"]));
  const coxaD = numberOrNull(getFormValue(formData, ["coxa_d", "right_thigh_cm", "thigh_cm", "thigh"]));
  const coxaE = numberOrNull(getFormValue(formData, ["coxa_e", "left_thigh_cm", "thigh_cm", "thigh"]));
  const panturrilhaD = numberOrNull(getFormValue(formData, ["panturrilha_d", "right_calf_cm", "calf_cm", "calf"]));
  const panturrilhaE = numberOrNull(getFormValue(formData, ["panturrilha_e", "left_calf_cm", "calf_cm", "calf"]));
  const payload = {
    student_id: state.selectedStudentId,
    trainer_id: state.authProfile?.id || null,
    measurement_date: formData.get("measurement_date") || null,
    torax,
    chest_cm: torax,
    waist,
    waist_cm: waist,
    cintura: waist,
    abdomen,
    abdomen_cm: abdomen,
    abdome: abdomen,
    hip,
    hip_cm: hip,
    quadril: hip,
    braco_d: bracoD,
    braco_e: bracoE,
    right_arm_cm: bracoD,
    left_arm_cm: bracoE,
    arm: bracoD,
    arm_cm: bracoD,
    arms_cm: bracoD,
    arms: bracoD,
    bracos: bracoD,
    antebraco_d: numberOrNull(formData.get("antebraco_d")),
    antebraco_e: numberOrNull(formData.get("antebraco_e")),
    coxa_d: coxaD,
    coxa_e: coxaE,
    right_thigh_cm: coxaD,
    left_thigh_cm: coxaE,
    thigh: coxaD,
    thigh_cm: coxaD,
    thighs_cm: coxaD,
    thighs: coxaD,
    coxas: coxaD,
    panturrilha_d: panturrilhaD,
    panturrilha_e: panturrilhaE,
    right_calf_cm: panturrilhaD,
    left_calf_cm: panturrilhaE,
    calf: panturrilhaD,
    calf_cm: panturrilhaD,
    calves_cm: panturrilhaD,
    calves: panturrilhaD,
    panturrilhas: panturrilhaD,
    bi_epicondilo: numberOrNull(formData.get("bi_epicondilo")),
    bi_estiloide: numberOrNull(formData.get("bi_estiloide")),
    bi_femoral: numberOrNull(formData.get("bi_femoral")),
    bi_maleolar: numberOrNull(formData.get("bi_maleolar")),
    icq: calculateIcq(waist, hip),
    notes: formData.get("notes") || null
  };
  const editId = form.dataset.editId;
  console.log("[Alion Treinos] Enviando body_measurement para Supabase:", {
    mode: editId ? "update" : "insert",
    id: editId || null,
    payload
  });
  setFormLoading(form, true);

  try {
    if (editId) {
      await updateWithSchemaFallback("body_measurements", editId, payload, "Erro ao editar medidas");
      resetMeasurementEditMode(form);
      showToast("Medidas atualizadas com sucesso.");
    } else {
      await insertWithSchemaFallback("body_measurements", payload, "Erro ao salvar medidas");
      showToast("Medidas salvas com sucesso.");
    }
    form.reset();
    await refreshSelectedStudentProfile();
  } catch (error) {
    console.error("[Alion Treinos] Erro ao salvar/editar medidas:", error);
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

  const editId = form.dataset.editId;
  const workoutInput = {
    name: workoutName,
    objective: getFormValue(formData, ["objective", "goal"]),
    notes: formData.get("notes")
  };
  const workoutFields = buildWorkoutFields(workoutInput);
  setFormLoading(form, true);

  try {
    if (editId) {
      console.log("[Alion Treinos] Enviando workout para Supabase:", {
        mode: "update",
        id: editId,
        payload: workoutFields
      });
      const updated = await updateWithSchemaFallback("workouts", editId, workoutFields, "Erro ao editar treino");
      assertPersistedWorkout(updated, workoutInput, "Erro ao editar treino");
      state.selectedWorkoutId = editId;
      form.dataset.editId = "";
      form.querySelector("button[type='submit']").textContent = "Criar treino";
      showToast("Treino atualizado.");
    } else {
      const responsibleProfile = (isTrainer() || isAdmin())
        ? await fetchAppProfileByUserId(state.authUser?.id)
        : null;
      const responsibleProfileId = responsibleProfile?.id || null;

      if ((isTrainer() || isAdmin()) && !responsibleProfileId) {
        throw new Error("Perfil do Personal/Admin nao encontrado em app_profiles. Faca logout/login e tente novamente.");
      }

      const insertPayload = {
        student_id: state.selectedStudentId,
        ...workoutFields,
        status: "ativo",
        personal_id: responsibleProfileId,
        trainer_id: responsibleProfileId,
        created_by: state.authUser?.id || null
      };
      console.log("[Alion Treinos] Enviando workout para Supabase:", {
        mode: "insert",
        id: null,
        payload: insertPayload
      });
      const created = await insertWithSchemaFallback("workouts", insertPayload, "Erro ao criar treino");
      const savedWorkout = assertPersistedWorkout(created, workoutInput, "Erro ao criar treino");
      state.selectedWorkoutId = savedWorkout.id || "";
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
    showToast("Selecione treino e exercício.", "error");
    return;
  }

  if (!exerciseName) {
    showToast("Exercício selecionado não possui nome cadastrado.", "error");
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
  console.log("[Alion Treinos] addExerciseToWorkout(payload):", {
    mode: editId ? "update" : "insert",
    id: editId || null,
    payload
  });

  try {
    if (editId) {
      await updateWithSchemaFallback("workout_exercises", editId, payload, "Erro ao editar exercício do treino");
      el.addExerciseButton.dataset.editId = "";
      el.addExerciseButton.textContent = "Adicionar exercício";
      showToast("Exercício atualizado no treino.");
    } else {
      await insertWorkoutExerciseWithFallback(payload);
      showToast("Exercício adicionado ao treino.");
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
 * Atualiza com compatibilidade para aliases legados sem remover campos canonicos.
 */
async function updateWithSchemaFallback(tableName, id, payload, fallbackMessage) {
  return window.AlionWorkoutData.runWithSchemaFallback({
    tableName,
    payload,
    fallbackMessage,
    execute: async (currentPayload) => {
      if (["students", "assessments", "body_measurements", "exercise_library", "workouts", "workout_exercises"].includes(tableName)) {
        console.log(`[Alion Treinos] UPDATE final em ${tableName}:`, { id, payload: currentPayload });
      }
      return await runQuery(supabaseClient.from(tableName).update(currentPayload).eq("id", id).select(), fallbackMessage);
    }
  });
}

/**
 * Exclui registros do Supabase sem depender de retorno select.
 */
async function deleteById(tableName, id, fallbackMessage) {
  if (!id || id === "undefined") {
    throw new Error(`${fallbackMessage}: id nao informado.`);
  }

  console.log(`[Alion Treinos] DELETE em ${tableName}:`, { id });
  const { error } = await supabaseClient.from(tableName).delete().eq("id", id);
  if (error) {
    console.error(`[Alion Treinos] Erro DELETE em ${tableName}:`, error);
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

async function moveOwnedRecordToTrash(recordType, id, label) {
  const { error } = await supabaseClient.rpc("alion_soft_delete_owned_record", {
    target_type: recordType,
    target_id: id,
    target_label: label || "Registro"
  });
  if (error) throw new Error(`Não foi possível mover para a lixeira: ${error.message}`);
}

/**
 * Exclui uma avaliacao pelo id.
 */
async function deleteAssessment(id) {
  if (!window.confirm(DELETE_CONFIRMATION)) return;
  console.log("[Alion Treinos] deleteAssessment(id):", id);

  try {
    await moveOwnedRecordToTrash("assessment", id, "Avaliação");
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
  console.log("[Alion Treinos] deleteBodyMeasurement(id):", id);

  try {
    await moveOwnedRecordToTrash("body_measurement", id, "Medida corporal");
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
  console.log("[Alion Treinos] deleteWorkoutExercise(id):", id);

  try {
    await moveOwnedRecordToTrash("workout_exercise", id, "Exercício do treino");
    showToast("Exercício removido do treino.");
    await reloadAfterDelete();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Exclui treino pelo id e remove seus exercicios caso nao exista cascade.
 */
async function deleteWorkout(id) {
  const workout = state.workouts.find((item) => String(item.id) === String(id));
  const workoutName = getWorkoutName(workout, "EXCLUIR TREINO");
  if (!isAdmin()) {
    if (!window.confirm("Mover este treino para a lixeira? O histórico será preservado.")) return;
    try {
      await moveOwnedRecordToTrash("workout", id, workoutName);
      showToast("Treino movido para a lixeira.");
      await reloadAfterDelete();
    } catch (error) {
      showToast(error.message, "error");
    }
    return;
  }
  let preview;
  try {
    preview = await runAdminRpc(
      "admin_preview_workout_deletion",
      { target_workout_id: id },
      "Erro ao calcular previa do treino"
    ) || {};
  } catch (error) {
    showToast(error.message, "error");
    return;
  }
  const confirmed = await confirmAdminDestructiveAction({
    title: "Excluir treino definitivamente",
    description: `Esta acao remove o treino e seus vínculos. Prévia real do banco: exercícios ${preview.exercises || 0}, sessões ${preview.sessions || 0}.`,
    expectedText: workoutName
  });
  if (!confirmed) return;
  console.log("[Alion Treinos] deleteWorkout(id):", id);

  try {
    await deleteWorkoutPermanently(id);
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
  if (!id) {
    showToast("Selecione um aluno antes de excluir.", "error");
    return;
  }

  if (isStudent()) {
    showToast("Aluno não pode excluir cadastro. Fale com o personal ou com o sistema.", "error");
    return;
  }

  const confirmation = isAdmin()
    ? "Tem certeza que deseja excluir definitivamente? Esta acao nao podera ser desfeita."
    : "Tem certeza que deseja marcar este aluno como excluído e enviar ao sistema?";
  if (!window.confirm(confirmation)) return;
  console.log("[Alion Treinos] deleteStudent(id):", id);

  try {
    if (isAdmin()) {
      await deleteStudentPermanently(id);
      showToast("Aluno excluido definitivamente.");
    } else {
      const deleted = await requestStudentDeletionByPersonal(id);
      if (!deleted) return;
      showToast("Aluno marcado como excluído e enviado ao sistema.");
    }

    state.selectedStudentId = "";
    state.selectedWorkoutId = "";
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
  console.log(`[Alion Treinos] DELETE em ${tableName} por ${column}:`, value);
  const { error } = await supabaseClient.from(tableName).delete().eq(column, value);
  if (error) {
    console.error(`[Alion Treinos] Erro DELETE em ${tableName}:`, error);
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
  if (!form) return;

  if (!record) {
    showToast("Avaliacao nao encontrada para edicao. Recarregue os dados.", "error");
    console.error("[Alion Treinos] Avaliacao nao encontrada no cache:", { id, cache: state.trainerAssessmentsCache });
    return;
  }

  form.dataset.editId = id;
  setFormTitle(form, "Editar avaliação física");
  setFormControlValue(form, "objective", pick(record, ["objective", "objetivo"], ""));
  setFormControlValue(form, "assessment_date", dateInputValue(pick(record, ["assessment_date", "data_avaliacao", "assessed_at", "created_at"], "")));
  setFormControlValue(form, "reassessment_date", dateInputValue(pick(record, ["reassessment_date", "data_reavaliacao"], "")));
  setFormControlValue(form, "professor_responsavel", pick(record, ["professor_responsavel"], ""));
  setFormControlValue(form, "weight_kg", normalizeNumberInput(pick(record, ["weight_kg", "weight", "peso"], "")));
  setFormControlValue(form, "height", normalizeNumberInput(pick(record, ["estatura_cm", "height", "height_cm", "altura"], "")));
  setFormControlValue(form, "peso_ideal", normalizeNumberInput(pick(record, ["peso_ideal"], "")));
  setFormControlValue(form, "body_fat_percent", normalizeNumberInput(pick(record, ["percentual_gordura_atual", "body_fat_percent", "body_fat", "body_fat_percentage", "gordura_corporal"], "")));
  setFormControlValue(form, "percentual_gordura_ideal", normalizeNumberInput(pick(record, ["percentual_gordura_ideal"], "")));
  setFormControlValue(form, "muscle_mass_kg", normalizeNumberInput(pick(record, ["muscle_mass_kg", "muscle_mass", "lean_mass", "massa_muscular"], "")));
  setFormControlValue(form, "visceral_fat", normalizeNumberInput(pick(record, ["visceral_fat", "gordura_visceral"], "")));
  setFormControlValue(form, "body_water_percent", normalizeNumberInput(pick(record, ["body_water_percent", "body_water", "body_water_percentage", "agua_corporal"], "")));
  setFormControlValue(form, "pa_repouso", pick(record, ["pa_repouso"], ""));
  setFormControlValue(form, "fc_repouso", normalizeNumberInput(pick(record, ["fc_repouso"], "")));
  setFormControlValue(form, "zona_treino", pick(record, ["zona_treino"], ""));
  setFormControlValue(form, "imc", normalizeNumberInput(pick(record, ["imc", "bmi"], "")));
  setFormControlValue(form, "icq", normalizeNumberInput(pick(record, ["icq"], "")));
  ["cardiopatia", "has_hipertensao", "diabetes", "labirintite", "endocrino", "cirurgia", "snc", "respiratorio", "tabagismo", "osteomioarticular"].forEach((field) => {
    setFormControlChecked(form, field, record[field]);
  });
  setFormControlValue(form, "outros", pick(record, ["outros"], ""));
  ["torax_dobra", "axilar_media", "supra_iliaca", "abdomen_dobra", "coxa_dobra", "subescapular", "triceps", "biceps", "panturrilha_dobra"].forEach((field) => {
    setFormControlValue(form, field, normalizeNumberInput(pick(record, [field], "")));
  });
  setFormControlValue(form, "protocolo", pick(record, ["protocolo"], ""));
  setFormControlValue(form, "notes", pick(record, ["notes", "observations"], ""));
  setSubmitLabel(form, "Atualizar avaliação");
  switchTrainerTab("assessments");
}

/**
 * Preenche formulario de medidas para edicao.
 */
function editMeasurement(id) {
  const record = state.trainerMeasurementsCache.find((item) => String(item.id) === String(id));
  const form = document.querySelector("#new-measurement-form");
  if (!form) return;

  if (!record) {
    showToast("Medida nao encontrada para edicao. Recarregue os dados.", "error");
    console.error("[Alion Treinos] Medida nao encontrada no cache:", { id, cache: state.trainerMeasurementsCache });
    return;
  }

  form.dataset.editId = id;
  setFormTitle(form, "Editar perimetria");
  setFormControlValue(form, "measurement_date", dateInputValue(pick(record, ["measurement_date", "measured_at", "created_at"], "")));
  setFormControlValue(form, "torax", normalizeNumberInput(pick(record, ["torax", "chest_cm", "chest"], "")));
  setFormControlValue(form, "waist_cm", normalizeNumberInput(pick(record, ["waist_cm", "waist", "cintura"], "")));
  setFormControlValue(form, "abdomen_cm", normalizeNumberInput(pick(record, ["abdomen_cm", "abdomen", "abdome"], "")));
  setFormControlValue(form, "hip_cm", normalizeNumberInput(pick(record, ["hip_cm", "hip", "quadril"], "")));
  setFormControlValue(form, "braco_d", normalizeNumberInput(pick(record, ["braco_d", "right_arm_cm", "arm_cm", "arms_cm", "arm", "arms", "bracos"], "")));
  setFormControlValue(form, "braco_e", normalizeNumberInput(pick(record, ["braco_e", "left_arm_cm"], "")));
  setFormControlValue(form, "antebraco_d", normalizeNumberInput(pick(record, ["antebraco_d"], "")));
  setFormControlValue(form, "antebraco_e", normalizeNumberInput(pick(record, ["antebraco_e"], "")));
  setFormControlValue(form, "coxa_d", normalizeNumberInput(pick(record, ["coxa_d", "right_thigh_cm", "thigh_cm", "thighs_cm", "thigh", "thighs", "coxas"], "")));
  setFormControlValue(form, "coxa_e", normalizeNumberInput(pick(record, ["coxa_e", "left_thigh_cm"], "")));
  setFormControlValue(form, "panturrilha_d", normalizeNumberInput(pick(record, ["panturrilha_d", "right_calf_cm", "calf_cm", "calves_cm", "calf", "calves", "panturrilhas"], "")));
  setFormControlValue(form, "panturrilha_e", normalizeNumberInput(pick(record, ["panturrilha_e", "left_calf_cm"], "")));
  setFormControlValue(form, "bi_epicondilo", normalizeNumberInput(pick(record, ["bi_epicondilo"], "")));
  setFormControlValue(form, "bi_estiloide", normalizeNumberInput(pick(record, ["bi_estiloide"], "")));
  setFormControlValue(form, "bi_femoral", normalizeNumberInput(pick(record, ["bi_femoral"], "")));
  setFormControlValue(form, "bi_maleolar", normalizeNumberInput(pick(record, ["bi_maleolar"], "")));
  setFormControlValue(form, "notes", pick(record, ["notes", "observations"], ""));
  setSubmitLabel(form, "Atualizar medidas");
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
  setFormControlValue(form, "name", getWorkoutName(record, ""));
  setFormControlValue(form, "objective", getWorkoutObjective(record, ""));
  setFormControlValue(form, "notes", getWorkoutNotes(record, ""));
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
  el.addExerciseButton.textContent = "Atualizar exercício";
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
      `Primeiro treino: ${escapeHtml(getWorkoutName(workouts.at(-1), "-"))}`
    ]),
    renderHistoryBlock("Agora", [
      `Peso atual: ${formatNumber(pick(latestAssessment, ["weight", "weight_kg", "peso"], "-"))} kg`,
      `Cintura atual: ${formatNumber(pick(latestMeasurement, ["waist", "waist_cm", "cintura"], "-"))} cm`,
      `Treino atual: ${escapeHtml(getWorkoutName(workouts[0], "-"))}`
    ]),
    renderHistoryBlock("Treinos concluidos", logs.length
      ? logs.slice(0, 8).map((log) => `${formatDate(pick(log, ["completed_at", "created_at"]))} - ${escapeHtml(getWorkoutName(state.workouts.find((workout) => String(workout.id) === String(log.workout_id)), "Treino"))}`)
      : ["Nenhum treino concluido ainda."]),
    renderHistoryBlock("Evolução de exercícios", renderExerciseEvolution(workouts))
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
      lines.push(`${escapeHtml(getWorkoutName(workout, "Treino"))}: ${escapeHtml(exerciseName)} - ${formatNumber(pick(item, ["sets"], "-"))}x${escapeHtml(pick(item, ["reps"], "-"))} - ${escapeHtml(pick(item, ["weight"], "-"))}`);
    });
  });
  return lines.length ? lines.slice(0, 12) : ["Nenhum exercício cadastrado nos treinos."];
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

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthInputValue(date = new Date()) {
  return toDateInputValue(date).slice(0, 7);
}

function buildStudentContactPayload(value) {
  const contact = String(value || "").trim() || null;
  return {
    phone: contact,
    telefone: contact,
    whatsapp: contact,
    contact
  };
}

function addMonthsToDateOnly(value, months) {
  const parsed = parseDateOnly(value);
  if (!parsed) return toDateInputValue();
  const date = new Date(Number(parsed.year), Number(parsed.month) - 1 + months, Number(parsed.day));
  return toDateInputValue(date);
}

function formatCurrency(value) {
  const number = Number(value || 0);
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function changeScreen(screenName, options = {}) {
  if (screenName === "admin-area" && !enforceAdminAccess()) {
    document.body.dataset.role = "";
    el.sidebar.classList.add("hidden");
    screenName = "access";
  }

  if (!canAccessScreen(screenName)) {
    showToast("Acesso visual indisponível para este perfil.", "error");
    return;
  }

  const currentScreen = document.querySelector(".screen.active")?.id?.replace("screen-", "") || "";
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === `screen-${screenName}`);
  });
  window.AlionAccessibility?.updateActiveScreen(document.querySelector(`#screen-${screenName}`));

  document.querySelectorAll(".menu-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screenName);
  });

  const labels = {
    access: "Como deseja acessar?",
    "first-access": "Primeiro acesso",
    "student-area": "Meu Treino",
    "trainer-area": "Treinador",
    "admin-area": "Controle do Sistema"
  };
  el.pageTitle.textContent = labels[screenName] || "Alion Treinos";

  if (options.pushHistory && currentScreen !== screenName) {
    window.history.pushState({ alionScreen: screenName }, "", window.location.href);
  }

  if (screenName === "trainer-area") {
    loadSupabaseData();
  }
}

/**
 * Define o papel visual escolhido na tela inicial.
 */
function setAccessRole(role) {
  if (!["student", "trainer", "admin"].includes(role)) return;
  state.accessRole = role;
  if (role !== "admin") {
    state.authProfile = state.authProfile || { role };
  }
  el.sidebar.classList.remove("hidden");
  document.body.dataset.role = role;
  renderAuthStatus();

  if (role === "admin") {
    if (!isAdmin()) {
      el.sidebar.classList.add("hidden");
      document.body.dataset.role = "";
    }
    changeScreen(isAdmin() ? "admin-area" : "access");
    return;
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
function updateLoginRoleHelper(role) {
  state.preferredLoginRole = role;
  const helpers = {
    student: {
      title: "Area do aluno",
      description: "Acesse seus treinos, registre exercícios, cargas, repetições e observações."
    },
    trainer: {
      title: "Area do personal",
      description: "Cadastre alunos, monte treinos, acompanhe evolução e visualize históricos."
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
}

function renderAdminPersonalItem(profile) {
  const ownedStudents = state.students.filter((student) => (
    String(pick(student, ["personal_id", "trainer_id"], "")) === String(profile.id)
  )).length;
  return `
    <article class="simple-item stacked">
      <strong>Personal cadastrado</strong>
      <small>Status: ${escapeHtml(pick(profile, ["status_usuario"], "ativo"))}</small>
      <small>Alunos sob responsabilidade: ${ownedStudents}</small>
      <div class="record-actions">
        <button class="tiny-button ${pick(profile, ["status_usuario"], "ativo") === "ativo" ? "danger" : ""}" type="button" data-admin-personal-action="${pick(profile, ["status_usuario"], "ativo") === "ativo" ? "suspend" : "activate"}" data-id="${escapeHtml(profile.id)}">
          ${pick(profile, ["status_usuario"], "ativo") === "ativo" ? "Suspender" : "Reativar"}
        </button>
      </div>
    </article>
  `;
}

async function changeTrainerStatus(profileId, status) {
  if (!await requireAdminTi()) return;
  if (status === "bloqueado") {
    const confirmed = await requestStrongConfirmation({
      title: "Suspender acesso do Personal",
      description: "O Personal perderá acesso imediatamente. Os alunos e históricos serão preservados.",
      expectedText: "SUSPENDER"
    });
    if (!confirmed) return;
  }
  const { error } = await supabaseClient.from("app_profiles").update({ status_usuario: status }).eq("id", profileId);
  if (error) throw error;
  showToast(status === "ativo" ? "Personal reativado." : "Personal suspenso.");
  await loadSupabaseData({ silent: true });
}

function switchAuthMode(mode) {
  const isRegister = mode === "register";
  el.authLoginForm.classList.toggle("hidden", isRegister);
  el.authRegisterForm.classList.toggle("hidden", !isRegister);
  const roleInput = document.querySelector("#register-role");
  const emailInput = document.querySelector("#register-email");
  if (roleInput && !state.pendingInvite) roleInput.disabled = false;
  if (emailInput && !state.pendingInvite) emailInput.readOnly = false;
  el.authStatus.textContent = isRegister
    ? "Finalize o cadastro usando o convite recebido pelo personal."
    : "Use o login criado no Supabase Auth.";
}

function handleInviteRegisterRequest() {
  const input = window.prompt("Cole o link do convite ou apenas o token:");
  const raw = String(input || "").trim();
  if (!raw) return;

  try {
    const parsedUrl = raw.includes("invite=") ? new URL(raw) : null;
    const trainerToken = parsedUrl?.searchParams.get("trainer_invite") || "";
    const token = parsedUrl ? (trainerToken || parsedUrl.searchParams.get("invite")) : raw;
    if (!token) throw new Error("Token nao encontrado no convite.");
    const parameter = trainerToken ? "trainer_invite" : "invite";
    window.location.href = `${window.location.origin}${window.location.pathname}?${parameter}=${encodeURIComponent(token)}`;
  } catch (error) {
    showToast(`Convite invalido: ${error.message}`, "error");
  }
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
    const { data: current, error: readError } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    if (readError) throw readError;

    if (current) {
      const changed = Object.entries(payload).some(([key, value]) => (
        value != null && String(current[key] ?? "") !== String(value)
      ));
      if (!changed) return current;
      const { data, error } = await supabaseClient
        .from("profiles")
        .update(payload)
        .eq("id", user.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    }

    const { data, error } = await supabaseClient.from("profiles").insert(payload).select().maybeSingle();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn("[Alion Treinos] profiles canonico ainda nao disponivel.", error);
    return null;
  }
}

async function fetchInviteByToken(token) {
  if (!token) return null;

  const rpcResult = await supabaseClient.rpc("get_student_invite_by_token", { invite_token: token });
  if (!rpcResult.error) {
    const invite = Array.isArray(rpcResult.data) ? (rpcResult.data[0] || null) : rpcResult.data;
    return window.AlionTrainerDataRules?.isInviteUsable(invite) ? invite : null;
  }

  const { data, error } = await supabaseClient
    .from("student_invites")
    .select("*")
    .eq("token", token)
    .eq("status", "pendente")
    .maybeSingle();

  if (error) throw rpcResult.error || error;
  return window.AlionTrainerDataRules?.isInviteUsable(data) ? data : null;
}

async function fetchAppProfileByUserId(userId) {
  if (!userId) return null;

  const { data, error } = await supabaseClient
    .from("app_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data || null;
}

function normalizeAuthEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeAuthPhone(value) {
  return String(value || "").replace(/\D/g, "");
}

async function fetchTrustedAdminStatus() {
  if (!state.authUser?.id) return false;
  const { data, error } = await supabaseClient.rpc("is_current_admin_ti");
  if (error) {
    console.warn("[Alion Treinos] Nao foi possivel validar identidade Admin TI.", error);
    return false;
  }
  return data === true;
}

async function fetchTrainerInviteByToken(token) {
  if (!token) return null;
  const { data, error } = await supabaseClient.rpc("get_trainer_invite_by_token", { invite_token: token });
  if (error) throw error;
  const invite = Array.isArray(data) ? (data[0] || null) : data;
  return invite?.status === "pendente" && (!invite.expires_at || new Date(invite.expires_at) > new Date())
    ? { ...invite, token }
    : null;
}

async function ensureUserProfileAndStudentLink(user, options = {}) {
  if (!user?.id) return null;

  const existing = await fetchAppProfileByUserId(user.id);
  if (existing) return existing;

  return null;
}

function hydrateInviteRegisterForm(invite) {
  if (!invite) return;
  el.inviteExistingAuthActions?.classList.add("hidden");
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
    roleInput.value = state.pendingInviteType === "trainer" ? "personal" : "aluno";
  }
  el.registerStatus.textContent = `Convite encontrado. Crie sua senha para finalizar o cadastro de ${state.pendingInviteType === "trainer" ? "Personal" : "aluno"}.`;
}

function showExistingInviteAuthPrompt() {
  const inviteEmail = normalizeAuthEmail(state.pendingInvite?.email);
  el.registerStatus.textContent = "Este e-mail já possui uma conta no Alion. Faça login para aceitar o convite.";
  el.inviteExistingAuthActions?.classList.remove("hidden");
  if (el.authEmail) el.authEmail.value = inviteEmail;
}

function continueExistingInviteWithLogin() {
  const role = state.pendingInviteType === "trainer" ? "trainer" : "student";
  const inviteEmail = normalizeAuthEmail(state.pendingInvite?.email);
  updateLoginRoleHelper(role);
  switchAuthMode("login");
  if (el.authEmail) el.authEmail.value = inviteEmail;
  el.inviteExistingAuthActions?.classList.add("hidden");
  el.authStatus.textContent = "Entre com a conta existente para aceitar o convite. O e-mail precisa ser o mesmo do convite.";
  el.authPassword?.focus();
}

async function cancelExistingInviteFlow() {
  state.pendingInvite = null;
  state.pendingInviteType = "";
  state.inviteToken = "";
  el.inviteExistingAuthActions?.classList.add("hidden");
  clearAuthUrlParams();
  switchAuthMode("login");
  await initAuthSession();
}

async function loadInviteFromUrl() {
  const token = getInviteTokenFromUrl();
  state.inviteToken = token;
  if (!token) return;

  try {
    const invite = state.pendingInviteType === "trainer"
      ? await fetchTrainerInviteByToken(token)
      : await fetchInviteByToken(token);
    if (!invite) {
      showToast("Convite invalido, expirado ou ja utilizado.", "error");
      return;
    }
    state.pendingInvite = invite;
    hydrateInviteRegisterForm(invite);
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const sessionEmail = normalizeAuthEmail(sessionData?.session?.user?.email);
    const inviteEmail = normalizeAuthEmail(invite.email);
    if (sessionEmail && inviteEmail && sessionEmail !== inviteEmail) {
      state.inviteSessionConflict = true;
      el.inviteSessionConflict?.classList.remove("hidden");
      el.authStatus.textContent = "Há uma conta diferente conectada. Escolha como continuar.";
    }
  } catch (error) {
    console.error("[Alion Treinos] Erro ao carregar convite:", error);
    showToast(`Erro ao carregar convite: ${error.message}`, "error");
  }
}

async function completeInviteForUser(user, invite = state.pendingInvite) {
  if (!user?.id || !invite?.token) return null;

  const inviteEmail = normalizeAuthEmail(invite.email);
  const userEmail = normalizeAuthEmail(user.email);
  if (!inviteEmail || inviteEmail !== userEmail) {
    throw new Error("Este convite pertence a outro e-mail.");
  }

  const rpcName = state.pendingInviteType === "trainer" ? "accept_trainer_invite" : "accept_student_invite_link";
  const { error } = await supabaseClient.rpc(rpcName, {
    invite_token: invite.token
  });
  if (error) {
    console.error("[Alion Treinos] Erro ao aceitar convite atomico:", error);
    throw new Error(`Nao foi possivel aceitar o convite com seguranca: ${error.message}`);
  }

  state.pendingInvite = null;
  state.pendingInviteType = "";
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
    console.warn("[Alion Treinos] Nao foi possivel criar app_profiles automaticamente.", error);
    showToast(`Login feito, mas o perfil nao foi vinculado: ${error.message}`, "error");
    return null;
  }
}

async function fetchAuthProfile(user, _options = {}) {
  if (!user?.id) return null;

  try {
    const { data, error } = await supabaseClient
      .from("app_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;

    const profileByUserId = await supabaseClient
      .from("profiles")
      .select("*")
      .or(`id.eq.${user.id},user_id.eq.${user.id},auth_user_id.eq.${user.id}`)
      .maybeSingle();

    if (profileByUserId.error) throw profileByUserId.error;
    if (!profileByUserId.data) return null;
    return {
      ...profileByUserId.data,
      user_id: profileByUserId.data.auth_user_id || profileByUserId.data.user_id || profileByUserId.data.id
    };
  } catch (error) {
    console.warn("[Alion Treinos] Perfil autorizado indisponivel.", error);
    state.lastError = error.message;
    return null;
  }
}

function renderAuthStatus() {
  if (!el.authStatus) return;
  const role = getCurrentRole();
  const email = state.authUser?.email;
  el.authStatus.textContent = email
    ? `Logado como ${email} (${formatRoleLabel(role)})`
    : "Use o login criado no Supabase Auth.";
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
  console.error(`[Alion Treinos] ${context}:`, {
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
  console.warn("[Alion Treinos] Login bloqueado pelo Supabase Auth:", message);
  el.authStatus.textContent = message;
  showToast(message, "error");
}

function formatRoleLabel(role) {
  const labels = {
    admin: "Admin TI",
    trainer: "Personal",
    student: "Aluno",
    personal: "Personal",
    aluno: "Aluno",
    admin_ti: "Admin TI"
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
  const params = getSupabaseUrlParams();
  state.pendingInviteType = params.get("trainer_invite") ? "trainer" : (params.get("invite") ? "student" : "");
  return String(params.get("trainer_invite") || params.get("invite") || "").trim();
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

async function applyAuthenticatedSessionInternal(session) {
  if (!session?.user) return;

  state.authUser = session.user;
  state.trustedAdmin = await fetchTrustedAdminStatus();
  const metadataInviteToken = session.user.user_metadata?.invite_token || "";
  if (!state.pendingInvite && metadataInviteToken) {
    state.pendingInviteType = session.user.user_metadata?.invite_type === "trainer" ? "trainer" : "student";
    state.pendingInvite = state.pendingInviteType === "trainer"
      ? await fetchTrainerInviteByToken(metadataInviteToken)
      : await fetchInviteByToken(metadataInviteToken);
  }

  if (!state.pendingInvite) {
    const active = await fetchCurrentAccountActiveStatus();
    if (active === false) {
      await handleSuspendedAccount();
      return;
    }
  }

  if (state.pendingInvite) {
    const acceptedType = state.pendingInviteType;
    state.authProfile = await completeInviteForUser(session.user, state.pendingInvite);
    showToast(acceptedType === "trainer" ? "Convite aceito e perfil de Personal ativado." : "Convite aceito e aluno vinculado ao Personal.");
  }

  try {
    if (!state.authProfile) {
      state.authProfile = await ensureUserProfileAndStudentLink(session.user, {
        requestedRole: session.user.user_metadata?.role || state.preferredLoginRole || "aluno",
        name: session.user.user_metadata?.nome || session.user.user_metadata?.name || ""
      });
    } else {
      state.authProfile = await ensureUserProfileAndStudentLink(session.user, {
        requestedRole: state.authProfile.role || session.user.user_metadata?.role || state.preferredLoginRole || "aluno",
        name: state.authProfile.nome || state.authProfile.full_name || session.user.user_metadata?.nome || session.user.user_metadata?.name || "",
        invite: state.pendingInvite
      }) || state.authProfile;
    }
  } catch (error) {
    console.warn("[Alion Treinos] Nao foi possivel reconciliar perfil/aluno no pos-login.", error);
    if (!state.authProfile) {
      state.authProfile = await fetchAuthProfile(session.user);
    }
    const recoveredRole = normalizeRole(state.authProfile?.role);
    const missingEssentialStudentLink = recoveredRole === "student" && !state.authProfile?.student_id;
    if (!recoveredRole || missingEssentialStudentLink) {
      showToast("Seu acesso foi carregado, mas alguns dados do cadastro ainda precisam ser completados.");
    }
  }

  if (state.passwordRecoveryMode) {
    renderPasswordFlowText();
    el.sidebar.classList.add("hidden");
    document.body.dataset.role = "";
    renderAuthStatus();
    changeScreen("first-access");
    return;
  }

  const accountStatus = normalizeText(state.authProfile?.status_usuario || "ativo");
  if (state.authProfile && !["ativo", "active"].includes(accountStatus)) {
    await handleAuthLogout({ skipConfirmation: true, silent: true });
    el.authStatus.textContent = "Esta conta está suspensa. Procure o administrador do sistema.";
    showToast("Conta suspensa.", "error");
    changeScreen("access");
    return;
  }

  const role = getCurrentRole();

  if (!role) {
    const message = normalizeRole(state.preferredLoginRole) === "student"
      ? "Seu login foi feito, mas ainda não encontramos um aluno vinculado."
      : "Usuario sem perfil. Configure app_profiles no Supabase.";
    showToast(message, "error");
    renderAuthStatus();
    return;
  }

  state.accessRole = role;
  state.adminUnlocked = isAdmin();
  document.body.dataset.role = role;
  el.sidebar.classList.remove("hidden");

  if (role === "admin") {
    enforceAdminAccess();
  } else {
    enforceAdminAccess();
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
}

async function applyAuthenticatedSession(session) {
  if (!session?.user) return;

  const userId = String(session.user.id);
  if (activeAuthReconciliation?.userId === userId) {
    return activeAuthReconciliation.promise;
  }

  const promise = applyAuthenticatedSessionInternal(session);
  activeAuthReconciliation = { userId, promise };
  try {
    return await promise;
  } finally {
    if (activeAuthReconciliation?.promise === promise) {
      activeAuthReconciliation = null;
    }
  }
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
    const actualRole = getCurrentRole();
    const selectedRole = normalizeRole(state.preferredLoginRole);
    if (actualRole !== "admin" && actualRole && actualRole !== selectedRole) {
      await handleAuthLogout({ skipConfirmation: true, silent: true });
      throw new Error(`Esta conta é de ${actualRole === "trainer" ? "Personal" : "Aluno"}. Selecione o perfil correto para entrar.`);
    }
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
  const role = state.pendingInviteType === "trainer" ? "personal" : "aluno";

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

  if (!state.pendingInvite) {
    showToast("Cadastro disponível somente por convite válido.", "error");
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
          invite_token: state.pendingInvite?.token || null,
          invite_type: state.pendingInviteType
        }
      }
    });

    if (isExistingEmailSignUpResult(data, error)) {
      if (state.pendingInvite) {
        showExistingInviteAuthPrompt();
        showToast("Este e-mail já possui uma conta. Entre para aceitar o convite.");
        return;
      }
      throw new Error("Este e-mail ja esta cadastrado. Entre ou recupere sua senha.");
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
    console.error("[Alion Treinos] Erro ao criar cadastro:", error);
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

async function handleAuthLogout(options = {}) {
  const pendingCount = getPendingWorkoutLogs().length;
  if (pendingCount && !options.skipConfirmation) {
    const confirmed = window.confirm(
      `Existem ${pendingCount} conclusão(ões) pendente(s) de sincronização neste aparelho. `
      + "Se você sair agora, os registros locais serão preservados, mas só serão enviados depois de um novo login. Deseja sair?"
    );
    if (!confirmed) return;
  }
  const { error } = await supabaseClient.auth.signOut();
  if (error) throw error;
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(`${EXECUTION_DRAFT_PREFIX}:`)) {
      localStorage.removeItem(key);
    }
  });
  state.authUser = null;
  state.authProfile = null;
  state.accessRole = "";
  state.adminUnlocked = false;
  state.trustedAdmin = false;
  state.studentAreaId = "";
  state.selectedStudentId = "";
  state.selectedWorkoutId = "";
  state.students = [];
  state.workouts = [];
  state.workoutExercises = [];
  state.workoutLogs = [];
  state.studentInvites = [];
  state.trainerStudents = [];
  state.appProfiles = [];
  state.studentExerciseExecution = {};
  document.body.dataset.role = "";
  el.sidebar.classList.add("hidden");
  el.adminLock.classList.remove("hidden");
  el.adminPanel.classList.add("hidden");
  renderAuthStatus();
  changeScreen("access");
  if (!options.silent) showToast("Sessão encerrada.");
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
    console.warn("[Alion Treinos] Nao foi possivel restaurar sessao Auth.", error);
  }

  if (state.passwordRecoveryMode) {
    changeScreen("first-access");
  }

  setConnectionStatus("Faça login para carregar seus dados", false);
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
  if (state.accessRole === "admin" && isAdmin()) return ["admin-area", "trainer-area", "student-area"].includes(screenName);
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
  updateCompleteWorkoutButtonState();
  if (event.type === "change") {
    renderStudentArea();
  }
}

/**
 * Aplica atalhos de execucao mobile do aluno.
 */
async function handleStudentWorkoutQuickAction(event) {
  const imageButton = event.target.closest("[data-expand-exercise-image]");
  if (imageButton) {
    openExerciseImage(imageButton.dataset.expandExerciseImage, imageButton.dataset.exerciseImageAlt);
    return;
  }

  const videoButton = event.target.closest("[data-exercise-video-url]");
  if (videoButton) {
    openExerciseVideo(videoButton.dataset.exerciseVideoUrl);
    return;
  }

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
  unlockWorkoutAudio();

  if (action === "speak") {
    speakExerciseInstruction(button.dataset.workoutExerciseId);
    return;
  }

  if (action === "stop-speech") {
    window.speechSynthesis?.cancel();
    return;
  }

  if (action === "feedback") {
    execution.feedback = window.AlionEasyWorkoutFlow.normalizeFeedback(button.dataset.feedbackValue);
    if (execution.feedback === "dor") {
      execution.pain_level = execution.pain_level || "5";
      execution.notes = execution.notes || "Senti dor durante o exercício";
    }
    saveCurrentExecutionDraft();
    renderStudentArea();
    return;
  }

  if (action === "save-feedback") {
    if (!window.AlionEasyWorkoutFlow.normalizeFeedback(execution.feedback)) {
      showToast("Escolha uma opção de feedback.", "error");
      return;
    }
    execution.pain_level = window.AlionEasyWorkoutFlow.normalizePainIntensity(execution.pain_level) ?? "";
    const workout = getCurrentWorkout(state.studentAreaId);
    const exercises = workout ? getWorkoutExercisesInStableOrder(workout.id) : [];
    const exerciseIds = exercises.map((item) => String(item.id));
    state.awaitingFeedbackExerciseId = "";
    saveCurrentExecutionDraft();
    if (window.AlionEasyWorkoutFlow.areAllExercisesCompleted(exerciseIds, state.studentExerciseExecution)) {
      await persistWorkoutCompletion(workout, { automatic: true });
      return;
    }
    advanceToNextEasyExercise(exercises, button.dataset.workoutExerciseId);
    renderStudentArea();
    return;
  }

  if (action === "rest") {
    startExerciseRestTimer(button.dataset.workoutExerciseId);
    return;
  }

  if (action === "confirm-done") {
    if (execution.completed && !execution.skipped) {
      showToast("Exercício já finalizado.");
      return;
    }
    state.pendingConfirmExerciseId = button.dataset.workoutExerciseId;
    renderStudentArea();
    return;
  }

  if (action === "confirm-back") {
    state.pendingConfirmExerciseId = "";
    renderStudentArea();
    return;
  }

  if (action === "confirm-yes") {
    state.pendingConfirmExerciseId = "";
    await completeExerciseSeries(button.dataset.workoutExerciseId);
    return;
  }

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
    execution.notes = execution.notes || "Senti dor durante o exercício";
  }

  saveCurrentExecutionDraft();
  renderStudentArea();
}

function startExerciseRestTimer(exerciseId) {
  unlockWorkoutAudio();
  const exercise = state.workoutExercises.find((item) => String(item.id) === String(exerciseId));
  const seconds = numberOrNull(pick(exercise, ["rest_seconds"], "")) || 30;
  const key = String(exerciseId);
  stopExerciseRestTimer(key);
  state.restTimers[key] = seconds;
  renderStudentArea();

  const interval = window.setInterval(() => {
    state.restTimers[key] = Math.max(0, Number(state.restTimers[key] || 0) - 1);
    renderStudentArea();
    if (state.restTimers[key] <= 0) {
      window.clearInterval(interval);
      delete state.restTimerIntervals[key];
      notifyRestFinished();
      showToast("Descanso finalizado.");
    }
  }, 1000);
  state.restTimerIntervals[key] = interval;
}

function getWorkoutExercisesInStableOrder(workoutId) {
  return state.workoutExercises
    .filter((item) => String(item.workout_id) === String(workoutId))
    .sort((left, right) => {
      const fields = ["order_index", "position", "sequence"];
      for (const field of fields) {
        const leftValue = Number(left[field]);
        const rightValue = Number(right[field]);
        if (Number.isFinite(leftValue) && Number.isFinite(rightValue) && leftValue !== rightValue) {
          return leftValue - rightValue;
        }
      }
      const createdOrder = String(left.created_at || "").localeCompare(String(right.created_at || ""));
      return createdOrder || String(left.id).localeCompare(String(right.id));
    });
}

function advanceToNextEasyExercise(exercises, completedExerciseId) {
  const currentIndex = exercises.findIndex((item) => String(item.id) === String(completedExerciseId));
  const nextExercise = exercises[currentIndex + 1];
  if (!nextExercise) return;
  state.studentExerciseIndex = currentIndex + 1;

  window.setTimeout(() => {
    const nextCard = Array.from(document.querySelectorAll("[data-easy-exercise-card-id]"))
      .find((card) => String(card.dataset.easyExerciseCardId) === String(nextExercise.id));
    nextCard?.scrollIntoView({ behavior: "smooth", block: "start" });
    nextCard?.querySelector("button, input")?.focus({ preventScroll: true });
  }, 650);
}

async function completeExerciseSeries(exerciseId) {
  const actionKey = String(exerciseId);
  if (state.easySeriesActionsInProgress.has(actionKey) || state.easyWorkoutCompletionInProgress) return;
  state.easySeriesActionsInProgress.add(actionKey);

  const exercise = state.workoutExercises.find((item) => String(item.id) === String(exerciseId));
  const workout = getCurrentWorkout(state.studentAreaId);
  if (!exercise || !workout || String(exercise.workout_id) !== String(workout.id)) {
    state.easySeriesActionsInProgress.delete(actionKey);
    return;
  }

  try {
    const execution = getStudentExerciseExecution(exerciseId);
    const result = window.AlionEasyWorkoutFlow.completeSeries(execution, getPlannedSets(exercise));
    saveCurrentExecutionDraft();

    if (result.shouldStartRest) {
      showToast(`Série ${result.completedSets} de ${result.total} concluída. Descanso iniciado.`);
      startExerciseRestTimer(exerciseId);
      return;
    }

    stopExerciseRestTimer(exerciseId);
    notifyExerciseFinished();
    showToast("Parabéns, exercício concluído.", "success");
    state.awaitingFeedbackExerciseId = String(exerciseId);
    renderStudentArea();

    const exercises = getWorkoutExercisesInStableOrder(workout.id);
    const exerciseIds = exercises.map((item) => String(item.id));
    const allCompleted = window.AlionEasyWorkoutFlow.areAllExercisesCompleted(
      exerciseIds,
      state.studentExerciseExecution
    );

    if (!allCompleted) return;
  } catch (error) {
    showToast(error.message || "Não foi possível concluir a série.", "error");
  } finally {
    state.easySeriesActionsInProgress.delete(actionKey);
  }
}

function getWorkoutAudioContext() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!state.workoutAudioContext) {
      state.workoutAudioContext = new AudioContext();
    }
    return state.workoutAudioContext;
  } catch (_error) {
    // Som é um apoio opcional; se o navegador bloquear, o treino continua normal.
    return null;
  }
}

function unlockWorkoutAudio() {
  const audioContext = getWorkoutAudioContext();
  if (!audioContext) return;

  try {
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    state.workoutAudioUnlocked = true;
  } catch (_error) {
    state.workoutAudioUnlocked = false;
  }
}

function playShortBeep() {
  try {
    const audioContext = getWorkoutAudioContext();
    if (!audioContext) return;
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, now);
    oscillator.frequency.setValueAtTime(660, now + 0.11);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.26);
  } catch (_error) {
    // Som é opcional; vibração e aviso visual continuam funcionando.
  }
}

function vibrateDevice(pattern = 180) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

function speakWorkoutMessage(message, { force = false } = {}) {
  const enabled = localStorage.getItem("alion-voice-enabled") === "true";
  if ((!enabled && !force) || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(message));
}

function speakExerciseInstruction(exerciseId) {
  if (!("speechSynthesis" in window)) {
    showToast("A leitura em voz alta não está disponível neste navegador.", "error");
    return;
  }
  const item = state.workoutExercises.find((record) => String(record.id) === String(exerciseId));
  if (!item) return;
  const exercise = getLibraryExerciseForWorkoutItem(item);
  const name = pick(item, ["exercise_name"], pick(exercise, ["name", "title", "nome"], "Exercício"));
  const parts = [
    name,
    `${getPlannedSets(item)} séries de ${pick(item, ["reps"], "repetições não informadas")} repetições`,
    pick(item, ["weight"], "") ? `Carga prevista: ${pick(item, ["weight"], "")}` : "",
    pick(exercise, ["instructions", "description", "instrucoes"], pick(item, ["instructions"], "")),
    `Descanso de ${pick(item, ["rest_seconds"], "0")} segundos`
  ].filter(Boolean);
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(parts.join(". "));
  utterance.lang = "pt-BR";
  window.speechSynthesis.speak(utterance);
}

function openExerciseImage(imageUrl, altText = "Imagem do exercício") {
  const modal = document.querySelector("#exercise-image-modal");
  const image = document.querySelector("#exercise-image-modal-content");
  if (!modal || !image) return;
  image.src = getExerciseMediaUrl(imageUrl, "image") || window.AlionExerciseMedia.PLACEHOLDER;
  image.alt = altText;
  image.onerror = () => {
    image.onerror = null;
    image.src = window.AlionExerciseMedia.PLACEHOLDER;
  };
  modal.classList.remove("hidden");
  modal.querySelector("[data-close-exercise-image]")?.focus();
}

function closeExerciseImage() {
  document.querySelector("#exercise-image-modal")?.classList.add("hidden");
}

function notifyRestFinished() {
  playShortBeep();
  vibrateDevice([120, 80, 120]);
  speakWorkoutMessage("Descanso finalizado. Pode iniciar a próxima série.");
}

function notifyExerciseFinished() {
  playShortBeep();
  vibrateDevice(200);
  speakWorkoutMessage("Parabéns, exercício concluído.", { force: true });
}

function openExerciseVideo(videoUrl) {
  const url = getExerciseMediaUrl(videoUrl, "video");
  if (!url) {
    showToast("Vídeo não cadastrado para este exercício.", "error");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Recupera a preferencia visual salva. O padrao segue o sistema.
 */
function getStoredThemePreference() {
  const savedPreference = localStorage.getItem(THEME_STORAGE_KEY);
  return THEME_VALUES.includes(savedPreference) ? savedPreference : "system";
}

/**
 * Detecta o tema atual do sistema operacional.
 */
function getSystemTheme() {
  if (!window.matchMedia) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Resolve qual tema deve ser aplicado no momento.
 */
function getEffectiveTheme(preference = state.themePreference) {
  return preference === "system" ? getSystemTheme() : preference;
}

/**
 * Atualiza a cor da barra do PWA/navegador conforme o tema ativo.
 */
function updateThemeColor(theme) {
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (!themeColor) return;
  themeColor.setAttribute("content", THEME_COLORS[theme] || THEME_COLORS.light);
}

/**
 * Aplica o tema visual sem alterar regras de negocio do app.
 */
function applyTheme(preference = state.themePreference) {
  const normalizedPreference = THEME_VALUES.includes(preference) ? preference : "system";
  state.themePreference = normalizedPreference;
  const effectiveTheme = getEffectiveTheme(normalizedPreference);
  document.documentElement.dataset.theme = effectiveTheme;
  document.documentElement.dataset.themePreference = normalizedPreference;
  updateThemeColor(effectiveTheme);
  if (el.themeSelect) el.themeSelect.value = normalizedPreference;
}

/**
 * Salva a escolha manual de tema.
 */
function setThemePreference(preference) {
  const normalizedPreference = THEME_VALUES.includes(preference) ? preference : "system";
  localStorage.setItem(THEME_STORAGE_KEY, normalizedPreference);
  applyTheme(normalizedPreference);
}

/**
 * Se o usuario escolher "Sistema", acompanha mudancas do celular/computador.
 */
function bindSystemThemeListener() {
  if (!window.matchMedia) return;
  const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const handleThemeChange = () => {
    if (state.themePreference === "system") applyTheme("system");
  };

  if (themeQuery.addEventListener) {
    themeQuery.addEventListener("change", handleThemeChange);
  } else if (themeQuery.addListener) {
    themeQuery.addListener(handleThemeChange);
  }
}

/**
 * Registra eventos de interface.
 */
function bindEvents() {
  el.themeSelect?.addEventListener("change", (event) => {
    setThemePreference(event.currentTarget.value);
  });

  el.authLoginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleAuthLogin(event.currentTarget);
  });
  el.authRegisterForm.addEventListener("submit", (event) => {
    event.preventDefault();
    handleAuthRegister(event.currentTarget);
  });
  el.forgotPasswordButton.addEventListener("click", handleForgotPassword);
  el.inviteRegisterButton.addEventListener("click", handleInviteRegisterRequest);
  el.inviteExistingAuthLogin?.addEventListener("click", continueExistingInviteWithLogin);
  el.inviteExistingAuthCancel?.addEventListener("click", () => {
    cancelExistingInviteFlow().catch((error) => showToast(error.message, "error"));
  });
  el.authLogoutButton.addEventListener("click", handleAuthLogout);
  el.inviteConflictLogout?.addEventListener("click", async () => {
    await handleAuthLogout({ skipConfirmation: true, silent: true });
    state.inviteSessionConflict = false;
    el.inviteSessionConflict.classList.add("hidden");
    hydrateInviteRegisterForm(state.pendingInvite);
  });
  el.inviteConflictCancel?.addEventListener("click", async () => {
    state.pendingInvite = null;
    state.pendingInviteType = "";
    state.inviteToken = "";
    state.inviteSessionConflict = false;
    el.inviteSessionConflict.classList.add("hidden");
    clearAuthUrlParams();
    switchAuthMode("login");
    await initAuthSession();
  });
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
      if (button.dataset.screen === "access" && state.authUser) {
        handleAuthLogout().catch((error) => showAuthError("Erro ao sair", error));
        return;
      }
      changeScreen(button.dataset.screen, { pushHistory: true });
    });
  });

  document.querySelectorAll("[data-access-role]").forEach((button) => {
    button.addEventListener("click", () => setAccessRole(button.dataset.accessRole));
  });

  el.studentAreaSelect.addEventListener("change", (event) => {
    state.studentAreaId = event.target.value;
    state.studentPdfWorkoutId = "all";
    loadCurrentExecutionDraft();
    renderStudentArea();
  });

  el.studentPdfWorkoutSelect?.addEventListener("change", (event) => {
    state.studentPdfWorkoutId = event.target.value;
  });
  el.studentDownloadWorkoutPdf?.addEventListener("click", () => {
    generateWorkoutPdf(state.studentAreaId, state.studentPdfWorkoutId);
  });
  el.studentCharacterPreferenceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveStudentCharacterPreference(event.currentTarget);
  });

  el.studentModeToggle?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-student-mode]");
    if (!button) return;
    state.studentMode = button.dataset.studentMode;
    localStorage.setItem("alion-student-mode", state.studentMode);
    renderStudentArea();
  });

  el.completeWorkoutButton.addEventListener("click", completeCurrentWorkout);
  el.studentCurrentWorkout.addEventListener("change", handleStudentWorkoutExecutionChange);
  el.studentCurrentWorkout.addEventListener("input", handleStudentWorkoutExecutionChange);
  el.studentCurrentWorkout.addEventListener("click", handleStudentWorkoutQuickAction);
  document.querySelector("[data-close-exercise-image]")?.addEventListener("click", closeExerciseImage);
  document.querySelector("#exercise-image-modal")?.addEventListener("click", (event) => {
    if (event.target.id === "exercise-image-modal") closeExerciseImage();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!document.querySelector("#exercise-image-modal")?.classList.contains("hidden")) closeExerciseImage();
    if (!el.adminConfirmModal?.classList.contains("hidden")) closeStrongConfirmation(false);
  });
  window.addEventListener("popstate", (event) => {
    const screenName = event.state?.alionScreen;
    if (screenName && canAccessScreen(screenName)) changeScreen(screenName);
  });

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

  el.adminExerciseSearch?.addEventListener("input", (event) => {
    state.adminExerciseSearch = event.target.value;
    renderAdminArea();
  });

  el.adminExerciseGroupFilter?.addEventListener("change", (event) => {
    state.adminExerciseGroupFilter = event.target.value;
    renderAdminArea();
  });

  document.querySelectorAll(".exercise-library-form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      saveExerciseLibraryItem(event.currentTarget);
    });
    ["image_url", "image_url_masculino", "image_url_feminino"].forEach((field) => {
      form.elements[field]?.addEventListener("input", () => updateExerciseImagePreview(form));
    });
    form.querySelectorAll("[data-exercise-image-file]").forEach((input) => {
      input.addEventListener("change", () => uploadExerciseLibraryImage(form, input));
    });
    form.addEventListener("click", (event) => {
      const removeButton = event.target.closest("[data-remove-exercise-image]");
      if (!removeButton) return;
      const field = removeButton.dataset.removeExerciseImage || "image_url";
      if (form.elements[field]) form.elements[field].value = "";
      updateExerciseImagePreview(form);
    });
    updateExerciseImagePreview(form);
  });

  document.querySelectorAll("[data-cancel-library-exercise-edit]").forEach((button) => {
    button.addEventListener("click", () => clearExerciseLibraryForm(button.closest("form")));
  });

  el.trainerExerciseLibrary?.addEventListener("click", (event) => {
    const videoButton = event.target.closest("[data-exercise-video-url]");
    if (videoButton) {
      openExerciseVideo(videoButton.dataset.exerciseVideoUrl);
      return;
    }

    const button = event.target.closest("[data-library-exercise-action]");
    if (!button) return;
    if (button.dataset.libraryExerciseAction === "edit") {
      editExerciseLibraryItem(button.dataset.id);
    }
  });

  el.trainerTabs.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trainer-tab]");
    if (!button) return;
    switchTrainerTab(button.dataset.trainerTab);
  });

  el.trainerInvitesList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-invite-action]");
    if (!button) return;
    handleInviteAction(button.dataset.inviteAction, button.dataset.id);
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
    if (String(state.selectedStudentId) !== String(button.dataset.studentId)) cancelTrainerEditModes();
    state.selectedStudentId = button.dataset.studentId;
    state.trainerPdfWorkoutId = "all";
    renderTrainerStudents();
    renderTrainerProfile();
  });

  el.studentAccessPanel?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-student-access-action]");
    if (!button) return;
    handleStudentAccessAction(button.dataset.studentAccessAction, button.dataset.id)
      .catch((error) => showToast(error.message, "error"));
  });

  el.trainerPdfWorkoutSelect?.addEventListener("change", (event) => {
    state.trainerPdfWorkoutId = event.target.value;
  });
  el.trainerDownloadWorkoutPdf?.addEventListener("click", () => {
    generateWorkoutPdf(state.selectedStudentId, state.trainerPdfWorkoutId);
  });
  el.openWorkoutTemplate?.addEventListener("click", openWorkoutTemplateModal);
  el.workoutTemplateClose?.addEventListener("click", closeWorkoutTemplateModal);
  el.workoutTemplateCancel?.addEventListener("click", closeWorkoutTemplateModal);
  el.workoutTemplateDownload?.addEventListener("click", downloadWorkoutTemplate);
  el.workoutTemplateVersion?.addEventListener("change", () => {
    const isV2 = el.workoutTemplateVersion.value === "2";
    document.querySelector("#workout-template-version-label").textContent = isV2 ? "AcroForm V2" : "AcroForm V1";
    document.querySelector("#workout-template-exercises-field")?.classList.toggle("hidden", isV2);
    if (isV2 && Number(el.workoutTemplateCount.value) < 6) el.workoutTemplateCount.value = "6";
    if (!isV2 && Number(el.workoutTemplateCount.value) > 5) el.workoutTemplateCount.value = "5";
  });

  document.querySelector("#reload-trainer-data").addEventListener("click", loadSupabaseData);
  document.querySelector("#new-student-form").addEventListener("submit", (event) => {
    event.preventDefault();
    createStudent(event.currentTarget);
  });
  el.studentAccessResult?.addEventListener("click", async (event) => {
    const offerButton = event.target.closest("[data-student-invite-offer]");
    if (offerButton) {
      handleStudentInviteOffer(offerButton.dataset.studentInviteOffer)
        .catch((error) => showToast(error.message, "error"));
      return;
    }
    const linkButton = event.target.closest("[data-student-invite-link]");
    if (!linkButton) return;
    const link = linkButton.dataset.link || "";
    if (linkButton.dataset.studentInviteLink === "share" && navigator.share) {
      await navigator.share({ title: "Convite Alion Treinos", url: link });
    } else {
      await copyTextToClipboard(link);
      showToast("Link copiado.");
    }
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
  document.querySelector("#new-assessment-form").addEventListener("input", (event) => {
    updateAssessmentCalculatedFields(event.currentTarget);
  });
  document.querySelector("#new-measurement-form").addEventListener("submit", (event) => {
    event.preventDefault();
    createMeasurement(event.currentTarget);
  });
  document.querySelector("#add-exercise-to-workout").addEventListener("click", addExerciseToWorkout);

  el.trainerAssessments.addEventListener("click", handleTrainerListAction);
  el.trainerMeasurements.addEventListener("click", handleTrainerListAction);
  el.trainerWorkouts.addEventListener("click", handleTrainerListAction);

  el.adminConfirmCancel?.addEventListener("click", () => closeStrongConfirmation(false));
  el.adminConfirmInput?.addEventListener("input", () => {
    const expected = state.pendingAdminConfirmation?.expected || "";
    el.adminConfirmSubmit.disabled = el.adminConfirmInput.value.trim() !== expected;
  });
  el.adminConfirmSubmit?.addEventListener("click", () => closeStrongConfirmation(true));
  el.adminConfirmModal?.addEventListener("click", (event) => {
    if (event.target === el.adminConfirmModal) closeStrongConfirmation(false);
  });

  document.querySelector("#test-connection-button").addEventListener("click", testConnection);
  document.querySelector("#admin-reload-data").addEventListener("click", async () => {
    if (!await requireAdminTi()) return;
    await loadSupabaseData();
  });
  document.querySelector("#seed-exercise-library").addEventListener("click", seedExerciseLibrary);
  el.adminDownloadExerciseLibraryPdf?.addEventListener("click", printAdminExerciseLibraryPdf);
  el.adminMaintenanceLog?.closest(".card")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-maintenance]");
    if (!button) return;
    handleAdminMaintenance(button.dataset.adminMaintenance);
  });
  el.adminStudentsList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-student-action]");
    if (!button) return;
    if (button.dataset.adminStudentAction === "pdf") {
      generateWorkoutPdf(button.dataset.studentId, "all");
      return;
    }
    handleAdminStudentAction(button.dataset.adminStudentAction, button.dataset.studentId);
  });
  el.adminPersonalsList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-personal-action]");
    if (!button) return;
    changeTrainerStatus(button.dataset.id, button.dataset.adminPersonalAction === "activate" ? "ativo" : "bloqueado")
      .catch((error) => showToast(error.message, "error"));
  });
  el.adminTrainerInviteForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    createTrainerInvite(event.currentTarget).catch((error) => showToast(error.message, "error"));
  });
  el.adminTrainerInvitesList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-copy-trainer-invite]");
    if (button) copyTextToClipboard(button.dataset.copyTrainerInvite).then(() => showToast("Link copiado."));
  });
  [el.trainerTrashList, el.adminTrashList].forEach((list) => list?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-trash-action='restore']");
    if (button) restoreTrashRecord(button.dataset.id).catch((error) => showToast(error.message, "error"));
  }));
  el.adminExercisesList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-admin-exercise-action]");
    if (!button) return;
    if (button.dataset.adminExerciseAction === "edit") {
      editExerciseLibraryItem(button.dataset.id, el.adminExerciseLibraryForm);
    }
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
  const deleteButton = `<button class="tiny-button danger" type="button" data-action="delete-workout" data-id="${id}">${state.accessRole === "admin" ? "Excluir definitivo" : "Mover para lixeira"}</button>`;

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
  applyTheme();
  bindSystemThemeListener();
  bindEvents();
  window.AlionWorkoutImportReview?.initialize({
    getStudentId: () => state.selectedStudentId,
    getLibrary: () => state.exercises,
    toast: showToast,
    rpc: async (name, args) => runQuery(supabaseClient.rpc(name, args), "Não foi possível salvar a importação"),
    onSaved: async () => loadSupabaseData()
  });
  bindAuthRecoveryEvents();
  hydrateAdminConfigForm();
  updateLoginRoleHelper(state.preferredLoginRole);
  await loadInviteFromUrl();
  if (state.inviteSessionConflict) return;
  await initAuthSession();
}

init();
