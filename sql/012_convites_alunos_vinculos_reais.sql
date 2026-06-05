-- Alion Treinos / app-treino-supabase
-- Fluxo real de aluno por convite.
-- Rode no Supabase SQL Editor depois do arquivo 011_roles_reais_permissoes.sql.

do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and c.relkind = 'v'
  ) then
    execute 'drop view public.profiles';
  end if;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  nome text,
  full_name text,
  email text unique,
  role text not null check (role in ('admin_ti', 'personal', 'aluno', 'gestor_academia', 'owner')),
  status_usuario text not null default 'ativo',
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('admin_ti', 'personal', 'aluno', 'gestor_academia', 'owner'));

alter table public.profiles add column if not exists user_id uuid;
alter table public.profiles add column if not exists auth_user_id uuid;

update public.profiles
set auth_user_id = coalesce(auth_user_id, user_id, id)
where auth_user_id is null;

update public.profiles
set user_id = coalesce(user_id, auth_user_id, id)
where user_id is null;

-- Mantem compatibilidade com app_profiles, usado pelo app para vinculos operacionais.
insert into public.app_profiles (
  id,
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
  p.id,
  p.auth_user_id,
  public.normalize_app_role(p.role),
  p.nome,
  p.full_name,
  p.email,
  coalesce(p.status_usuario, 'ativo'),
  false,
  false
from public.profiles p
where p.auth_user_id is not null
  and not exists (
    select 1
    from public.app_profiles ap
    where ap.user_id = p.auth_user_id
  );

-- Ajusta profiles para a regra canonica: profiles.id = auth.users.id.
update public.profiles p
set id = p.auth_user_id
where p.auth_user_id is not null
  and p.id <> p.auth_user_id
  and not exists (
    select 1
    from public.profiles other_profile
    where other_profile.id = p.auth_user_id
  );

create unique index if not exists profiles_auth_user_id_unique
on public.profiles(auth_user_id)
where auth_user_id is not null;

create table if not exists public.student_invites (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.students(id) on delete cascade,
  name text not null,
  email text not null,
  trainer_id uuid references public.app_profiles(id) on delete cascade,
  token text not null unique,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'expirado', 'cancelado')),
  created_by uuid references auth.users(id) on delete set null,
  accepted_user_id uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.trainer_students (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.app_profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  student_user_id uuid references auth.users(id) on delete set null,
  invite_id uuid references public.student_invites(id) on delete set null,
  status text not null default 'ativo' check (status in ('ativo', 'arquivado', 'excluido')),
  created_at timestamptz not null default now(),
  unique (trainer_id, student_id)
);

alter table public.assessments add column if not exists trainer_id uuid references public.app_profiles(id) on delete set null;
alter table public.body_measurements add column if not exists trainer_id uuid references public.app_profiles(id) on delete set null;
alter table public.workout_logs add column if not exists trainer_id uuid references public.app_profiles(id) on delete set null;

update public.assessments a
set trainer_id = s.personal_id
from public.students s
where a.student_id = s.id
  and a.trainer_id is null;

update public.body_measurements b
set trainer_id = s.personal_id
from public.students s
where b.student_id = s.id
  and b.trainer_id is null;

update public.workout_logs l
set trainer_id = s.personal_id
from public.students s
where l.student_id = s.id
  and l.trainer_id is null;

create or replace function public.fill_student_trainer_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.trainer_id is null and new.student_id is not null then
    select personal_id into new.trainer_id
    from public.students
    where id = new.student_id;
  end if;
  return new;
end;
$$;

drop trigger if exists assessments_fill_trainer_id on public.assessments;
create trigger assessments_fill_trainer_id
before insert or update of student_id, trainer_id on public.assessments
for each row execute function public.fill_student_trainer_id();

drop trigger if exists body_measurements_fill_trainer_id on public.body_measurements;
create trigger body_measurements_fill_trainer_id
before insert or update of student_id, trainer_id on public.body_measurements
for each row execute function public.fill_student_trainer_id();

drop trigger if exists workout_logs_fill_trainer_id on public.workout_logs;
create trigger workout_logs_fill_trainer_id
before insert or update of student_id, trainer_id on public.workout_logs
for each row execute function public.fill_student_trainer_id();

alter table public.profiles enable row level security;
alter table public.student_invites enable row level security;
alter table public.trainer_students enable row level security;

grant select, insert, update on public.profiles to authenticated;
grant select, insert, update on public.student_invites to authenticated;
revoke all on public.student_invites from anon;
grant select, insert, update on public.trainer_students to authenticated;

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
  limit 1
$$;

grant execute on function public.get_student_invite_by_token(text) to anon;
grant execute on function public.get_student_invite_by_token(text) to authenticated;

drop policy if exists profiles_select_real on public.profiles;
create policy profiles_select_real
on public.profiles
for select
to authenticated
using (
  id = auth.uid()
  or public.current_app_role() in ('admin_ti', 'gestor_academia')
);

drop policy if exists profiles_insert_self_real on public.profiles;
create policy profiles_insert_self_real
on public.profiles
for insert
to authenticated
with check (
  id = auth.uid()
  and auth_user_id = auth.uid()
  and (
    public.normalize_app_role(role) in ('personal', 'gestor_academia')
    or (
      public.normalize_app_role(role) = 'admin_ti'
      and lower(coalesce(email, auth.jwt() ->> 'email', '')) = 'ananunes1807@gmail.com'
    )
    or (
      public.normalize_app_role(role) = 'aluno'
      and exists (
        select 1
        from public.student_invites i
        where i.status = 'pendente'
          and lower(i.email) = lower(coalesce(email, auth.jwt() ->> 'email', ''))
      )
    )
  )
);

drop policy if exists profiles_update_self_or_admin_real on public.profiles;
create policy profiles_update_self_or_admin_real
on public.profiles
for update
to authenticated
using (id = auth.uid() or public.current_app_role() = 'admin_ti')
with check (id = auth.uid() or public.current_app_role() = 'admin_ti');

drop policy if exists student_invites_public_read_token on public.student_invites;

drop policy if exists student_invites_authenticated_read on public.student_invites;
create policy student_invites_authenticated_read
on public.student_invites
for select
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists student_invites_create_by_admin_or_personal on public.student_invites;
create policy student_invites_create_by_admin_or_personal
on public.student_invites
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or (public.current_app_role() = 'personal' and trainer_id = public.current_app_profile_id())
);

drop policy if exists student_invites_update_accept on public.student_invites;
create policy student_invites_update_accept
on public.student_invites
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or lower(email) = lower(auth.jwt() ->> 'email')
)
with check (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or lower(email) = lower(auth.jwt() ->> 'email')
);

drop policy if exists trainer_students_select_real on public.trainer_students;
create policy trainer_students_select_real
on public.trainer_students
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or trainer_id = public.current_app_profile_id()
  or student_user_id = auth.uid()
);

drop policy if exists trainer_students_insert_real on public.trainer_students;
create policy trainer_students_insert_real
on public.trainer_students
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or student_user_id = auth.uid()
);

drop policy if exists trainer_students_update_real on public.trainer_students;
create policy trainer_students_update_real
on public.trainer_students
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
)
with check (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
);

-- Fecha cadastro aberto de aluno em app_profiles: aluno so entra com convite pendente.
drop policy if exists app_profiles_self_signup_insert on public.app_profiles;
create policy app_profiles_self_signup_insert
on public.app_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    public.normalize_app_role(role) in ('personal', 'gestor_academia')
    or (
      public.normalize_app_role(role) = 'admin_ti'
      and lower(coalesce(email, auth.jwt() ->> 'email', '')) = 'ananunes1807@gmail.com'
    )
    or (
      public.normalize_app_role(role) = 'aluno'
      and exists (
        select 1
        from public.student_invites i
        where i.status = 'pendente'
          and lower(i.email) = lower(coalesce(email, auth.jwt() ->> 'email', ''))
      )
    )
  )
);

-- Refina leitura de alunos pelo vinculo trainer_students alem de students.personal_id.
drop policy if exists students_real_select on public.students;
create policy students_real_select
on public.students
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or (
    public.current_app_role() = 'personal'
    and status <> 'excluido'
    and (
      personal_id = public.current_app_profile_id()
      or id in (select student_id from public.trainer_students where trainer_id = public.current_app_profile_id() and status = 'ativo')
    )
  )
  or (public.current_app_role() = 'aluno' and auth_user_id = auth.uid() and status = 'ativo')
);
