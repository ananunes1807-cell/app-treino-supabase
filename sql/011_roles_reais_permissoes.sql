-- Alion Treinos / app-treino-supabase
-- Roles reais para producao:
-- admin_ti: acesso total e manutencao tecnica.
-- personal: acesso aos proprios alunos.
-- aluno: acesso apenas ao proprio perfil/dados.
-- gestor_academia: role futura para relatorios e visao gerencial.
--
-- Rode no Supabase SQL Editor depois dos arquivos 007 e 010.

alter table public.app_profiles
  drop constraint if exists app_profiles_role_check;

alter table public.app_profiles
  add constraint app_profiles_role_check
  check (role in ('admin_ti', 'personal', 'aluno', 'gestor_academia', 'owner'));

create or replace function public.normalize_app_role(raw_role text)
returns text
language sql
immutable
as $$
  select case
    when raw_role in ('admin', 'admin_ti') then 'admin_ti'
    when raw_role in ('owner', 'gestor_academia') then 'gestor_academia'
    when raw_role in ('trainer', 'treinador', 'personal') then 'personal'
    when raw_role in ('student', 'aluno') then 'aluno'
    else raw_role
  end
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.normalize_app_role(role)
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

create or replace function public.enforce_single_admin_ti_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.role := public.normalize_app_role(new.role);

  if new.role = 'admin_ti' and lower(coalesce(new.email, '')) <> 'ananunes1807@gmail.com' then
    raise exception 'Admin TI principal permitido apenas para ananunes1807@gmail.com';
  end if;

  return new;
end;
$$;

drop trigger if exists app_profiles_enforce_single_admin_ti on public.app_profiles;
create trigger app_profiles_enforce_single_admin_ti
before insert or update of role, email on public.app_profiles
for each row execute function public.enforce_single_admin_ti_profile();

create or replace function public.ensure_admin_ti()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() <> 'admin_ti' then
    raise exception 'Apenas Admin TI pode executar esta acao.';
  end if;
end;
$$;

-- Compatibilidade com documentacao/terminologia "profiles".
do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
  ) then
    execute 'create view public.profiles as select * from public.app_profiles';
  end if;
end $$;

grant select, insert, update on public.app_profiles to authenticated;
grant select on public.profiles to authenticated;

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

drop policy if exists app_profiles_personal_create_student on public.app_profiles;
create policy app_profiles_personal_create_student
on public.app_profiles
for insert
to authenticated
with check (
  public.current_app_role() = 'personal'
  and public.normalize_app_role(role) = 'aluno'
);

drop policy if exists app_profiles_self_signup_insert on public.app_profiles;
create policy app_profiles_self_signup_insert
on public.app_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    public.normalize_app_role(role) in ('aluno', 'personal', 'gestor_academia')
    or (
      public.normalize_app_role(role) = 'admin_ti'
      and lower(coalesce(email, auth.jwt() ->> 'email', '')) = 'ananunes1807@gmail.com'
    )
  )
);

drop policy if exists app_profiles_self_update_basic on public.app_profiles;
create policy app_profiles_self_update_basic
on public.app_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    public.normalize_app_role(role) in ('aluno', 'personal', 'gestor_academia')
    or (
      public.normalize_app_role(role) = 'admin_ti'
      and lower(coalesce(email, auth.jwt() ->> 'email', '')) = 'ananunes1807@gmail.com'
    )
  )
);

drop policy if exists app_profiles_student_update_own_first_access on public.app_profiles;
create policy app_profiles_student_update_own_first_access
on public.app_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and public.normalize_app_role(role) in ('aluno', 'personal', 'gestor_academia', 'admin_ti')
);

drop policy if exists students_real_select on public.students;
create policy students_real_select
on public.students
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id() and status <> 'excluido')
  or (public.current_app_role() = 'aluno' and auth_user_id = auth.uid() and status = 'ativo')
);

drop policy if exists students_real_insert on public.students;
create policy students_real_insert
on public.students
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id())
);

drop policy if exists students_real_update on public.students;
create policy students_real_update
on public.students
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id())
  or (public.current_app_role() = 'aluno' and auth_user_id = auth.uid())
)
with check (
  public.current_app_role() = 'admin_ti'
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id() and status <> 'excluido')
  or (public.current_app_role() = 'aluno' and auth_user_id = auth.uid() and status = 'ativo')
);

drop policy if exists workouts_real_select on public.workouts;
create policy workouts_real_select
on public.workouts
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
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
  public.current_app_role() = 'admin_ti'
  or (public.current_app_role() = 'personal' and personal_id = public.current_app_profile_id())
)
with check (
  public.current_app_role() = 'admin_ti'
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
  public.current_app_role() = 'admin_ti'
  or workout_id in (select id from public.workouts where personal_id = public.current_app_profile_id())
)
with check (
  public.current_app_role() = 'admin_ti'
  or workout_id in (select id from public.workouts where personal_id = public.current_app_profile_id())
);

drop policy if exists workout_logs_real_select on public.workout_logs;
create policy workout_logs_real_select
on public.workout_logs
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
  or student_id in (select id from public.students where auth_user_id = auth.uid())
);

drop policy if exists workout_logs_real_insert_student on public.workout_logs;
create policy workout_logs_real_insert_student
on public.workout_logs
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or student_id in (select id from public.students where auth_user_id = auth.uid())
);

drop policy if exists workout_logs_real_delete_admin on public.workout_logs;
create policy workout_logs_real_delete_admin
on public.workout_logs
for delete
to authenticated
using (public.current_app_role() = 'admin_ti');

drop policy if exists assessments_real_select on public.assessments;
create policy assessments_real_select
on public.assessments
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
  or student_id in (select id from public.students where auth_user_id = auth.uid())
);

drop policy if exists assessments_real_insert_admin_personal on public.assessments;
create policy assessments_real_insert_admin_personal
on public.assessments
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
);

drop policy if exists assessments_real_update_admin_personal on public.assessments;
create policy assessments_real_update_admin_personal
on public.assessments
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
)
with check (
  public.current_app_role() = 'admin_ti'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
);

drop policy if exists assessments_real_delete_admin on public.assessments;
create policy assessments_real_delete_admin
on public.assessments
for delete
to authenticated
using (public.current_app_role() = 'admin_ti');

drop policy if exists body_measurements_real_select on public.body_measurements;
create policy body_measurements_real_select
on public.body_measurements
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
  or student_id in (select id from public.students where auth_user_id = auth.uid())
);

drop policy if exists body_measurements_real_insert_admin_personal on public.body_measurements;
create policy body_measurements_real_insert_admin_personal
on public.body_measurements
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
);

drop policy if exists body_measurements_real_update_admin_personal on public.body_measurements;
create policy body_measurements_real_update_admin_personal
on public.body_measurements
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
)
with check (
  public.current_app_role() = 'admin_ti'
  or student_id in (select id from public.students where personal_id = public.current_app_profile_id())
);

drop policy if exists body_measurements_real_delete_admin on public.body_measurements;
create policy body_measurements_real_delete_admin
on public.body_measurements
for delete
to authenticated
using (public.current_app_role() = 'admin_ti');

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
using (public.current_app_role() = 'admin_ti')
with check (public.current_app_role() = 'admin_ti');

drop policy if exists manutencao_logs_admin_all on public.manutencao_logs;
create policy manutencao_logs_admin_all
on public.manutencao_logs
for all
to authenticated
using (public.current_app_role() = 'admin_ti')
with check (public.current_app_role() = 'admin_ti');
