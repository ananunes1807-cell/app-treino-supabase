-- Alion Treinos: lixeira segura, auditoria e bloqueio de DELETE direto.
-- Migração apenas preparada no repositório. Revise em staging antes de aplicar.

create table if not exists public.alion_trash_records (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('student','workout','workout_exercise','assessment','body_measurement','exercise')),
  record_id uuid not null,
  owner_profile_id uuid,
  display_name text not null default 'Registro',
  deleted_at timestamptz not null default now(),
  deleted_by uuid not null default auth.uid(),
  purge_after timestamptz not null default (now() + interval '60 days'),
  restored_at timestamptz,
  restored_by uuid,
  permanently_deleted_at timestamptz,
  permanently_deleted_by uuid,
  unique (record_type, record_id)
);

alter table public.alion_trash_records enable row level security;

do $$
declare t text;
begin
  foreach t in array array['students','workouts','workout_exercises','assessments','body_measurements','exercise_library'] loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', t);
    execute format('alter table public.%I add column if not exists deleted_by uuid', t);
    execute format('alter table public.%I add column if not exists purge_after timestamptz', t);
  end loop;
end $$;

drop policy if exists alion_trash_select on public.alion_trash_records;
create policy alion_trash_select on public.alion_trash_records for select to authenticated
using (
  public.is_current_admin_ti()
  or owner_profile_id = auth.uid()
);

revoke insert, update, delete on public.alion_trash_records from anon, authenticated;
grant select on public.alion_trash_records to authenticated;

-- O cliente nunca exclui tabelas de negócio diretamente.
revoke delete on public.students, public.workouts, public.workout_exercises,
  public.assessments, public.body_measurements, public.exercise_library from authenticated;

do $$
declare t text;
begin
  foreach t in array array['students','workouts','workout_exercises','assessments','body_measurements','exercise_library'] loop
    execute format('drop policy if exists alion_not_deleted_select on public.%I',t);
    execute format('create policy alion_not_deleted_select on public.%I as restrictive for select to authenticated using (deleted_at is null or public.is_current_admin_ti())',t);
  end loop;
end $$;

revoke execute on function public.admin_delete_test_students() from authenticated;
revoke execute on function public.admin_delete_test_workouts() from authenticated;

create or replace function public.alion_soft_delete_owned_record(
  target_type text,
  target_id uuid,
  target_label text default 'Registro'
) returns uuid
language plpgsql security definer
set search_path = public
as $$
declare
  table_name text;
  owner_id uuid;
  trash_id uuid;
begin
  if auth.uid() is null then raise exception 'Autenticacao obrigatoria'; end if;

  table_name := case target_type
    when 'student' then 'students'
    when 'workout' then 'workouts'
    when 'workout_exercise' then 'workout_exercises'
    when 'assessment' then 'assessments'
    when 'body_measurement' then 'body_measurements'
    when 'exercise' then 'exercise_library'
    else null end;
  if table_name is null then raise exception 'Tipo de registro invalido'; end if;

  if target_type = 'student' then
    select ts.trainer_id into owner_id from trainer_students ts
      where ts.student_id = target_id and ts.status = 'active' limit 1;
  elsif target_type in ('workout','assessment','body_measurement') then
    execute format('select ts.trainer_id from %I r join trainer_students ts on ts.student_id=r.student_id where r.id=$1 and ts.status=''active'' limit 1', table_name)
      into owner_id using target_id;
  elsif target_type = 'workout_exercise' then
    select ts.trainer_id into owner_id from workout_exercises we
      join workouts w on w.id=we.workout_id join trainer_students ts on ts.student_id=w.student_id
      where we.id=target_id and ts.status='active' limit 1;
  else
    execute format('select coalesce(trainer_id, created_by) from %I where id=$1', table_name)
      into owner_id using target_id;
  end if;

  if not public.is_current_admin_ti() and owner_id is distinct from auth.uid() then
    raise exception 'Registro fora do seu escopo';
  end if;

  execute format('update public.%I set deleted_at=now(), deleted_by=auth.uid(), purge_after=now()+interval ''60 days'' where id=$1 and deleted_at is null', table_name)
    using target_id;
  if not found then raise exception 'Registro inexistente ou ja excluido'; end if;

  insert into alion_trash_records(record_type, record_id, owner_profile_id, display_name)
  values(target_type, target_id, owner_id, left(coalesce(nullif(target_label,''),'Registro'),160))
  on conflict(record_type,record_id) do update set
    deleted_at=now(), deleted_by=auth.uid(), purge_after=now()+interval '60 days',
    restored_at=null, restored_by=null, permanently_deleted_at=null, permanently_deleted_by=null
  returning id into trash_id;

  insert into manutencao_logs(acao, detalhes)
  values('soft_delete', jsonb_build_object('record_type',target_type,'record_id',target_id,'trash_id',trash_id,'actor',auth.uid()));
  return trash_id;
end $$;

create or replace function public.alion_restore_trash(trash_record_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare r alion_trash_records%rowtype; table_name text;
begin
  select * into r from alion_trash_records where id=trash_record_id for update;
  if not found or r.permanently_deleted_at is not null then raise exception 'Item indisponivel'; end if;
  if not public.is_current_admin_ti() and r.owner_profile_id is distinct from auth.uid() then raise exception 'Item fora do seu escopo'; end if;
  table_name := case r.record_type when 'student' then 'students' when 'workout' then 'workouts'
    when 'workout_exercise' then 'workout_exercises' when 'assessment' then 'assessments'
    when 'body_measurement' then 'body_measurements' when 'exercise' then 'exercise_library' end;
  execute format('update public.%I set deleted_at=null, deleted_by=null, purge_after=null where id=$1',table_name) using r.record_id;
  update alion_trash_records set restored_at=now(), restored_by=auth.uid() where id=r.id;
  insert into manutencao_logs(acao, detalhes) values('trash_restore',jsonb_build_object('trash_id',r.id,'actor',auth.uid()));
  return true;
end $$;

grant execute on function public.alion_soft_delete_owned_record(text,uuid,text) to authenticated;
grant execute on function public.alion_restore_trash(uuid) to authenticated;

-- Expurgo é deliberadamente admin-only. O agendamento deve ser habilitado apenas
-- depois da validação em staging; não depende do navegador estar aberto.
create or replace function public.alion_purge_expired_trash() returns integer
language plpgsql security definer set search_path=public as $$
declare r alion_trash_records%rowtype; table_name text; total integer:=0;
begin
  if not public.is_current_admin_ti() then raise exception 'Acesso administrativo obrigatorio'; end if;
  for r in select * from alion_trash_records where restored_at is null and permanently_deleted_at is null and purge_after <= now() for update skip locked loop
    table_name := case r.record_type when 'student' then 'students' when 'workout' then 'workouts'
      when 'workout_exercise' then 'workout_exercises' when 'assessment' then 'assessments'
      when 'body_measurement' then 'body_measurements' when 'exercise' then 'exercise_library' end;
    execute format('delete from public.%I where id=$1 and deleted_at is not null',table_name) using r.record_id;
    update alion_trash_records set permanently_deleted_at=now(), permanently_deleted_by=auth.uid() where id=r.id;
    total:=total+1;
  end loop;
  insert into manutencao_logs(acao,detalhes) values('trash_purge',jsonb_build_object('count',total,'actor',auth.uid()));
  return total;
end $$;
revoke all on function public.alion_purge_expired_trash() from public, anon, authenticated;
grant execute on function public.alion_purge_expired_trash() to service_role;
