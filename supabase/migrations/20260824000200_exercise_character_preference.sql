-- Alion Treinos - preferencia visual dos personagens dos exercicios.
-- Migration aditiva. Nao altera identidade de genero nem abre UPDATE amplo.

alter table public.students
add column if not exists exercise_character_preference text;

alter table public.students
drop constraint if exists students_exercise_character_preference_check;

alter table public.students
add constraint students_exercise_character_preference_check
check (
  exercise_character_preference is null
  or exercise_character_preference in ('masculine', 'feminine', 'random')
);

create or replace function public.update_my_exercise_character_preference(selected_preference text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_preference text := lower(trim(coalesce(selected_preference, '')));
  updated_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Autenticacao obrigatoria.';
  end if;

  if normalized_preference not in ('masculine', 'feminine', 'random') then
    raise exception 'Preferencia visual invalida.';
  end if;

  perform set_config('alion.trusted_profile_update', 'on', true);

  update public.students student
  set exercise_character_preference = normalized_preference,
      updated_at = now()
  where (student.auth_user_id = auth.uid() or student.profile_id = auth.uid())
    and exists (
      select 1
      from public.app_profiles profile
      where profile.user_id = auth.uid()
        and profile.student_id = student.id
        and lower(coalesce(profile.role, '')) in ('aluno', 'student')
    );

  get diagnostics updated_count = row_count;
  perform set_config('alion.trusted_profile_update', 'off', true);

  if updated_count <> 1 then
    raise exception 'Perfil de aluno vinculado nao encontrado.';
  end if;

  return normalized_preference;
exception
  when others then
    perform set_config('alion.trusted_profile_update', 'off', true);
    raise;
end;
$$;

revoke all on function public.update_my_exercise_character_preference(text) from public, anon;
grant execute on function public.update_my_exercise_character_preference(text) to authenticated;
