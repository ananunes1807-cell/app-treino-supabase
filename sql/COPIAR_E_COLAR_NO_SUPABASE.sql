-- COPIE E COLE TODO ESTE ARQUIVO NO SUPABASE SQL EDITOR.
-- Nao cole mensagens de erro como:
-- new row violates row-level security policy...
-- Isso nao e SQL, e apenas a mensagem retornada pelo Supabase.

grant usage on schema public to anon;

grant select, insert on public.students to anon;
grant select, insert on public.assessments to anon;
grant select, insert on public.body_measurements to anon;
grant select, insert on public.exercise_library to anon;
grant select, insert on public.workouts to anon;
grant select, insert on public.workout_exercises to anon;
grant select, insert on public.workout_logs to anon;

alter table public.workouts
add column if not exists status text not null default 'ativo';

update public.workouts
set status = case
  when lower(coalesce(status, '')) in ('active', 'ativo') then 'ativo'
  when lower(coalesce(status, '')) in ('archived', 'arquivado') then 'arquivado'
  when lower(coalesce(status, '')) in ('draft', 'rascunho', 'not_done', 'incomplete') then 'rascunho'
  when lower(coalesce(status, '')) in ('deleted', 'excluido') then 'excluido'
  else 'ativo'
end;

alter table public.workouts
drop constraint if exists workouts_status_check;

alter table public.workouts
add constraint workouts_status_check
check (status in ('ativo', 'arquivado', 'rascunho', 'excluido'));

create index if not exists workouts_student_status_idx
on public.workouts (student_id, status);

alter table public.students enable row level security;
alter table public.assessments enable row level security;
alter table public.body_measurements enable row level security;
alter table public.exercise_library enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;

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

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'students',
    'assessments',
    'body_measurements',
    'exercise_library',
    'workouts',
    'workout_exercises',
    'workout_logs'
  )
order by tablename, policyname;
