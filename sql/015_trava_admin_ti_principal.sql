-- GymPulse / app-treino-supabase
-- Trava definitiva do Admin TI principal.
-- Depois que ananunes1807@gmail.com estiver criado, nao deixe bootstrap publico ativo.

drop policy if exists app_profiles_bootstrap_first_admin on public.app_profiles;

update public.app_profiles
set role = 'personal',
    status_usuario = coalesce(status_usuario, 'ativo')
where public.normalize_app_role(role) = 'admin_ti'
  and lower(coalesce(email, '')) <> 'ananunes1807@gmail.com';

update public.profiles
set role = 'personal',
    status_usuario = coalesce(status_usuario, 'ativo')
where public.normalize_app_role(role) = 'admin_ti'
  and lower(coalesce(email, '')) <> 'ananunes1807@gmail.com';

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

drop trigger if exists profiles_enforce_single_admin_ti on public.profiles;
create trigger profiles_enforce_single_admin_ti
before insert or update of role, email on public.profiles
for each row execute function public.enforce_single_admin_ti_profile();

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when public.normalize_app_role(role) = 'admin_ti'
      and lower(coalesce(email, auth.jwt() ->> 'email', '')) = 'ananunes1807@gmail.com'
      then 'admin_ti'
    when public.normalize_app_role(role) = 'admin_ti'
      then 'aluno'
    else public.normalize_app_role(role)
  end
  from (
    select role, email, 1 as priority
    from public.app_profiles
    where user_id = auth.uid()
    union all
    select role, email, 2 as priority
    from public.profiles
    where id = auth.uid()
       or user_id = auth.uid()
       or auth_user_id = auth.uid()
  ) roles
  order by priority
  limit 1
$$;

create or replace function public.is_primary_admin_ti()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'ananunes1807@gmail.com'
    and public.current_app_role() = 'admin_ti'
$$;

grant execute on function public.is_primary_admin_ti() to authenticated;
