-- Rollback da migration 20260830000100.
-- Remove apenas as guardas/funcoes adicionadas pela migration e restaura os
-- helpers exatamente para a versao publicada em 20260829000100.

do $$
declare protected_table text;
begin
  foreach protected_table in array array[
    'app_profiles','profiles','students','trainer_students','student_invites',
    'trainer_invites','workouts','workout_exercises','workout_logs','assessments',
    'body_measurements','alion_trash_records','manutencao_logs'
  ] loop
    if to_regclass(format('public.%I', protected_table)) is not null then
      execute format('drop policy if exists alion_active_account_guard on public.%I', protected_table);
    end if;
  end loop;
end
$$;

drop trigger if exists app_profiles_sync_legacy_status on public.app_profiles;
drop function if exists public.sync_legacy_profile_status_from_app_profile();

create or replace function public.is_current_admin_ti()
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null
    and exists (select 1 from public.alion_admin_identities a where a.user_id=auth.uid())
    and exists (
      select 1 from public.app_profiles ap
      where ap.user_id=auth.uid() and coalesce(ap.status_usuario,'ativo')='ativo'
    )
$$;

create or replace function public.current_app_role()
returns text language sql stable security definer set search_path=public as $$
  select case when public.is_current_admin_ti() then 'admin_ti' else (
    select case lower(coalesce(source.role,''))
      when 'personal' then 'personal' when 'trainer' then 'personal'
      when 'treinador' then 'personal' when 'aluno' then 'aluno'
      when 'student' then 'aluno' else null end
    from (
      select ap.role, 1 priority from public.app_profiles ap
      where ap.user_id=auth.uid() and coalesce(ap.status_usuario,'ativo')='ativo'
      union all
      select p.role, 2 priority from public.profiles p
      where (p.id=auth.uid() or p.user_id=auth.uid() or p.auth_user_id=auth.uid())
        and coalesce(p.status_usuario,'ativo')='ativo'
    ) source order by source.priority limit 1
  ) end
$$;

create or replace function public.current_app_profile_id()
returns uuid language sql stable security definer set search_path=public as $$
  select ap.id from public.app_profiles ap where ap.user_id=auth.uid() limit 1
$$;

drop function if exists public.is_current_user_active();
