-- Alion Treinos: bloqueia imediatamente contas suspensas, inclusive com JWT antigo.
-- app_profiles e a fonte canonica. profiles so e fallback para identidades legadas
-- que ainda nao possuem uma linha em app_profiles.

create or replace function public.is_current_user_active()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and (
      exists (
        select 1
        from public.app_profiles ap
        where ap.user_id = auth.uid()
          and lower(coalesce(ap.status_usuario, '')) = 'ativo'
      )
      or (
        not exists (
          select 1 from public.app_profiles ap where ap.user_id = auth.uid()
        )
        and exists (
          select 1
          from public.profiles p
          where (p.id = auth.uid() or p.user_id = auth.uid() or p.auth_user_id = auth.uid())
            and lower(coalesce(p.status_usuario, '')) = 'ativo'
        )
      )
    )
$$;

revoke all on function public.is_current_user_active() from public, anon;
grant execute on function public.is_current_user_active() to authenticated;

create or replace function public.is_current_admin_ti()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_current_user_active()
    and exists (
      select 1
      from public.alion_admin_identities identity
      where identity.user_id = auth.uid()
    )
$$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when not public.is_current_user_active() then null
    when public.is_current_admin_ti() then 'admin_ti'
    else (
      select case lower(coalesce(source.role, ''))
        when 'personal' then 'personal'
        when 'trainer' then 'personal'
        when 'treinador' then 'personal'
        when 'aluno' then 'aluno'
        when 'student' then 'aluno'
        else null
      end
      from (
        select ap.role, 1 as priority
        from public.app_profiles ap
        where ap.user_id = auth.uid()

        union all

        select p.role, 2 as priority
        from public.profiles p
        where not exists (
            select 1 from public.app_profiles ap where ap.user_id = auth.uid()
          )
          and (p.id = auth.uid() or p.user_id = auth.uid() or p.auth_user_id = auth.uid())
      ) source
      order by source.priority
      limit 1
    )
  end
$$;

create or replace function public.current_app_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select ap.id
  from public.app_profiles ap
  where ap.user_id = auth.uid()
    and public.is_current_user_active()
  limit 1
$$;

-- Mantem a tabela legada coerente nas proximas suspensoes/reativacoes sem
-- reescrever em massa dados existentes.
create or replace function public.sync_legacy_profile_status_from_app_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles p
  set status_usuario = new.status_usuario
  where p.id = new.user_id
     or p.user_id = new.user_id
     or p.auth_user_id = new.user_id;
  return new;
end
$$;

drop trigger if exists app_profiles_sync_legacy_status on public.app_profiles;
create trigger app_profiles_sync_legacy_status
after update of status_usuario on public.app_profiles
for each row
when (new.status_usuario is distinct from old.status_usuario)
execute function public.sync_legacy_profile_status_from_app_profile();

-- Policies restritivas sao combinadas com AND com as policies de ownership
-- existentes. Assim nenhuma regra antiga consegue autorizar uma conta inativa.
do $$
declare
  protected_table text;
begin
  foreach protected_table in array array[
    'app_profiles',
    'profiles',
    'students',
    'trainer_students',
    'student_invites',
    'trainer_invites',
    'workouts',
    'workout_exercises',
    'workout_logs',
    'assessments',
    'body_measurements',
    'alion_trash_records',
    'manutencao_logs'
  ] loop
    if to_regclass(format('public.%I', protected_table)) is not null then
      execute format(
        'drop policy if exists alion_active_account_guard on public.%I',
        protected_table
      );
      execute format(
        'create policy alion_active_account_guard on public.%I as restrictive for all to authenticated using (public.is_current_user_active()) with check (public.is_current_user_active())',
        protected_table
      );
    end if;
  end loop;
end
$$;

comment on function public.is_current_user_active() is
  'Consulta o status atual da identidade Auth; app_profiles prevalece e profiles somente atende legado sem app_profiles.';
