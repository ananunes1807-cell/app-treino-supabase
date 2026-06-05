-- Alion Treinos - auditoria e reforco de seguranca Supabase
-- Execute no Supabase SQL Editor depois das migrations 014, 015, 016, 017, 018 e 019.
-- Este script nao apaga dados.

-- 1) Inventario de RLS em tabelas publicas usadas pelo app.
select
  schemaname,
  tablename,
  rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'app_profiles',
    'students',
    'trainer_students',
    'student_invites',
    'workouts',
    'workout_exercises',
    'workout_logs',
    'workout_sessions',
    'assessments',
    'body_measurements',
    'measurements',
    'exercise_library',
    'manutencao_logs'
  )
order by tablename;

-- 2) Policies atuais.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 3) Policies MVP/anon que nao devem existir em producao.
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and policyname like 'mvp_anon_%'
order by tablename, policyname;

-- 4) Grants para anon/authenticated em tabelas sensiveis.
select
  table_schema,
  table_name,
  grantee,
  privilege_type
from information_schema.table_privileges
where table_schema = 'public'
  and table_name in (
    'profiles',
    'app_profiles',
    'students',
    'trainer_students',
    'student_invites',
    'workouts',
    'workout_exercises',
    'workout_logs',
    'workout_sessions',
    'assessments',
    'body_measurements',
    'measurements',
    'exercise_library',
    'manutencao_logs'
  )
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- 5) Reforco: remover acesso anon de dados sensiveis.
revoke all on table public.profiles from anon;
revoke all on table public.app_profiles from anon;
revoke all on table public.students from anon;
revoke all on table public.trainer_students from anon;
revoke all on table public.student_invites from anon;
revoke all on table public.workouts from anon;
revoke all on table public.workout_exercises from anon;
revoke all on table public.workout_logs from anon;
revoke all on table public.assessments from anon;
revoke all on table public.body_measurements from anon;
revoke all on table public.manutencao_logs from anon;

-- exercise_library pode ser publica apenas para leitura.
grant select on table public.exercise_library to anon;
revoke insert, update, delete on table public.exercise_library from anon;

-- 6) Reforco: RLS ativo nas tabelas usadas pelo app.
alter table if exists public.profiles enable row level security;
alter table if exists public.app_profiles enable row level security;
alter table if exists public.students enable row level security;
alter table if exists public.trainer_students enable row level security;
alter table if exists public.student_invites enable row level security;
alter table if exists public.workouts enable row level security;
alter table if exists public.workout_exercises enable row level security;
alter table if exists public.workout_logs enable row level security;
alter table if exists public.assessments enable row level security;
alter table if exists public.body_measurements enable row level security;
alter table if exists public.exercise_library enable row level security;
alter table if exists public.manutencao_logs enable row level security;

-- 7) Policies base de perfis, convites, vinculos e biblioteca.
drop policy if exists profiles_select_self_or_admin on public.profiles;
create policy profiles_select_self_or_admin
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or auth_user_id = auth.uid()
  or user_id = auth.uid()
  or public.current_app_role() in ('admin_ti', 'gestor_academia')
);

drop policy if exists app_profiles_read_own_or_admin on public.app_profiles;
create policy app_profiles_read_own_or_admin
on public.app_profiles
for select
to authenticated
using (
  user_id = auth.uid()
  or public.current_app_role() in ('admin_ti', 'gestor_academia')
);

drop policy if exists app_profiles_admin_write on public.app_profiles;
create policy app_profiles_admin_write
on public.app_profiles
for all
to authenticated
using (public.current_app_role() = 'admin_ti')
with check (public.current_app_role() = 'admin_ti');

drop policy if exists student_invites_authenticated_read on public.student_invites;
create policy student_invites_authenticated_read
on public.student_invites
for select
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists student_invites_create_by_admin_or_personal on public.student_invites;
create policy student_invites_create_by_admin_or_personal
on public.student_invites
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or (
    public.current_app_role() = 'personal'
    and trainer_id = public.current_app_profile_id()
  )
);

drop policy if exists student_invites_update_accept on public.student_invites;
create policy student_invites_update_accept
on public.student_invites
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists trainer_students_select_real on public.trainer_students;
create policy trainer_students_select_real
on public.trainer_students
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or trainer_id = public.current_app_profile_id()
  or student_user_id = auth.uid()
);

drop policy if exists trainer_students_insert_real on public.trainer_students;
create policy trainer_students_insert_real
on public.trainer_students
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or student_user_id = auth.uid()
);

drop policy if exists trainer_students_update_real on public.trainer_students;
create policy trainer_students_update_real
on public.trainer_students
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
)
with check (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
);

drop policy if exists exercise_library_secure_admin_write on public.exercise_library;
drop policy if exists exercise_library_secure_admin_personal_write on public.exercise_library;
create policy exercise_library_secure_admin_personal_write
on public.exercise_library
for all
to authenticated
using (public.current_app_role() in ('admin_ti', 'personal'))
with check (public.current_app_role() in ('admin_ti', 'personal'));

-- 8) Remover policies MVP/anon restantes, se existirem.
drop policy if exists mvp_anon_select_students on public.students;
drop policy if exists mvp_anon_insert_students on public.students;
drop policy if exists mvp_anon_update_students on public.students;
drop policy if exists mvp_anon_delete_students on public.students;

drop policy if exists mvp_anon_select_workouts on public.workouts;
drop policy if exists mvp_anon_insert_workouts on public.workouts;
drop policy if exists mvp_anon_update_workouts on public.workouts;
drop policy if exists mvp_anon_delete_workouts on public.workouts;

drop policy if exists mvp_anon_select_workout_exercises on public.workout_exercises;
drop policy if exists mvp_anon_insert_workout_exercises on public.workout_exercises;
drop policy if exists mvp_anon_update_workout_exercises on public.workout_exercises;
drop policy if exists mvp_anon_delete_workout_exercises on public.workout_exercises;

drop policy if exists mvp_anon_select_workout_logs on public.workout_logs;
drop policy if exists mvp_anon_insert_workout_logs on public.workout_logs;
drop policy if exists mvp_anon_update_workout_logs on public.workout_logs;
drop policy if exists mvp_anon_delete_workout_logs on public.workout_logs;

drop policy if exists mvp_anon_select_assessments on public.assessments;
drop policy if exists mvp_anon_insert_assessments on public.assessments;
drop policy if exists mvp_anon_update_assessments on public.assessments;
drop policy if exists mvp_anon_delete_assessments on public.assessments;

drop policy if exists mvp_anon_select_body_measurements on public.body_measurements;
drop policy if exists mvp_anon_insert_body_measurements on public.body_measurements;
drop policy if exists mvp_anon_update_body_measurements on public.body_measurements;
drop policy if exists mvp_anon_delete_body_measurements on public.body_measurements;

drop policy if exists mvp_anon_select_exercise_library on public.exercise_library;
drop policy if exists mvp_anon_insert_exercise_library on public.exercise_library;
drop policy if exists mvp_anon_update_exercise_library on public.exercise_library;
drop policy if exists mvp_anon_delete_exercise_library on public.exercise_library;

-- 9) Diagnostico de vinculos.
select * from public.gympulse_audit_summary();

-- 10) Conferencia do Admin TI principal.
select
  id,
  user_id,
  email,
  role,
  status_usuario
from public.app_profiles
where lower(coalesce(email, '')) = 'ananunes1807@gmail.com';

-- 11) Alunos sem vinculo adequado.
select
  id,
  name,
  email,
  auth_user_id,
  profile_id,
  personal_id,
  trainer_id,
  status
from public.students
where coalesce(status, 'ativo') <> 'excluido'
  and (
    auth_user_id is null
    or profile_id is null
    or coalesce(personal_id, trainer_id) is null
  )
order by created_at desc nulls last;
