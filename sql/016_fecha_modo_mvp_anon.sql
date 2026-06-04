-- GymPulse / app-treino-supabase
-- Fecha o modo MVP/anon para dados sensiveis.
-- Rode depois de 015_trava_admin_ti_principal.sql.

do $$
declare
  item record;
begin
  raise notice 'Policies mvp_anon existentes antes da limpeza:';
  for item in
    select schemaname, tablename, policyname, roles, cmd
    from pg_policies
    where schemaname = 'public'
      and policyname like 'mvp_anon_%'
    order by tablename, policyname
  loop
    raise notice '% %.% roles=% cmd=%', item.policyname, item.schemaname, item.tablename, item.roles, item.cmd;
  end loop;

  raise notice 'Grants anon existentes antes da limpeza:';
  for item in
    select table_schema, table_name, privilege_type
    from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name in (
        'students',
        'workouts',
        'workout_exercises',
        'workout_logs',
        'assessments',
        'body_measurements',
        'exercise_library'
      )
    order by table_name, privilege_type
  loop
    raise notice 'anon %.% privilege=%', item.table_schema, item.table_name, item.privilege_type;
  end loop;
end $$;

drop policy if exists mvp_anon_select_students on public.students;
drop policy if exists mvp_anon_insert_students on public.students;
drop policy if exists mvp_anon_update_students on public.students;
drop policy if exists mvp_anon_delete_students on public.students;
drop policy if exists mvp_anon_all_students on public.students;

drop policy if exists mvp_anon_select_workouts on public.workouts;
drop policy if exists mvp_anon_insert_workouts on public.workouts;
drop policy if exists mvp_anon_update_workouts on public.workouts;
drop policy if exists mvp_anon_delete_workouts on public.workouts;
drop policy if exists mvp_anon_all_workouts on public.workouts;

drop policy if exists mvp_anon_select_workout_exercises on public.workout_exercises;
drop policy if exists mvp_anon_insert_workout_exercises on public.workout_exercises;
drop policy if exists mvp_anon_update_workout_exercises on public.workout_exercises;
drop policy if exists mvp_anon_delete_workout_exercises on public.workout_exercises;
drop policy if exists mvp_anon_all_workout_exercises on public.workout_exercises;

drop policy if exists mvp_anon_select_workout_logs on public.workout_logs;
drop policy if exists mvp_anon_insert_workout_logs on public.workout_logs;
drop policy if exists mvp_anon_update_workout_logs on public.workout_logs;
drop policy if exists mvp_anon_delete_workout_logs on public.workout_logs;
drop policy if exists mvp_anon_all_workout_logs on public.workout_logs;

drop policy if exists mvp_anon_select_assessments on public.assessments;
drop policy if exists mvp_anon_insert_assessments on public.assessments;
drop policy if exists mvp_anon_update_assessments on public.assessments;
drop policy if exists mvp_anon_delete_assessments on public.assessments;
drop policy if exists mvp_anon_all_assessments on public.assessments;

drop policy if exists mvp_anon_select_body_measurements on public.body_measurements;
drop policy if exists mvp_anon_insert_body_measurements on public.body_measurements;
drop policy if exists mvp_anon_update_body_measurements on public.body_measurements;
drop policy if exists mvp_anon_delete_body_measurements on public.body_measurements;
drop policy if exists mvp_anon_all_body_measurements on public.body_measurements;

drop policy if exists mvp_anon_select_exercise_library on public.exercise_library;
drop policy if exists mvp_anon_insert_exercise_library on public.exercise_library;
drop policy if exists mvp_anon_update_exercise_library on public.exercise_library;
drop policy if exists mvp_anon_delete_exercise_library on public.exercise_library;
drop policy if exists mvp_anon_all_exercise_library on public.exercise_library;

revoke all on public.students from anon;
revoke all on public.workouts from anon;
revoke all on public.workout_exercises from anon;
revoke all on public.workout_logs from anon;
revoke all on public.assessments from anon;
revoke all on public.body_measurements from anon;
revoke all on public.exercise_library from anon;

alter table public.students enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_logs enable row level security;
alter table public.assessments enable row level security;
alter table public.body_measurements enable row level security;
alter table public.exercise_library enable row level security;
alter table public.student_invites enable row level security;

grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.workout_logs to authenticated;
grant select, insert, update, delete on public.assessments to authenticated;
grant select, insert, update, delete on public.body_measurements to authenticated;
grant select on public.exercise_library to anon, authenticated;
grant insert, update, delete on public.exercise_library to authenticated;

drop policy if exists students_secure_select on public.students;
create policy students_secure_select
on public.students
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or (
    public.current_app_role() = 'personal'
    and personal_id = public.current_app_profile_id()
    and status <> 'excluido'
  )
  or (
    public.current_app_role() = 'aluno'
    and auth_user_id = auth.uid()
    and status = 'ativo'
  )
);

drop policy if exists students_secure_insert on public.students;
create policy students_secure_insert
on public.students
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or (
    public.current_app_role() = 'personal'
    and personal_id = public.current_app_profile_id()
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
    and personal_id = public.current_app_profile_id()
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
    and personal_id = public.current_app_profile_id()
    and status <> 'excluido'
  )
  or (
    public.current_app_role() = 'aluno'
    and auth_user_id = auth.uid()
    and status = 'ativo'
  )
);

drop policy if exists students_secure_delete_admin on public.students;
create policy students_secure_delete_admin
on public.students
for delete
to authenticated
using (public.current_app_role() = 'admin_ti');

drop policy if exists workouts_secure_select on public.workouts;
create policy workouts_secure_select
on public.workouts
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or (
    public.current_app_role() = 'personal'
    and personal_id = public.current_app_profile_id()
  )
  or (
    public.current_app_role() = 'aluno'
    and status = 'ativo'
    and student_id in (
      select id from public.students
      where auth_user_id = auth.uid()
        and status = 'ativo'
    )
  )
);

drop policy if exists workouts_secure_write_admin_personal on public.workouts;
create policy workouts_secure_write_admin_personal
on public.workouts
for all
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or (
    public.current_app_role() = 'personal'
    and personal_id = public.current_app_profile_id()
  )
)
with check (
  public.current_app_role() = 'admin_ti'
  or (
    public.current_app_role() = 'personal'
    and personal_id = public.current_app_profile_id()
  )
);

drop policy if exists workout_exercises_secure_select on public.workout_exercises;
create policy workout_exercises_secure_select
on public.workout_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.workouts w
    where w.id = workout_id
      and (
        public.current_app_role() in ('admin_ti', 'gestor_academia')
        or (
          public.current_app_role() = 'personal'
          and w.personal_id = public.current_app_profile_id()
        )
        or (
          public.current_app_role() = 'aluno'
          and w.status = 'ativo'
          and w.student_id in (
            select id from public.students
            where auth_user_id = auth.uid()
              and status = 'ativo'
          )
        )
      )
  )
);

drop policy if exists workout_exercises_secure_write_admin_personal on public.workout_exercises;
create policy workout_exercises_secure_write_admin_personal
on public.workout_exercises
for all
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or exists (
    select 1
    from public.workouts w
    where w.id = workout_id
      and public.current_app_role() = 'personal'
      and w.personal_id = public.current_app_profile_id()
  )
)
with check (
  public.current_app_role() = 'admin_ti'
  or exists (
    select 1
    from public.workouts w
    where w.id = workout_id
      and public.current_app_role() = 'personal'
      and w.personal_id = public.current_app_profile_id()
  )
);

drop policy if exists workout_logs_secure_select on public.workout_logs;
create policy workout_logs_secure_select
on public.workout_logs
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or student_id in (
    select id from public.students
    where personal_id = public.current_app_profile_id()
  )
  or student_id in (
    select id from public.students
    where auth_user_id = auth.uid()
  )
);

drop policy if exists workout_logs_secure_insert_student on public.workout_logs;
create policy workout_logs_secure_insert_student
on public.workout_logs
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or student_id in (
    select id from public.students
    where auth_user_id = auth.uid()
      and status = 'ativo'
  )
  or (
    public.current_app_role() = 'personal'
    and student_id in (
      select id from public.students
      where personal_id = public.current_app_profile_id()
    )
  )
);

drop policy if exists workout_logs_secure_delete_admin on public.workout_logs;
create policy workout_logs_secure_delete_admin
on public.workout_logs
for delete
to authenticated
using (public.current_app_role() = 'admin_ti');

drop policy if exists assessments_secure_select on public.assessments;
create policy assessments_secure_select
on public.assessments
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or student_id in (
    select id from public.students
    where personal_id = public.current_app_profile_id()
  )
  or student_id in (
    select id from public.students
    where auth_user_id = auth.uid()
  )
);

drop policy if exists assessments_secure_write_admin_personal on public.assessments;
create policy assessments_secure_write_admin_personal
on public.assessments
for all
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or student_id in (
    select id from public.students
    where personal_id = public.current_app_profile_id()
  )
)
with check (
  public.current_app_role() = 'admin_ti'
  or student_id in (
    select id from public.students
    where personal_id = public.current_app_profile_id()
  )
);

drop policy if exists body_measurements_secure_select on public.body_measurements;
create policy body_measurements_secure_select
on public.body_measurements
for select
to authenticated
using (
  public.current_app_role() in ('admin_ti', 'gestor_academia')
  or student_id in (
    select id from public.students
    where personal_id = public.current_app_profile_id()
  )
  or student_id in (
    select id from public.students
    where auth_user_id = auth.uid()
  )
);

drop policy if exists body_measurements_secure_write_admin_personal on public.body_measurements;
create policy body_measurements_secure_write_admin_personal
on public.body_measurements
for all
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or student_id in (
    select id from public.students
    where personal_id = public.current_app_profile_id()
  )
)
with check (
  public.current_app_role() = 'admin_ti'
  or student_id in (
    select id from public.students
    where personal_id = public.current_app_profile_id()
  )
);

drop policy if exists exercise_library_public_select on public.exercise_library;
create policy exercise_library_public_select
on public.exercise_library
for select
to anon, authenticated
using (true);

drop policy if exists exercise_library_secure_admin_write on public.exercise_library;
create policy exercise_library_secure_admin_write
on public.exercise_library
for all
to authenticated
using (public.current_app_role() = 'admin_ti')
with check (public.current_app_role() = 'admin_ti');

do $$
declare
  item record;
begin
  raise notice 'Policies mvp_anon restantes depois da limpeza:';
  for item in
    select schemaname, tablename, policyname, roles, cmd
    from pg_policies
    where schemaname = 'public'
      and policyname like 'mvp_anon_%'
    order by tablename, policyname
  loop
    raise notice '% %.% roles=% cmd=%', item.policyname, item.schemaname, item.tablename, item.roles, item.cmd;
  end loop;

  raise notice 'Grants anon restantes em tabelas sensiveis depois da limpeza:';
  for item in
    select table_schema, table_name, privilege_type
    from information_schema.role_table_grants
    where grantee = 'anon'
      and table_schema = 'public'
      and table_name in (
        'students',
        'workouts',
        'workout_exercises',
        'workout_logs',
        'assessments',
        'body_measurements'
      )
    order by table_name, privilege_type
  loop
    raise notice 'anon %.% privilege=%', item.table_schema, item.table_name, item.privilege_type;
  end loop;
end $$;
