-- Alion Treinos - exclusao logica por Personal com motivo e exclusao definitiva por Admin TI
-- Seguro para dados existentes: adiciona colunas opcionais, ajusta policies e cria RPC administrativa.

alter table if exists public.students
  add column if not exists exclusion_reason text,
  add column if not exists deletion_reason text,
  add column if not exists motivo_exclusao text,
  add column if not exists exclusion_requested_by uuid,
  add column if not exists excluded_by uuid,
  add column if not exists exclusion_requested_at timestamptz,
  add column if not exists excluded_at timestamptz;

comment on column public.students.exclusion_reason is
  'Motivo informado pelo Personal/Admin ao marcar o aluno como excluido.';

drop policy if exists students_real_update on public.students;
create policy students_real_update
on public.students
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or trainer_id = public.current_app_profile_id()
    )
  )
  or (
    public.current_app_role() = 'aluno'
    and auth_user_id = auth.uid()
  )
)
with check (
  public.current_app_role() = 'admin_ti'
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or trainer_id = public.current_app_profile_id()
    )
    and (
      status <> 'excluido'
      or coalesce(exclusion_reason, deletion_reason, motivo_exclusao, '') <> ''
    )
  )
  or (
    public.current_app_role() = 'aluno'
    and auth_user_id = auth.uid()
    and status = 'ativo'
  )
);

drop policy if exists students_secure_update on public.students;
create policy students_secure_update
on public.students
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or trainer_id = public.current_app_profile_id()
    )
  )
  or (
    public.current_app_role() = 'aluno'
    and auth_user_id = auth.uid()
  )
)
with check (
  public.current_app_role() = 'admin_ti'
  or (
    public.current_app_role() = 'personal'
    and (
      personal_id = public.current_app_profile_id()
      or trainer_id = public.current_app_profile_id()
    )
    and (
      status <> 'excluido'
      or coalesce(exclusion_reason, deletion_reason, motivo_exclusao, '') <> ''
    )
  )
  or (
    public.current_app_role() = 'aluno'
    and auth_user_id = auth.uid()
    and status = 'ativo'
  )
);

create or replace function public.admin_delete_student_permanently(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  workout_ids uuid[];
begin
  perform public.ensure_admin_ti();

  select coalesce(array_agg(id), array[]::uuid[])
  into workout_ids
  from public.workouts
  where student_id = target_student_id;

  delete from public.workout_logs
  where student_id = target_student_id
     or workout_id = any(workout_ids);

  delete from public.workout_exercises
  where workout_id = any(workout_ids);

  delete from public.assessments
  where student_id = target_student_id;

  delete from public.body_measurements
  where student_id = target_student_id;

  delete from public.trainer_students
  where student_id = target_student_id;

  delete from public.student_invites
  where student_id = target_student_id;

  delete from public.workouts
  where student_id = target_student_id;

  delete from public.students
  where id = target_student_id;

  perform public.admin_log_action('delete_student_permanently', 'students', target_student_id, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_delete_student_permanently(uuid) to authenticated;
