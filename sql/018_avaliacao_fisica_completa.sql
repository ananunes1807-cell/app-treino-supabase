-- GymPulse / app-treino-supabase
-- Avaliacao fisica completa e perimetria de ficha de academia.
-- Migration segura: apenas adiciona campos opcionais e normaliza grupos da biblioteca.

alter table public.assessments
  add column if not exists objective text,
  add column if not exists objetivo text,
  add column if not exists assessment_date date,
  add column if not exists data_avaliacao date,
  add column if not exists reassessment_date date,
  add column if not exists data_reavaliacao date,
  add column if not exists professor_responsavel text,
  add column if not exists estatura_cm numeric,
  add column if not exists peso_ideal numeric,
  add column if not exists percentual_gordura_atual numeric,
  add column if not exists percentual_gordura_ideal numeric,
  add column if not exists pa_repouso text,
  add column if not exists fc_repouso numeric,
  add column if not exists icq numeric,
  add column if not exists zona_treino text,
  add column if not exists cardiopatia boolean default false,
  add column if not exists has_hipertensao boolean default false,
  add column if not exists diabetes boolean default false,
  add column if not exists labirintite boolean default false,
  add column if not exists endocrino boolean default false,
  add column if not exists cirurgia boolean default false,
  add column if not exists snc boolean default false,
  add column if not exists respiratorio boolean default false,
  add column if not exists tabagismo boolean default false,
  add column if not exists osteomioarticular boolean default false,
  add column if not exists outros text,
  add column if not exists torax_dobra numeric,
  add column if not exists axilar_media numeric,
  add column if not exists supra_iliaca numeric,
  add column if not exists abdomen_dobra numeric,
  add column if not exists coxa_dobra numeric,
  add column if not exists subescapular numeric,
  add column if not exists triceps numeric,
  add column if not exists biceps numeric,
  add column if not exists panturrilha_dobra numeric,
  add column if not exists protocolo text;

alter table public.body_measurements
  add column if not exists measurement_date date,
  add column if not exists torax numeric,
  add column if not exists braco_d numeric,
  add column if not exists braco_e numeric,
  add column if not exists antebraco_d numeric,
  add column if not exists antebraco_e numeric,
  add column if not exists coxa_d numeric,
  add column if not exists coxa_e numeric,
  add column if not exists panturrilha_d numeric,
  add column if not exists panturrilha_e numeric,
  add column if not exists bi_epicondilo numeric,
  add column if not exists bi_estiloide numeric,
  add column if not exists bi_femoral numeric,
  add column if not exists bi_maleolar numeric,
  add column if not exists icq numeric;

create index if not exists assessments_student_assessment_date_idx
on public.assessments(student_id, assessment_date desc);

create index if not exists body_measurements_student_measurement_date_idx
on public.body_measurements(student_id, measurement_date desc);

update public.exercise_library
set muscle_group = case
  when lower(translate(coalesce(muscle_group, ''), 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) in ('perna', 'pernas', 'quadriceps') then 'Pernas'
  when lower(translate(coalesce(muscle_group, ''), 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) in ('peito', 'peitoral') then 'Peitoral'
  when lower(translate(coalesce(muscle_group, ''), 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) in ('costas', 'dorsal') then 'Dorsal'
  when lower(translate(coalesce(muscle_group, ''), 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) in ('braco', 'bracos', 'biceps', 'triceps') then 'Braços'
  when lower(translate(coalesce(muscle_group, ''), 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) in ('posterior', 'posterior de coxa') then 'Posterior'
  when lower(translate(coalesce(muscle_group, ''), 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) in ('gluteo', 'gluteos') then 'Glúteo'
  when lower(translate(coalesce(muscle_group, ''), 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) in ('abdomen', 'abdominal') then 'Abdominal'
  when lower(translate(coalesce(muscle_group, ''), 'áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ', 'aaaaeeioooucAAAAEEIOOOUC')) in ('ombro', 'ombros') then 'Ombro'
  else muscle_group
end
where muscle_group is not null;
