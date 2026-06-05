# Auditoria de Segurança Supabase - Alion Treinos

Data: 2026-06-04

## Escopo

Auditoria feita sobre a integração atual do app com Supabase, analisando:

- Auth: login, cadastro, convite, recuperação e troca de senha.
- Operações frontend com `supabaseClient.from(...)`, `auth.*` e RPCs.
- Migrations e scripts SQL existentes.
- RLS, grants e policies documentadas no repositório.
- Fluxos de Admin TI, Personal e Aluno.

## Estado Atual

### OK

- O app usa Supabase Auth para login, cadastro por convite, recuperação e troca de senha.
- O fluxo de recuperação chama `supabase.auth.resetPasswordForEmail(...)` com `redirectTo` apontando para produção.
- A troca de senha usa `supabase.auth.updateUser({ password })`.
- A migration `016_fecha_modo_mvp_anon.sql` remove policies `mvp_anon_*`, revoga grants `anon` de tabelas sensíveis e habilita RLS.
- `exercise_library` permanece pública apenas para leitura, como esperado.
- `admin_ti` principal é travado para `ananunes1807@gmail.com` pela migration `015`.
- `student_invites` e `trainer_students` existem nas migrations e sustentam o vínculo Personal -> Aluno.
- O frontend não faz upload de arquivos; imagens/vídeos são caminhos locais ou URLs validadas simples.

### Parcial

- O frontend ainda contém botões/ações administrativas; isso é aceitável para UX, mas não deve ser a barreira de segurança principal.
- A função `fetchTable(tableName)` permite consultar tabelas dinamicamente pelo frontend. A segurança real precisa estar 100% no RLS.
- Scripts antigos `001` a `005` e `COPIAR_E_COLAR_NO_SUPABASE.sql` ainda registram o histórico do modo MVP/anon. Eles não devem ser reaplicados em produção.
- Existem dois modelos de perfil (`profiles` e `app_profiles`). As migrations 014/015 sincronizam e priorizam `app_profiles`, mas a consistência deve ser auditada periodicamente.
- A role `gestor_academia` aparece preparada em algumas policies, mas o fluxo de interface ainda não está completo.

### Riscos Encontrados

1. **Risco se migrations antigas forem reaplicadas**
   - Tabelas afetadas: `students`, `assessments`, `body_measurements`, `workouts`, `workout_exercises`, `workout_logs`, `exercise_library`.
   - Causa: scripts MVP antigos concedem `anon` e policies `mvp_anon_*`.
   - Mitigação: rodar/manter a migration 016 depois de qualquer script antigo. Não usar `COPIAR_E_COLAR_NO_SUPABASE.sql` em produção.

2. **Dependência visual no frontend para ações perigosas**
   - Tabelas afetadas: `students`, `workouts`, `workout_logs`, `assessments`, `body_measurements`, `exercise_library`.
   - Causa: botões são ocultados por role no JS, mas qualquer usuário poderia tentar chamar a API manualmente.
   - Mitigação: RLS precisa negar por banco. O script `020_auditoria_seguranca_supabase.sql` verifica grants/policies e reaplica regras críticas.

3. **Possível desalinhamento entre `trainer_id` e `personal_id`**
   - Tabelas afetadas: `students`, `workouts`.
   - Causa: legado usava `personal_id`; migrations novas usam também `trainer_id`.
   - Mitigação: migration 014 sincroniza. Auditoria SQL lista registros órfãos.

4. **Exclusões permanentes pelo frontend**
   - Tabelas afetadas: `students`, `workouts`, `workout_exercises`, `workout_logs`, `assessments`, `body_measurements`.
   - Causa: funções JS chamam `.delete()`.
   - Mitigação: policies devem permitir delete apenas para `admin_ti`. Personal deve arquivar/desativar, não excluir histórico.

5. **Biblioteca de exercícios pública**
   - Tabela afetada: `exercise_library`.
   - Risco baixo se conteúdo for público.
   - Mitigação: manter apenas `SELECT` para `anon`; escrita somente `authenticated` com `admin_ti` ou `personal`, conforme decisão do negócio.

## Tabelas Auditadas

- `profiles`
- `app_profiles`
- `students`
- `trainer_students`
- `student_invites`
- `workouts`
- `workout_exercises`
- `workout_logs`
- `assessments`
- `body_measurements`
- `exercise_library`
- `manutencao_logs`

## Recomendações

1. Rodar `sql/020_auditoria_seguranca_supabase.sql` no Supabase SQL Editor.
2. Conferir se `anon` só possui `SELECT` em `exercise_library`.
3. Conferir se `mvp_anon_%` retorna zero linhas.
4. Conferir se `rowsecurity = true` para tabelas sensíveis.
5. Testar com três usuários reais:
   - Admin TI: `ananunes1807@gmail.com`.
   - Personal: usuário autenticado com role `personal`.
   - Aluno: usuário aceito por convite e vinculado em `trainer_students`.

## Teste Manual Recomendado

### Admin TI

- Deve ver todos os alunos, treinos, avaliações, medidas e logs.
- Deve conseguir corrigir vínculos e excluir registros de teste.

### Personal

- Deve ver apenas alunos com `students.personal_id`/`trainer_id` igual ao seu `app_profiles.id`.
- Deve criar/editar treinos e avaliações apenas desses alunos.
- Não deve conseguir excluir histórico global.

### Aluno

- Deve ver apenas o próprio `students.auth_user_id = auth.uid()`.
- Deve ver apenas treinos ativos próprios.
- Deve inserir apenas logs próprios.
- Não deve editar/excluir alunos, treinos ou biblioteca.

## Pendências

- Confirmar no Supabase real, via SQL Editor, se a migration 020 retorna zero policies `mvp_anon_%`.
- Remover da rotina de uso qualquer script antigo de MVP/anon.
- Futuramente consolidar `profiles` e `app_profiles` em um modelo único ou manter uma função de sincronização clara.
