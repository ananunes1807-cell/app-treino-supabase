-- GymPulse / app-treino-supabase
-- Permite criar o primeiro Admin TI pelo proprio app.
-- Rode este script no Supabase SQL Editor depois do 007.

drop policy if exists app_profiles_bootstrap_first_admin on public.app_profiles;
create policy app_profiles_bootstrap_first_admin
on public.app_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and role in ('admin', 'admin_ti')
  and not exists (
    select 1
    from public.app_profiles existing
    where existing.role in ('admin', 'admin_ti')
  )
);
