-- Alion Treinos v46
-- Migração ADITIVA. Não executar sem revisar em ambiente de homologação.
-- Finalidade: enriquecer instruções da biblioteca e permitir substitutos
-- definidos pelo personal. Feedbacks continuam no exercises_snapshot privado
-- de workout_logs, evitando uma tabela pública com informações de dor.

alter table if exists public.exercise_library
  add column if not exists observations text,
  add column if not exists posture text,
  add column if not exists breathing text,
  add column if not exists care_notes text;

create table if not exists public.exercise_substitutes (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid references public.students(id) on delete cascade,
  exercise_id uuid not null references public.exercise_library(id) on delete cascade,
  substitute_exercise_id uuid not null references public.exercise_library(id) on delete cascade,
  reason_type text not null check (reason_type in ('comum', 'equipamento', 'limitacao_individual')),
  notes text,
  created_at timestamptz not null default now(),
  constraint exercise_substitute_different check (exercise_id <> substitute_exercise_id)
);

alter table public.exercise_substitutes enable row level security;

drop policy if exists exercise_substitutes_personal_admin_manage on public.exercise_substitutes;
create policy exercise_substitutes_personal_admin_manage
on public.exercise_substitutes
for all
to authenticated
using (
  trainer_id = auth.uid()
  or public.current_app_role() = 'admin_ti'
)
with check (
  trainer_id = auth.uid()
  or public.current_app_role() = 'admin_ti'
);

drop policy if exists exercise_substitutes_student_read_assigned on public.exercise_substitutes;
create policy exercise_substitutes_student_read_assigned
on public.exercise_substitutes
for select
to authenticated
using (
  student_id is not null
  and exists (
    select 1
    from public.students s
    where s.id = exercise_substitutes.student_id
      and (
        s.user_id = auth.uid()
        or lower(coalesce(s.email, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
      )
  )
);

comment on table public.exercise_substitutes is
  'Alternativas cadastradas pelo personal. O aluno apenas visualiza alternativas atribuídas ao próprio cadastro.';

