-- GymPulse / app-treino-supabase
-- Adiciona controle de status dos treinos para separar Aluno, Personal e Admin TI.
-- Rode este arquivo no Supabase SQL Editor.

alter table public.workouts
add column if not exists status text not null default 'ativo';

update public.workouts
set status = case
  when lower(coalesce(status, '')) in ('active', 'ativo') then 'ativo'
  when lower(coalesce(status, '')) in ('archived', 'arquivado') then 'arquivado'
  when lower(coalesce(status, '')) in ('draft', 'rascunho', 'not_done', 'incomplete') then 'rascunho'
  when lower(coalesce(status, '')) in ('deleted', 'excluido') then 'excluido'
  else 'ativo'
end;

alter table public.workouts
drop constraint if exists workouts_status_check;

alter table public.workouts
add constraint workouts_status_check
check (status in ('ativo', 'arquivado', 'rascunho', 'excluido'));

create index if not exists workouts_student_status_idx
on public.workouts (student_id, status);
