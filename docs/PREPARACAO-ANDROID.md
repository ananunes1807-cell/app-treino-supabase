# Preparação do Alion Treinos para Android

## Já está pronto

- PWA instalável com `manifest.webmanifest`, ícones 192/512 e ícone maskable.
- `start_url` e `scope` relativos, compatíveis com GitHub Pages.
- Interface responsiva e Modo Fácil priorizado no celular.
- Service worker com app shell, atualização automática e fallback offline.
- Progresso do treino e conclusão pendente preservados no aparelho.
- Sincronização posterior sem apagar o registro antes da confirmação do Supabase.
- Imagens de exercícios com lazy loading, fallback local e cache em tempo de uso.

## Ainda falta antes de empacotar

- Aplicar e validar a migração `025_exercise_guidance_feedback_substitutes.sql`.
- Testar RLS com contas reais de aluno, personal, academia e Admin TI.
- Produzir ícones e splash screens Android em todas as densidades.
- Definir identificador definitivo, por exemplo `br.com.aliontreinos.app`.
- Definir política de privacidade, termos de uso e canal de suporte.
- Validar navegação pelo botão Voltar dentro de um WebView.
- Testar câmera/galeria somente se upload local de imagens for adicionado.
- Configurar assinatura e armazenamento seguro das chaves de publicação.

## Permissões futuras

A versão atual não exige permissões nativas. Se recursos forem adicionados:

- Internet: necessária para sincronização com Supabase.
- Notificações: opcional para lembretes e fim do descanso.
- Vibração: opcional; hoje usa a API web quando disponível.
- Áudio: leitura usa síntese de voz do sistema, sem gravar microfone.
- Câmera/arquivos: somente se houver upload de avaliação ou exercício.

## Passos futuros para APK

1. Instalar Node.js LTS, Android Studio, JDK compatível e Capacitor.
2. Adicionar o Capacitor sem substituir os arquivos web existentes.
3. Definir `webDir` para a pasta exportada do PWA.
4. Executar `npx cap add android` e `npx cap sync android`.
5. Abrir com `npx cap open android`.
6. Configurar `applicationId`, versão, ícones, splash e permissões.
7. Gerar um APK de teste assinado e validar em aparelhos reais.

## Passos futuros para AAB

1. Concluir os testes do APK em diferentes versões do Android.
2. Criar uma chave de upload e guardá-la fora do repositório.
3. Configurar a assinatura de release no Gradle.
4. Gerar `bundleRelease` no Android Studio/Gradle.
5. Fazer testes internos no Google Play antes da produção.

## Riscos encontrados

- O frontend depende do esquema e das políticas RLS reais do Supabase.
- URLs externas de imagens podem ficar indisponíveis; o placeholder evita quebra visual.
- `speechSynthesis` varia entre fabricantes e precisa de teste em Android real.
- Filas offline em `localStorage` são adequadas ao PWA atual, mas uma versão nativa
  poderá migrar para armazenamento mais robusto.
- Cache antigo do GitHub Pages pode manter arquivos anteriores; cada publicação
  deve alterar a versão do service worker e dos assets.

