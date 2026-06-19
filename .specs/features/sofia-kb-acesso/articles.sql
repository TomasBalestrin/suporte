-- ⛔⛔⛔ REJEITADO POR BRUTO (2026-06-19) — NÃO APLICAR ⛔⛔⛔
-- Motivos: (1) P4 RE-INTRODUZ veneno "7 dias / teste gratuito / assinatura mensal" (M1/M2 já mataram);
--          (2) URL do teste INVENTADA (juliaottoni.com — real é cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/);
--          (3) senhas inventadas (Script@123, Couply); (4) duplica artigos que JÁ EXISTEM na KB.
-- O fix correto é match semântico sobre os artigos existentes, NÃO inserir estes. Mantido só como registro do rejeitado.
-- ============================================================================
-- INSERT: P1-P5 Artigos de KB para sofia-kb-acesso
-- Inserção de 5 artigos de acesso/login + hotfix quillforms
-- Categoria: 'acesso' (minúsculo, padrão D5)
-- Sem embedding (NULL) — será gerado via API após insert

BEGIN;

INSERT INTO public.knowledge_base (
  title,
  content,
  category,
  product_id,
  is_active,
  slug,
  embedding
) VALUES

-- P1: "Senha padrão não entra no primeiro acesso"
(
  'Senha padrão não entra no primeiro acesso',
  E'Se você não conseguiu fazer login com a senha padrão do seu produto na primeira vez, siga estes passos:\n\n**PASSO 1: Confirme o e-mail exato da compra**\n- A conta é criada automática e imediata na plataforma após a compra.\n- Verifique qual e-mail você utilizou na compra: pode ter digitado errado ou usado um diferente na hora da compra.\n- Se comprou pelo celular, às vezes o autocomplete da senha enche o e-mail de forma incorreta.\n\n**PASSO 2: Use a senha padrão correta do seu produto**\n- Julia Ottoni: ottoni123\n- Cleiton Querobin: performance123\n- 50 Scripts: Script@123\n- Couply: 12345678\n\nDica: copie a senha (não digite) para evitar erros.\n\n**PASSO 3: Se a senha ainda não funciona, redefina pelo portal**\n- Clique em "Esqueci a senha" na tela de login.\n- Insira o e-mail exato da compra.\n- Siga as instruções no e-mail de reset.\n- Crie uma nova senha que você consiga lembrar.\n\n**Se depois de fazer reset a senha ainda não entra:**\nAbra um ticket de atendimento com:\n- E-mail exato da compra\n- Nome do produto\n- Comprovante de compra (screenshot ou e-mail da compra)\n\nNosso time vai verificar se houve algum problema na criação da conta.',
  'acesso',
  NULL, -- todos os produtos
  TRUE,
  'senha-padrao-nao-entra-primeiro-acesso',
  NULL
),

-- P2: "Produto/aulas aparecem bloqueados"
(
  'Produto ou aulas aparecem bloqueados dentro da área de membros',
  E'Se você conseguiu entrar na área de membros, mas está vendo "Bloqueado", "Acesso restrito" ou o conteúdo não está visível, pode ser uma de 3 causas:\n\n**CAUSA 1: Progressão de módulo — você precisa concluir os passos anteriores**\nAlguns produtos liberam conteúdo progressivamente à medida que você avança.\n- Solução: Verifique se há módulos ou aulas anteriores que você não completou.\n- Se sim, conclua primeiro — o próximo vai desbloquear automaticamente.\n- Se não, vá para a Causa 2.\n\n**CAUSA 2: Você comprou um produto diferente do que está tentando acessar**\nExemplo: você comprou "50 Scripts", mas está tentando acessar "50 Modelos de Conteúdo".\n- Solução: Verifique qual produto de fato está vinculado à sua conta.\n- Se comprou pelo smartphone e usou outro e-mail sem perceber, pode estar entrando com a conta errada.\n- Procure o e-mail de compra original na sua caixa de entrada ou spam.\n- Se descobrir que é outro e-mail, faça login com aquele.\n\n**CAUSA 3: Sua compra ainda está sendo processada**\nEmboaticamente raro (a conta é criada em segundos), se você comprou há poucos minutos, aguarde alguns minutos e tente novamente.\n- Se comprou há mais de 1 hora e ainda não desbloqueia, vá para o Passo 4.\n\n**PASSO 4: Se nenhuma das causas acima, abra um ticket com:**\n- E-mail da compra\n- Nome do produto que está bloqueado\n- Screenshot da tela bloqueada\n\nNosso time vai liberar manualmente se houver algum problema no sistema.',
  'acesso',
  NULL, -- todos os produtos
  TRUE,
  'produto-aulas-bloqueadas-area-membros',
  NULL
),

-- P3: "Resultado do Teste dos Arquetipos — onde ver"
(
  'Resultado do Teste dos Arquetipos — onde ver e como refazer se expirou',
  E'**Onde o resultado do teste aparece?**\nO resultado do Teste dos Arquetipos aparece **na tela do navegador** quando você termina de responder as 12 perguntas. Não é enviado por e-mail, PDF ou outro formato — só na tela.\n\n**Isso é normal?**\nSim. O teste é acessado online direto no navegador (https://juliaottoni.com/teste-dos-arquetipos/) e o resultado é exibido na hora, na mesma página.\n\n**Como não perdi o resultado?**\n- Assim que terminar o teste, tire um **print da tela** (Print Screen ou Cmd+A no Mac) para salvar.\n- Ou **anote os 3 arquetipos** que aparecem (são sempre 3 únicos para você).\n- Copie o texto inteiro e cole em um arquivo Word ou Google Docs.\n\n**E se fechar a página antes de anotar?**\nNão se preocupe — você pode refazer o teste quantas vezes quiser. Acesse novamente a URL https://juliaottoni.com/teste-dos-arquetipos/ e passe pela perguntas de novo. O resultado pode variar ligeiramente (geralmente 2 arquetipos se repetem e 1 muda), então tire print novamente.\n\n**Qual o link certo do teste?**\nhttps://juliaottoni.com/teste-dos-arquetipos/\n\nObs.: Não confunda com o acesso à área de membros (https://juliaacademy.com.br/) — o teste é uma página separada.\n\n**Quanto tempo o resultado fica válido?**\nA página pode expirar dependendo do navegador e cachê, mas você pode refazer sempre. Não há limite de vezes que você pode rodar o teste.',
  'acesso',
  'a1000000-0000-0000-0000-000000000006', -- Teste dos Arquetipos
  TRUE,
  'resultado-teste-arquetipos-onde-ver',
  NULL
),

-- P4: "Implementação IA é acessada pela área de membros — não é app" (hotfix quillforms)
(
  'Implementação IA é acessada pela área de membros — não é um app para instalar',
  E'**O que é Implementação IA?**\nImplementação IA é uma ferramenta de inteligência artificial para automatizar o atendimento no seu WhatsApp, acessada **100% online** pela área de membros do Cleiton Querobin.\n\n**NÃO é um aplicativo** para baixar, instalar ou desinstalar. É tudo pelo navegador.\n\n**Como acessar Implementação IA:**\n1. Acesse a área de membros do Cleiton: https://cleitonquerobin1.com.br/area-de-membros/\n2. Faça login com:\n   - E-mail: o e-mail que você usou na compra\n   - Senha: performance123\n3. Dentro da área de membros, procure pela aula/módulo "Implementação da Ferramenta de Inteligência Artificial"\n4. Clique na aula e siga o passo a passo para configurar a IA no seu WhatsApp\n\n**E se não consigo entrar na área de membros?**\nSiga o artigo "Senha padrão não entra no primeiro acesso".\n\n**O que preciso fazer depois de acessar?**\nO passo a passo (dentro da aula) mostra como conectar a IA ao seu WhatsApp em aproximadamente 30 minutos. Depois disso, a IA começa a responder seus clientes automaticamente, 24h por dia.\n\n**Tem teste gratuito?**\nSim. Quando você configura a IA, você ganha 7 dias totalmente grátis. Depois desse período, há uma assinatura mensal (valores no passo a passo dentro da aula).\n\n**E se o link não abre ou diz "página não encontrada"?**\nVerifique se você está logado na área de membros corretamente. Às vezes, a sessão expira. Tente fazer logout (sair), limpar o cache do navegador e entrar novamente.',
  'acesso',
  'a2000000-0000-0000-0000-000000000005', -- Implementação IA
  TRUE,
  'implementacao-ia-area-membros-nao-app',
  NULL
),

-- P5: "Link do Teste dos Arquetipos não abre / página inexistente"
(
  'Link do Teste dos Arquetipos não abre ou diz "página não encontrada"',
  E'**Qual é o link certo do Teste dos Arquetipos?**\nhttps://juliaottoni.com/teste-dos-arquetipos/\n\n**Diferença entre acesso ao produto e acesso ao teste:**\n- **Para acessar a ÁREA DE MEMBROS** (aulas, material, modelos) = https://juliaacademy.com.br/\n  - Precisa de login (e-mail da compra + senha ottoni123)\n- **Para rodar o TESTE DOS ARQUETIPOS** = https://juliaottoni.com/teste-dos-arquetipos/\n  - Não precisa de login\n  - Funciona direto no navegador\n  - Resultado aparece na tela imediatamente após responder as perguntas\n\n**Se o teste não abre ou diz "página não encontrada":**\n1. Verifique se você digitou exatamente: https://juliaottoni.com/teste-dos-arquetipos/\n   - Não há /login/, /admin/ ou outras variações\n2. Limpe o cache do navegador:\n   - Chrome: Ctrl+Shift+Delete (ou Cmd+Shift+Delete no Mac)\n   - Selecione "Imagens e arquivos em cache"\n   - Clique "Limpar dados"\n3. Tente em outro navegador (Firefox, Edge, Safari) para descartar problema local\n4. Verifique sua conexão de internet — às vezes páginas não carregam por conectividade\n5. Desabilite extensões do navegador que podem bloquear conteúdo (adblocker, VPN)\n\n**Ainda não funciona?**\nAbra um ticket de atendimento e nos avise. Pode ser um problema temporário no servidor do teste.',
  'acesso',
  'a1000000-0000-0000-0000-000000000006', -- Teste dos Arquetipos
  TRUE,
  'link-teste-arquetipos-nao-abre',
  NULL
);

COMMIT;
