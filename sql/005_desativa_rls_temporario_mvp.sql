-- SOLUCAO TEMPORARIA PARA MVP SEM LOGIN.
-- Execute no Supabase SQL Editor se o app ainda mostrar erros como:
-- "new row violates row-level security policy"
-- ou se editar/excluir nao funcionar.
--
-- ATENCAO: isto deixa as tabelas abaixo abertas para a anon/public key.
-- Use apenas no MVP enquanto ainda nao existe Supabase Auth.

alter table public.students disable row level security;
alter table public.assessments disable row level security;
alter table public.body_measurements disable row level security;
alter table public.workouts disable row level security;
alter table public.workout_exercises disable row level security;
alter table public.workout_logs disable row level security;
alter table public.exercise_library disable row level security;

grant select, insert, update, delete on public.students to anon;
grant select, insert, update, delete on public.assessments to anon;
grant select, insert, update, delete on public.body_measurements to anon;
grant select, insert, update, delete on public.workouts to anon;
grant select, insert, update, delete on public.workout_exercises to anon;
grant select, insert, update, delete on public.workout_logs to anon;
grant select, insert, update, delete on public.exercise_library to anon;
