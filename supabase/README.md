# Supabase

Esta pasta e a estrutura oficial usada pela integracao GitHub do Supabase.

## Working directory

No painel do Supabase, use:

```text
.
```

Isso indica que a pasta `supabase/` esta na raiz do repositorio.

## Migrations

As migrations oficiais ficam em:

```text
supabase/migrations/
```

Ordem atual:

1. `20260602000100_auth_roles_real_use.sql`
2. `20260602000200_admin_maintenance_rpc.sql`
3. `20260602000300_bootstrap_first_admin.sql`
4. `20260602000400_auth_signup_profiles.sql`
5. `20260602000500_roles_reais_permissoes.sql`
6. `20260602000600_convites_alunos_vinculos_reais.sql`
7. `20260602000700_corrige_exclusoes_admin_personal.sql`

Os scripts antigos da pasta `sql/` foram mantidos como historico e apoio manual.
Nao coloque os scripts MVP `001` a `005` nesta pasta oficial, pois eles foram feitos para teste e podem abrir ou desativar RLS.
