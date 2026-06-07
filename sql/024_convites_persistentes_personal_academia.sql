-- Alion Treinos - convites persistentes para Personal e Academia
-- Seguro para dados existentes: nao apaga convites antigos.

alter table if exists public.student_invites
  add column if not exists updated_at timestamptz default now(),
  add column if not exists canceled_at timestamptz,
  add column if not exists canceled_by uuid;

create index if not exists idx_student_invites_student_status
on public.student_invites(student_id, status);

create index if not exists idx_student_invites_trainer_status
on public.student_invites(trainer_id, status);

drop policy if exists student_invites_persistent_insert on public.student_invites;
create policy student_invites_persistent_insert
on public.student_invites
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or (
    public.current_app_role() in ('personal', 'gestor_academia')
    and trainer_id = public.current_app_profile_id()
  )
);

drop policy if exists student_invites_persistent_read on public.student_invites;
create policy student_invites_persistent_read
on public.student_invites
for select
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or lower(email) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1
    from public.students s
    join public.app_profiles ap on ap.user_id = auth.uid()
    where s.id = student_invites.student_id
      and ap.academy_id = s.academy_id
  )
);

drop policy if exists student_invites_persistent_update on public.student_invites;
create policy student_invites_persistent_update
on public.student_invites
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or lower(email) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1
    from public.students s
    join public.app_profiles ap on ap.user_id = auth.uid()
    where s.id = student_invites.student_id
      and ap.academy_id = s.academy_id
  )
)
with check (
  public.current_app_role() = 'admin_ti'
  or trainer_id = public.current_app_profile_id()
  or lower(email) = lower(auth.jwt() ->> 'email')
  or exists (
    select 1
    from public.students s
    join public.app_profiles ap on ap.user_id = auth.uid()
    where s.id = student_invites.student_id
      and ap.academy_id = s.academy_id
  )
);
