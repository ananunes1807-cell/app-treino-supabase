# FitTrack Pro — App de Treinos com Supabase

Aplicativo web responsivo, mobile first, criado com **HTML, CSS e JavaScript puro** para acompanhamento de treinos de academia. A versão 1 está preparada para consumir dados reais de um banco Supabase já existente com as tabelas:

- `students`
- `assessments`
- `body_measurements`
- `exercise_library`
- `workouts`
- `workout_exercises`
- `workout_logs`

> O projeto não inclui dados simulados. Enquanto as credenciais do Supabase não forem configuradas, a interface permanece vazia e exibe o status “Supabase não configurado”.

## Funcionalidades

### Tela inicial

- Dashboard moderno com menu lateral.
- Layout responsivo para celular, tablet e desktop.
- Métricas reais de alunos, treinos, treinos concluídos e exercícios.
- Listas de alunos recentes e histórico recente de treinos.

### Área treinador

- Listagem de alunos cadastrados.
- Cadastro de novo aluno.
- Visualização de perfil do aluno.
- Visualização de avaliações físicas.
- Visualização de medidas corporais.
- Criação de treino.
- Adição de exercícios ao treino usando a tabela `exercise_library`.
- Registro de observações do aluno.
- Visualização do histórico de treinos realizados.

### Área aluno

- Visualização do treino atual.
- Marcação de treino como concluído.
- Visualização do histórico de treinos.
- Visualização de avaliações físicas.
- Visualização de medidas corporais.
- Visualização da evolução corporal.

### Exercícios

- Busca por nome.
- Filtro por grupo muscular.
- Exibição de equipamento utilizado.
- Exibição de nível de dificuldade.
- Exibição de instruções.

### Evolução

- Gráfico de peso.
- Gráfico de gordura corporal.
- Gráfico de medidas corporais.
- Gráficos desenhados com Canvas API, sem dependências externas.

## Estrutura do projeto

```text
.
├── index.html      # Estrutura das telas e formulários
├── style.css       # Estilos responsivos e identidade visual
├── app.js          # Regras de interface e funções de integração com Supabase
├── supabase.js     # Configuração do cliente Supabase
└── README.md       # Documentação de instalação e configuração
```

## Instalação local

1. Clone o repositório:

```bash
git clone <url-do-repositorio>
cd app-treino-supabase
```

2. Configure as credenciais públicas do Supabase em `supabase.js`:

```js
export const SUPABASE_URL = 'https://seu-projeto.supabase.co';
export const SUPABASE_ANON_KEY = 'sua-chave-anon-publica';
```

Esses valores ficam no painel do Supabase em **Project Settings > API**.

3. Sirva os arquivos com um servidor estático. Exemplo com Python:

```bash
python3 -m http.server 8080
```

4. Acesse no navegador:

```text
http://localhost:8080
```

## Configuração do Supabase

O app usa o pacote oficial `@supabase/supabase-js` via CDN no arquivo `supabase.js`, então não é necessário instalar dependências com npm.

Certifique-se de que:

1. As tabelas informadas existem no projeto Supabase.
2. As políticas de RLS permitem as operações desejadas para a chave `anon` ou para o fluxo de autenticação que você adicionar futuramente.
3. Os nomes de colunas usados nos formulários existem no banco.

### Colunas esperadas pela interface

O app foi escrito para ser tolerante a nomes comuns de colunas. Ainda assim, recomenda-se que as tabelas tenham ao menos estes campos:

#### `students`

- `id`
- `name` ou `full_name`
- `email`
- `phone` ou `phone_number`
- `notes` ou `observations`
- `created_at`

#### `exercise_library`

- `id`
- `name` ou `title`
- `muscle_group`, `primary_muscle` ou `category`
- `equipment`
- `difficulty` ou `level`
- `instructions` ou `description`

#### `workouts`

- `id`
- `student_id`
- `title` ou `name`
- `description`
- `created_at`

#### `workout_exercises`

- `id`
- `workout_id`
- `exercise_id`
- `sets`
- `reps`
- `rest_seconds`
- `notes`

#### `workout_logs`

- `id`
- `student_id`
- `workout_id`
- `completed_at`
- `created_at`
- `notes`

#### `assessments`

- `id`
- `student_id`
- `goal`, `summary` ou `notes`
- `assessment_date`, `date` ou `created_at`

#### `body_measurements`

- `id`
- `student_id`
- `weight`
- `body_fat_percentage` ou `body_fat`
- `waist`
- `chest`
- `hip`
- `arm`
- `thigh`
- `measured_at`, `date` ou `created_at`

## Publicação no GitHub Pages

1. Faça commit dos arquivos do projeto.
2. Envie para o GitHub.
3. No repositório, acesse **Settings > Pages**.
4. Selecione a branch principal e a pasta raiz.
5. Salve e aguarde a URL pública ser gerada.

## Segurança

- A chave `anon` do Supabase é pública por natureza, mas deve ser usada com políticas de RLS bem configuradas.
- Não coloque `service_role` key no frontend.
- Para controle de acesso por treinador/aluno, adicione autenticação Supabase Auth em uma próxima versão.

## Próximos passos sugeridos

- Adicionar autenticação com Supabase Auth.
- Separar permissões por perfil de treinador e aluno.
- Adicionar upload de fotos de evolução.
- Criar edição e exclusão de treinos.
- Exibir detalhes completos dos exercícios de cada treino.
