begin;

create or replace function public.protect_student_invite_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_profile_id uuid := public.current_app_profile_id();
begin
  if public.is_current_admin_ti()
     or coalesce(current_setting('alion.trusted_profile_update', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if public.current_app_role() <> 'personal' or v_current_profile_id is null then
      raise exception 'Apenas Personal autenticado pode criar convite.';
    end if;

    if not exists (
      select 1
      from public.students as s
      where s.id = new.student_id
        and coalesce(s.personal_id, s.trainer_id) = v_current_profile_id
    ) then
      raise exception 'Convite deve apontar para aluno do Personal autenticado.';
    end if;

    new.trainer_id := v_current_profile_id;
    new.created_by := auth.uid();
    new.status := 'pendente';
    new.accepted_user_id := null;
    new.accepted_at := null;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.student_id is distinct from old.student_id
     or new.trainer_id is distinct from old.trainer_id
     or lower(new.email) is distinct from lower(old.email)
     or new.token is distinct from old.token
     or new.created_by is distinct from old.created_by
     or new.accepted_user_id is distinct from old.accepted_user_id
     or new.accepted_at is distinct from old.accepted_at then
    raise exception 'Identidade e propriedade do convite nao podem ser alteradas pelo cliente.';
  end if;

  if new.status not in ('pendente', 'cancelado', 'expirado') then
    raise exception 'Somente a RPC atomica pode aceitar um convite.';
  end if;

  return new;
end;
$function$;

comment on function public.protect_student_invite_ownership()
is 'Protege convites de aluno usando app_profiles.id sem colisao com students.profile_id.';

create or replace function public.create_or_get_student_invite(
  target_student_id uuid,
  target_email text,
  replace_pending boolean default false
)
returns public.student_invites
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_current_profile_id uuid := public.current_app_profile_id();
  v_student public.students%rowtype;
  v_existing_invite public.student_invites%rowtype;
  v_result public.student_invites%rowtype;
  v_normalized_email text := lower(trim(coalesce(target_email, '')));
begin
  if auth.uid() is null
     or public.current_app_role() <> 'personal'
     or v_current_profile_id is null then
    raise exception 'Personal ativo e autenticado obrigatorio.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_student_id::text, 0));

  select s.*
  into v_student
  from public.students as s
  where s.id = target_student_id
    and coalesce(s.personal_id, s.trainer_id) = v_current_profile_id
    and s.deleted_at is null;

  if not found then
    raise exception 'Aluno inexistente ou fora do escopo do Personal.';
  end if;

  if v_normalized_email = '' then
    raise exception 'Adicione um e-mail ao aluno para gerar o convite de acesso.';
  end if;

  if lower(trim(coalesce(v_student.email, ''))) <> v_normalized_email then
    raise exception 'O e-mail do convite deve ser o mesmo e-mail cadastrado no aluno.';
  end if;

  select si.*
  into v_existing_invite
  from public.student_invites as si
  where si.student_id = target_student_id
    and si.trainer_id = v_current_profile_id
    and si.status = 'pendente'
  order by si.created_at desc
  limit 1
  for update;

  if found and v_existing_invite.expires_at > now() and not replace_pending then
    return v_existing_invite;
  end if;

  if found then
    update public.student_invites as si
    set status = case
          when v_existing_invite.expires_at <= now() then 'expirado'
          else 'cancelado'
        end,
        canceled_at = case
          when v_existing_invite.expires_at > now() then now()
          else si.canceled_at
        end,
        canceled_by = case
          when v_existing_invite.expires_at > now() then auth.uid()
          else si.canceled_by
        end,
        updated_at = now()
    where si.id = v_existing_invite.id;
  end if;

  insert into public.student_invites (
    student_id,
    name,
    email,
    trainer_id,
    token,
    status,
    expires_at,
    created_by
  ) values (
    v_student.id,
    coalesce(nullif(trim(v_student.name), ''), 'Aluno'),
    v_normalized_email,
    v_current_profile_id,
    encode(gen_random_bytes(32), 'hex'),
    'pendente',
    now() + interval '30 days',
    auth.uid()
  )
  returning * into v_result;

  return v_result;
end;
$function$;

revoke all on function public.create_or_get_student_invite(uuid, text, boolean)
from public, anon;
grant execute on function public.create_or_get_student_invite(uuid, text, boolean)
to authenticated;

comment on function public.create_or_get_student_invite(uuid, text, boolean)
is 'Cria ou recupera convite pendente do aluno com ownership, e-mail e concorrencia validados no banco.';

commit;
