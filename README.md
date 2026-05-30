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

## Areas do sistema

### Area Aluno

- Visualizar treino atual.
- Marcar treino como concluido.
- Ver historico de treinos.
- Ver evolucao corporal simples.

### Area Treinador

- Listar alunos cadastrados no Supabase pela tabela `students`.
- Buscar aluno por nome ou e-mail.
- Visualizar perfil do aluno.
- Adicionar novo aluno na tabela `students`.
- Criar treino para aluno na tabela `workouts`.
- Adicionar exercicios ao treino usando a tabela `exercise_library`.
- Ver avaliacoes e medidas corporais.

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
