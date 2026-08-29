-- Alion Treinos: autorização de treinadores, suspensão e correção da lixeira.
-- NÃO APLICAR sem revisão/autorizaçao. Não remove dados existentes na aplicação.

-- 1. Admin e roles somente funcionam para perfis ativos.
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

-- 2. Nenhum cliente cria app_profiles/profiles. Convites usam fluxo trusted.
drop policy if exists alion_app_profiles_insert_self on public.app_profiles;
create policy alion_app_profiles_insert_controlled on public.app_profiles
for insert to authenticated with check (public.is_current_admin_ti());

drop policy if exists alion_profiles_insert_self on public.profiles;
create policy alion_profiles_insert_controlled on public.profiles
for insert to authenticated with check (public.is_current_admin_ti());

create or replace function public.protect_app_profile_identity()
returns trigger language plpgsql security definer set search_path=public as $$
declare trusted boolean := coalesce(current_setting('alion.trusted_profile_update',true),'')='on';
begin
  if public.is_current_admin_ti() or trusted then return new; end if;
  if tg_op='INSERT' then raise exception 'Perfil somente pode ser criado por convite autorizado.'; end if;
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.role is distinct from old.role or lower(coalesce(new.email,'')) is distinct from lower(coalesce(old.email,''))
    or new.student_id is distinct from old.student_id or new.independent_personal is distinct from old.independent_personal
    or new.status_usuario is distinct from old.status_usuario then
    raise exception 'Identidade, role, vinculo e status nao podem ser alterados pelo cliente.';
  end if;
  return new;
end $$;

create or replace function public.protect_profile_identity()
returns trigger language plpgsql security definer set search_path=public as $$
declare trusted boolean := coalesce(current_setting('alion.trusted_profile_update',true),'')='on';
begin
  if public.is_current_admin_ti() or trusted then return new; end if;
  if tg_op='INSERT' then raise exception 'Perfil somente pode ser criado por convite autorizado.'; end if;
  if new.id is distinct from old.id or new.auth_user_id is distinct from old.auth_user_id
    or new.user_id is distinct from old.user_id or new.role is distinct from old.role
    or lower(coalesce(new.email,'')) is distinct from lower(coalesce(old.email,''))
    or new.status_usuario is distinct from old.status_usuario then
    raise exception 'Identidade, role, e-mail e status nao podem ser alterados pelo cliente.';
  end if;
  return new;
end $$;

-- 3. Convites de treinador, administrados somente pelo Admin TI.
create table if not exists public.trainer_invites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  token text not null unique default encode(gen_random_bytes(32),'hex'),
  status text not null default 'pendente' check(status in ('pendente','aceito','cancelado','expirado')),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '7 days'),
  accepted_user_id uuid references auth.users(id) on delete restrict,
  accepted_at timestamptz,
  canceled_by uuid references auth.users(id) on delete restrict,
  canceled_at timestamptz
);
create unique index if not exists trainer_invites_pending_email_unique
on public.trainer_invites(lower(email)) where status='pendente';
alter table public.trainer_invites enable row level security;
revoke all on public.trainer_invites from public, anon, authenticated;
grant select on public.trainer_invites to authenticated;
create policy trainer_invites_admin_select on public.trainer_invites for select to authenticated
using(public.is_current_admin_ti());

create or replace function public.admin_create_trainer_invite(invited_name text, invited_email text)
returns public.trainer_invites language plpgsql security definer set search_path=public as $$
declare result public.trainer_invites;
begin
  perform public.ensure_admin_ti();
  if nullif(trim(invited_name),'') is null or position('@' in lower(trim(invited_email)))<2 then
    raise exception 'Nome e e-mail validos sao obrigatorios.';
  end if;
  update trainer_invites set status='cancelado',canceled_by=auth.uid(),canceled_at=now()
    where lower(email)=lower(trim(invited_email)) and status='pendente';
  insert into trainer_invites(name,email,created_by)
    values(trim(invited_name),lower(trim(invited_email)),auth.uid()) returning * into result;
  insert into manutencao_logs(admin_id,acao,tabela_afetada,registro_id,detalhes)
    values(public.current_app_profile_id(),'trainer_invite_created','trainer_invites',result.id,
      jsonb_build_object('actor_user_id',auth.uid()));
  return result;
end $$;

create or replace function public.get_trainer_invite_by_token(invite_token text)
returns table(name text,email text,status text,expires_at timestamptz)
language sql stable security definer set search_path=public as $$
  select ti.name,ti.email,
    case when ti.status='pendente' and ti.expires_at<=now() then 'expirado' else ti.status end,
    ti.expires_at from trainer_invites ti where ti.token=invite_token limit 1
$$;

create or replace function public.accept_trainer_invite(invite_token text)
returns public.app_profiles language plpgsql security definer set search_path=public as $$
declare invite trainer_invites; result app_profiles; jwt_email text:=lower(coalesce(auth.jwt()->>'email',''));
begin
  if auth.uid() is null then raise exception 'Autenticacao obrigatoria.'; end if;
  select * into invite from trainer_invites where token=invite_token for update;
  if not found or invite.status<>'pendente' then raise exception 'Convite invalido ou ja utilizado.'; end if;
  if invite.expires_at<=now() then
    update trainer_invites set status='expirado' where id=invite.id;
    raise exception 'Convite expirado.';
  end if;
  if jwt_email='' or jwt_email<>lower(invite.email) then raise exception 'Convite pertence a outro e-mail.'; end if;
  if exists(select 1 from app_profiles where user_id=auth.uid()) then raise exception 'Usuario ja possui perfil.'; end if;
  perform set_config('alion.trusted_profile_update','on',true);
  insert into app_profiles(user_id,role,nome,full_name,email,status_usuario,primeiro_acesso_obrigatorio,senha_temporaria,independent_personal)
    values(auth.uid(),'personal',invite.name,invite.name,invite.email,'ativo',false,false,true)
    returning * into result;
  insert into profiles(id,auth_user_id,user_id,nome,full_name,email,role,status_usuario)
    values(auth.uid(),auth.uid(),auth.uid(),invite.name,invite.name,invite.email,'personal','ativo')
    on conflict(id) do update set role='personal',status_usuario='ativo';
  perform set_config('alion.trusted_profile_update','off',true);
  update trainer_invites set status='aceito',accepted_user_id=auth.uid(),accepted_at=now() where id=invite.id;
  insert into manutencao_logs(admin_id,acao,tabela_afetada,registro_id,detalhes)
    values(null,'trainer_invite_accepted','trainer_invites',invite.id,jsonb_build_object('actor_user_id',auth.uid()));
  return result;
end $$;

revoke all on function public.admin_create_trainer_invite(text,text) from public,anon;
grant execute on function public.admin_create_trainer_invite(text,text) to authenticated;
revoke all on function public.get_trainer_invite_by_token(text) from public;
grant execute on function public.get_trainer_invite_by_token(text) to anon,authenticated;
revoke all on function public.accept_trainer_invite(text) from public,anon;
grant execute on function public.accept_trainer_invite(text) to authenticated;

-- 4. Ownership da lixeira usa exclusivamente app_profiles.id.
alter table public.alion_trash_records add column if not exists purge_blocked_reason text;
update public.alion_trash_records tr set owner_profile_id=ap.id
from public.app_profiles ap where tr.owner_profile_id=ap.user_id;
revoke select on public.alion_trash_records from anon;
drop policy if exists alion_trash_select on public.alion_trash_records;
create policy alion_trash_select on public.alion_trash_records for select to authenticated using(
  public.is_current_admin_ti() or owner_profile_id=public.current_app_profile_id()
);

-- 5. Campos de exclusão só podem mudar em fluxo confiável.
create or replace function public.protect_soft_delete_fields()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if coalesce(current_setting('alion.trusted_trash_update',true),'')='on' then return new; end if;
  if new.deleted_at is distinct from old.deleted_at or new.deleted_by is distinct from old.deleted_by
    or new.purge_after is distinct from old.purge_after then
    raise exception 'Campos da lixeira somente podem ser alterados por operacao controlada.';
  end if;
  return new;
end $$;
do $$ declare t text; begin
  foreach t in array array['students','workouts','workout_exercises','assessments','body_measurements','exercise_library'] loop
    execute format('drop trigger if exists alion_protect_soft_delete on public.%I',t);
    execute format('create trigger alion_protect_soft_delete before update on public.%I for each row execute function public.protect_soft_delete_fields()',t);
  end loop;
end $$;

create or replace function public.alion_soft_delete_owned_record(target_type text,target_id uuid,target_label text default 'Registro')
returns uuid language plpgsql security definer set search_path=public as $$
declare table_name text; owner_id uuid; trash_id uuid;
begin
  if auth.uid() is null or public.current_app_role()<>'personal' then raise exception 'Personal ativo obrigatorio.'; end if;
  table_name:=case target_type when 'student' then 'students' when 'workout' then 'workouts'
    when 'workout_exercise' then 'workout_exercises' when 'assessment' then 'assessments'
    when 'body_measurement' then 'body_measurements' when 'exercise' then 'exercise_library' end;
  if table_name is null then raise exception 'Tipo invalido.'; end if;
  if target_type='student' then select coalesce(personal_id,trainer_id) into owner_id from students where id=target_id;
  elsif target_type in('workout','assessment','body_measurement','exercise') then
    execute format('select trainer_id from public.%I where id=$1',table_name) into owner_id using target_id;
  else select coalesce(w.personal_id,w.trainer_id) into owner_id from workout_exercises we join workouts w on w.id=we.workout_id where we.id=target_id;
  end if;
  if owner_id is distinct from public.current_app_profile_id() then raise exception 'Registro fora do escopo do Personal.'; end if;
  perform set_config('alion.trusted_trash_update','on',true);
  execute format('update public.%I set deleted_at=now(),deleted_by=auth.uid(),purge_after=now()+interval ''60 days'' where id=$1 and deleted_at is null',table_name) using target_id;
  if not found then raise exception 'Registro inexistente ou ja excluido.'; end if;
  perform set_config('alion.trusted_trash_update','off',true);
  insert into alion_trash_records(record_type,record_id,owner_profile_id,display_name)
    values(target_type,target_id,owner_id,left(coalesce(nullif(target_label,''),'Registro'),160))
    on conflict(record_type,record_id) do update set deleted_at=now(),deleted_by=auth.uid(),purge_after=now()+interval '60 days',restored_at=null,restored_by=null,permanently_deleted_at=null,permanently_deleted_by=null,purge_blocked_reason=null
    returning id into trash_id;
  insert into manutencao_logs(acao,tabela_afetada,registro_id,detalhes)
    values('soft_delete',table_name,target_id,jsonb_build_object('actor_user_id',auth.uid(),'trash_id',trash_id));
  return trash_id;
end $$;

create or replace function public.alion_restore_trash(trash_record_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare r alion_trash_records%rowtype; table_name text;
begin
  if auth.uid() is null or public.current_app_role() is null then raise exception 'Conta ativa obrigatoria.'; end if;
  select * into r from alion_trash_records where id=trash_record_id for update;
  if not found or r.permanently_deleted_at is not null then raise exception 'Item indisponivel.'; end if;
  if not public.is_current_admin_ti() and r.owner_profile_id is distinct from public.current_app_profile_id() then raise exception 'Item fora do seu escopo.'; end if;
  table_name:=case r.record_type when 'student' then 'students' when 'workout' then 'workouts'
    when 'workout_exercise' then 'workout_exercises' when 'assessment' then 'assessments'
    when 'body_measurement' then 'body_measurements' when 'exercise' then 'exercise_library' end;
  perform set_config('alion.trusted_trash_update','on',true);
  execute format('update public.%I set deleted_at=null,deleted_by=null,purge_after=null where id=$1',table_name) using r.record_id;
  perform set_config('alion.trusted_trash_update','off',true);
  update alion_trash_records set restored_at=now(),restored_by=auth.uid(),purge_blocked_reason=null where id=r.id;
  insert into manutencao_logs(acao,tabela_afetada,registro_id,detalhes)
    values('trash_restore',table_name,r.record_id,jsonb_build_object('actor_user_id',auth.uid(),'trash_id',r.id));
  return true;
end $$;

-- 6. Expurgo interno. Alunos e treinos com histórico ficam bloqueados para revisão.
create or replace function public.alion_purge_expired_trash_internal()
returns integer language plpgsql security definer set search_path=public as $$
declare r alion_trash_records%rowtype; table_name text; total integer:=0;
begin
  for r in select * from alion_trash_records where restored_at is null and permanently_deleted_at is null and purge_after<=now() for update skip locked loop
    if r.record_type='student' then
      update alion_trash_records set purge_blocked_reason='Aluno requer revisão administrativa de dependências.' where id=r.id; continue;
    elsif r.record_type='workout' and exists(select 1 from workout_logs where workout_id=r.record_id) then
      update alion_trash_records set purge_blocked_reason='Treino possui histórico de execução.' where id=r.id; continue;
    elsif r.record_type='exercise' and exists(select 1 from workout_exercises where exercise_id=r.record_id) then
      update alion_trash_records set purge_blocked_reason='Exercício ainda possui referências.' where id=r.id; continue;
    end if;
    table_name:=case r.record_type when 'workout' then 'workouts' when 'workout_exercise' then 'workout_exercises'
      when 'assessment' then 'assessments' when 'body_measurement' then 'body_measurements' when 'exercise' then 'exercise_library' end;
    begin
      execute format('delete from public.%I where id=$1 and deleted_at is not null',table_name) using r.record_id;
      update alion_trash_records set permanently_deleted_at=now(),purge_blocked_reason=null where id=r.id;
      total:=total+1;
    exception when foreign_key_violation then
      update alion_trash_records set purge_blocked_reason='Dependência ativa impede expurgo.' where id=r.id;
    end;
  end loop;
  insert into manutencao_logs(acao,detalhes) values('trash_purge_backend',jsonb_build_object('count',total));
  return total;
end $$;
revoke all on function public.alion_purge_expired_trash_internal() from public,anon,authenticated,service_role;
revoke all on function public.alion_purge_expired_trash() from public,anon,authenticated,service_role;

-- pg_cron executa como proprietário do banco, sem JWT/service_role no frontend.
-- to_regclass evita referenciar cron.job quando a extensão não está disponível.
do $$
declare existing_job_id bigint;
begin
  if to_regclass('cron.job') is null then
    raise warning 'pg_cron não está habilitado; habilite antes de considerar o expurgo ativo.';
    return;
  end if;

  for existing_job_id in
    execute 'select jobid from cron.job where jobname=$1'
    using 'alion-trash-purge-daily'
  loop
    execute 'select cron.unschedule($1)' using existing_job_id;
  end loop;

  execute 'select cron.schedule($1,$2,$3)'
    using 'alion-trash-purge-daily', '15 3 * * *',
      'select public.alion_purge_expired_trash_internal();';
end $$;
