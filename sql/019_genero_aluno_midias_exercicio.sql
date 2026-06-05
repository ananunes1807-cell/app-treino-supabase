-- Alion Treinos - genero do aluno e midias por genero nos exercicios
-- Migration segura: apenas adiciona colunas opcionais, sem apagar dados existentes.

alter table if exists public.students
  add column if not exists genero text;

alter table if exists public.exercise_library
  add column if not exists image_url_masculino text,
  add column if not exists image_url_feminino text,
  add column if not exists video_url_masculino text,
  add column if not exists video_url_feminino text;

comment on column public.students.genero is
  'Genero informado pelo aluno: masculino, feminino, nao_binario, prefiro_nao_informar ou outro.';

comment on column public.exercise_library.image_url_masculino is
  'Imagem demonstrativa masculina do exercicio. Opcional; usa image_url como fallback.';

comment on column public.exercise_library.image_url_feminino is
  'Imagem demonstrativa feminina do exercicio. Opcional; usa image_url como fallback.';

comment on column public.exercise_library.video_url_masculino is
  'Video demonstrativo masculino do exercicio. Opcional; usa video_url como fallback.';

comment on column public.exercise_library.video_url_feminino is
  'Video demonstrativo feminino do exercicio. Opcional; usa video_url como fallback.';
