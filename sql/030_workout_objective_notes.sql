-- Execute no Supabase SQL Editor.
-- Fonte canonica: supabase/migrations/20260824000300_workout_objective_notes.sql
-- Nao altera RLS, policies, triggers ou grants.

alter table public.workouts
  add column if not exists name text,
  add column if not exists objective text,
  add column if not exists notes text;

alter table public.students
  add column if not exists objective text,
  add column if not exists notes text;
