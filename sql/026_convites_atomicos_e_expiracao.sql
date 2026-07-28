-- Corrige a aceitação concorrente de convites sem remover dados ou desativar RLS.
create or replace function public.get_student_invite_by_token(invite_token text)
returns setof public.student_invites
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.student_invites
  where token = $1
    and status = 'pendente'
    and (expires_at is null or expires_at > now())
  limit 1
$$;

create or replace function public.accept_student_invite_link(invite_token text)
returns setof public.trainer_students
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_invite public.student_invites%rowtype;
  authenticated_email text;
begin
  if auth.uid() is null then
    raise exception 'Autenticacao obrigatoria';
  end if;

  select lower(coalesce(auth.jwt() ->> 'email', '')) into authenticated_email;

  select *
  into selected_invite
  from public.student_invites
  where token = invite_token
  for update;

  if not found
    or selected_invite.status <> 'pendente'
    or (selected_invite.expires_at is not null and selected_invite.expires_at <= now()) then
    raise exception 'Convite invalido, expirado ou ja utilizado';
  end if;

  if authenticated_email = ''
    or lower(selected_invite.email) <> authenticated_email then
    raise exception 'Este convite pertence a outro e-mail';
  end if;

  insert into public.trainer_students (
    trainer_id,
    student_id,
    student_user_id,
    invite_id,
    status
  )
  values (
    selected_invite.trainer_id,
    selected_invite.student_id,
    auth.uid(),
    selected_invite.id,
    'ativo'
  )
  on conflict (trainer_id, student_id)
  do update set
    student_user_id = excluded.student_user_id,
    invite_id = excluded.invite_id,
    status = 'ativo';

  update public.student_invites
  set status = 'aceito',
      accepted_user_id = auth.uid(),
      accepted_at = coalesce(accepted_at, now())
  where id = selected_invite.id;

  return query
  select *
  from public.trainer_students
  where trainer_id = selected_invite.trainer_id
    and student_id = selected_invite.student_id;
end;
$$;

grant execute on function public.get_student_invite_by_token(text) to anon;
grant execute on function public.get_student_invite_by_token(text) to authenticated;
revoke all on function public.accept_student_invite_link(text) from public;
revoke all on function public.accept_student_invite_link(text) from anon;
grant execute on function public.accept_student_invite_link(text) to authenticated;

-- Reversão segura:
-- drop function if exists public.accept_student_invite_link(text);
-- e reaplique a versão anterior de get_student_invite_by_token(text), se necessário.
