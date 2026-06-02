-- GymPulse / app-treino-supabase
-- Auditoria final de autenticacao, profiles e vinculos.
-- Rode depois do arquivo 013.

alter table public.students add column if not exists profile_id uuid references public.profiles(id) on delete set null;
alter table public.students add column if not exists trainer_id uuid references public.app_profiles(id) on delete set null;
alter table public.workouts add column if not exists trainer_id uuid references public.app_profiles(id) on delete set null;

update public.students
set profile_id = auth_user_id
where profile_id is null
  and auth_user_id is not null;

update public.students
set trainer_id = personal_id
where trainer_id is null
  and personal_id is not null;

update public.workouts
set trainer_id = personal_id
where trainer_id is null
  and personal_id is not null;

-- Garante que app_profiles exista para perfis ja cadastrados em profiles.
insert into public.app_profiles (
  id,
  user_id,
  role,
  nome,
  full_name,
  email,
  status_usuario,
  primeiro_acesso_obrigatorio,
  senha_temporaria
)
select
  p.id,
  coalesce(p.auth_user_id, p.user_id, p.id),
  public.normalize_app_role(p.role),
  p.nome,
  p.full_name,
  p.email,
  coalesce(p.status_usuario, 'ativo'),
  false,
  false
from public.profiles p
where coalesce(p.auth_user_id, p.user_id, p.id) is not null
  and not exists (
    select 1
    from public.app_profiles ap
    where ap.user_id = coalesce(p.auth_user_id, p.user_id, p.id)
  );

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.normalize_app_role(role)
  from (
    select role, 1 as priority
    from public.app_profiles
    where user_id = auth.uid()
    union all
    select role, 2 as priority
    from public.profiles
    where id = auth.uid()
       or user_id = auth.uid()
       or auth_user_id = auth.uid()
  ) roles
  order by priority
  limit 1
$$;

create or replace function public.current_app_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
  from public.app_profiles
  where user_id = auth.uid()
  limit 1
$$;

create or replace function public.gympulse_audit_summary()
returns table(item text, status text, details text)
language sql
stable
security definer
set search_path = public
as $$
  select 'profiles_table', 'ok', 'Tabela profiles existe'
  union all
  select 'student_invites_table', 'ok', 'Tabela student_invites existe'
  union all
  select 'trainer_students_table', 'ok', 'Tabela trainer_students existe'
  union all
  select 'profiles_without_auth', 'check', count(*)::text
  from public.profiles
  where coalesce(auth_user_id, user_id, id) is null
  union all
  select 'students_without_profile', 'check', count(*)::text
  from public.students
  where status <> 'excluido'
    and profile_id is null
    and auth_user_id is not null
  union all
  select 'students_without_trainer', 'check', count(*)::text
  from public.students
  where status <> 'excluido'
    and coalesce(trainer_id, personal_id) is null
  union all
  select 'workouts_without_student', 'check', count(*)::text
  from public.workouts
  where student_id is null
  union all
  select 'workouts_without_trainer', 'check', count(*)::text
  from public.workouts
  where status <> 'excluido'
    and coalesce(trainer_id, personal_id) is null
$$;

grant execute on function public.gympulse_audit_summary() to authenticated;
