import { supabase, isSupabaseConfigured } from './supabase.js';

const state = {
  students: [],
  exercises: [],
  workouts: [],
  workoutLogs: [],
  selectedStudentId: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

// Exibe mensagens de feedback para ações de leitura e escrita.
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('is-visible');
  window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
}

// Normaliza datas vindas do Supabase para o padrão brasileiro.
function formatDate(value) {
  if (!value) return 'Sem data';
  return new Intl.DateTimeFormat('pt-BR').format(new Date(value));
}

// Retorna o primeiro campo preenchido entre possíveis nomes de coluna.
function pick(record, fields, fallback = '') {
  const field = fields.find((key) => record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== '');
  return field ? record[field] : fallback;
}

// Executa consultas no Supabase apenas quando as credenciais estão configuradas.
async function safeQuery(queryBuilder, fallback = []) {
  if (!isSupabaseConfigured()) return fallback;
  const { data, error } = await queryBuilder;
  if (error) {
    showToast(`Erro no Supabase: ${error.message}`);
    return fallback;
  }
  return data ?? fallback;
}

// Insere registros no Supabase e devolve a linha criada para atualizar a interface.
async function insertRecord(table, payload) {
  if (!isSupabaseConfigured()) {
    showToast('Configure o Supabase antes de cadastrar dados.');
    return null;
  }
  const { data, error } = await supabase.from(table).insert(payload).select().single();
  if (error) {
    showToast(`Não foi possível salvar: ${error.message}`);
    return null;
  }
  showToast('Registro salvo com sucesso.');
  return data;
}

// Atualiza registros existentes, usado para observações do aluno.
async function updateRecord(table, id, payload) {
  if (!isSupabaseConfigured()) {
    showToast('Configure o Supabase antes de atualizar dados.');
    return null;
  }
  const { data, error } = await supabase.from(table).update(payload).eq('id', id).select().single();
  if (error) {
    showToast(`Não foi possível atualizar: ${error.message}`);
    return null;
  }
  showToast('Registro atualizado com sucesso.');
  return data;
}

// Carrega contadores, listas principais e opções de formulários para o dashboard.
async function loadInitialData() {
  state.students = await safeQuery(supabase.from('students').select('*').order('created_at', { ascending: false }));
  state.exercises = await safeQuery(supabase.from('exercise_library').select('*').order('name'));
  state.workouts = await safeQuery(supabase.from('workouts').select('*').order('created_at', { ascending: false }));
  state.workoutLogs = await safeQuery(supabase.from('workout_logs').select('*').order('created_at', { ascending: false }));

  updateConnectionStatus();
  renderDashboard();
  renderStudents();
  renderExerciseOptions();
  renderWorkoutOptions();
  renderExerciseLibrary();
}

// Atualiza o selo visual de conexão de acordo com a configuração local.
function updateConnectionStatus() {
  const status = $('#connectionStatus');
  if (isSupabaseConfigured()) {
    status.textContent = 'Supabase conectado';
    status.classList.add('is-online');
  } else {
    status.textContent = 'Supabase não configurado';
    status.classList.remove('is-online');
  }
}

// Renderiza métricas e listas resumidas do painel inicial.
function renderDashboard() {
  $('#studentsCount').textContent = state.students.length;
  $('#workoutsCount').textContent = state.workouts.length;
  $('#logsCount').textContent = state.workoutLogs.length;
  $('#exercisesCount').textContent = state.exercises.length;

  $('#recentStudentsList').innerHTML = state.students.slice(0, 5).map((student) => `
    <article class="list-item">
      <strong>${pick(student, ['name', 'full_name'], 'Aluno sem nome')}</strong>
      <small>${pick(student, ['email'], 'E-mail não informado')}</small>
    </article>
  `).join('') || '<div class="empty-state">Nenhum aluno encontrado no Supabase.</div>';

  $('#recentLogsList').innerHTML = state.workoutLogs.slice(0, 5).map((log) => `
    <article class="list-item">
      <strong>Treino ${pick(log, ['workout_id'], 'sem identificação')}</strong>
      <small>Concluído em ${formatDate(pick(log, ['completed_at', 'created_at']))}</small>
    </article>
  `).join('') || '<div class="empty-state">Nenhum treino concluído encontrado.</div>';
}

// Lista alunos e popula todos os selects que dependem da tabela students.
function renderStudents() {
  const options = '<option value="">Selecione um aluno</option>' + state.students.map((student) => (
    `<option value="${student.id}">${pick(student, ['name', 'full_name'], 'Aluno sem nome')}</option>`
  )).join('');

  ['#workoutStudentSelect', '#notesStudentSelect', '#studentAreaSelect', '#progressStudentSelect'].forEach((selector) => {
    $(selector).innerHTML = options;
  });

  $('#studentsList').innerHTML = state.students.map((student) => `
    <article class="list-item ${state.selectedStudentId === student.id ? 'is-selected' : ''}" data-student-id="${student.id}">
      <strong>${pick(student, ['name', 'full_name'], 'Aluno sem nome')}</strong>
      <small>${pick(student, ['email'], 'E-mail não informado')} • ${pick(student, ['phone', 'phone_number'], 'Telefone não informado')}</small>
    </article>
  `).join('') || '<div class="empty-state">Cadastre o primeiro aluno usando o formulário acima.</div>';
}

// Renderiza selects de exercícios usados na criação de itens de treino.
function renderExerciseOptions() {
  $('#exerciseSelect').innerHTML = '<option value="">Selecione um exercício</option>' + state.exercises.map((exercise) => (
    `<option value="${exercise.id}">${pick(exercise, ['name', 'title'], 'Exercício sem nome')}</option>`
  )).join('');

  const groups = [...new Set(state.exercises.map((exercise) => pick(exercise, ['muscle_group', 'primary_muscle', 'category'])).filter(Boolean))];
  $('#muscleGroupFilter').innerHTML = '<option value="">Todos os grupos musculares</option>' + groups.map((group) => `<option value="${group}">${group}</option>`).join('');
}

// Renderiza selects de treinos usados para adicionar exercícios ao treino.
function renderWorkoutOptions() {
  $('#workoutSelect').innerHTML = '<option value="">Selecione um treino</option>' + state.workouts.map((workout) => (
    `<option value="${workout.id}">${pick(workout, ['title', 'name'], 'Treino sem título')}</option>`
  )).join('');
}

// Filtra e exibe a biblioteca de exercícios real do Supabase.
function renderExerciseLibrary() {
  const search = $('#exerciseSearch').value?.toLowerCase() ?? '';
  const group = $('#muscleGroupFilter').value;
  const filtered = state.exercises.filter((exercise) => {
    const name = pick(exercise, ['name', 'title']).toLowerCase();
    const exerciseGroup = pick(exercise, ['muscle_group', 'primary_muscle', 'category']);
    return name.includes(search) && (!group || exerciseGroup === group);
  });

  $('#exerciseLibraryGrid').innerHTML = filtered.map((exercise) => `
    <article class="exercise-card">
      <h4>${pick(exercise, ['name', 'title'], 'Exercício sem nome')}</h4>
      <div class="badges">
        <span class="badge">${pick(exercise, ['muscle_group', 'primary_muscle', 'category'], 'Grupo não informado')}</span>
        <span class="badge">${pick(exercise, ['equipment'], 'Equipamento não informado')}</span>
        <span class="badge">${pick(exercise, ['difficulty', 'level'], 'Nível não informado')}</span>
      </div>
      <p>${pick(exercise, ['instructions', 'description'], 'Instruções não cadastradas.')}</p>
    </article>
  `).join('') || '<div class="empty-state">Nenhum exercício encontrado para os filtros selecionados.</div>';
}

// Carrega dados completos do perfil do aluno selecionado na área do treinador.
async function loadStudentProfile(studentId) {
  state.selectedStudentId = studentId;
  renderStudents();
  const student = state.students.find((item) => String(item.id) === String(studentId));
  if (!student) return;

  const [assessments, measurements, workouts, logs] = await Promise.all([
    safeQuery(supabase.from('assessments').select('*').eq('student_id', studentId).order('created_at', { ascending: false })),
    safeQuery(supabase.from('body_measurements').select('*').eq('student_id', studentId).order('created_at', { ascending: false })),
    safeQuery(supabase.from('workouts').select('*').eq('student_id', studentId).order('created_at', { ascending: false })),
    safeQuery(supabase.from('workout_logs').select('*').eq('student_id', studentId).order('created_at', { ascending: false })),
  ]);

  $('#studentProfile').innerHTML = `
    <article class="list-item">
      <strong>${pick(student, ['name', 'full_name'], 'Aluno sem nome')}</strong>
      <small>${pick(student, ['email'], 'E-mail não informado')} • ${pick(student, ['phone', 'phone_number'], 'Telefone não informado')}</small>
      <p>${pick(student, ['notes', 'observations'], 'Sem observações cadastradas.')}</p>
    </article>
    <h4>Avaliações físicas</h4>${renderSimpleList(assessments, ['goal', 'summary', 'notes'], 'Nenhuma avaliação física encontrada.')}
    <h4>Medidas corporais</h4>${renderSimpleList(measurements, ['weight', 'body_fat_percentage', 'waist'], 'Nenhuma medida corporal encontrada.')}
    <h4>Treinos criados</h4>${renderSimpleList(workouts, ['title', 'name', 'description'], 'Nenhum treino criado.')}
    <h4>Histórico realizado</h4>${renderSimpleList(logs, ['completed_at', 'created_at', 'notes'], 'Nenhum histórico encontrado.')}
  `;
}

// Converte coleções genéricas em HTML reutilizável para avaliações, medidas e histórico.
function renderSimpleList(items, fields, emptyText) {
  if (!items.length) return `<div class="empty-state">${emptyText}</div>`;
  return `<div class="list">${items.map((item) => `
    <article class="list-item">
      <strong>${formatDate(pick(item, ['date', 'assessment_date', 'measured_at', 'completed_at', 'created_at']))}</strong>
      <small>${fields.map((field) => item[field]).filter(Boolean).join(' • ') || 'Registro sem detalhes adicionais'}</small>
    </article>`).join('')}</div>`;
}

// Carrega a visão do aluno com treino atual, histórico, avaliações e medidas.
async function loadStudentArea(studentId) {
  if (!studentId) return;
  const [workouts, logs, assessments, measurements] = await Promise.all([
    safeQuery(supabase.from('workouts').select('*').eq('student_id', studentId).order('created_at', { ascending: false })),
    safeQuery(supabase.from('workout_logs').select('*').eq('student_id', studentId).order('created_at', { ascending: false })),
    safeQuery(supabase.from('assessments').select('*').eq('student_id', studentId).order('created_at', { ascending: false })),
    safeQuery(supabase.from('body_measurements').select('*').eq('student_id', studentId).order('created_at', { ascending: false })),
  ]);
  const currentWorkout = workouts[0];

  $('#currentWorkout').innerHTML = currentWorkout ? `
    <article class="list-item">
      <strong>${pick(currentWorkout, ['title', 'name'], 'Treino atual')}</strong>
      <small>${pick(currentWorkout, ['description'], 'Sem descrição')}</small>
      <button class="primary-button" data-complete-workout="${currentWorkout.id}" data-student-id="${studentId}">Marcar como concluído</button>
    </article>
  ` : 'Nenhum treino atual encontrado.';
  $('#studentWorkoutHistory').innerHTML = renderSimpleList(logs, ['workout_id', 'notes'], 'Nenhum treino concluído.');
  $('#studentAssessments').innerHTML = renderSimpleList(assessments, ['goal', 'summary', 'notes'], 'Nenhuma avaliação encontrada.');
  $('#studentMeasurements').innerHTML = renderSimpleList(measurements, ['weight', 'body_fat_percentage', 'waist'], 'Nenhuma medida encontrada.');
}

// Busca medidas corporais do aluno e desenha gráficos em canvas sem bibliotecas externas.
async function loadProgress(studentId) {
  if (!studentId) return;
  const measurements = await safeQuery(
    supabase.from('body_measurements').select('*').eq('student_id', studentId).order('created_at', { ascending: true })
  );
  drawLineChart($('#weightChart'), measurements, ['weight'], '#16e0a7');
  drawLineChart($('#fatChart'), measurements, ['body_fat_percentage', 'body_fat'], '#ffca66');
  drawLineChart($('#measurementsChart'), measurements, ['waist', 'chest', 'hip', 'arm', 'thigh'], '#6c63ff');
}

// Desenha um gráfico de linha simples a partir dos campos numéricos selecionados.
function drawLineChart(canvas, rows, fields, color) {
  const context = canvas.getContext('2d');
  const width = canvas.width = canvas.offsetWidth * window.devicePixelRatio;
  const height = canvas.height = canvas.offsetHeight * window.devicePixelRatio;
  context.clearRect(0, 0, width, height);
  context.strokeStyle = 'rgba(255,255,255,.14)';
  context.lineWidth = 1;
  for (let i = 1; i <= 4; i += 1) {
    context.beginPath();
    context.moveTo(24, (height / 5) * i);
    context.lineTo(width - 24, (height / 5) * i);
    context.stroke();
  }

  const points = rows.map((row, index) => ({
    x: index,
    y: Number(pick(row, fields, NaN)),
  })).filter((point) => Number.isFinite(point.y));

  if (!points.length) {
    context.fillStyle = '#9fb0ca';
    context.font = `${14 * window.devicePixelRatio}px Inter`;
    context.fillText('Sem dados para exibir', 28, height / 2);
    return;
  }

  const values = points.map((point) => point.y);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  context.strokeStyle = color;
  context.lineWidth = 3 * window.devicePixelRatio;
  context.beginPath();
  points.forEach((point, index) => {
    const x = 28 + (point.x / Math.max(points.length - 1, 1)) * (width - 56);
    const y = height - 28 - ((point.y - min) / range) * (height - 56);
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
}

// Alterna entre telas e atualiza título e estado do menu.
function switchView(viewName) {
  const titles = { dashboard: 'Dashboard', trainer: 'Área Treinador', student: 'Área Aluno', exercises: 'Exercícios', progress: 'Evolução' };
  $$('.view').forEach((view) => view.classList.remove('is-visible'));
  $(`#${viewName}View`).classList.add('is-visible');
  $$('.nav__item').forEach((item) => item.classList.toggle('is-active', item.dataset.view === viewName));
  $('#pageTitle').textContent = titles[viewName];
  $('#sidebar').classList.remove('is-open');
}

// Registra todos os eventos de interface e formulários do aplicativo.
function bindEvents() {
  $('#menuToggle').addEventListener('click', () => $('#sidebar').classList.toggle('is-open'));
  $$('.nav__item').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
  $$('[data-view-shortcut]').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.viewShortcut)));
  $('#refreshStudentsButton').addEventListener('click', loadInitialData);
  $('#exerciseSearch').addEventListener('input', renderExerciseLibrary);
  $('#muscleGroupFilter').addEventListener('change', renderExerciseLibrary);
  $('#studentAreaSelect').addEventListener('change', (event) => loadStudentArea(event.target.value));
  $('#progressStudentSelect').addEventListener('change', (event) => loadProgress(event.target.value));

  $('#studentsList').addEventListener('click', (event) => {
    const item = event.target.closest('[data-student-id]');
    if (item) loadStudentProfile(item.dataset.studentId);
  });

  $('#studentForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target));
    const created = await insertRecord('students', payload);
    if (created) {
      event.target.reset();
      await loadInitialData();
    }
  });

  $('#workoutForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target));
    const created = await insertRecord('workouts', payload);
    if (created) {
      event.target.reset();
      await loadInitialData();
    }
  });

  $('#workoutExerciseForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const payload = Object.fromEntries(formData);
    ['sets', 'rest_seconds'].forEach((field) => {
      if (payload[field]) payload[field] = Number(payload[field]);
    });
    const created = await insertRecord('workout_exercises', payload);
    if (created) event.target.reset();
  });

  $('#studentNotesForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.target));
    const updated = await updateRecord('students', payload.student_id, { notes: payload.notes });
    if (updated) {
      event.target.reset();
      await loadInitialData();
    }
  });

  document.body.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-complete-workout]');
    if (!button) return;
    const created = await insertRecord('workout_logs', {
      workout_id: button.dataset.completeWorkout,
      student_id: button.dataset.studentId,
      completed_at: new Date().toISOString(),
    });
    if (created) loadStudentArea(button.dataset.studentId);
  });
}

bindEvents();
loadInitialData();
