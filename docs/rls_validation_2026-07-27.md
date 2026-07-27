# Validação RLS — 27/07/2026

## Escopo executado

Teste direto contra a API REST do projeto Supabase usando apenas a chave
publicável do frontend, sem sessão de usuário.

## Resultado

| Recurso | Resultado sem autenticação |
| --- | --- |
| `students` | Bloqueado (`401`) |
| `assessments` | Bloqueado (`401`) |
| `body_measurements` | Bloqueado (`401`) |
| `workouts` | Bloqueado (`401`) |
| `workout_exercises` | Bloqueado (`401`) |
| `workout_logs` | Bloqueado (`401`) |
| `student_invites` | Bloqueado (`401`) |
| `academies` | Bloqueado (`401`) |
| `academy_financials` | Bloqueado (`401`) |
| `trainer_students` | Permitido, mas retorna zero registros |
| `app_profiles` | Permitido, mas retorna zero registros |
| `exercise_library` | Leitura pública permitida, conforme o produto |

## Conclusão

Não foi possível obter dados pessoais ou operacionais usando somente a chave
pública. A barreira anônima está ativa.

O teste entre contas autenticadas continua sendo obrigatório antes de ampliar o
uso: personal A não pode consultar aluno do personal B, e cada aluno deve
consultar somente o próprio cadastro, treinos e histórico. Esse teste exige
contas reais distintas e não deve ser simulado alterando tokens ou dados.
