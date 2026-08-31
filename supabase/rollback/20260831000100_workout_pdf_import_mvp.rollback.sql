-- Rollback seguro da importacao por PDF.
-- Desabilita novas confirmacoes sem remover colunas, treinos importados ou auditorias existentes.

begin;

revoke all on function public.alion_confirm_workout_import(uuid, jsonb, text)
  from public, anon, authenticated;
drop function if exists public.alion_confirm_workout_import(uuid, jsonb, text);

drop policy if exists alion_workout_imports_select on public.workout_imports;
revoke all on table public.workout_imports from public, anon, authenticated;

comment on table public.workout_imports is
  'Importacao por PDF desabilitada por rollback; dados preservados para historico e rastreabilidade.';

commit;

