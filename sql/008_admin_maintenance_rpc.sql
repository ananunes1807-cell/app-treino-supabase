-- Alion Treinos / app-treino-supabase
-- Funcoes administrativas seguras para limpeza de testes.
-- Requer app_profiles e current_app_role() do arquivo 007_auth_roles_real_use.sql.

create or replace function public.ensure_admin_ti()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_app_role() not in ('admin', 'admin_ti') then
    raise exception 'Apenas Admin TI pode executar esta acao.';
  end if;
end;
$$;

create or replace function public.admin_log_action(
  acao text,
  tabela_afetada text,
  registro_id uuid,
  detalhes jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_profile_id uuid;
begin
  perform public.ensure_admin_ti();

  select id
  into admin_profile_id
  from public.app_profiles
  where user_id = auth.uid()
  limit 1;

  insert into public.manutencao_logs (admin_id, acao, tabela_afetada, registro_id, detalhes)
  values (admin_profile_id, acao, tabela_afetada, registro_id, detalhes);
end;
$$;

create or replace function public.admin_soft_delete_student(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_admin_ti();

  update public.students
  set status = 'excluido',
      status_usuario = 'bloqueado',
      updated_at = now()
  where id = target_student_id;

  update public.workouts
  set status = 'excluido'
  where student_id = target_student_id;

  perform public.admin_log_action('soft_delete_student', 'students', target_student_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_archive_student(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_admin_ti();

  update public.students
  set status = 'arquivado',
      status_usuario = 'arquivado',
      updated_at = now()
  where id = target_student_id;

  perform public.admin_log_action('archive_student', 'students', target_student_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_restore_student(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_admin_ti();

  update public.students
  set status = 'ativo',
      status_usuario = 'ativo',
      updated_at = now()
  where id = target_student_id;

  perform public.admin_log_action('restore_student', 'students', target_student_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_clear_student_sessions(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_admin_ti();

  delete from public.workout_logs
  where student_id = target_student_id;

  perform public.admin_log_action('clear_student_sessions', 'workout_logs', target_student_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_clear_student_measurements(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_admin_ti();

  delete from public.body_measurements
  where student_id = target_student_id;

  perform public.admin_log_action('clear_student_measurements', 'body_measurements', target_student_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_clear_student_workouts(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_admin_ti();

  update public.workouts
  set status = 'excluido'
  where student_id = target_student_id;

  perform public.admin_log_action('clear_student_workouts', 'workouts', target_student_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_reset_student_for_tests(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_admin_ti();

  delete from public.workout_logs where student_id = target_student_id;
  delete from public.body_measurements where student_id = target_student_id;
  delete from public.assessments where student_id = target_student_id;

  update public.workouts
  set status = 'arquivado'
  where student_id = target_student_id;

  update public.students
  set status = 'ativo',
      status_usuario = 'ativo',
      primeiro_acesso_obrigatorio = false,
      senha_temporaria = false,
      updated_at = now()
  where id = target_student_id;

  perform public.admin_log_action('reset_student_for_tests', 'students', target_student_id, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_soft_delete_student(uuid) to authenticated;
grant execute on function public.admin_archive_student(uuid) to authenticated;
grant execute on function public.admin_restore_student(uuid) to authenticated;
grant execute on function public.admin_clear_student_sessions(uuid) to authenticated;
grant execute on function public.admin_clear_student_measurements(uuid) to authenticated;
grant execute on function public.admin_clear_student_workouts(uuid) to authenticated;
grant execute on function public.admin_reset_student_for_tests(uuid) to authenticated;
