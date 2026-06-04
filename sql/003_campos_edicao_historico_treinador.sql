-- Campos e politicas necessarios para a reestruturacao da Area Treinador.
-- Execute no Supabase SQL Editor se algum campo novo ainda nao existir.
-- MVP publico: as permissoes para anon sao temporarias e devem ser trocadas por Supabase Auth.

alter table public.students
  add column if not exists nickname text,
  add column if not exists birth_date date,
  add column if not exists height_cm numeric,
  add column if not exists objective text,
  add column if not exists difficulties text,
  add column if not exists restrictions text,
  add column if not exists notes text;

alter table public.assessments
  add column if not exists height numeric,
  add column if not exists body_fat numeric,
  add column if not exists muscle_mass numeric,
  add column if not exists visceral_fat numeric,
  add column if not exists body_water numeric,
  add column if not exists bmi numeric,
  add column if not exists notes text;

alter table public.body_measurements
  add column if not exists waist numeric,
  add column if not exists abdomen numeric,
  add column if not exists hip numeric,
  add column if not exists arm numeric,
  add column if not exists thigh numeric,
  add column if not exists calf numeric,
  add column if not exists notes text;

alter table public.workouts
  add column if not exists title text,
  add column if not exists goal text,
  add column if not exists notes text,
  add column if not exists status text default 'active';

alter table public.workout_exercises
  add column if not exists sets numeric,
  add column if not exists reps text,
  add column if not exists rest_seconds numeric,
  add column if not exists load_description text,
  add column if not exists notes text,
  add column if not exists order_index integer;

grant select, insert, update, delete on public.students to anon;
grant select, insert, update, delete on public.assessments to anon;
grant select, insert, update, delete on public.body_measurements to anon;
grant select, insert, update, delete on public.workouts to anon;
grant select, insert, update, delete on public.workout_exercises to anon;

drop policy if exists mvp_anon_update_students on public.students;
create policy mvp_anon_update_students
on public.students for update
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_update_assessments on public.assessments;
create policy mvp_anon_update_assessments
on public.assessments for update
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_delete_assessments on public.assessments;
create policy mvp_anon_delete_assessments
on public.assessments for delete
to anon
using (true);

drop policy if exists mvp_anon_update_body_measurements on public.body_measurements;
create policy mvp_anon_update_body_measurements
on public.body_measurements for update
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_delete_body_measurements on public.body_measurements;
create policy mvp_anon_delete_body_measurements
on public.body_measurements for delete
to anon
using (true);

drop policy if exists mvp_anon_update_workouts on public.workouts;
create policy mvp_anon_update_workouts
on public.workouts for update
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_delete_workouts on public.workouts;
create policy mvp_anon_delete_workouts
on public.workouts for delete
to anon
using (true);

drop policy if exists mvp_anon_update_workout_exercises on public.workout_exercises;
create policy mvp_anon_update_workout_exercises
on public.workout_exercises for update
to anon
using (true)
with check (true);

drop policy if exists mvp_anon_delete_workout_exercises on public.workout_exercises;
create policy mvp_anon_delete_workout_exercises
on public.workout_exercises for delete
to anon
using (true);
