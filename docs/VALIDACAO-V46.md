# Validação da experiência de treino v46

## Automatizado nesta branch

- Sintaxe de `app.js`, módulos e service worker.
- Regressão da rotação e conclusão do treino.
- Seleção de um exercício atual por vez.
- Normalização de feedback e intensidade de dor.
- Bloqueio de URLs inseguras e fallback para imagem local.
- Campos novos presentes nos dois formulários da biblioteca.
- Manifesto válido e assets essenciais presentes no app shell.
- Busca por `service_role` e chaves privadas no frontend.
- `git diff --check`.

## Checklist manual antes de publicar

Execute em homologação com a migração SQL revisada:

- [ ] Imagem HTTPS válida, local, ausente, inválida e lenta.
- [ ] Ampliar e fechar imagem por toque, teclado e leitor de tela.
- [ ] Ouvir, parar e ouvir novamente em Android/Chrome e iPhone/Safari.
- [ ] Feedback Fácil, Adequado e Difícil.
- [ ] Feedback Senti dor com local, intensidade e observação.
- [ ] Confirmar que dor aparece apenas ao aluno e ao personal autorizado.
- [ ] Interromper internet durante o treino, concluir e reconectar.
- [ ] Tocar repetidamente em concluir série e concluir treino.
- [ ] Último exercício, tela concluída e rotação no dia seguinte.
- [ ] Conta de aluno, personal, academia e Admin TI.
- [ ] 320 px, celular paisagem, tablet e computador.
- [ ] Instalação do PWA e atualização do service worker da v45 para v46.
- [ ] Políticas RLS da nova tabela com usuários reais.

## Critério de publicação

Não publicar se houver duplicação de conclusão, exposição cruzada de aluno,
perda de feedback offline, imagem quebrada ou regressão de autenticação.
