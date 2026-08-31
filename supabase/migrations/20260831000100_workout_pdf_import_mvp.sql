-- Alion Treinos: importacao transacional de treinos a partir de PDF textual.
-- Migration aditiva: nao remove nem reescreve treinos, exercicios ou historicos existentes.

alter table public.workouts
  add column if not exists version_group_id uuid,
  add column if not exists version_number integer,
  add column if not exists supersedes_workout_id uuid,
  add column if not exists source_type text,
  add column if not exists import_id uuid,
  add column if not exists day_label text;

alter table public.workout_exercises
  add column if not exists exercise_library_id uuid,
  add column if not exists original_exercise_name text,
  add column if not exists equipment text,
  add column if not exists cadence text,
  add column if not exists duration_text text,
  add column if not exists adaptation_notes text,
  add column if not exists progression_notes text,
  add column if not exists source_page integer;

create table if not exists public.workout_imports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  trainer_id uuid not null references public.app_profiles(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  source_type text not null default 'pdf_text' check (source_type = 'pdf_text'),
  conflict_strategy text not null check (conflict_strategy in ('new_version', 'create_new', 'replace')),
  page_count integer not null check (page_count between 1 and 40),
  workout_count integer not null check (workout_count between 1 and 10),
  exercise_count integer not null check (exercise_count between 0 and 200),
  schema_version integer not null default 1 check (schema_version = 1),
  confirmed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.workout_imports enable row level security;
revoke all on table public.workout_imports from public, anon, authenticated;
grant select on table public.workout_imports to authenticated;

drop policy if exists alion_workout_imports_select on public.workout_imports;
create policy alion_workout_imports_select
on public.workout_imports for select to authenticated
using (
  public.is_current_admin_ti()
  or (
    public.current_app_role() = 'personal'
    and trainer_id = public.current_app_profile_id()
  )
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'workouts_supersedes_workout_id_fkey'
      and conrelid = 'public.workouts'::regclass
  ) then
    alter table public.workouts
      add constraint workouts_supersedes_workout_id_fkey
      foreign key (supersedes_workout_id) references public.workouts(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workouts_import_id_fkey'
      and conrelid = 'public.workouts'::regclass
  ) then
    alter table public.workouts
      add constraint workouts_import_id_fkey
      foreign key (import_id) references public.workout_imports(id) on delete restrict;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_exercises_exercise_library_id_fkey'
      and conrelid = 'public.workout_exercises'::regclass
  ) then
    alter table public.workout_exercises
      add constraint workout_exercises_exercise_library_id_fkey
      foreign key (exercise_library_id) references public.exercise_library(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workouts_version_number_check'
      and conrelid = 'public.workouts'::regclass
  ) then
    alter table public.workouts
      add constraint workouts_version_number_check
      check (version_number is null or version_number >= 1);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workouts_source_type_check'
      and conrelid = 'public.workouts'::regclass
  ) then
    alter table public.workouts
      add constraint workouts_source_type_check
      check (source_type is null or source_type in ('manual', 'pdf_import'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'workout_exercises_source_page_check'
      and conrelid = 'public.workout_exercises'::regclass
  ) then
    alter table public.workout_exercises
      add constraint workout_exercises_source_page_check
      check (source_page is null or source_page between 1 and 40);
  end if;
end $$;

create index if not exists idx_workouts_version_group
  on public.workouts(version_group_id, version_number);
create index if not exists idx_workouts_import_id
  on public.workouts(import_id);
create index if not exists idx_workout_exercises_library_id
  on public.workout_exercises(exercise_library_id);
create index if not exists idx_workout_imports_owner
  on public.workout_imports(trainer_id, student_id, created_at desc);

create or replace function public.alion_confirm_workout_import(
  target_student_id uuid,
  import_payload jsonb,
  conflict_strategy text default 'new_version'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_user_id uuid := auth.uid();
  actor_profile_id uuid := public.current_app_profile_id();
  normalized_strategy text := lower(btrim(coalesce(conflict_strategy, '')));
  payload_workouts jsonb;
  workout_payload jsonb;
  exercise_payload jsonb;
  active_workouts public.workouts[];
  previous_workout public.workouts;
  created_workout public.workouts;
  created_import_id uuid;
  created_workout_ids uuid[] := array[]::uuid[];
  workout_position integer := 0;
  exercise_position integer;
  workout_count integer;
  exercise_count integer := 0;
  page_count integer;
  schema_version integer;
  parsed_library_id uuid;
  parsed_sets integer;
  parsed_rest integer;
  parsed_page integer;
  next_group_id uuid;
  next_version integer;
  workout_name text;
  original_name text;
begin
  if actor_user_id is null
     or actor_profile_id is null
     or public.current_app_role() <> 'personal' then
    raise exception 'Apenas Personal ativo pode confirmar importacao de treino.';
  end if;

  if target_student_id is null or not exists (
    select 1
    from public.students student
    where student.id = target_student_id
      and student.deleted_at is null
      and coalesce(student.personal_id, student.trainer_id) = actor_profile_id
  ) then
    raise exception 'Aluno nao pertence ao Personal autenticado.';
  end if;

  if normalized_strategy not in ('new_version', 'create_new', 'replace') then
    raise exception 'Estrategia de conflito invalida.';
  end if;

  if jsonb_typeof(import_payload) <> 'object' then
    raise exception 'Payload de importacao invalido.';
  end if;

  schema_version := nullif(import_payload ->> 'schema_version', '')::integer;
  page_count := nullif(import_payload #>> '{source,page_count}', '')::integer;
  payload_workouts := import_payload -> 'workouts';

  if schema_version is distinct from 1 then
    raise exception 'Versao do contrato de importacao nao suportada.';
  end if;
  if page_count is null or page_count not between 1 and 40 then
    raise exception 'Quantidade de paginas invalida.';
  end if;
  if jsonb_typeof(payload_workouts) <> 'array' then
    raise exception 'Lista de treinos invalida.';
  end if;

  workout_count := jsonb_array_length(payload_workouts);
  if workout_count not between 1 and 10 then
    raise exception 'A importacao deve conter entre 1 e 10 treinos.';
  end if;

  for workout_payload in select value from jsonb_array_elements(payload_workouts)
  loop
    if jsonb_typeof(workout_payload) <> 'object'
       or jsonb_typeof(workout_payload -> 'exercises') <> 'array' then
      raise exception 'Estrutura de treino invalida.';
    end if;
    exercise_count := exercise_count + jsonb_array_length(workout_payload -> 'exercises');
  end loop;

  if exercise_count > 200 then
    raise exception 'A importacao excede o limite de 200 exercicios.';
  end if;

  select coalesce(array_agg(workout order by workout.created_at, workout.id), array[]::public.workouts[])
  into active_workouts
  from public.workouts workout
  where workout.student_id = target_student_id
    and workout.deleted_at is null
    and lower(coalesce(workout.status, 'ativo')) = 'ativo'
    and coalesce(workout.personal_id, workout.trainer_id) = actor_profile_id;

  insert into public.workout_imports (
    student_id, trainer_id, created_by, conflict_strategy,
    page_count, workout_count, exercise_count, schema_version
  ) values (
    target_student_id, actor_profile_id, actor_user_id, normalized_strategy,
    page_count, workout_count, exercise_count, schema_version
  ) returning id into created_import_id;

  if normalized_strategy in ('new_version', 'replace') and cardinality(active_workouts) > 0 then
    update public.workouts
    set status = 'arquivado', active = false
    where id = any(array(select active_row.id from unnest(active_workouts) active_row));
  end if;

  for workout_payload in select value from jsonb_array_elements(payload_workouts)
  loop
    workout_position := workout_position + 1;
    workout_name := btrim(coalesce(workout_payload ->> 'name', ''));
    if workout_name = '' or length(workout_name) > 160 then
      raise exception 'Nome do treino % e invalido.', workout_position;
    end if;

    if length(coalesce(workout_payload ->> 'day_label', '')) > 80
       or length(coalesce(workout_payload ->> 'objective', '')) > 500
       or length(coalesce(workout_payload ->> 'notes', '')) > 4000 then
      raise exception 'Campos textuais do treino % excedem o limite.', workout_position;
    end if;

    previous_workout := null;
    if normalized_strategy in ('new_version', 'replace')
       and workout_position <= cardinality(active_workouts) then
      previous_workout := active_workouts[workout_position];
    end if;

    if normalized_strategy = 'new_version' and previous_workout.id is not null then
      next_group_id := coalesce(previous_workout.version_group_id, previous_workout.id);
      next_version := coalesce(previous_workout.version_number, 1) + 1;
    else
      next_group_id := gen_random_uuid();
      next_version := 1;
    end if;

    insert into public.workouts (
      student_id, name, objective, notes, day_label, status, active,
      personal_id, trainer_id, created_by, version_group_id, version_number,
      supersedes_workout_id, source_type, import_id
    ) values (
      target_student_id,
      workout_name,
      nullif(btrim(coalesce(workout_payload ->> 'objective', '')), ''),
      nullif(btrim(coalesce(workout_payload ->> 'notes', '')), ''),
      nullif(btrim(coalesce(workout_payload ->> 'day_label', '')), ''),
      'ativo', true,
      actor_profile_id, actor_profile_id, actor_user_id,
      next_group_id, next_version, previous_workout.id, 'pdf_import', created_import_id
    ) returning * into created_workout;

    created_workout_ids := array_append(created_workout_ids, created_workout.id);
    exercise_position := 0;

    for exercise_payload in
      select value from jsonb_array_elements(workout_payload -> 'exercises')
    loop
      exercise_position := exercise_position + 1;
      if jsonb_typeof(exercise_payload) <> 'object' then
        raise exception 'Exercicio % do treino % e invalido.', exercise_position, workout_position;
      end if;

      original_name := btrim(coalesce(exercise_payload ->> 'original_name', ''));
      if original_name = '' or length(original_name) > 240 then
        raise exception 'Nome original do exercicio % do treino % e invalido.', exercise_position, workout_position;
      end if;

      begin
        parsed_library_id := nullif(exercise_payload ->> 'exercise_library_id', '')::uuid;
        parsed_sets := nullif(exercise_payload ->> 'sets', '')::integer;
        parsed_rest := nullif(exercise_payload ->> 'rest_seconds', '')::integer;
        parsed_page := nullif(exercise_payload ->> 'source_page', '')::integer;
      exception when invalid_text_representation or numeric_value_out_of_range then
        raise exception 'Campo numerico ou UUID invalido no exercicio % do treino %.', exercise_position, workout_position;
      end;

      if parsed_library_id is not null and not exists (
        select 1 from public.exercise_library library where library.id = parsed_library_id
      ) then
        raise exception 'Exercicio da biblioteca nao encontrado no item % do treino %.', exercise_position, workout_position;
      end if;
      if parsed_sets is not null and parsed_sets not between 1 and 100 then
        raise exception 'Series invalidas no exercicio % do treino %.', exercise_position, workout_position;
      end if;
      if parsed_rest is not null and parsed_rest not between 0 and 86400 then
        raise exception 'Descanso invalido no exercicio % do treino %.', exercise_position, workout_position;
      end if;
      if parsed_page is not null and parsed_page not between 1 and page_count then
        raise exception 'Pagina de origem invalida no exercicio % do treino %.', exercise_position, workout_position;
      end if;
      if length(coalesce(exercise_payload ->> 'reps', '')) > 50
         or length(coalesce(exercise_payload ->> 'weight', '')) > 80
         or length(coalesce(exercise_payload ->> 'equipment', '')) > 160
         or length(coalesce(exercise_payload ->> 'cadence', '')) > 80
         or length(coalesce(exercise_payload ->> 'duration_text', '')) > 80
         or length(coalesce(exercise_payload ->> 'instructions', '')) > 4000
         or length(coalesce(exercise_payload ->> 'adaptation_notes', '')) > 2000
         or length(coalesce(exercise_payload ->> 'progression_notes', '')) > 2000 then
        raise exception 'Campo textual excede o limite no exercicio % do treino %.', exercise_position, workout_position;
      end if;

      insert into public.workout_exercises (
        workout_id, exercise_name, exercise_library_id, original_exercise_name,
        sets, reps, weight, rest_seconds, instructions, order_number,
        equipment, cadence, duration_text, adaptation_notes,
        progression_notes, source_page
      ) values (
        created_workout.id,
        coalesce(
          (select library.name from public.exercise_library library where library.id = parsed_library_id),
          original_name
        ),
        parsed_library_id,
        original_name,
        parsed_sets,
        nullif(btrim(coalesce(exercise_payload ->> 'reps', '')), ''),
        nullif(btrim(coalesce(exercise_payload ->> 'weight', '')), ''),
        parsed_rest,
        nullif(btrim(coalesce(exercise_payload ->> 'instructions', '')), ''),
        exercise_position,
        nullif(btrim(coalesce(exercise_payload ->> 'equipment', '')), ''),
        nullif(btrim(coalesce(exercise_payload ->> 'cadence', '')), ''),
        nullif(btrim(coalesce(exercise_payload ->> 'duration_text', '')), ''),
        nullif(btrim(coalesce(exercise_payload ->> 'adaptation_notes', '')), ''),
        nullif(btrim(coalesce(exercise_payload ->> 'progression_notes', '')), ''),
        parsed_page
      );
    end loop;
  end loop;

  insert into public.manutencao_logs (admin_id, acao, tabela_afetada, registro_id, detalhes)
  values (
    null,
    'workout_pdf_import_confirmed',
    'workout_imports',
    created_import_id,
    jsonb_build_object(
      'actor_user_id', actor_user_id,
      'trainer_profile_id', actor_profile_id,
      'student_id', target_student_id,
      'strategy', normalized_strategy,
      'workout_count', workout_count,
      'exercise_count', exercise_count
    )
  );

  return jsonb_build_object(
    'status', 'success',
    'import_id', created_import_id,
    'workout_ids', to_jsonb(created_workout_ids),
    'workout_count', workout_count,
    'exercise_count', exercise_count
  );
end;
$$;

revoke all on function public.alion_confirm_workout_import(uuid, jsonb, text)
  from public, anon;
grant execute on function public.alion_confirm_workout_import(uuid, jsonb, text)
  to authenticated;

comment on function public.alion_confirm_workout_import(uuid, jsonb, text) is
  'Confirma atomicamente um rascunho local de importacao PDF. Exclusiva para Personal ativo e aluno proprio.';

