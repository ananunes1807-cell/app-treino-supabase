# GymPulse / app-treino-supabase

Aplicativo web simples para acompanhamento de treinos de academia, conectado ao Supabase.

O projeto usa apenas:

- HTML
- CSS
- JavaScript puro
- Supabase

Nao usa frameworks, nao usa Firebase como banco e permanece compativel com GitHub Pages.

## Objetivo

Centralizar o acompanhamento de alunos, treinos, exercicios, avaliacoes fisicas, medidas corporais e historico de treinos realizados.

## Login e perfis

Para uso real com terceiros, use Supabase Auth com a tabela `app_profiles`.

Perfis suportados:

- `admin_ti`: Admin TI com acesso total, manutencao e exclusoes administrativas. O principal e `ananunes1807@gmail.com`.
- `personal`: personal que cadastra alunos, cria treinos e acompanha apenas seus alunos.
- `aluno`: aluno que ve apenas o proprio perfil, treinos ativos e historico.
- `gestor_academia`: papel futuro para relatorios de alunos, frequencia, pagamentos e visao gerencial.

Execute no Supabase SQL Editor:

```text
sql/007_auth_roles_real_use.sql
sql/008_admin_maintenance_rpc.sql
sql/009_bootstrap_first_admin.sql
sql/010_auth_signup_profiles.sql
sql/011_roles_reais_permissoes.sql
```

O cadastro tradicional do app usa Supabase Auth e grava o perfil em `app_profiles`. Se um usuario ja existir em Authentication sem perfil, o app tenta criar um perfil basico no primeiro login. Para vincular um aluno ao login, preencha `students.auth_user_id`. Para vincular um aluno a um personal, preencha `students.personal_id`.

O arquivo `011_roles_reais_permissoes.sql` reforca as regras de producao: Admin TI tem acesso total, personal acessa apenas alunos vinculados, aluno acessa apenas seus proprios dados e `gestor_academia` fica preparado para visoes gerenciais sem manutencao tecnica profunda.

## Areas do sistema

### Area Aluno

- Visualizar treino atual.
- Visualizar apenas treinos com status `ativo`.
- Marcar treino como concluido.
- Ver historico de treinos.
- Ver evolucao corporal simples.

### Area Treinador

- Listar alunos cadastrados no Supabase pela tabela `students`.
- Buscar aluno por nome ou e-mail.
- Visualizar e editar perfil do aluno.
- Adicionar novo aluno na tabela `students`.
- Criar, editar, ativar, desativar e arquivar treinos na tabela `workouts`.
- Adicionar, editar e remover exercicios do treino usando a tabela `exercise_library`.
- Ver, editar e excluir avaliacoes e medidas corporais.
- Consultar historico sem apagar registros realizados pelo aluno.
- Acompanhar historico do aluno por abas: Perfil, Avaliacoes, Medidas, Treinos, Historico e Biblioteca.

### TI/Admin ou Controle do Sistema

Area protegida por senha simples temporaria:

```text
ac741
```

Essa senha e apenas provisoria para o MVP. Futuramente deve ser substituida por autenticacao real com Supabase Auth.

Essa area contem:

- Configuracao do Supabase.
- Project URL.
- Anon/Public Key.
- Status de conexao.
- Manutencao para limpar dados de teste, duplicados, dados orfaos e exclusoes permanentes quando necessario.
- Testar conexao.
- Ver tabelas existentes.
- Listar alunos do banco.
- Listar exercicios do banco.
- Diagnostico do sistema.
- Botao para recarregar dados do Supabase.

## Configuracao do Supabase

A conexao principal fica em `supabase.js`.

```js
const DEFAULT_SUPABASE_URL = "https://seu-projeto.supabase.co";
const DEFAULT_SUPABASE_ANON_KEY = "sua-chave-anon-publica";
```

Tambem e possivel alterar a configuracao pela area TI/Admin. A tela de configuracao nao aparece no menu publico e so fica disponivel depois de digitar a senha temporaria.

Importante: a chave anon/public pode ficar no frontend, mas as permissoes reais devem ser protegidas por Row Level Security (RLS) e policies no Supabase.

### URLs de autenticacao

Os e-mails enviados pelo Supabase Auth precisam apontar para a URL publicada do app, nao para `localhost`.

No Supabase, ajuste em:

```text
Authentication > URL Configuration
```

Use:

```text
Site URL:
https://ananunes1807-cell.github.io/app-treino-supabase/

Redirect URLs:
https://ananunes1807-cell.github.io/app-treino-supabase/**
https://ananunes1807-cell.github.io/app-treino-supabase/
```

O app tambem envia `emailRedirectTo` nos cadastros de Auth usando essa mesma URL publica.

## Diagnostico: alunos nao aparecem

Se alunos como Ana Carolina ou Carlos existem no painel do Supabase, mas nao aparecem no app, verifique:

- Se o app esta usando o mesmo projeto Supabase onde os dados foram cadastrados.
- Se a tabela `students` esta no schema `public`.
- Se a anon/public key tem permissao de `SELECT` na tabela `students`.
- Se existe policy de `INSERT` para permitir cadastrar alunos pela versao MVP sem login.

No Supabase, quando RLS esta ativo e nao existe policy de leitura para `anon`, a chamada pode retornar lista vazia mesmo com dados na tabela.

Exemplo temporario para MVP, ajuste conforme sua regra de seguranca:

```sql
create policy "Permitir leitura publica temporaria de students"
on public.students
for select
to anon
using (true);

create policy "Permitir cadastro publico temporario de students"
on public.students
for insert
to anon
with check (true);
```

Essas policies sao apenas para MVP sem login. Quando o projeto usar Supabase Auth, substitua por policies baseadas no usuario autenticado.

## Script de correcao RLS e exercise_library

O arquivo abaixo corrige os erros conhecidos de MVP:

- `new row violates row-level security policy for table "assessments"`
- `new row violates row-level security policy for table "body_measurements"`
- `there is no unique or exclusion constraint matching the ON CONFLICT specification`

Execute no Supabase SQL Editor:

```text
sql/001_corrige_rls_e_conflitos.sql
```

O app tambem foi ajustado para nao usar `ON CONFLICT` ao inserir a biblioteca padrao de exercicios. Ele compara os exercicios ja existentes pelo nome e insere apenas os que faltam.

Para a Area Treinador reestruturada, execute tambem se o seu banco ainda nao tiver os campos opcionais ou policies de edicao/exclusao:

```text
sql/003_campos_edicao_historico_treinador.sql
```

Esse script adiciona campos opcionais de perfil, avaliacao, medidas e treino com `add column if not exists`, alem de policies temporarias de `UPDATE` e `DELETE` para o MVP com anon key. Em producao, essas policies devem ser substituidas por regras com Supabase Auth.

Para separar treinos ativos, rascunhos, arquivados e excluidos, execute tambem:

```text
sql/006_workout_status_admin_roles.sql
```

Esse script adiciona `workouts.status` com os valores `ativo`, `arquivado`, `rascunho` e `excluido`.

Para usar as rotinas de manutencao do Admin TI no MVP, confirme tambem as policies CRUD temporarias:

```text
sql/004_policies_crud_mvp.sql
```

Para ambiente real, substitua as policies abertas de MVP pelo script `sql/007_auth_roles_real_use.sql`.

## Tabelas usadas

Banco existente:

- `students`
- `assessments`
- `body_measurements`
- `exercise_library`
- `workouts`
- `workout_exercises`
- `workout_logs`

## Banco de Dados

Este repositorio contem somente o aplicativo web.

O projeto esta preparado para ter um segundo repositorio separado chamado `database-app-treino`, responsavel pelos scripts SQL, migrations, seeds e documentacao do banco de dados.

Quando o repositorio do banco existir, adicione o link aqui:

```text
Repositorio do banco de dados: adicionar link do database-app-treino
```

## Como rodar localmente

Por ser um projeto estatico, voce pode abrir o `index.html` no navegador.

Se preferir usar servidor local:

```bash
python -m http.server 5500
```

Depois acesse:

```text
http://localhost:5500
```

## Publicacao

O projeto pode ser publicado no GitHub Pages, Netlify, Vercel ou qualquer hospedagem de site estatico.
