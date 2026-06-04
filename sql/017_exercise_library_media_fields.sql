-- GymPulse / app-treino-supabase
-- Campos opcionais para enriquecer a biblioteca de exercicios.
-- Nao altera RLS: exercise_library continua publica apenas para leitura via anon.

alter table public.exercise_library
  add column if not exists image_url text,
  add column if not exists video_url text,
  add column if not exists instructions text,
  add column if not exists common_mistakes text;

drop policy if exists exercise_library_secure_admin_write on public.exercise_library;
drop policy if exists exercise_library_secure_admin_personal_write on public.exercise_library;
create policy exercise_library_secure_admin_personal_write
on public.exercise_library
for all
to authenticated
using (public.current_app_role() in ('admin_ti', 'personal'))
with check (public.current_app_role() in ('admin_ti', 'personal'));
