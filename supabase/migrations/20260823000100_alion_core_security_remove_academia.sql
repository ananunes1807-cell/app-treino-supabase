-- Alion Treinos - seguranca do nucleo e congelamento do legado Academia.
-- Migration aditiva: nao remove tabelas, colunas, dados ou migrations antigas.

-- A identidade administrativa passa a ser um UUID do Supabase Auth, nao um e-mail
-- gravavel pelo cliente. A carga inicial usa o e-mail historico apenas uma vez para
-- localizar o UUID ja existente em auth.users.
create table if not exists public.alion_admin_identities (
  user_id uuid primary key references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  note text
);

alter table public.alion_admin_identities enable row level security;
revoke all on table public.alion_admin_identities from public, anon, authenticated;

insert into public.alion_admin_identities (user_id, note)
select u.id, 'Admin TI principal migrado pela seguranca Alion 2026-08-23'
from auth.users u
where lower(coalesce(u.email, '')) = 'ananunes1807@gmail.com'
on conflict (user_id) do nothing;

create or replace function public.is_current_admin_ti()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.alion_admin_identities admin_identity
      where admin_identity.user_id = auth.uid()
    )
$$;

revoke all on function public.is_current_admin_ti() from public, anon;
grant execute on function public.is_current_admin_ti() to authenticated;

-- Garante que a conta confiavel continue com o perfil operacional usado pelo app.
-- O fluxo confiavel fica limitado a este bloco para permitir reaplicar a migration
-- quando o trigger de protecao ja existir (por exemplo, apos execucao parcial).
do $$
begin
  perform set_config('alion.trusted_profile_update', 'on', true);

  insert into public.app_profiles (
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
    admin_identity.user_id,
    'admin_ti',
    coalesce(u.raw_user_meta_data ->> 'nome', u.raw_user_meta_data ->> 'name', 'Admin TI'),
    coalesce(u.raw_user_meta_data ->> 'nome', u.raw_user_meta_data ->> 'name', 'Admin TI'),
    u.email,
    'ativo',
    false,
    false
  from public.alion_admin_identities admin_identity
  join auth.users u on u.id = admin_identity.user_id
  on conflict (user_id) do update
  set role = 'admin_ti',
      email = excluded.email,
      status_usuario = 'ativo',
      primeiro_acesso_obrigatorio = false,
      senha_temporaria = false;

  perform set_config('alion.trusted_profile_update', 'off', true);
end $$;

create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
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
        where p.id = auth.uid()
           or p.user_id = auth.uid()
           or p.auth_user_id = auth.uid()
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
  limit 1
$$;

create or replace function public.ensure_admin_ti()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_admin_ti() then
    raise exception 'Apenas o Admin TI autorizado pode executar esta acao.';
  end if;
end;
$$;

revoke all on function public.ensure_admin_ti() from public, anon;
grant execute on function public.ensure_admin_ti() to authenticated;

-- Campos de identidade/role nao podem ser promovidos pelo proprio usuario.
-- Os triggers legados confiavam em um e-mail gravavel; a identidade UUID acima
-- passa a ser a unica fonte de autoridade administrativa.
drop trigger if exists app_profiles_enforce_single_admin_ti on public.app_profiles;
drop trigger if exists profiles_enforce_single_admin_ti on public.profiles;

create or replace function public.protect_app_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  trusted_flow boolean := coalesce(current_setting('alion.trusted_profile_update', true), '') = 'on';
begin
  if public.is_current_admin_ti() or trusted_flow then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null or new.user_id <> auth.uid() then
      raise exception 'Perfil deve pertencer ao usuario autenticado.';
    end if;
    if lower(coalesce(new.role, '')) not in ('aluno', 'personal') then
      raise exception 'Role nao permitida para autocadastro.';
    end if;
    if jwt_email = '' or lower(coalesce(new.email, jwt_email)) <> jwt_email then
      raise exception 'E-mail do perfil deve ser o e-mail autenticado.';
    end if;
    new.email := jwt_email;
    new.academy_id := null;
    new.academy_link_status := null;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.role is distinct from old.role
     or lower(coalesce(new.email, '')) is distinct from lower(coalesce(old.email, ''))
     or new.student_id is distinct from old.student_id
     or new.academy_id is distinct from old.academy_id
     or new.academy_link_status is distinct from old.academy_link_status
     or new.independent_personal is distinct from old.independent_personal then
    raise exception 'Campos de identidade, role e vinculo nao podem ser alterados pelo cliente.';
  end if;

  return new;
end;
$$;

drop trigger if exists app_profiles_protect_identity on public.app_profiles;
create trigger app_profiles_protect_identity
before insert or update on public.app_profiles
for each row execute function public.protect_app_profile_identity();

create or replace function public.protect_profile_identity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  trusted_flow boolean := coalesce(current_setting('alion.trusted_profile_update', true), '') = 'on';
begin
  if public.is_current_admin_ti() or trusted_flow then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if auth.uid() is null
       or new.id <> auth.uid()
       or coalesce(new.auth_user_id, auth.uid()) <> auth.uid()
       or coalesce(new.user_id, auth.uid()) <> auth.uid() then
      raise exception 'Perfil canonico deve pertencer ao usuario autenticado.';
    end if;
    if lower(coalesce(new.role, '')) not in ('aluno', 'personal') then
      raise exception 'Role nao permitida para autocadastro.';
    end if;
    if jwt_email = '' or lower(coalesce(new.email, jwt_email)) <> jwt_email then
      raise exception 'E-mail do perfil deve ser o e-mail autenticado.';
    end if;
    new.auth_user_id := auth.uid();
    new.user_id := auth.uid();
    new.email := jwt_email;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.auth_user_id is distinct from old.auth_user_id
     or new.user_id is distinct from old.user_id
     or new.role is distinct from old.role
     or lower(coalesce(new.email, '')) is distinct from lower(coalesce(old.email, '')) then
    raise exception 'Identidade, role e e-mail nao podem ser alterados pelo cliente.';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_identity on public.profiles;
create trigger profiles_protect_identity
before insert or update on public.profiles
for each row execute function public.protect_profile_identity();

-- A propriedade Personal -> Aluno e os IDs Auth nao podem ser trocados pelo browser.
create or replace function public.protect_student_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  app_role text := public.current_app_role();
  profile_id uuid := public.current_app_profile_id();
  trusted_flow boolean := coalesce(current_setting('alion.trusted_profile_update', true), '') = 'on';
  allowed_student_fields text[] := array[
    'name', 'nome', 'full_name', 'phone', 'telefone', 'whatsapp', 'contact',
    'birth_date', 'genero', 'height_cm', 'objective', 'difficulties',
    'restrictions', 'notes', 'dores_limitacoes', 'updated_at', 'atualizado_em'
  ];
begin
  if public.is_current_admin_ti() or trusted_flow then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if app_role <> 'personal' or profile_id is null then
      raise exception 'Apenas Personal autenticado pode cadastrar aluno.';
    end if;
    new.personal_id := profile_id;
    new.trainer_id := profile_id;
    new.auth_user_id := null;
    new.profile_id := null;
    new.academy_id := null;
    new.academy_status := 'independente';
    return new;
  end if;

  if new.id is distinct from old.id
     or new.auth_user_id is distinct from old.auth_user_id
     or new.profile_id is distinct from old.profile_id
     or new.personal_id is distinct from old.personal_id
     or new.trainer_id is distinct from old.trainer_id
     or new.academy_id is distinct from old.academy_id
     or new.academy_status is distinct from old.academy_status then
    raise exception 'Vinculos do aluno nao podem ser alterados pelo cliente.';
  end if;

  if app_role = 'aluno'
     and (to_jsonb(new) - allowed_student_fields) is distinct from (to_jsonb(old) - allowed_student_fields) then
    raise exception 'Aluno tentou alterar campos reservados ao Personal/Admin.';
  end if;

  return new;
end;
$$;

drop trigger if exists students_protect_ownership on public.students;
create trigger students_protect_ownership
before insert or update on public.students
for each row execute function public.protect_student_ownership();

create or replace function public.protect_student_invite_ownership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid := public.current_app_profile_id();
begin
  if public.is_current_admin_ti()
     or coalesce(current_setting('alion.trusted_profile_update', true), '') = 'on' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if public.current_app_role() <> 'personal' or profile_id is null then
      raise exception 'Apenas Personal autenticado pode criar convite.';
    end if;
    if not exists (
      select 1 from public.students student
      where student.id = new.student_id
        and coalesce(student.personal_id, student.trainer_id) = profile_id
    ) then
      raise exception 'Convite deve apontar para aluno do Personal autenticado.';
    end if;
    new.trainer_id := profile_id;
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
$$;

drop trigger if exists student_invites_protect_ownership on public.student_invites;
create trigger student_invites_protect_ownership
before insert or update on public.student_invites
for each row execute function public.protect_student_invite_ownership();

create or replace function public.protect_workout_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid := public.current_app_profile_id();
begin
  if public.is_current_admin_ti() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if public.current_app_role() <> 'personal' or profile_id is null then
      raise exception 'Apenas Personal autenticado pode criar treino.';
    end if;
    new.personal_id := profile_id;
    new.trainer_id := profile_id;
    new.created_by := auth.uid();
  elsif new.student_id is distinct from old.student_id
     or new.personal_id is distinct from old.personal_id
     or new.trainer_id is distinct from old.trainer_id
     or new.created_by is distinct from old.created_by then
    raise exception 'Treino nao pode ser movido para outro aluno ou Personal.';
  end if;
  return new;
end;
$$;

drop trigger if exists workouts_protect_assignment on public.workouts;
create trigger workouts_protect_assignment
before insert or update on public.workouts
for each row execute function public.protect_workout_assignment();

create or replace function public.protect_student_record_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  owner_profile_id uuid;
begin
  if public.is_current_admin_ti() then
    return new;
  end if;
  select coalesce(s.personal_id, s.trainer_id)
  into owner_profile_id
  from public.students s
  where s.id = new.student_id;
  if tg_op = 'UPDATE' and new.student_id is distinct from old.student_id then
    raise exception 'Registro nao pode ser movido para outro aluno.';
  end if;
  new.trainer_id := owner_profile_id;
  return new;
end;
$$;

drop trigger if exists assessments_protect_assignment on public.assessments;
create trigger assessments_protect_assignment
before insert or update on public.assessments
for each row execute function public.protect_student_record_assignment();

drop trigger if exists body_measurements_protect_assignment on public.body_measurements;
create trigger body_measurements_protect_assignment
before insert or update on public.body_measurements
for each row execute function public.protect_student_record_assignment();

create or replace function public.protect_workout_exercise_assignment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_current_admin_ti()
     and tg_op = 'UPDATE'
     and new.workout_id is distinct from old.workout_id then
    raise exception 'Exercicio nao pode ser movido para outro treino.';
  end if;
  return new;
end;
$$;

drop trigger if exists workout_exercises_protect_assignment on public.workout_exercises;
create trigger workout_exercises_protect_assignment
before update on public.workout_exercises
for each row execute function public.protect_workout_exercise_assignment();

-- Remove todas as policies cumulativas das tabelas em escopo. Elas eram permissivas
-- e combinadas por OR. Em seguida um unico conjunto explicito e recriado.
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any (array[
        'app_profiles', 'profiles', 'students', 'trainer_students', 'student_invites',
        'workouts', 'workout_exercises', 'workout_logs', 'assessments',
        'body_measurements', 'exercise_library', 'manutencao_logs',
        'academies', 'academy_personal_links', 'academy_attendance', 'academy_financials'
      ])
  loop
    execute format('drop policy if exists %I on %I.%I',
      policy_record.policyname, policy_record.schemaname, policy_record.tablename);
  end loop;
end $$;

revoke all on table public.app_profiles, public.profiles, public.students,
  public.trainer_students, public.student_invites, public.assessments,
  public.body_measurements, public.workouts, public.workout_exercises,
  public.workout_logs, public.manutencao_logs from anon;
revoke all on table public.academies, public.academy_personal_links,
  public.academy_attendance, public.academy_financials from anon;
grant select on table public.exercise_library to anon;

-- Perfis: Admin confiavel ve/gerencia tudo; usuario comum ve e atualiza apenas o proprio.
create policy alion_app_profiles_select
on public.app_profiles for select to authenticated
using (public.is_current_admin_ti() or user_id = auth.uid());

create policy alion_app_profiles_insert_self
on public.app_profiles for insert to authenticated
with check (
  user_id = auth.uid()
  and lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and (
    lower(role) = 'personal'
    or (
      lower(role) = 'aluno'
      and exists (
        select 1 from public.student_invites invite
        where invite.status = 'pendente'
          and lower(invite.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          and (app_profiles.student_id is null or invite.student_id = app_profiles.student_id)
          and (invite.expires_at is null or invite.expires_at > now())
      )
    )
  )
);

create policy alion_app_profiles_update_self
on public.app_profiles for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and lower(role) in ('aluno', 'personal')
  and lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

create policy alion_app_profiles_admin_all
on public.app_profiles for all to authenticated
using (public.is_current_admin_ti())
with check (public.is_current_admin_ti());

create policy alion_profiles_select
on public.profiles for select to authenticated
using (
  public.is_current_admin_ti()
  or id = auth.uid()
  or user_id = auth.uid()
  or auth_user_id = auth.uid()
);

create policy alion_profiles_insert_self
on public.profiles for insert to authenticated
with check (
  id = auth.uid()
  and coalesce(user_id, auth.uid()) = auth.uid()
  and coalesce(auth_user_id, auth.uid()) = auth.uid()
  and lower(coalesce(email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
  and lower(role) in ('aluno', 'personal')
  and exists (
    select 1 from public.app_profiles ap
    where ap.user_id = auth.uid()
      and lower(ap.role) = lower(profiles.role)
  )
);

create policy alion_profiles_update_self
on public.profiles for update to authenticated
using (id = auth.uid() or user_id = auth.uid() or auth_user_id = auth.uid())
with check (
  id = auth.uid()
  and coalesce(user_id, auth.uid()) = auth.uid()
  and coalesce(auth_user_id, auth.uid()) = auth.uid()
  and lower(role) in ('aluno', 'personal')
);

create policy alion_profiles_admin_all
on public.profiles for all to authenticated
using (public.is_current_admin_ti())
with check (public.is_current_admin_ti());

-- Alunos: Personal ve somente sua propriedade canonica; Aluno ve somente sua identidade Auth.
create policy alion_students_select
on public.students for select to authenticated
using (
  public.is_current_admin_ti()
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or (personal_id is null and trainer_id = public.current_app_profile_id())
    )
  )
  or (
    public.current_app_role() = 'aluno'
    and (auth_user_id = auth.uid() or (auth_user_id is null and profile_id = auth.uid()))
    and coalesce(status, 'ativo') = 'ativo'
  )
);

create policy alion_students_insert
on public.students for insert to authenticated
with check (
  public.is_current_admin_ti()
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or (personal_id is null and trainer_id = public.current_app_profile_id())
    )
    and trainer_id = public.current_app_profile_id()
    and academy_id is null
    and coalesce(academy_status, 'independente') = 'independente'
  )
);

create policy alion_students_update
on public.students for update to authenticated
using (
  public.is_current_admin_ti()
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or (personal_id is null and trainer_id = public.current_app_profile_id())
    )
  )
  or (
    public.current_app_role() = 'aluno'
    and (auth_user_id = auth.uid() or (auth_user_id is null and profile_id = auth.uid()))
  )
)
with check (
  public.is_current_admin_ti()
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or (personal_id is null and trainer_id = public.current_app_profile_id())
    )
  )
  or (
    public.current_app_role() = 'aluno'
    and (auth_user_id = auth.uid() or (auth_user_id is null and profile_id = auth.uid()))
    and coalesce(status, 'ativo') = 'ativo'
  )
);

create policy alion_students_delete_admin
on public.students for delete to authenticated
using (public.is_current_admin_ti());

-- Convites e vinculos: nenhuma escrita direta por Personal/Aluno em trainer_students.
create policy alion_trainer_students_select
on public.trainer_students for select to authenticated
using (
  public.is_current_admin_ti()
  or (public.current_app_role() = 'personal' and trainer_id = public.current_app_profile_id())
  or (
    public.current_app_role() = 'aluno'
    and (
      student_user_id = auth.uid()
      or exists (
        select 1 from public.students student
        where student.id = trainer_students.student_id
          and (student.auth_user_id = auth.uid() or student.profile_id = auth.uid())
      )
    )
  )
);

create policy alion_trainer_students_admin_write
on public.trainer_students for all to authenticated
using (public.is_current_admin_ti())
with check (public.is_current_admin_ti());

create policy alion_student_invites_select
on public.student_invites for select to authenticated
using (
  public.is_current_admin_ti()
  or (
    public.current_app_role() = 'personal'
    and trainer_id = public.current_app_profile_id()
  )
);

create policy alion_student_invites_insert
on public.student_invites for insert to authenticated
with check (
  public.is_current_admin_ti()
  or (
    public.current_app_role() = 'personal'
    and trainer_id = public.current_app_profile_id()
    and created_by = auth.uid()
    and status = 'pendente'
    and exists (
      select 1 from public.students student
      where student.id = student_invites.student_id
        and (
          student.personal_id = public.current_app_profile_id()
          or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
        )
    )
  )
);

create policy alion_student_invites_update
on public.student_invites for update to authenticated
using (
  public.is_current_admin_ti()
  or (public.current_app_role() = 'personal' and trainer_id = public.current_app_profile_id())
)
with check (
  public.is_current_admin_ti()
  or (public.current_app_role() = 'personal' and trainer_id = public.current_app_profile_id())
);

-- Treinos e registros relacionados sempre validam o aluno do Personal ou o Auth do Aluno.
create policy alion_workouts_select
on public.workouts for select to authenticated
using (
  public.is_current_admin_ti()
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or (personal_id is null and trainer_id = public.current_app_profile_id())
    )
    and exists (
      select 1 from public.students student
      where student.id = workouts.student_id
        and (
          student.personal_id = public.current_app_profile_id()
          or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
        )
    )
  )
  or (
    public.current_app_role() = 'aluno'
    and coalesce(status, 'ativo') = 'ativo'
    and exists (
      select 1 from public.students student
      where student.id = workouts.student_id
        and (student.auth_user_id = auth.uid() or student.profile_id = auth.uid())
    )
  )
);

create policy alion_workouts_write
on public.workouts for all to authenticated
using (
  public.is_current_admin_ti()
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or (personal_id is null and trainer_id = public.current_app_profile_id())
    )
    and exists (
      select 1 from public.students student
      where student.id = workouts.student_id
        and (
          student.personal_id = public.current_app_profile_id()
          or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
        )
    )
  )
)
with check (
  public.is_current_admin_ti()
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or (personal_id is null and trainer_id = public.current_app_profile_id())
    )
    and exists (
      select 1 from public.students student
      where student.id = workouts.student_id
        and (
          student.personal_id = public.current_app_profile_id()
          or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
        )
    )
  )
);

create policy alion_workout_exercises_select
on public.workout_exercises for select to authenticated
using (exists (select 1 from public.workouts workout where workout.id = workout_id));

create policy alion_workout_exercises_write
on public.workout_exercises for all to authenticated
using (
  public.is_current_admin_ti()
  or exists (
    select 1 from public.workouts workout
    where workout.id = workout_id
      and public.current_app_role() = 'personal'
      and (
        workout.personal_id = public.current_app_profile_id()
        or (workout.personal_id is null and workout.trainer_id = public.current_app_profile_id())
      )
  )
)
with check (
  public.is_current_admin_ti()
  or exists (
    select 1 from public.workouts workout
    where workout.id = workout_id
      and public.current_app_role() = 'personal'
      and (
        workout.personal_id = public.current_app_profile_id()
        or (workout.personal_id is null and workout.trainer_id = public.current_app_profile_id())
      )
  )
);

create policy alion_workout_logs_select
on public.workout_logs for select to authenticated
using (
  public.is_current_admin_ti()
  or exists (
    select 1 from public.students student
    where student.id = workout_logs.student_id
      and (
        (public.current_app_role() = 'personal' and (
          student.personal_id = public.current_app_profile_id()
          or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
        ))
        or (public.current_app_role() = 'aluno' and (
          student.auth_user_id = auth.uid() or student.profile_id = auth.uid()
        ))
      )
  )
);

create policy alion_workout_logs_insert
on public.workout_logs for insert to authenticated
with check (
  public.is_current_admin_ti()
  or exists (
    select 1
    from public.students student
    join public.workouts workout on workout.id = workout_logs.workout_id
    where student.id = workout_logs.student_id
      and workout.student_id = student.id
      and (
        (public.current_app_role() = 'personal' and (
          student.personal_id = public.current_app_profile_id()
          or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
        ))
        or (public.current_app_role() = 'aluno' and (
          student.auth_user_id = auth.uid() or student.profile_id = auth.uid()
        ))
      )
  )
);

create policy alion_workout_logs_delete_admin
on public.workout_logs for delete to authenticated
using (public.is_current_admin_ti());

create policy alion_assessments_select
on public.assessments for select to authenticated
using (
  public.is_current_admin_ti()
  or exists (
    select 1 from public.students student
    where student.id = assessments.student_id
      and (
        (public.current_app_role() = 'personal' and (
          student.personal_id = public.current_app_profile_id()
          or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
        ))
        or (public.current_app_role() = 'aluno' and (
          student.auth_user_id = auth.uid() or student.profile_id = auth.uid()
        ))
      )
  )
);

create policy alion_assessments_write
on public.assessments for all to authenticated
using (
  public.is_current_admin_ti()
  or exists (
    select 1 from public.students student
    where student.id = assessments.student_id
      and public.current_app_role() = 'personal'
      and (
        student.personal_id = public.current_app_profile_id()
        or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
      )
  )
)
with check (
  public.is_current_admin_ti()
  or exists (
    select 1 from public.students student
    where student.id = assessments.student_id
      and public.current_app_role() = 'personal'
      and (
        student.personal_id = public.current_app_profile_id()
        or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
      )
  )
);

create policy alion_body_measurements_select
on public.body_measurements for select to authenticated
using (
  public.is_current_admin_ti()
  or exists (
    select 1 from public.students student
    where student.id = body_measurements.student_id
      and (
        (public.current_app_role() = 'personal' and (
          student.personal_id = public.current_app_profile_id()
          or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
        ))
        or (public.current_app_role() = 'aluno' and (
          student.auth_user_id = auth.uid() or student.profile_id = auth.uid()
        ))
      )
  )
);

create policy alion_body_measurements_write
on public.body_measurements for all to authenticated
using (
  public.is_current_admin_ti()
  or exists (
    select 1 from public.students student
    where student.id = body_measurements.student_id
      and public.current_app_role() = 'personal'
      and (
        student.personal_id = public.current_app_profile_id()
        or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
      )
  )
)
with check (
  public.is_current_admin_ti()
  or exists (
    select 1 from public.students student
    where student.id = body_measurements.student_id
      and public.current_app_role() = 'personal'
      and (
        student.personal_id = public.current_app_profile_id()
        or (student.personal_id is null and student.trainer_id = public.current_app_profile_id())
      )
  )
);

create policy alion_exercise_library_public_select
on public.exercise_library for select to anon, authenticated
using (true);

create policy alion_exercise_library_personal_admin_write
on public.exercise_library for all to authenticated
using (public.is_current_admin_ti() or public.current_app_role() = 'personal')
with check (public.is_current_admin_ti() or public.current_app_role() = 'personal');

create policy alion_maintenance_admin_all
on public.manutencao_logs for all to authenticated
using (public.is_current_admin_ti())
with check (public.is_current_admin_ti());

-- Academia permanece fisicamente preservada, congelada e fora da autorizacao core.
revoke insert, update, delete on table public.academies from authenticated;
revoke insert, update, delete on table public.academy_personal_links from authenticated;
revoke insert, update, delete on table public.academy_attendance from authenticated;
revoke insert, update, delete on table public.academy_financials from authenticated;
grant select on table public.academies to authenticated;
grant select on table public.academy_personal_links to authenticated;
grant select on table public.academy_attendance to authenticated;
grant select on table public.academy_financials to authenticated;

create policy alion_academies_legacy_admin_read
on public.academies for select to authenticated
using (public.is_current_admin_ti());

create policy alion_academy_links_legacy_admin_read
on public.academy_personal_links for select to authenticated
using (public.is_current_admin_ti());

create policy alion_academy_attendance_legacy_admin_read
on public.academy_attendance for select to authenticated
using (public.is_current_admin_ti());

create policy alion_academy_financials_legacy_admin_read
on public.academy_financials for select to authenticated
using (public.is_current_admin_ti());

-- Aceitacao de convite realmente atomica: perfis, aluno, vinculo e convite.
create or replace function public.accept_student_invite_link(invite_token text)
returns public.trainer_students
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_invite public.student_invites;
  selected_student public.students;
  selected_profile public.app_profiles;
  linked_record public.trainer_students;
  jwt_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if auth.uid() is null then
    raise exception 'Autenticacao obrigatoria para aceitar convite.';
  end if;

  select * into selected_invite
  from public.student_invites
  where token = invite_token
  for update;

  if not found then raise exception 'Convite nao encontrado.'; end if;
  if selected_invite.status <> 'pendente' then raise exception 'Convite nao esta pendente.'; end if;
  if selected_invite.expires_at is not null and selected_invite.expires_at <= now() then
    update public.student_invites set status = 'expirado' where id = selected_invite.id;
    raise exception 'Convite expirado.';
  end if;
  if jwt_email = '' or lower(selected_invite.email) <> jwt_email then
    raise exception 'Convite pertence a outro e-mail.';
  end if;

  select * into selected_student
  from public.students
  where id = selected_invite.student_id
  for update;

  if not found then raise exception 'Aluno do convite nao encontrado.'; end if;
  if coalesce(selected_student.personal_id, selected_student.trainer_id) is distinct from selected_invite.trainer_id then
    raise exception 'Convite nao corresponde ao Personal responsavel.';
  end if;
  if selected_student.auth_user_id is not null and selected_student.auth_user_id <> auth.uid() then
    raise exception 'Aluno ja vinculado a outra conta.';
  end if;
  if selected_student.profile_id is not null and selected_student.profile_id <> auth.uid() then
    raise exception 'Perfil do aluno ja pertence a outra conta.';
  end if;
  if exists (
    select 1 from public.app_profiles other_profile
    where other_profile.student_id = selected_student.id
      and other_profile.user_id <> auth.uid()
  ) then
    raise exception 'Aluno ja associado a outro perfil de acesso.';
  end if;
  if exists (
    select 1 from public.trainer_students existing_link
    where existing_link.trainer_id = selected_invite.trainer_id
      and existing_link.student_id = selected_student.id
      and existing_link.student_user_id is not null
      and existing_link.student_user_id <> auth.uid()
  ) then
    raise exception 'Vinculo Personal-Aluno ja pertence a outra conta.';
  end if;

  select * into selected_profile
  from public.app_profiles
  where user_id = auth.uid()
  for update;

  if found and lower(selected_profile.role) <> 'aluno' then
    raise exception 'Conta autenticada ja possui outro perfil.';
  end if;

  perform set_config('alion.trusted_profile_update', 'on', true);

  insert into public.app_profiles (
    user_id, role, nome, full_name, email, student_id,
    status_usuario, primeiro_acesso_obrigatorio, senha_temporaria
  ) values (
    auth.uid(), 'aluno', selected_invite.name, selected_invite.name, jwt_email,
    selected_student.id, 'ativo', false, false
  )
  on conflict (user_id) do update
  set role = 'aluno',
      nome = excluded.nome,
      full_name = excluded.full_name,
      email = excluded.email,
      student_id = excluded.student_id,
      status_usuario = 'ativo',
      primeiro_acesso_obrigatorio = false,
      senha_temporaria = false;

  insert into public.profiles (
    id, auth_user_id, user_id, nome, full_name, email, role, status_usuario
  ) values (
    auth.uid(), auth.uid(), auth.uid(), selected_invite.name,
    selected_invite.name, jwt_email, 'aluno', 'ativo'
  )
  on conflict (id) do update
  set auth_user_id = auth.uid(),
      user_id = auth.uid(),
      nome = excluded.nome,
      full_name = excluded.full_name,
      email = excluded.email,
      role = 'aluno',
      status_usuario = 'ativo';

  update public.students
  set auth_user_id = auth.uid(),
      profile_id = auth.uid(),
      personal_id = selected_invite.trainer_id,
      trainer_id = selected_invite.trainer_id,
      status = 'ativo',
      status_usuario = 'ativo',
      primeiro_acesso_obrigatorio = false,
      senha_temporaria = false,
      updated_at = now()
  where id = selected_student.id;

  insert into public.trainer_students (
    trainer_id, student_id, student_user_id, invite_id, status
  ) values (
    selected_invite.trainer_id, selected_invite.student_id,
    auth.uid(), selected_invite.id, 'ativo'
  )
  on conflict (trainer_id, student_id) do update
  set student_user_id = excluded.student_user_id,
      invite_id = excluded.invite_id,
      status = 'ativo'
  returning * into linked_record;

  update public.student_invites
  set status = 'aceito',
      accepted_user_id = auth.uid(),
      accepted_at = now()
  where id = selected_invite.id;

  return linked_record;
end;
$$;

revoke all on function public.accept_student_invite_link(text) from public, anon;
grant execute on function public.accept_student_invite_link(text) to authenticated;

-- Manutencao Admin: todas as decisoes destrutivas passam a usar o estado real do banco.
create or replace function public.admin_delete_workout_permanently(target_workout_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_admin_ti();
  delete from public.workout_logs where workout_id = target_workout_id;
  delete from public.workout_exercises where workout_id = target_workout_id;
  delete from public.workouts where id = target_workout_id;
  perform public.admin_log_action('delete_workout_permanently', 'workouts', target_workout_id, '{}'::jsonb);
end;
$$;

create or replace function public.admin_preview_workout_deletion(target_workout_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform public.ensure_admin_ti();
  return jsonb_build_object(
    'workout_exists', exists (select 1 from public.workouts where id = target_workout_id),
    'exercises', (select count(*) from public.workout_exercises where workout_id = target_workout_id),
    'sessions', (select count(*) from public.workout_logs where workout_id = target_workout_id)
  );
end;
$$;

create or replace function public.admin_preview_maintenance(maintenance_action text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.ensure_admin_ti();
  if maintenance_action = 'test-students' then
    select jsonb_build_object('students', count(*)) into result
    from public.students item
    where concat_ws(' ', to_jsonb(item)->>'name', to_jsonb(item)->>'objective', to_jsonb(item)->>'notes')
      ~* '(^|[^[:alnum:]])(teste|test|demo|exemplo)([^[:alnum:]]|$)';
  elsif maintenance_action = 'test-workouts' then
    select jsonb_build_object('workouts', count(*)) into result
    from public.workouts item
    where concat_ws(' ', to_jsonb(item)->>'name', to_jsonb(item)->>'title', to_jsonb(item)->>'goal', to_jsonb(item)->>'notes', to_jsonb(item)->>'description')
      ~* '(^|[^[:alnum:]])(teste|test|demo|exemplo)([^[:alnum:]]|$)';
  elsif maintenance_action = 'orphans' then
    select jsonb_build_object(
      'workout_exercises', (select count(*) from public.workout_exercises item where not exists (select 1 from public.workouts workout where workout.id = item.workout_id)),
      'workout_logs', (select count(*) from public.workout_logs item where not exists (select 1 from public.students student where student.id = item.student_id) or (item.workout_id is not null and not exists (select 1 from public.workouts workout where workout.id = item.workout_id)))
    ) into result;
  else
    result := '{}'::jsonb;
  end if;
  return result;
end;
$$;

create or replace function public.admin_preview_student_maintenance(target_student_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  perform public.ensure_admin_ti();
  select jsonb_build_object(
    'student_exists', exists (select 1 from public.students where id = target_student_id),
    'workouts', (select count(*) from public.workouts where student_id = target_student_id),
    'sessions', (select count(*) from public.workout_logs where student_id = target_student_id),
    'measurements', (select count(*) from public.body_measurements where student_id = target_student_id),
    'assessments', (select count(*) from public.assessments where student_id = target_student_id),
    'invites', (select count(*) from public.student_invites where student_id = target_student_id)
  ) into result;
  return result;
end;
$$;

create or replace function public.admin_cleanup_orphan_workout_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_logs integer := 0;
  deleted_exercises integer := 0;
begin
  perform public.ensure_admin_ti();
  delete from public.workout_logs item
  where not exists (select 1 from public.students student where student.id = item.student_id)
     or (item.workout_id is not null and not exists (select 1 from public.workouts workout where workout.id = item.workout_id));
  get diagnostics deleted_logs = row_count;
  delete from public.workout_exercises item
  where not exists (select 1 from public.workouts workout where workout.id = item.workout_id);
  get diagnostics deleted_exercises = row_count;
  perform public.admin_log_action('cleanup_orphans', null, null, jsonb_build_object('workout_logs', deleted_logs, 'workout_exercises', deleted_exercises));
  return jsonb_build_object('workout_logs', deleted_logs, 'workout_exercises', deleted_exercises);
end;
$$;

create or replace function public.admin_delete_test_workouts()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  workout_record record;
  deleted_count integer := 0;
begin
  perform public.ensure_admin_ti();
  for workout_record in
    select item.id
    from public.workouts item
    where concat_ws(' ', to_jsonb(item)->>'name', to_jsonb(item)->>'title', to_jsonb(item)->>'goal', to_jsonb(item)->>'notes', to_jsonb(item)->>'description')
      ~* '(^|[^[:alnum:]])(teste|test|demo|exemplo)([^[:alnum:]]|$)'
  loop
    perform public.admin_delete_workout_permanently(workout_record.id);
    deleted_count := deleted_count + 1;
  end loop;
  return deleted_count;
end;
$$;

create or replace function public.admin_delete_test_students()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  student_record record;
  deleted_count integer := 0;
begin
  perform public.ensure_admin_ti();
  for student_record in
    select item.id
    from public.students item
    where concat_ws(' ', to_jsonb(item)->>'name', to_jsonb(item)->>'objective', to_jsonb(item)->>'notes')
      ~* '(^|[^[:alnum:]])(teste|test|demo|exemplo)([^[:alnum:]]|$)'
  loop
    perform public.admin_delete_student_permanently(student_record.id);
    deleted_count := deleted_count + 1;
  end loop;
  return deleted_count;
end;
$$;

revoke all on function public.admin_delete_workout_permanently(uuid) from public, anon;
revoke all on function public.admin_preview_workout_deletion(uuid) from public, anon;
revoke all on function public.admin_preview_maintenance(text) from public, anon;
revoke all on function public.admin_preview_student_maintenance(uuid) from public, anon;
revoke all on function public.admin_cleanup_orphan_workout_data() from public, anon;
revoke all on function public.admin_delete_test_workouts() from public, anon;
revoke all on function public.admin_delete_test_students() from public, anon;
grant execute on function public.admin_delete_workout_permanently(uuid) to authenticated;
grant execute on function public.admin_preview_workout_deletion(uuid) to authenticated;
grant execute on function public.admin_preview_maintenance(text) to authenticated;
grant execute on function public.admin_preview_student_maintenance(uuid) to authenticated;
grant execute on function public.admin_cleanup_orphan_workout_data() to authenticated;
grant execute on function public.admin_delete_test_workouts() to authenticated;
grant execute on function public.admin_delete_test_students() to authenticated;

-- Defesa em profundidade para RPCs administrativas antigas.
do $$
declare
  function_record record;
begin
  for function_record in
    select p.oid::regprocedure as function_signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'admin\_%' escape '\'
  loop
    execute format('revoke all on function %s from public, anon', function_record.function_signature);
    execute format('grant execute on function %s to authenticated', function_record.function_signature);
  end loop;
end $$;

do $$
begin
  if not exists (select 1 from public.alion_admin_identities) then
    raise warning 'Nenhum Admin TI confiavel foi encontrado. Cadastre a conta Auth e insira seu auth.uid em alion_admin_identities pelo SQL Editor antes de publicar o frontend.';
  end if;
end $$;
