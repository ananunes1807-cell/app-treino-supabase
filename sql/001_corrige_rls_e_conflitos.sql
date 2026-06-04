-- GymPulse / app-treino-supabase
-- Correcao de RLS para MVP sem login e ajuste de conflito da exercise_library.
--
-- Execute este arquivo no Supabase SQL Editor.
-- Nao contem chaves, senhas, anon key ou service_role key.
--
-- Observacao:
-- Estas policies liberam leitura/insercao para a role anon no MVP.
-- Em producao, substitua por Supabase Auth e policies por usuario autenticado.

alter table public.students enable row level security;
alter table public.assessments enable row level security;
alter table public.body_measurements enable row level security;
alter table public.exercise_library enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;

-- Students
drop policy if exists "mvp_anon_select_students" on public.students;
create policy "mvp_anon_select_students"
on public.students
for select
to anon
using (true);

drop policy if exists "mvp_anon_insert_students" on public.students;
create policy "mvp_anon_insert_students"
on public.students
for insert
to anon
with check (true);

-- Assessments
drop policy if exists "mvp_anon_select_assessments" on public.assessments;
create policy "mvp_anon_select_assessments"
on public.assessments
for select
to anon
using (true);

drop policy if exists "mvp_anon_insert_assessments" on public.assessments;
create policy "mvp_anon_insert_assessments"
on public.assessments
for insert
to anon
with check (true);

-- Body measurements
drop policy if exists "mvp_anon_select_body_measurements" on public.body_measurements;
create policy "mvp_anon_select_body_measurements"
on public.body_measurements
for select
to anon
using (true);

drop policy if exists "mvp_anon_insert_body_measurements" on public.body_measurements;
create policy "mvp_anon_insert_body_measurements"
on public.body_measurements
for insert
to anon
with check (true);

-- Exercise library
drop policy if exists "mvp_anon_select_exercise_library" on public.exercise_library;
create policy "mvp_anon_select_exercise_library"
on public.exercise_library
for select
to anon
using (true);

drop policy if exists "mvp_anon_insert_exercise_library" on public.exercise_library;
create policy "mvp_anon_insert_exercise_library"
on public.exercise_library
for insert
to anon
with check (true);

-- O app nao usa mais ON CONFLICT para inserir a biblioteca padrao.
-- Caso voce queira impedir nomes duplicados no banco, limpe duplicidades antes
-- e depois execute manualmente:
-- create unique index exercise_library_name_unique on public.exercise_library (name);

-- Workouts
drop policy if exists "mvp_anon_select_workouts" on public.workouts;
create policy "mvp_anon_select_workouts"
on public.workouts
for select
to anon
using (true);

drop policy if exists "mvp_anon_insert_workouts" on public.workouts;
create policy "mvp_anon_insert_workouts"
on public.workouts
for insert
to anon
with check (true);

-- Workout exercises
drop policy if exists "mvp_anon_select_workout_exercises" on public.workout_exercises;
create policy "mvp_anon_select_workout_exercises"
on public.workout_exercises
for select
to anon
using (true);

drop policy if exists "mvp_anon_insert_workout_exercises" on public.workout_exercises;
create policy "mvp_anon_insert_workout_exercises"
on public.workout_exercises
for insert
to anon
with check (true);

-- Workout logs
drop policy if exists "mvp_anon_select_workout_logs" on public.workout_logs;
create policy "mvp_anon_select_workout_logs"
on public.workout_logs
for select
to anon
using (true);

drop policy if exists "mvp_anon_insert_workout_logs" on public.workout_logs;
create policy "mvp_anon_insert_workout_logs"
on public.workout_logs
for insert
to anon
with check (true);
