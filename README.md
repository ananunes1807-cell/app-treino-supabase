# GymPulse

Aplicativo web responsivo para acompanhamento de treinos de academia, feito com HTML, CSS e JavaScript puro, conectado ao Supabase.

## Funcionalidades

- Dashboard com totais de alunos, treinos, exercícios e treinos concluídos.
- Área do treinador para listar/cadastrar alunos, ver perfil, avaliações, medidas, histórico e criar treinos.
- Inclusão de exercícios no treino usando a tabela `exercise_library`.
- Área do aluno para ver treino atual, concluir treino e consultar histórico.
- Biblioteca de exercícios com busca por nome e filtro por grupo muscular.
- Gráficos em canvas para peso, gordura corporal e medidas corporais.
- Layout mobile first com menu lateral no desktop e navegação inferior no celular.

## Estrutura

```text
gym-tracker-supabase/
  index.html
  style.css
  app.js
  supabase.js
  README.md
```

## Configuração do Supabase

1. No painel do Supabase, abra **Project Settings > API**.
2. Copie a **Project URL**.
3. Copie a chave **anon public**.
4. Edite `supabase.js`:

```js
const SUPABASE_CONFIG = {
  url: "https://seu-projeto.supabase.co",
  anonKey: "sua-chave-anon-publica"
};
```

Também é possível abrir a tela **Supabase** dentro do app e salvar esses dados no navegador para testar localmente.

## Tabelas esperadas

O app consome dados reais das tabelas já existentes:

- `students`
- `assessments`
- `body_measurements`
- `exercise_library`
- `workouts`
- `workout_exercises`
- `workout_logs`

As funções usam nomes comuns de colunas, como `name`, `full_name`, `student_id`, `created_at`, `weight`, `body_fat_percentage`, `muscle_group`, `equipment`, `difficulty_level`, `instructions`, `title`, `goal`, `sets`, `reps`, `rest_seconds` e `completed_at`.

Se o seu banco tiver nomes diferentes, ajuste o payload das funções em `app.js` e os nomes auxiliares dentro de `valueOf(...)`.

## Políticas RLS

Se Row Level Security estiver ativo, crie políticas que permitam leitura e escrita conforme seu modelo de autenticação. Para uma versão inicial sem login, as tabelas precisam permitir operações para a role `anon`, ou as consultas serão bloqueadas pelo Supabase.

## Rodando localmente

Como é um app estático, você pode publicar os arquivos diretamente. Para testar com servidor local:

```bash
npx serve gym-tracker-supabase
```

Ou use qualquer servidor estático:

```bash
python -m http.server 5500
```

Depois acesse `http://localhost:5500/gym-tracker-supabase`.

## Publicação no GitHub

1. Crie um repositório no GitHub.
2. Faça commit da pasta `gym-tracker-supabase`.
3. Publique com GitHub Pages, Netlify, Vercel ou outro host estático.
4. Garanta que `supabase.js` esteja configurado ou que a configuração seja feita pela tela **Supabase** do app.

## Observações

- Não há dados simulados no projeto.
- Os estados vazios aparecem quando as tabelas ainda não possuem registros.
- A chave `anon public` pode ficar no frontend, mas as permissões reais devem ser controladas por RLS no Supabase.
