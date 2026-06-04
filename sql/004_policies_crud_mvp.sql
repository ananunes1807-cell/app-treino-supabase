-- Politicas temporarias para o MVP sem login.
-- Execute no Supabase SQL Editor para permitir CRUD com anon/public key.
-- Trocar por Supabase Auth antes de usar em producao.

alter table public.students enable row level security;
alter table public.assessments enable row level security;
alter table public.body_measurements enable row level security;
alter table public.exercise_library enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;

grant select, insert, update, delete on public.students to anon;
grant select, insert, update, delete on public.assessments to anon;
grant select, insert, update, delete on public.body_measurements to anon;
grant select, insert, update, delete on public.exercise_library to anon;
grant select, insert, update, delete on public.workouts to anon;
grant select, insert, update, delete on public.workout_exercises to anon;
grant select, insert, update, delete on public.workout_logs to anon;

drop policy if exists mvp_anon_all_students on public.students;
create policy mvp_anon_all_students
on public.students
for all
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_all_assessments on public.assessments;
create policy mvp_anon_all_assessments
on public.assessments
for all
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_all_body_measurements on public.body_measurements;
create policy mvp_anon_all_body_measurements
on public.body_measurements
for all
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_all_exercise_library on public.exercise_library;
create policy mvp_anon_all_exercise_library
on public.exercise_library
for all
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_all_workouts on public.workouts;
create policy mvp_anon_all_workouts
on public.workouts
for all
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_all_workout_exercises on public.workout_exercises;
create policy mvp_anon_all_workout_exercises
on public.workout_exercises
for all
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_all_workout_logs on public.workout_logs;
create policy mvp_anon_all_workout_logs
on public.workout_logs
for all
to anon
using (true)
with check (true);

-- Alternativa menos segura para depuracao local de MVP:
-- alter table public.workout_exercises disable row level security;
