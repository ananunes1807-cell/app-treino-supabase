-- Alion Treinos / app-treino-supabase
-- Permite cadastro tradicional pelo Supabase Auth e criacao do proprio perfil.
-- Rode no Supabase SQL Editor depois do arquivo 007_auth_roles_real_use.sql.

grant select, insert, update on public.app_profiles to authenticated;

drop policy if exists app_profiles_self_signup_insert on public.app_profiles;
create policy app_profiles_self_signup_insert
on public.app_profiles
for insert
to authenticated
with check (
  user_id = auth.uid()
  and (
    role in ('aluno', 'personal')
    or (
      role in ('admin', 'admin_ti')
      and lower(coalesce(email, auth.jwt() ->> 'email', '')) = 'ananunes1807@gmail.com'
    )
  )
);

drop policy if exists app_profiles_self_update_basic on public.app_profiles;
create policy app_profiles_self_update_basic
on public.app_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and (
    role in ('aluno', 'personal')
    or (
      role in ('admin', 'admin_ti')
      and lower(coalesce(email, auth.jwt() ->> 'email', '')) = 'ananunes1807@gmail.com'
    )
  )
);
