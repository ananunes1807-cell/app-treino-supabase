const ADMIN_TEMP_PASSWORD = "ac741"; // MVP apenas: substituir futuramente por autenticacao real com Supabase Auth.
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
  ["assessments", "SELECT anon", "mvp_anon_select_assessments"],
  ["assessments", "INSERT anon", "mvp_anon_insert_assessments"],
  ["body_measurements", "SELECT anon", "mvp_anon_select_body_measurements"],
  ["body_measurements", "INSERT anon", "mvp_anon_insert_body_measurements"],
  ["exercise_library", "SELECT anon", "mvp_anon_select_exercise_library"],
  ["exercise_library", "INSERT anon", "mvp_anon_insert_exercise_library"],
  ["workouts", "SELECT anon", "mvp_anon_select_workouts"],
  ["workouts", "INSERT anon", "mvp_anon_insert_workouts"],
  ["workout_exercises", "SELECT anon", "mvp_anon_select_workout_exercises"],
  ["workout_exercises", "INSERT anon", "mvp_anon_insert_workout_exercises"],
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
  studentAreaId: "",
  studentSearch: "",
  exerciseSearch: "",
  adminUnlocked: false,
  lastError: "",
  tableErrors: {}
};

const el = {
  pageTitle: document.querySelector("#page-title"),
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
  completeWorkoutButton: document.querySelector("#complete-workout-button"),
  trainerStudentsList: document.querySelector("#trainer-students-list"),
  trainerProfileTitle: document.querySelector("#trainer-profile-title"),
  trainerProfileSummary: document.querySelector("#trainer-profile-summary"),
  trainerAssessments: document.querySelector("#trainer-assessments"),
  trainerMeasurements: document.querySelector("#trainer-measurements"),
  trainerWorkoutSelect: document.querySelector("#trainer-workout-select"),
  trainerExerciseSelect: document.querySelector("#trainer-exercise-select"),
  trainerExerciseLibrary: document.querySelector("#trainer-exercise-library"),
  exerciseSearch: document.querySelector("#exercise-search"),
  trainerWorkouts: document.querySelector("#trainer-workouts"),
  studentSearch: document.querySelector("#student-search"),
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
 * Retorna HTML padrao para estados vazios.
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
async function loadSupabaseData() {
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

  if (hasBlockingError) {
    showToast(state.tableErrors.students || state.tableErrors.exercise_library, "error");
  } else if (!students.length) {
    showToast("Conexao OK, mas nenhum aluno foi retornado pela anon key.", "error");
  } else {
    showToast("Dados carregados do Supabase.");
  }
}

/**
 * Atualiza o status visual da conexao.
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
 * Renderiza treino atual, historico e evolucao da area Aluno.
 */
function renderStudentArea() {
  if (!state.studentAreaId) {
    el.studentCurrentWorkout.innerHTML = emptyMessage("Selecione um aluno para visualizar o treino atual.");
    el.studentHistory.innerHTML = emptyMessage("Selecione um aluno para visualizar o historico.");
    el.studentEvolution.innerHTML = emptyMessage("Selecione um aluno para visualizar a evolucao.");
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
    : emptyMessage("Nenhum treino concluido encontrado.");

  el.completeWorkoutButton.disabled = !currentWorkout;
  renderStudentEvolution();
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
 * Renderiza um treino com seus exercicios cadastrados.
 */
function renderWorkoutWithExercises(workout) {
  const exercises = state.workoutExercises.filter((item) => String(item.workout_id) === String(workout.id));

  return `
    <article class="list-item workout-highlight">
      <div>
        <strong>${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino sem nome"))}</strong>
        <span>${escapeHtml(pick(workout, ["goal", "description", "notes"], "Objetivo nao informado"))}</span>
      </div>
    </article>
    ${exercises.length ? exercises.map(renderWorkoutExerciseItem).join("") : emptyMessage("Este treino ainda nao possui exercicios.")}
  `;
}

/**
 * Renderiza um exercicio vinculado a um treino.
 */
function renderWorkoutExerciseItem(item) {
  const exercise = state.exercises.find((record) => String(record.id) === String(item.exercise_id));

  return `
    <article class="simple-item">
      <strong>${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercicio"))}</strong>
      <span>Series: ${escapeHtml(pick(item, ["sets"], "-"))} | Reps: ${escapeHtml(pick(item, ["reps"], "-"))} | Descanso: ${escapeHtml(pick(item, ["rest_seconds"], "-"))}s</span>
    </article>
  `;
}

/**
 * Renderiza historico de treinos concluidos.
 */
function renderWorkoutLogItem(log) {
  const workout = state.workouts.find((item) => String(item.id) === String(log.workout_id));

  return `
    <article class="simple-item">
      <strong>${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino"))}</strong>
      <span>Concluido em ${formatDate(pick(log, ["completed_at", "created_at"]))}</span>
    </article>
  `;
}

/**
 * Renderiza evolucao simples com ultimo peso, gordura e medidas.
 */
async function renderStudentEvolution() {
  if (!state.studentAreaId) return;

  try {
    const [assessments, measurements] = await Promise.all([
      fetchTable("assessments", { eq: { column: "student_id", value: state.studentAreaId }, orderBy: "created_at" }),
      fetchTable("body_measurements", { eq: { column: "student_id", value: state.studentAreaId }, orderBy: "created_at" })
    ]);

    const latestAssessment = assessments[0] || {};
    const latestMeasurement = measurements[0] || {};

    el.studentEvolution.innerHTML = `
      ${renderEvolutionCard("Peso", pick(latestAssessment, ["weight", "weight_kg"], "Sem dado"))}
      ${renderEvolutionCard("Gordura corporal", pick(latestAssessment, ["body_fat", "body_fat_percentage"], "Sem dado"))}
      ${renderEvolutionCard("Cintura", pick(latestMeasurement, ["waist", "waist_cm"], "Sem dado"))}
    `;
  } catch (error) {
    console.error(error);
    el.studentEvolution.innerHTML = emptyMessage(error.message);
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
    : emptyMessage(state.tableErrors.students || "Nenhum aluno encontrado na tabela students. Verifique se ha dados no projeto correto e se o RLS permite SELECT para anon.");
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
        <span>Objetivo: ${escapeHtml(pick(student, ["objective", "email"], "Nao informado"))}</span>
        <small>Dificuldades: ${escapeHtml(pick(student, ["difficulties"], "Nao informado"))}</small>
        <small>Restricoes: ${escapeHtml(pick(student, ["restrictions"], "Nao informado"))}</small>
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
      : emptyMessage("Nenhuma avaliacao encontrada.");
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
 * Renderiza uma avaliacao fisica.
 */
function renderAssessmentItem(assessment) {
  return `
    <article class="simple-item">
      <strong>${formatDate(pick(assessment, ["assessment_date", "assessed_at", "created_at"]))}</strong>
      <span>Peso: ${escapeHtml(pick(assessment, ["weight", "weight_kg"], "-"))}</span>
      <span>Gordura: ${escapeHtml(pick(assessment, ["body_fat", "body_fat_percentage"], "-"))}</span>
    </article>
  `;
}

/**
 * Renderiza uma medida corporal.
 */
function renderMeasurementItem(measurement) {
  return `
    <article class="simple-item">
      <strong>${formatDate(pick(measurement, ["measurement_date", "measured_at", "created_at"]))}</strong>
      <span>Cintura: ${escapeHtml(pick(measurement, ["waist", "waist_cm"], "-"))}</span>
      <span>Quadril: ${escapeHtml(pick(measurement, ["hip", "hip_cm"], "-"))}</span>
      <span>Peito: ${escapeHtml(pick(measurement, ["chest", "chest_cm"], "-"))}</span>
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
        <span>${escapeHtml(pick(workout, ["goal", "description", "notes"], "Objetivo nao informado"))}</span>
        <small>Criado em ${formatDate(pick(workout, ["created_at", "start_date"]))}</small>
      </div>
    </article>
  `;
}

/**
 * Preenche o select de treinos do aluno para adicionar exercicios.
 */
function renderTrainerWorkoutSelect(workouts) {
  el.trainerWorkoutSelect.innerHTML = workouts.length
    ? workouts.map((workout) => `<option value="${escapeHtml(workout.id)}">${escapeHtml(pick(workout, ["title", "name", "nome"], "Treino"))}</option>`).join("")
    : `<option value="">Crie um treino primeiro</option>`;
}

/**
 * Preenche o select com exercicios reais da exercise_library.
 */
function renderExerciseSelect() {
  el.trainerExerciseSelect.innerHTML = state.exercises.length
    ? state.exercises.map((exercise) => `<option value="${escapeHtml(exercise.id)}">${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercicio"))}</option>`).join("")
    : `<option value="">Nenhum exercicio encontrado</option>`;
}

/**
 * Renderiza a biblioteca de exercicios completa para o treinador.
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
    : emptyMessage(state.tableErrors.exercise_library || "Nenhum exercicio encontrado na tabela exercise_library. Rode o seed da biblioteca ou verifique o RLS.");
}

/**
 * Renderiza um item da biblioteca de exercicios.
 */
function renderExerciseLibraryItem(exercise) {
  return `
    <article class="simple-item stacked">
      <strong>${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercicio"))}</strong>
      <span>${escapeHtml(pick(exercise, ["muscle_group", "primary_muscle", "grupo_muscular"], "Grupo nao informado"))}</span>
      <span>${escapeHtml(pick(exercise, ["equipment", "equipamento"], "Equipamento nao informado"))} | ${escapeHtml(pick(exercise, ["difficulty", "difficulty_level", "nivel"], "Nivel nao informado"))}</span>
      <small>${escapeHtml(pick(exercise, ["instructions", "description", "instrucoes"], "Sem instrucoes cadastradas."))}</small>
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
 * Tenta cadastrar aluno com telefone e, se o schema nao tiver phone, tenta sem telefone.
 */
async function insertStudentWithFallback(payload) {
  return insertWithSchemaFallback("students", payload, "Erro ao adicionar aluno");
}

/**
 * Adiciona avaliacao fisica para o aluno selecionado.
 */
async function createAssessment(form) {
  if (!state.selectedStudentId) {
    showToast("Selecione um aluno antes de salvar a avaliacao.", "error");
    return;
  }

  const formData = new FormData(form);
  const payload = {
    student_id: state.selectedStudentId,
    weight: numberOrNull(formData.get("weight")),
    height: numberOrNull(formData.get("height")),
    body_fat: numberOrNull(formData.get("body_fat")),
    notes: formData.get("notes") || null
  };

  try {
    await insertWithSchemaFallback("assessments", payload, "Erro ao salvar avaliacao");
    form.reset();
    showToast("Avaliacao salva com sucesso.");
    await renderTrainerProfile();
    await renderStudentEvolution();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Adiciona medidas corporais para o aluno selecionado.
 */
async function createMeasurement(form) {
  if (!state.selectedStudentId) {
    showToast("Selecione um aluno antes de salvar medidas.", "error");
    return;
  }

  const formData = new FormData(form);
  const payload = {
    student_id: state.selectedStudentId,
    waist: numberOrNull(formData.get("waist")),
    hip: numberOrNull(formData.get("hip")),
    chest: numberOrNull(formData.get("chest")),
    arm: numberOrNull(formData.get("arm")),
    thigh: numberOrNull(formData.get("thigh")),
    notes: formData.get("notes") || null
  };

  try {
    await insertWithSchemaFallback("body_measurements", payload, "Erro ao salvar medidas");
    form.reset();
    showToast("Medidas salvas com sucesso.");
    await renderTrainerProfile();
    await renderStudentEvolution();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Converte campos numericos opcionais em numero ou null.
 */
function numberOrNull(value) {
  if (value === null || value === "") return null;
  return Number(value);
}

/**
 * Cria um treino para o aluno selecionado.
 */
async function createWorkout(form) {
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
    await insertWithSchemaFallback("workouts", payload, "Erro ao criar treino");
    form.reset();
    showToast("Treino criado com sucesso.");
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Adiciona exercicio da exercise_library ao treino selecionado.
 */
async function addExerciseToWorkout() {
  const workoutId = el.trainerWorkoutSelect.value;
  const exerciseId = el.trainerExerciseSelect.value;

  if (!workoutId || !exerciseId) {
    showToast("Selecione treino e exercicio.", "error");
    return;
  }

  const currentCount = state.workoutExercises.filter((item) => String(item.workout_id) === String(workoutId)).length;
  const payload = {
    workout_id: workoutId,
    exercise_id: exerciseId,
    sets: Number(document.querySelector("#sets-input").value) || null,
    reps: document.querySelector("#reps-input").value || null,
    rest_seconds: Number(document.querySelector("#rest-input").value) || null,
    order_index: currentCount + 1
  };

  try {
    await insertWorkoutExerciseWithFallback(payload);
    showToast("Exercicio adicionado ao treino.");
    await loadSupabaseData();
  } catch (error) {
    showToast(error.message, "error");
  }
}

/**
 * Tenta inserir com order_index e, se a coluna nao existir, repete sem ela.
 */
async function insertWorkoutExerciseWithFallback(payload) {
  return insertWithSchemaFallback("workout_exercises", payload, "Erro ao adicionar exercicio ao treino");
}

/**
 * Remove automaticamente colunas que nao existem no schema real e tenta inserir novamente.
 */
async function insertWithSchemaFallback(tableName, payload, fallbackMessage) {
  let currentPayload = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
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

  throw new Error(`${fallbackMessage}: nao foi possivel adaptar o payload ao schema.`);
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
    await runQuery(
      supabaseClient
        .from("workout_logs")
        .insert({
          workout_id: workout.id,
          student_id: state.studentAreaId,
          completed_at: new Date().toISOString()
        })
        .select(),
      "Erro ao marcar treino como concluido"
    );
    showToast("Treino marcado como concluido.");
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
  showToast("Area TI/Admin liberada.");
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
 * Testa conexao lendo um registro da tabela students.
 */
async function testConnection() {
  try {
    setConnectionStatus("Testando...", false);
    await runQuery(supabaseClient.from("students").select("id").limit(1), "Erro ao testar conexao");
    setConnectionStatus("Supabase conectado", true);
    showToast("Conexao testada com sucesso.");
  } catch (error) {
    setConnectionStatus("Erro na conexao", false);
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
    : emptyMessage("Nenhum exercicio encontrado.");

  el.adminDiagnostics.innerHTML = `
    ${renderDiagnostic("Status", el.connectionStatus.textContent)}
    ${renderDiagnostic("Alunos carregados", state.students.length)}
    ${renderDiagnostic("Exercicios carregados", state.exercises.length)}
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
      <span>${escapeHtml(pick(student, ["email"], "Sem e-mail"))}</span>
    </article>
  `;
}

/**
 * Renderiza exercicio dentro do painel admin.
 */
function renderAdminExerciseItem(exercise) {
  return `
    <article class="simple-item">
      <strong>${escapeHtml(pick(exercise, ["name", "title", "nome"], "Exercicio"))}</strong>
      <span>${escapeHtml(pick(exercise, ["muscle_group", "primary_muscle"], "Grupo nao informado"))}</span>
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
 * Insere a biblioteca padrao de exercicios no Supabase pelo TI/Admin.
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
      existingExercises.map((exercise) => normalizeText(pick(exercise, ["name", "title", "nome"])))
    );
    const missingPayload = payload.filter((exercise) => !existingNames.has(normalizeText(exercise.name)));

    if (!missingPayload.length) {
      showToast("Biblioteca padrao ja esta cadastrada.");
      return;
    }

    await runQuery(supabaseClient.from("exercise_library").insert(missingPayload).select(), "Erro ao inserir biblioteca padrao");
    showToast("Biblioteca padrao inserida.");
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
  document.querySelectorAll(".screen").forEach((screen) => {
    screen.classList.toggle("active", screen.id === `screen-${screenName}`);
  });

  document.querySelectorAll(".menu-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.screen === screenName);
  });

  const labels = {
    "student-area": "Area Aluno",
    "trainer-area": "Area Treinador",
    "admin-area": "Controle do Sistema"
  };
  el.pageTitle.textContent = labels[screenName] || "GymPulse";

  if (screenName === "trainer-area") {
    loadSupabaseData();
  }
}

/**
 * Registra eventos de interface.
 */
function bindEvents() {
  document.querySelectorAll("[data-screen]").forEach((button) => {
    button.addEventListener("click", () => changeScreen(button.dataset.screen));
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
