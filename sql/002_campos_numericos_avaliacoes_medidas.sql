-- Alion Treinos / app-treino-supabase
-- Garante colunas numericas usadas pelo formulario de avaliacoes e medidas.
--
-- Execute no Supabase SQL Editor caso algum campo numerico nao esteja salvando
-- ou nao apareca corretamente no app.

alter table public.assessments
  add column if not exists weight numeric,
  add column if not exists height numeric,
  add column if not exists body_fat numeric,
  add column if not exists muscle_mass numeric,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now();

alter table public.body_measurements
  add column if not exists waist numeric,
  add column if not exists abdomen numeric,
  add column if not exists hip numeric,
  add column if not exists arm numeric,
  add column if not exists thigh numeric,
  add column if not exists calf numeric,
  add column if not exists notes text,
  add column if not exists created_at timestamptz default now();
