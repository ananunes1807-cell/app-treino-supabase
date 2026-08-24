-- Alion Treinos - campos canonicos de treino e observacoes do aluno.
-- Migration estritamente aditiva: preserva dados, RLS, policies, triggers e grants atuais.

alter table public.workouts
  add column if not exists name text,
  add column if not exists objective text,
  add column if not exists notes text;

alter table public.students
  add column if not exists objective text,
  add column if not exists notes text;

-- Nao ha GRANT ou policy aqui de proposito. As permissoes autenticadas e o ownership
-- Personal -> Aluno continuam sendo definidos pelas migrations de seguranca existentes.
