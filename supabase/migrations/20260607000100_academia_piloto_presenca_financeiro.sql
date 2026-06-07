-- Alion Treinos - modulo Academia para piloto de 6 meses
-- Seguro para dados existentes: cria tabelas novas e adiciona colunas opcionais.

alter table if exists public.students
  add column if not exists academy_id uuid,
  add column if not exists academy_status text default 'independente';

alter table if exists public.app_profiles
  add column if not exists academy_id uuid,
  add column if not exists academy_link_status text default 'independente',
  add column if not exists independent_personal boolean default false;

create table if not exists public.academies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document text,
  phone text,
  whatsapp text,
  address text,
  responsible_name text,
  responsible_email text,
  plan_name text not null default 'Piloto 6 meses',
  pilot_start_date date default current_date,
  pilot_end_date date default (current_date + interval '6 months')::date,
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'arquivado', 'excluido')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academy_personal_links (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid references public.academies(id) on delete cascade,
  trainer_id uuid,
  trainer_user_id uuid default auth.uid(),
  academy_code text,
  responsible_email text,
  works_from_academy boolean not null default false,
  independent_personal boolean not null default false,
  status text not null default 'pendente' check (status in ('pendente', 'aprovado', 'recusado', 'cancelado')),
  notes text,
  created_by uuid default auth.uid(),
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academy_attendance (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid references public.academies(id) on delete set null,
  student_id uuid references public.students(id) on delete cascade,
  checkin_at timestamptz,
  checkout_at timestamptz,
  registered_by uuid default auth.uid(),
  observation text,
  status text not null default 'aberto' check (status in ('aberto', 'finalizado', 'cancelado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.academy_financials (
  id uuid primary key default gen_random_uuid(),
  academy_id uuid references public.academies(id) on delete set null,
  student_id uuid references public.students(id) on delete cascade,
  month_ref date not null default date_trunc('month', current_date)::date,
  monthly_value numeric(12,2) default 0,
  due_date date,
  status text not null default 'pendente' check (status in ('pago', 'pendente', 'atrasado')),
  payment_method text,
  paid_at date,
  observation text,
  registered_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_students_academy_id on public.students(academy_id);
create index if not exists idx_academy_links_trainer on public.academy_personal_links(trainer_id, trainer_user_id);
create index if not exists idx_academy_attendance_student_date on public.academy_attendance(student_id, checkin_at);
create index if not exists idx_academy_financials_student_month on public.academy_financials(student_id, month_ref);

alter table public.academies enable row level security;
alter table public.academy_personal_links enable row level security;
alter table public.academy_attendance enable row level security;
alter table public.academy_financials enable row level security;

revoke all on table public.academies from anon;
revoke all on table public.academy_personal_links from anon;
revoke all on table public.academy_attendance from anon;
revoke all on table public.academy_financials from anon;

grant select, insert, update on table public.academies to authenticated;
grant select, insert, update on table public.academy_personal_links to authenticated;
grant select, insert, update on table public.academy_attendance to authenticated;
grant select, insert, update on table public.academy_financials to authenticated;

drop policy if exists academies_read_by_role on public.academies;
create policy academies_read_by_role
on public.academies
for select
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or created_by = auth.uid()
  or exists (
    select 1 from public.app_profiles ap
    where ap.user_id = auth.uid()
      and ap.academy_id = academies.id
  )
  or exists (
    select 1 from public.academy_personal_links apl
    where apl.academy_id = academies.id
      and apl.status = 'aprovado'
      and (apl.trainer_user_id = auth.uid() or apl.trainer_id = public.current_app_profile_id())
  )
);

drop policy if exists academies_write_admin_or_owner on public.academies;
create policy academies_write_admin_or_owner
on public.academies
for all
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or created_by = auth.uid()
)
with check (
  public.current_app_role() = 'admin_ti'
  or public.current_app_role() = 'gestor_academia'
);

drop policy if exists academy_links_read_related on public.academy_personal_links;
create policy academy_links_read_related
on public.academy_personal_links
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or trainer_user_id = auth.uid()
  or trainer_id = public.current_app_profile_id()
);

drop policy if exists academy_links_create_trainer on public.academy_personal_links;
create policy academy_links_create_trainer
on public.academy_personal_links
for insert
to authenticated
with check (
  public.current_app_role() in ('admin_ti', 'gestor_academia', 'personal')
  and (trainer_user_id = auth.uid() or public.current_app_role() in ('admin_ti', 'gestor_academia'))
);

drop policy if exists academy_links_update_owner_admin on public.academy_personal_links;
create policy academy_links_update_owner_admin
on public.academy_personal_links
for update
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or trainer_user_id = auth.uid()
)
with check (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or trainer_user_id = auth.uid()
);

drop policy if exists academy_attendance_access on public.academy_attendance;
create policy academy_attendance_access
on public.academy_attendance
for all
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or exists (
    select 1 from public.app_profiles ap
    where ap.user_id = auth.uid()
      and ap.academy_id = academy_attendance.academy_id
  )
  or exists (
    select 1 from public.students s
    where s.id = academy_attendance.student_id
      and (
        s.auth_user_id = auth.uid()
        or s.personal_id = public.current_app_profile_id()
        or s.trainer_id = public.current_app_profile_id()
        or s.academy_id = academy_attendance.academy_id
      )
  )
)
with check (
  public.current_app_role() in ('admin_ti', 'gestor_academia', 'personal')
);

drop policy if exists academy_financials_access on public.academy_financials;
create policy academy_financials_access
on public.academy_financials
for all
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or exists (
    select 1 from public.app_profiles ap
    where ap.user_id = auth.uid()
      and ap.academy_id = academy_financials.academy_id
  )
  or exists (
    select 1 from public.students s
    where s.id = academy_financials.student_id
      and (s.personal_id = public.current_app_profile_id() or s.trainer_id = public.current_app_profile_id())
  )
)
with check (
  public.current_app_role() in ('admin_ti', 'gestor_academia', 'personal')
);
