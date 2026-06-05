-- Alion Treinos / app-treino-supabase
-- Correcoes de exclusao depois do fluxo real de roles.
-- Rode no Supabase SQL Editor depois do arquivo 012.

create or replace function public.admin_clear_student_assessments(target_student_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_admin_ti();

  delete from public.assessments
  where student_id = target_student_id;

  perform public.admin_log_action('clear_student_assessments', 'assessments', target_student_id, '{}'::jsonb);
end;
$$;

grant execute on function public.admin_clear_student_assessments(uuid) to authenticated;

drop policy if exists assessments_real_delete_admin on public.assessments;
create policy assessments_real_delete_admin_personal
on public.assessments
for delete
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or student_id in (
    select id
    from public.students
    where personal_id = public.current_app_profile_id()
  )
  or student_id in (
    select student_id
    from public.trainer_students
    where trainer_id = public.current_app_profile_id()
      and status = 'ativo'
  )
);

drop policy if exists body_measurements_real_delete_admin on public.body_measurements;
create policy body_measurements_real_delete_admin_personal
on public.body_measurements
for delete
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or student_id in (
    select id
    from public.students
    where personal_id = public.current_app_profile_id()
  )
  or student_id in (
    select student_id
    from public.trainer_students
    where trainer_id = public.current_app_profile_id()
      and status = 'ativo'
  )
);

drop policy if exists workout_exercises_real_write_admin_personal on public.workout_exercises;
create policy workout_exercises_real_write_admin_personal
on public.workout_exercises
for all
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or workout_id in (
    select id
    from public.workouts
    where personal_id = public.current_app_profile_id()
  )
)
with check (
  public.current_app_role() = 'admin_ti'
  or workout_id in (
    select id
    from public.workouts
    where personal_id = public.current_app_profile_id()
  )
);
