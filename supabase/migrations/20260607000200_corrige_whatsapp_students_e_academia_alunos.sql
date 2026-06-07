-- Alion Treinos - correcao whatsapp em students e suporte a alunos da academia
-- Seguro para dados existentes.

alter table if exists public.students
  add column if not exists whatsapp text,
  add column if not exists contact text;

comment on column public.students.whatsapp is
  'WhatsApp do aluno. Opcional; mantem compatibilidade com phone/telefone.';

comment on column public.students.contact is
  'Contato alternativo do aluno. Opcional.';

drop policy if exists students_academy_insert_pilot on public.students;
create policy students_academy_insert_pilot
on public.students
for insert
to authenticated
with check (
  public.current_app_role() = 'admin_ti'
  or public.current_app_role() = 'gestor_academia'
  or public.current_app_role() = 'personal'
);

drop policy if exists students_academy_select_pilot on public.students;
create policy students_academy_select_pilot
on public.students
for select
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or auth_user_id = auth.uid()
  or personal_id = public.current_app_profile_id()
  or trainer_id = public.current_app_profile_id()
  or exists (
    select 1 from public.app_profiles ap
    where ap.user_id = auth.uid()
      and ap.academy_id = students.academy_id
  )
);

drop policy if exists students_academy_update_pilot on public.students;
create policy students_academy_update_pilot
on public.students
for update
to authenticated
using (
  public.current_app_role() = 'admin_ti'
  or personal_id = public.current_app_profile_id()
  or trainer_id = public.current_app_profile_id()
  or exists (
    select 1 from public.app_profiles ap
    where ap.user_id = auth.uid()
      and ap.academy_id = students.academy_id
  )
)
with check (
  public.current_app_role() = 'admin_ti'
  or personal_id = public.current_app_profile_id()
  or trainer_id = public.current_app_profile_id()
  or exists (
    select 1 from public.app_profiles ap
    where ap.user_id = auth.uid()
      and ap.academy_id = students.academy_id
  )
);
