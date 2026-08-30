-- Alion Treinos: endpoint minimo e auditavel para o scheduler diario da lixeira.
-- Nao depende de uma sessao humana; somente service_role pode executar a rotina.

create table if not exists public.alion_trash_purge_runs (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'partial_failure', 'failed')),
  scanned_count integer not null default 0,
  purged_count integer not null default 0,
  blocked_count integer not null default 0,
  error_count integer not null default 0,
  error_summary text
);

alter table public.alion_trash_purge_runs enable row level security;
revoke all on table public.alion_trash_purge_runs from public, anon, authenticated;
grant select on table public.alion_trash_purge_runs to authenticated;

drop policy if exists alion_trash_purge_runs_admin_select on public.alion_trash_purge_runs;
create policy alion_trash_purge_runs_admin_select
on public.alion_trash_purge_runs for select to authenticated
using (public.is_current_admin_ti());

create or replace function public.alion_run_scheduled_trash_purge()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  run_id uuid;
  trash_row public.alion_trash_records%rowtype;
  target_table text;
  scanned integer := 0;
  purged integer := 0;
  blocked integer := 0;
  errors integer := 0;
  last_error text;
begin
  insert into public.alion_trash_purge_runs default values returning id into run_id;

  for trash_row in
    select *
    from public.alion_trash_records
    where restored_at is null
      and permanently_deleted_at is null
      and purge_after <= now()
    order by purge_after, id
    for update skip locked
  loop
    scanned := scanned + 1;
    begin
      if trash_row.record_type = 'student' then
        update public.alion_trash_records
        set purge_blocked_reason = 'Expurgo bloqueado: aluno requer revisão administrativa de registros vinculados.'
        where id = trash_row.id;
        blocked := blocked + 1;
        continue;
      end if;

      if trash_row.record_type = 'workout'
         and exists (select 1 from public.workout_logs log where log.workout_id = trash_row.record_id) then
        update public.alion_trash_records
        set purge_blocked_reason = 'Expurgo bloqueado: treino possui histórico de execução.'
        where id = trash_row.id;
        blocked := blocked + 1;
        continue;
      end if;

      if trash_row.record_type = 'exercise'
         and exists (
           select 1
           from public.exercise_library exercise
           join public.workout_exercises item
             on lower(btrim(item.exercise_name)) = lower(btrim(exercise.name))
           where exercise.id = trash_row.record_id
         ) then
        update public.alion_trash_records
        set purge_blocked_reason = 'Expurgo bloqueado: exercício ainda está sendo utilizado.'
        where id = trash_row.id;
        blocked := blocked + 1;
        continue;
      end if;

      target_table := case trash_row.record_type
        when 'workout' then 'workouts'
        when 'workout_exercise' then 'workout_exercises'
        when 'assessment' then 'assessments'
        when 'body_measurement' then 'body_measurements'
        when 'exercise' then 'exercise_library'
        else null
      end;

      if target_table is null then
        update public.alion_trash_records
        set purge_blocked_reason = 'Expurgo bloqueado: tipo de registro não suportado.'
        where id = trash_row.id;
        blocked := blocked + 1;
        continue;
      end if;

      execute format(
        'delete from public.%I where id = $1 and deleted_at is not null',
        target_table
      ) using trash_row.record_id;

      if found then
        update public.alion_trash_records
        set permanently_deleted_at = now(),
            purge_blocked_reason = null
        where id = trash_row.id;
        purged := purged + 1;
      else
        update public.alion_trash_records
        set purge_blocked_reason = 'Expurgo bloqueado: registro de origem indisponível ou não está na lixeira.'
        where id = trash_row.id;
        blocked := blocked + 1;
      end if;
    exception
      when foreign_key_violation then
        update public.alion_trash_records
        set purge_blocked_reason = 'Expurgo bloqueado: dependência ativa impede a exclusão.'
        where id = trash_row.id;
        blocked := blocked + 1;
      when others then
        errors := errors + 1;
        last_error := left(sqlstate || ': ' || sqlerrm, 500);
        update public.alion_trash_records
        set purge_blocked_reason = 'Falha durante o expurgo automático; nova tentativa será realizada.'
        where id = trash_row.id;
    end;
  end loop;

  update public.alion_trash_purge_runs
  set finished_at = now(),
      status = case when errors = 0 then 'success' else 'partial_failure' end,
      scanned_count = scanned,
      purged_count = purged,
      blocked_count = blocked,
      error_count = errors,
      error_summary = last_error
  where id = run_id;

  insert into public.manutencao_logs (acao, detalhes)
  values (
    'trash_purge_scheduled',
    jsonb_build_object(
      'run_id', run_id,
      'scanned', scanned,
      'purged', purged,
      'blocked', blocked,
      'errors', errors
    )
  );

  return jsonb_build_object(
    'run_id', run_id,
    'status', case when errors = 0 then 'success' else 'partial_failure' end,
    'scanned', scanned,
    'purged', purged,
    'blocked', blocked,
    'errors', errors
  );
exception
  when others then
    if run_id is not null then
      update public.alion_trash_purge_runs
      set finished_at = now(), status = 'failed', error_count = errors + 1,
          error_summary = left(sqlstate || ': ' || sqlerrm, 500)
      where id = run_id;
    end if;
    raise;
end
$$;

revoke all on function public.alion_run_scheduled_trash_purge() from public, anon, authenticated;
grant execute on function public.alion_run_scheduled_trash_purge() to service_role;

comment on function public.alion_run_scheduled_trash_purge() is
  'Expurgo diario idempotente da lixeira; executavel somente por service_role e auditado por contagens.';
