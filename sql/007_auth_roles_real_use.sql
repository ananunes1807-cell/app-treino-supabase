-- GymPulse / app-treino-supabase
-- Estrutura recomendada para uso real com Supabase Auth.
-- Rode no Supabase SQL Editor depois de criar usuarios em Authentication.

create table if not exists public.app_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role text not null check (role in ('admin', 'admin_ti', 'personal', 'aluno')),
  nome text,
  full_name text,
  email text,
  telefone text,
  student_id uuid references public.students(id) on delete set null,
  status_usuario text not null default 'ativo' check (status_usuario in ('ativo', 'pendente_primeiro_acesso', 'arquivado', 'bloqueado')),
  primeiro_acesso_obrigatorio boolean not null default false,
  senha_temporaria boolean not null default false,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.students
  add column if not exists status text not null default 'ativo',
  add column if not exists status_usuario text not null default 'ativo',
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists personal_id uuid references public.app_profiles(id) on delete set null,
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists telefone text,
  add column if not exists birth_date date,
  add column if not exists primeiro_acesso_obrigatorio boolean not null default false,
  add column if not exists senha_temporaria boolean not null default false,
  add column if not exists dores_limitacoes text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.workouts
  add column if not exists status text not null default 'ativo',
  add column if not exists personal_id uuid references public.app_profiles(id) on delete set null,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

alter table public.students
drop constraint if exists students_status_check;

alter table public.students
add constraint students_status_check
check (status in ('ativo', 'arquivado', 'excluido'));

alter table public.workouts
drop constraint if exists workouts_status_check;

alter table public.workouts
add constraint workouts_status_check
check (status in ('ativo', 'arquivado', 'rascunho', 'excluido'));

create index if not exists students_auth_user_id_idx on public.students(auth_user_id);
create index if not exists students_personal_id_idx on public.students(personal_id);
create index if not exists students_status_idx on public.students(status);
create index if not exists workouts_student_status_idx on public.workouts(student_id, status);
create index if not exists workouts_personal_id_idx on public.workouts(personal_id);

create table if not exists public.manutencao_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.app_profiles(id) on delete set null,
  acao text not null,
  tabela_afetada text,
  registro_id uuid,
  detalhes jsonb,
  criado_em timestamptz not null default now()
);

grant select, insert, update, delete on public.app_profiles to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.assessments to authenticated;
grant select, insert, update, delete on public.body_measurements to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.exercise_library to authenticated;
grant select, insert, update, delete on public.manutencao_logs to authenticated;

alter table public.app_profiles enable row level security;
alter table public.students enable row level security;
alter table public.assessments enable row level security;
alter table public.body_measurements enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.exercise_library enable row level security;
alter table public.manutencao_logs enable row level security;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when role = 'admin_ti' then 'admin'
    when role = 'aluno' then 'aluno'
    else role
  end
  from public.app_profiles
  where user_id = auth.uid()
  limit 1
$$;

create or replace function public.current_app_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.app_profiles where user_id = auth.uid() limit 1
$$;

drop policy if exists app_profiles_read_own_or_admin on public.app_profiles;
create policy app_profiles_read_own_or_admin
on public.app_profiles
for select
to authenticated
using (user_id = auth.uid() or public.current_app_role() = 'admin');

drop policy if exists app_profiles_admin_write on public.app_profiles;
create policy app_profiles_admin_write
on public.app_profiles
for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists app_profiles_personal_create_student on public.app_profiles;
create policy app_profiles_personal_create_student
on public.app_profiles
for insert
to authenticated
with check (
  public.current_app_role() = 'personal'
  and role = 'aluno'
);

drop policy if exists app_profiles_student_update_own_first_access on public.app_profiles;
create policy app_profiles_student_update_own_first_access
on public.app_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid() and role = 'aluno');

drop policy if exists students_real_select on public.students;
create policy students_real_select
on public.students
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id() and status <> 'excluido')
  or (public.current_app_role() = 'aluno' and auth_user_id = auth.uid() and status = 'ativo')
);

drop policy if exists students_real_insert on public.students;
create policy students_real_insert
on public.students
for insert
to authenticated
with check (public.current_app_role() in ('admin', 'personal'));

drop policy if exists students_real_update on public.students;
create policy students_real_update
on public.students
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id())
  or (public.current_app_role() = 'aluno' and auth_user_id = auth.uid())
)
with check (
  public.current_app_role() = 'admin'
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id() and status <> 'excluido')
  or (public.current_app_role() = 'aluno' and auth_user_id = auth.uid() and status = 'ativo')
);

drop policy if exists workouts_real_select on public.workouts;
create policy workouts_real_select
on public.workouts
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id() and status <> 'excluido')
  or (
    public.current_app_role() = 'aluno'
    and student_id in (select id from public.students where auth_user_id = auth.uid())
    and status = 'ativo'
  )
);

drop policy if exists workouts_real_write_admin_personal on public.workouts;
create policy workouts_real_write_admin_personal
on public.workouts
for all
to authenticated
using (
  public.current_app_role() = 'admin'
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id())
)
with check (
  public.current_app_role() = 'admin'
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id())
);

drop policy if exists workout_exercises_real_select on public.workout_exercises;
create policy workout_exercises_real_select
on public.workout_exercises
for select
to authenticated
using (
  workout_id in (select id from public.workouts)
);

drop policy if exists workout_exercises_real_write_admin_personal on public.workout_exercises;
create policy workout_exercises_real_write_admin_personal
on public.workout_exercises
for all
to authenticated
using (
  public.current_app_role() = 'admin'
  or workout_id in (select id from public.workouts where personal_id = public.current_app_profile_id())
)
with check (
  public.current_app_role() = 'admin'
  or workout_id in (select id from public.workouts where personal_id = public.current_app_profile_id())
);

drop policy if exists workout_logs_real_select on public.workout_logs;
create policy workout_logs_real_select
on public.workout_logs
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
  or student_id in (select id from public.students where auth_user_id = auth.uid())
);

drop policy if exists workout_logs_real_insert_student on public.workout_logs;
create policy workout_logs_real_insert_student
on public.workout_logs
for insert
to authenticated
with check (
  public.current_app_role() = 'admin'
  or student_id in (select id from public.students where auth_user_id = auth.uid())
);

drop policy if exists workout_logs_real_delete_admin on public.workout_logs;
create policy workout_logs_real_delete_admin
on public.workout_logs
for delete
to authenticated
using (public.current_app_role() = 'admin');

drop policy if exists assessments_real_select on public.assessments;
create policy assessments_real_select
on public.assessments
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
  or student_id in (select id from public.students where auth_user_id = auth.uid())
);

drop policy if exists assessments_real_write_admin_personal on public.assessments;
drop policy if exists assessments_real_insert_admin_personal on public.assessments;
create policy assessments_real_insert_admin_personal
on public.assessments
for insert
to authenticated
with check (
  public.current_app_role() = 'admin'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
);

drop policy if exists assessments_real_update_admin_personal on public.assessments;
create policy assessments_real_update_admin_personal
on public.assessments
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
)
with check (
  public.current_app_role() = 'admin'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
);

drop policy if exists assessments_real_delete_admin on public.assessments;
create policy assessments_real_delete_admin
on public.assessments
for delete
to authenticated
using (public.current_app_role() = 'admin');

drop policy if exists body_measurements_real_select on public.body_measurements;
create policy body_measurements_real_select
on public.body_measurements
for select
to authenticated
using (
  public.current_app_role() = 'admin'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
  or student_id in (select id from public.students where auth_user_id = auth.uid())
);

drop policy if exists body_measurements_real_write_admin_personal on public.body_measurements;
drop policy if exists body_measurements_real_insert_admin_personal on public.body_measurements;
create policy body_measurements_real_insert_admin_personal
on public.body_measurements
for insert
to authenticated
with check (
  public.current_app_role() = 'admin'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
);

drop policy if exists body_measurements_real_update_admin_personal on public.body_measurements;
create policy body_measurements_real_update_admin_personal
on public.body_measurements
for update
to authenticated
using (
  public.current_app_role() = 'admin'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
)
with check (
  public.current_app_role() = 'admin'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
);

drop policy if exists body_measurements_real_delete_admin on public.body_measurements;
create policy body_measurements_real_delete_admin
on public.body_measurements
for delete
to authenticated
using (public.current_app_role() = 'admin');

drop policy if exists exercise_library_real_select on public.exercise_library;
create policy exercise_library_real_select
on public.exercise_library
for select
to authenticated
using (true);

drop policy if exists exercise_library_real_admin_write on public.exercise_library;
create policy exercise_library_real_admin_write
on public.exercise_library
for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');

drop policy if exists manutencao_logs_admin_all on public.manutencao_logs;
create policy manutencao_logs_admin_all
on public.manutencao_logs
for all
to authenticated
using (public.current_app_role() = 'admin')
with check (public.current_app_role() = 'admin');
