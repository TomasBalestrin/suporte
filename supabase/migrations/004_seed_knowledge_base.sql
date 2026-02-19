-- ============================================
-- SEED: Produtos e Base de Conhecimento (FAQ Bethel)
-- ============================================

-- ============================================
-- PRODUTOS
-- ============================================

INSERT INTO public.products (id, name, description, is_active) VALUES
  -- Produtos Julia Ottoni
  ('a1000000-0000-0000-0000-000000000001', '50 Modelos de Conteudo', 'Quadro no Trello com 50 ideias e roteiros prontos para postagens no Instagram.', TRUE),
  ('a1000000-0000-0000-0000-000000000002', 'Sequencias de Stories para Vender Muito', 'Guia estrategico com scripts para criar stories no Instagram que convertem.', TRUE),
  ('a1000000-0000-0000-0000-000000000003', 'Gatilhos Mentais: 16 Ganchos Poderosos', 'Material com frases de abertura (ganchos) prontas para Reels e conteudos de Instagram.', TRUE),
  ('a1000000-0000-0000-0000-000000000004', 'Plano Pratico: 7 Dias para Lotar a Sua Agenda', 'Plano pratico com acoes diarias para atrair mais clientes no Instagram em 7 dias.', TRUE),
  ('a1000000-0000-0000-0000-000000000005', '6 Formas de Gravar Reels Magneticos', 'Material com 6 formatos comprovados de videos curtos para Instagram.', TRUE),
  ('a1000000-0000-0000-0000-000000000006', 'Teste dos Arquetipos', 'Ferramenta online para identificar quais arquetipos de marca predominam na sua comunicacao.', TRUE),
  ('a1000000-0000-0000-0000-000000000007', 'Guia: Looks de Cada Arquetipo', 'Guia que ensina como transmitir seus arquetipos de marca por meio das roupas.', TRUE),
  ('a1000000-0000-0000-0000-000000000008', 'Como Criar um Posicionamento Magnetico', 'Guia estrategico para construir marca forte usando arquetipos.', TRUE),
  ('a1000000-0000-0000-0000-000000000009', 'Rotina de Stories de Cada Arquetipo', 'Planejamento semanal de stories alinhado aos 12 arquetipos.', TRUE),
  ('a1000000-0000-0000-0000-000000000010', 'Modelos Prontos de Conteudo para Vender Mais', 'Material com ideias e estruturas prontas para postagens estrategicas no Instagram.', TRUE),
  ('a1000000-0000-0000-0000-000000000011', 'Templates de Posts para um Feed Arquetipico', 'Modelos editaveis no Canva para os 12 arquetipos de marca.', TRUE),
  ('a1000000-0000-0000-0000-000000000012', 'Maquinas de Conteudos IA', 'GPT personalizado para criar conteudos para Instagram.', TRUE),
  ('a1000000-0000-0000-0000-000000000013', 'Metodo Posicionamento Milionario', 'Programa que ensina posicionamento de marca usando arquetipos.', TRUE),
  ('a1000000-0000-0000-0000-000000000014', 'Cronograma de Postagens 90 Dias', 'Planejamento estrategico de 3 meses de conteudos diarios para Instagram.', TRUE),
  ('a1000000-0000-0000-0000-000000000015', 'Metodo Maquina de Conteudos', 'Treinamento pratico para produzir conteudos com ChatGPT.', TRUE),
  ('a1000000-0000-0000-0000-000000000016', '100 Ideias de Conteudo', 'Lista com 100 sugestoes de temas para postagens no Instagram.', TRUE),
  ('a1000000-0000-0000-0000-000000000017', 'Cores que Vendem', 'Material sobre como escolher e aplicar cores estrategicas para o negocio.', TRUE),
  ('a1000000-0000-0000-0000-000000000018', 'Como Personalizar seu WhatsApp Business', 'Guia pratico para configurar e personalizar o WhatsApp Business.', TRUE),
  -- Produtos Cleiton
  ('a2000000-0000-0000-0000-000000000001', '50 Scripts Prontos para o WhatsApp', 'Conjunto de 50 modelos prontos de mensagens persuasivas para WhatsApp.', TRUE),
  ('a2000000-0000-0000-0000-000000000002', 'Quebrando Objecoes Facilmente', 'Treinamento estrategico para superar objecoes durante vendas.', TRUE),
  ('a2000000-0000-0000-0000-000000000003', 'Modelos de Audio Persuasivos para WhatsApp', '50 roteiros de audios prontos para conversas de vendas no WhatsApp.', TRUE),
  ('a2000000-0000-0000-0000-000000000004', 'Estrategia: 50 Clientes Novos Todos os Dias', 'Curso com 5 estrategias para atrair 50 a 100 novos clientes por dia.', TRUE),
  ('a2000000-0000-0000-0000-000000000005', 'Implementacao da Ferramenta de Inteligencia Artificial', 'Implementacao de IA personalizada com aulas praticas para WhatsApp.', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- CATEGORIAS DE SUPORTE
-- ============================================

INSERT INTO public.categories (id, name, description, icon, color, is_active) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Acesso e Login', 'Problemas com acesso, login e senha dos produtos', 'key', '#3B82F6', TRUE),
  ('c1000000-0000-0000-0000-000000000002', 'Pagamento e Reembolso', 'Duvidas sobre pagamento, parcelamento e garantia', 'credit-card', '#10B981', TRUE),
  ('c1000000-0000-0000-0000-000000000003', 'Uso do Produto', 'Duvidas sobre como usar e aplicar os produtos', 'book-open', '#8B5CF6', TRUE),
  ('c1000000-0000-0000-0000-000000000004', 'Problemas Tecnicos', 'Erros, bugs e problemas tecnicos com os produtos', 'alert-triangle', '#EF4444', TRUE),
  ('c1000000-0000-0000-0000-000000000005', 'Outros', 'Outras duvidas e solicitacoes', 'help-circle', '#6B7280', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================
-- BASE DE CONHECIMENTO - FAQ GERAL
-- ============================================

INSERT INTO public.knowledge_base (title, content, category, is_active) VALUES

-- Artigo 1: Acesso aos produtos
('Como acessar meu produto apos a compra',
E'Para acessar seu produto apos a compra, siga as instrucoes de acordo com o tipo de produto:\n\n**Produtos da Julia Ottoni:**\n- Acesse: https://juliaacademy.com.br/\n- Login: Seu e-mail de compra\n- Senha: ottoni123\n\n**Produtos do Cleiton:**\n- Acesse: https://cleitonquerobin1.com.br/area-de-membros/\n- Login: Seu e-mail de compra\n- Senha: performance123\n\n**Script GO:**\n- Acesse: https://www.scriptgo.app/login\n- Login: Seu e-mail de compra\n- Senha padrao: 12345678 (voce ira trocar depois)\n\n**Couply:**\n- Acesse: www.usecouply.app/login\n- Login: Seu e-mail de compra\n- Senha padrao: 12345678 (voce ira trocar depois)\n\n**Teste dos Arquetipos:**\n- Acesse: https://juliaottoni.com/teste-dos-arquetipos/',
'Acesso', TRUE),

-- Artigo 2: Problemas de acesso
('Nao consigo acessar minha conta - problemas de login',
E'Se voce nao consegue acessar sua conta, siga estes passos:\n\n1. Verifique se esta usando o e-mail correto (o mesmo usado na compra)\n2. Use a senha padrao do produto:\n   - Produtos Julia Ottoni: ottoni123\n   - Produtos Cleiton: performance123\n   - Script GO / Couply: 12345678\n3. Verifique se esta acessando a plataforma correta do seu produto\n\nSe mesmo assim nao conseguir, entre em contato com nosso suporte enviando:\n- Nome completo\n- E-mail de compra\n- Nome do produto adquirido\n\nContato do suporte: wa.me/5549998402162',
'Acesso', TRUE),

-- Artigo 3: Formas de pagamento
('Quais sao as formas de pagamento',
E'Aceitamos as seguintes formas de pagamento:\n\n- **PIX**: Pagamento a vista\n- **Cartao de credito**: Parcelamento em ate 12x\n\nOs pagamentos sao processados pelas plataformas Hotmart ou Pagtrust.',
'Pagamento', TRUE),

-- Artigo 4: Garantia e reembolso
('Garantia e reembolso - como funciona',
E'Sim! Voce tem **7 dias de garantia** a partir da data da compra.\n\nPara solicitar o reembolso, basta entrar em contato atraves da propria plataforma de compra (Hotmart ou Pagtrust) onde realizou a aquisicao.\n\nO prazo de 7 dias e contado a partir da data de confirmacao da compra.',
'Pagamento', TRUE),

-- Artigo 5: Horario de atendimento
('Horario de atendimento do suporte',
E'Nosso horario oficial de atendimento e:\n\n- **Segunda a sexta-feira**: 8h30 as 20h\n\nObservacao: Eventualmente atendemos alem do horario e aos finais de semana, mas nao como algo fixo.\n\nContato do suporte via WhatsApp: wa.me/5549998402162',
'Suporte', TRUE),

-- Artigo 6: Tempo de acesso
('Por quanto tempo terei acesso ao produto',
E'O tempo de acesso varia conforme o produto:\n\n- **Maioria dos produtos**: Acesso valido por **1 ano** a partir da data da compra\n- **Materiais em Trello** (como 50 Modelos de Conteudo e Modelos Prontos de Conteudo para Vender Mais): Acesso **vitalicio**, desde que voce mantenha seus dados de acesso salvos\n- **Teste dos Arquetipos**: Disponivel permanentemente no link https://juliaottoni.com/teste-dos-arquetipos/\n\nConsulte a descricao especifica do seu produto para confirmar o prazo.',
'Geral', TRUE),

-- Artigo 7: Acesso pelo celular
('Posso acessar os produtos pelo celular',
E'Sim! Todos os produtos sao acessiveis por **computador, tablet e celular**. Basta acessar a plataforma correspondente pelo navegador do seu dispositivo.',
'Geral', TRUE),

-- Artigo 8: E-mail de confirmacao
('Nao recebi o e-mail de confirmacao da compra',
E'Se voce nao recebeu o e-mail de confirmacao apos a compra:\n\n1. **Verifique sua caixa de spam ou lixo eletronico** - muitas vezes o e-mail vai para la\n2. Aguarde alguns minutos, pois pode haver um pequeno atraso\n\nSe nao encontrar, entre em contato com nosso suporte informando:\n- Nome completo\n- E-mail de compra\n- Nome do produto\n\nContato: wa.me/5549998402162',
'Acesso', TRUE),

-- Artigo 9: Compartilhamento de acesso
('Posso compartilhar meu acesso com outras pessoas',
E'**Nao.** O acesso e individual e intransferivel, vinculado ao e-mail de compra.\n\nO compartilhamento de credenciais pode resultar no **bloqueio da conta**.',
'Geral', TRUE),

-- Artigo 10: Duvidas sobre conteudo
('Tenho duvidas sobre como aplicar o conteudo do produto',
E'Sim! Nossa equipe de suporte pode tirar duvidas sobre como usar e aplicar os materiais.\n\nEntre em contato pelo WhatsApp: wa.me/5549998402162\n\nHorario de atendimento: Segunda a sexta-feira, das 8h30 as 20h.',
'Suporte', TRUE);


-- ============================================
-- BASE DE CONHECIMENTO - PRODUTOS JULIA OTTONI
-- ============================================

INSERT INTO public.knowledge_base (title, content, category, product_id, is_active) VALUES

-- 50 Modelos de Conteudo
('50 Modelos de Conteudo - Informacoes e FAQ',
E'**O que e?**\nO 50 Modelos de Conteudo e um quadro no Trello com cinquenta ideias e roteiros prontos para postagens no Instagram. Cada modelo vem acompanhado de explicacao, exemplos e instrucoes para que voce adapte ao seu nicho e grave seus proprios videos, mantendo autenticidade e conexao com seu publico.\n\n**Para que serve?**\nServe para ajudar empreendedoras e prestadoras de servico a criarem conteudo estrategico de forma mais rapida e pratica, economizando tempo e evitando bloqueios criativos. O objetivo e aumentar o engajamento, atrair clientes e gerar vendas no Instagram.\n\n**Acesso:** Vitalicio ao quadro no Trello, desde que mantenha seus dados de acesso salvos.\n\n**Preciso aparecer nos videos?** Nao obrigatoriamente, mas para melhores resultados, e recomendado adaptar os roteiros para o seu estilo e gravar com sua presenca.\n\n**Funciona para qualquer nicho?** Sim, os modelos sao adaptaveis para qualquer area.\n\n**Ja vem pronto para postar?** Nao. Sao modelos para voce se inspirar, com explicacao e exemplos. Voce precisa adaptar e gravar seus videos de acordo com o seu nicho.\n\n**Posso usar fora do Instagram?** Sim, voce pode adaptar para TikTok, Reels do Facebook e outras plataformas de video curto.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000001', TRUE),

-- Sequencias de Stories
('Sequencias de Stories para Vender Muito - Informacoes e FAQ',
E'**O que e?**\nO Sequencias de Stories para Vender Muito e um guia estrategico criado por Julia Ottoni com scripts e orientacoes para criar stories no Instagram que realmente convertem. Ele mostra, passo a passo, como apresentar seu servico, criar conexao, responder objecoes e fazer ofertas irresistiveis.\n\n**Para que serve?**\nServe para transformar stories em um canal de vendas ativo e eficiente, ajudando a apresentar servicos de forma clara, mostrar resultados, gerar desejo e levar o seguidor a acao.\n\n**Acesso:** Valido por 1 ano.\n\n**Preciso seguir exatamente as sequencias?** Nao. Voce pode seguir a risca ou adaptar os exemplos e linguagem para o seu negocio.\n\n**Funciona para qualquer nicho?** Sim. As estrategias e estruturas funcionam para qualquer area de atuacao.\n\n**Preciso aparecer nos stories?** E recomendado, pois aumenta a conexao, mas e possivel adaptar para imagens, textos e videos de bastidores ou produtos.\n\n**Posso usar fora do Instagram?** Sim. As sequencias podem ser adaptadas para reels, lives, TikTok e outras plataformas visuais.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000002', TRUE),

-- Gatilhos Mentais
('Gatilhos Mentais: 16 Ganchos Poderosos - Informacoes e FAQ',
E'**O que e?**\nO Gatilhos Mentais - 16 Ganchos Poderosos para Engajar e Vender e um material criado por Julia Ottoni com frases de abertura (ganchos) prontas para Reels e conteudos de Instagram. Dividido em categorias estrategicas como dor e desejo, curiosidade e quebra de objecoes.\n\n**Para que serve?**\nServe para ajudar empreendedoras a iniciarem seus conteudos de forma impactante, prendendo a atencao do publico nos primeiros segundos. Potencializa o alcance e aumenta a taxa de retencao.\n\n**Acesso:** Valido por 1 ano.\n\n**Funcionam para qualquer nicho?** Sim. Basta personalizar os espacos em branco com termos, dores ou desejos especificos do seu publico.\n\n**Preciso usar exatamente como esta?** Nao. Voce pode usar literalmente ou adaptar para o seu estilo e comunicacao.\n\n**So posso usar em Reels?** Nao. Eles funcionam tambem para stories, posts, lives e ate anuncios pagos.\n\n**Os ganchos substituem o conteudo?** Nao. Eles sao apenas a abertura para chamar atencao - o conteudo e a entrega precisam sustentar a promessa inicial.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000003', TRUE),

-- Plano Pratico 7 Dias
('Plano Pratico: 7 Dias para Lotar a Sua Agenda - Informacoes e FAQ',
E'**O que e?**\nO Desafio 7 Dias para Lotar a Sua Agenda e um plano pratico criado por Julia Ottoni para ajudar empreendedoras e prestadoras de servico a atrairem mais clientes no Instagram em apenas uma semana. Traz acoes diarias com exercicios prontos que combinam estrategias de posicionamento, criacao de conteudo, prova social e gatilhos de urgencia.\n\n**Para que serve?**\nServe para acelerar resultados, transformando o perfil do Instagram em uma vitrine profissional que atrai e converte seguidores em clientes.\n\n**Acesso:** Valido por 1 ano.\n\n**Preciso seguir exatamente os 7 dias na ordem?** Sim. A sequencia foi criada para gerar impacto crescente.\n\n**Funciona para qualquer nicho?** Sim. Os exercicios podem ser adaptados para qualquer area.\n\n**Posso repetir o desafio?** Sim. Voce pode refazer sempre que precisar impulsionar suas vendas.\n\n**O que preciso ter antes de comecar?** Clareza sobre o seu servico, publico-alvo, diferenciais e um perfil de Instagram pronto para receber novos clientes (bio ajustada, conteudos alinhados e link de contato).',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000004', TRUE),

-- 6 Formas de Gravar Reels
('6 Formas de Gravar Reels Magneticos - Informacoes e FAQ',
E'**O que e?**\nO 6 Formas de Gravar Reels Magneticos e um material/treinamento criado por Julia Ottoni que apresenta seis formatos comprovados de videos curtos para Instagram, pensados para prender a atencao nos primeiros segundos e aumentar o engajamento.\n\n**Para que serve?**\nServe para ajudar empreendedoras a criar conteudos mais atrativos e com maior potencial de viralizacao no Instagram, gerando conexao com o publico e aumentando a chance de conversao em vendas.\n\n**Acesso:** Valido por 1 ano.\n\n**Funciona para qualquer nicho?** Sim. Os formatos podem ser adaptados para qualquer area.\n\n**Preciso aparecer nos videos?** Nao e obrigatorio, mas recomendado para criar mais conexao.\n\n**Posso usar em outras redes sociais?** Sim. Funcionam no TikTok, Kwai, Reels do Facebook e Shorts do YouTube.\n\n**Preciso de equipamentos profissionais?** Nao. E possivel aplicar usando apenas o celular, com boa iluminacao e enquadramento.\n\n**Esses formatos podem ser repetidos?** Sim. Voce pode reutilizar os mesmos modelos trocando o tema ou abordagem.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000005', TRUE),

-- Teste dos Arquetipos
('Teste dos Arquetipos - Informacoes e FAQ',
E'**O que e?**\nO Teste dos Arquetipos e uma ferramenta desenvolvida por Julia Ottoni para identificar quais arquetipos de marca predominam na sua comunicacao e personalidade empreendedora. O teste e simples, rapido e online, e ao final voce recebe um diagnostico detalhado com os tres arquetipos dominantes.\n\n**Para que serve?**\nServe para ajudar empreendedoras a construirem uma marca mais autentica, alinhada a sua essencia e capaz de gerar maior conexao emocional com o publico.\n\n**Acesso:** Permanente no link https://juliaottoni.com/teste-dos-arquetipos/\n\n**Preciso ter conhecimento previo sobre arquetipos?** Nao. Todo o conteudo e explicado de forma clara e pratica.\n\n**Recebo o resultado na hora?** Sim. Apos responder o teste, o resultado e gerado na hora, mas nao fica salvo. Por isso e muito importante anotar ou tirar um print da tela.\n\n**Posso aplicar os resultados sozinha?** Sim. O material traz dicas e exemplos para que voce possa comecar a aplicar de forma independente.\n\n**Esse teste e so para quem trabalha com Instagram?** Nao. Ele pode ser aplicado em qualquer negocio que queira melhorar o posicionamento e a comunicacao.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000006', TRUE),

-- Guia Looks de Cada Arquetipo
('Guia: Looks de Cada Arquetipo - Informacoes e FAQ',
E'**O que e?**\nO Guia - Os Looks de Cada Arquetipo e um material criado por Julia Ottoni que ensina como transmitir seus arquetipos de marca por meio das roupas. O guia mostra, para cada arquetipo, quais estilos, cores, tecidos e pecas-chave melhor expressam sua identidade.\n\n**Para que serve?**\nServe para ajudar empreendedoras a usarem o vestuario como ferramenta estrategica de vendas e branding. Ao aplicar as orientacoes, e possivel comunicar personalidade, transmitir autoridade e gerar desejo.\n\n**Acesso:** Valido por 1 ano.\n\n**Preciso saber meus arquetipos antes?** Sim, para aplicar de forma estrategica e ideal saber seus arquetipos - o Teste dos Arquetipos da Julia identifica isso.\n\n**Funciona para qualquer tipo de negocio?** Sim. O posicionamento visual ajuda a reforcar autoridade e gerar conexao.\n\n**Preciso comprar roupas novas?** Nao necessariamente. Voce pode adaptar o que ja tem no guarda-roupa.\n\n**O guia substitui uma consultoria de imagem?** Nao. Ele e um complemento pratico, mas nao substitui um trabalho personalizado com profissional de moda/estilo.\n\n**Posso combinar mais de um arquetipo?** Sim. Muitas empreendedoras tem arquetipos complementares e podem mesclar elementos de cada um.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000007', TRUE),

-- Posicionamento Magnetico
('Como Criar um Posicionamento Magnetico - Informacoes e FAQ',
E'**O que e?**\nO Posicionamento Magnetico e um guia estrategico e pratico criado por Julia Ottoni para prestadoras de servico, empresarias e profissionais liberais que desejam construir uma marca forte, autentica e memoravel usando os arquetipos como base. O material e dividido em capitulos que abordam desde a compreensao dos arquetipos ate a construcao de uma narrativa envolvente e implementacao de um plano de acao.\n\n**Para que serve?**\nServe para guiar a criacao ou reposicionamento de uma marca pessoal ou empresarial de forma estrategica e consistente. A empreendedora aprende a entender e aplicar seus arquetipos, identificar o publico-alvo, criar uma proposta de valor unica e construir uma narrativa que conecta emocionalmente com o cliente.\n\n**Acesso:** Valido por 1 ano.\n\n**Preciso conhecer meus arquetipos antes?** Sim. Identificar seus arquetipos e essencial para direcionar a comunicacao.\n\n**Funciona para qualquer area?** Sim. O metodo pode ser adaptado para diferentes areas de atuacao.\n\n**O guia substitui um curso de branding?** Nao. Ele e um material de aplicacao pratica que complementa e potencializa estrategias de branding.\n\n**Posso aplicar sozinha?** Sim, seguindo o passo a passo, mas o acompanhamento pode acelerar resultados.\n\n**Qual a entrega final?** Uma marca pessoal clara, consistente, alinhada a sua essencia e com um plano estruturado de comunicacao e posicionamento.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000008', TRUE),

-- Rotina de Stories
('Rotina de Stories de Cada Arquetipo - Informacoes e FAQ',
E'**O que e?**\nO Rotina de Stories para Cada Arquetipo e um planejamento semanal de stories criado pela Julia Ottoni, com sugestoes de conteudo para cada dia da semana alinhadas aos 12 arquetipos (Mago, Governante, Bobo da Corte, Amante, Rebelde, Criador, Inocente, Heroi, Sabio, Cuidador, Explorador, etc.).\n\n**Para que serve?**\nServe para manter consistencia e estrategia nos stories, fortalecendo posicionamento e conexao diaria com o publico. Ajuda a postar com clareza, conectar linguagem ao seu arquetipo e aumentar respostas, cliques e DMs.\n\n**Acesso:** Valido por 1 ano.\n\n**Preciso postar todos os dias?** Nao. Use a rotina como guia. Se nao der para postar todos os dias, priorize 3 a 5 dias e mantenha consistencia.\n\n**E se eu tiver mais de um arquetipo?** Escolha 1 dominante para ser a base e intercale elementos do 2o/3o arquetipo em dias especificos.\n\n**Nao sei meu arquetipo. Posso usar?** Pode, usando o que mais combina com voce. Mas o ideal e fazer o Teste dos Arquetipos para alinhar 100%.\n\n**Posso adaptar os temas para Reels e feed?** Sim. Transforme o tema do dia em Reels e use prints/recortes no feed.\n\n**Posso repetir a rotina todo mes?** Sim. Reaproveite a estrutura, mude exemplos, CTAs e provas sociais.\n\n**Como medir se esta funcionando?** Acompanhe respostas nas caixinhas, taxa de visualizacao/retencao, cliques no link da bio e DMs iniciadas apos os stories.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000009', TRUE),

-- Modelos Prontos de Conteudo para Vender Mais
('Modelos Prontos de Conteudo para Vender Mais - Informacoes e FAQ',
E'**O que e?**\nO Modelos de Conteudo e um material criado por Julia Ottoni que reune ideias e estruturas prontas para postagens estrategicas no Instagram. Inclui diferentes tipos de conteudos (educacionais, emocionais, de prova social, de oferta, entre outros). O acesso e feito por um quadro no Trello.\n\n**Para que serve?**\nServe para ajudar empreendedoras a criarem conteudo de forma rapida, consistente e estrategica, evitando bloqueio criativo e garantindo que cada post tenha um objetivo claro - seja engajar, gerar conexao ou vender.\n\n**Acesso:** Vitalicio ao quadro no Trello, desde que mantenha o link salvo e suas credenciais de acesso.\n\n**Funciona para qualquer nicho?** Sim. Os modelos sao adaptaveis a qualquer area de atuacao.\n\n**Os modelos ja vem prontos para postar?** Nao. Sao roteiros e estruturas para voce adaptar e criar seu proprio conteudo.\n\n**Preciso aparecer nos conteudos?** Nao e obrigatorio, mas conteudos com a sua presenca tendem a gerar mais conexao e engajamento.\n\n**Posso usar em outras redes sociais?** Sim. Os modelos podem ser adaptados para TikTok, Facebook, LinkedIn e YouTube Shorts.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000010', TRUE),

-- Templates de Posts
('Templates de Posts para um Feed Arquetipico - Informacoes e FAQ',
E'**O que e?**\nO Templates de Post para Arquetipos e um conjunto de modelos editaveis no Canva, criados por Julia Ottoni, desenvolvidos especialmente para os 12 arquetipos de marca. Cada pacote traz designs personalizados com cores, fontes, elementos e estilos visuais que reforcam a identidade de cada arquetipo.\n\n**Para que serve?**\nServe para ajudar empreendedoras a criarem conteudos visuais no Instagram de forma rapida, profissional e alinhada ao seu posicionamento de marca. Permite manter estetica coerente e atrativa no feed.\n\n**Acesso:** Valido por 1 ano.\n\n**Preciso saber design para usar?** Nao. Os modelos sao editaveis no Canva, que e uma ferramenta intuitiva e facil de usar.\n\n**Funciona para qualquer nicho?** Sim. O design e adaptavel, basta ajustar cores, textos e imagens.\n\n**Como faco para editar?** Baixe em PDF padrao, abra um novo design no Canva e faca upload do arquivo. Ele ficara disponivel para edicoes.\n\n**Os templates ja vem com conteudo escrito?** Alguns vem com textos de exemplo, mas a ideia e que voce personalize.\n\n**Preciso de assinatura paga do Canva?** Nao necessariamente. A maioria dos elementos funciona na versao gratuita do Canva.\n\n**Posso usar em outras redes?** Sim. Podem ser exportados e usados no Facebook, Pinterest, LinkedIn e ate materiais impressos.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000011', TRUE),

-- Maquinas de Conteudos IA
('Maquinas de Conteudos IA - Informacoes e FAQ',
E'**O que e?**\nO Maquinas de Conteudos e um GPT personalizado criado por Julia Ottoni para ajudar empreendedoras e prestadoras de servico a criarem conteudos para Instagram de forma pratica, estrategica e adaptada ao seu nicho, publico e principais dificuldades.\n\n**Para que serve?**\nServe para facilitar a criacao de conteudo, eliminando o bloqueio criativo e ajudando a manter consistencia nas postagens. Permite receber ideias prontas adaptadas ao seu segmento e persona, criar conteudos estrategicos e planejar postagens de forma rapida.\n\n**Acesso:** Valido por 1 ano.\n\n**Funciona para qualquer nicho?** Sim. O GPT e treinado para adaptar as sugestoes ao seu segmento.\n\n**Ele posta no Instagram por mim?** Nao. Ele cria as ideias, textos e roteiros, e voce faz a publicacao.\n\n**Preciso saber usar IA antes?** Nao. O uso e simples, basta fazer as perguntas ou pedir os conteudos.\n\n**Posso pedir mais de um formato para o mesmo tema?** Sim. Voce pode solicitar versoes para post, carrossel, reels ou stories sobre o mesmo assunto.\n\n**As sugestoes sao iguais para todos?** Nao. O GPT considera o seu nicho, publico e preferencias para gerar respostas personalizadas.\n\n**Ele substitui um social media?** Nao necessariamente. Ele e um facilitador, mas o toque humano e a estrategia geral continuam sendo importantes.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000012', TRUE),

-- Metodo Posicionamento Milionario
('Metodo Posicionamento Milionario - Informacoes e FAQ',
E'**O que e?**\nO Metodo Posicionamento Milionario e um programa criado por Julia Ottoni que ensina, passo a passo, como construir um posicionamento de marca autentico, estrategico e altamente lucrativo usando os arquetipos como base. Combina aulas praticas, materiais de apoio e exercicios aplicaveis.\n\n**Para que serve?**\nServe para ajudar mulheres empreendedoras a se posicionarem de forma clara e estrategica, transformando sua imagem e comunicacao em um diferencial competitivo. Com o metodo, e possivel descobrir e aplicar seus arquetipos, construir comunicacao coerente, aumentar o valor percebido e ticket medio, e atrair clientes ideais.\n\n**Acesso:** Valido por 1 ano.\n\n**Preciso saber meu arquetipo antes?** Nao. O metodo inclui o Teste dos Arquetipos para identificar seus dominantes.\n\n**Funciona so para Instagram?** Nao. As estrategias podem ser aplicadas em qualquer rede social ou presenca online.\n\n**E so sobre imagem?** Nao. O metodo aborda posicionamento de forma completa, incluindo comunicacao, estrategia e construcao de autoridade.\n\n**Serve para qualquer nicho?** Sim. Pode ser adaptado para diferentes areas, desde prestadoras de servico ate infoprodutoras.\n\n**Em quanto tempo vejo resultados?** Depende da aplicacao, mas muitas alunas notam aumento de autoridade e interesse do publico nas primeiras semanas.\n\n**Recebo acompanhamento da Julia?** Sim, dependendo da modalidade adquirida, ha suporte e feedback personalizado.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000013', TRUE),

-- Cronograma de Postagens 90 Dias
('Cronograma de Postagens 90 Dias - Informacoes e FAQ',
E'**O que e?**\nO Cronograma de Postagens - 90 Dias e um planejamento estrategico criado por Julia Ottoni para ajudar empreendedoras a manterem consistencia no Instagram. Traz 3 meses completos de sugestoes de conteudos diarios, equilibrando postagens de atracao, conexao, prova social e vendas.\n\n**Para que serve?**\nServe para facilitar a criacao e organizacao dos conteudos no Instagram, eliminando a duvida sobre "o que postar". Permite manter frequencia sem gastar horas pensando em ideias, alternar tipos de conteudo e planejar com antecedencia.\n\n**Acesso:** Valido por 1 ano.\n\n**Preciso seguir exatamente como esta?** Nao. Voce pode adaptar as ideias conforme seu nicho, publico e rotina.\n\n**Funciona para qualquer area?** Sim. O cronograma e generico o suficiente para servir de base a diferentes segmentos.\n\n**Inclui artes ou so ideias?** O produto e focado no planejamento de temas e formatos. As artes podem ser criadas por voce ou com templates complementares.\n\n**Posso repetir o mesmo cronograma depois?** Sim. E possivel reaplicar a sequencia, fazendo pequenas adaptacoes.\n\n**Serve so para Instagram?** Nao. A logica de distribuicao de conteudo pode ser adaptada para TikTok, Facebook, LinkedIn e outras redes.\n\n**Quanto tempo leva para implementar?** Voce pode comecar a aplicar imediatamente, ja que o material vem pronto e organizado.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000014', TRUE),

-- Metodo Maquina de Conteudos
('Metodo Maquina de Conteudos - Informacoes e FAQ',
E'**O que e?**\nO Metodo Maquina de Conteudos e um treinamento pratico criado por Julia Ottoni que ensina a produzir conteudos estrategicos para Instagram de forma rapida e personalizada, combinando os 50 Modelos de Conteudo com a inteligencia artificial do ChatGPT. E dividido em etapas que mostram desde a criacao da conta no ChatGPT ate como transformar cada modelo em roteiros magneticos.\n\n**Para que serve?**\nServe para ajudar empreendedoras a criarem conteudos de forma consistente e adaptada ao seu nicho, economizando tempo e eliminando bloqueios criativos. Permite transformar ideias em roteiros prontos para Reels, stories e carrosseis, gerar conteudos ilimitados e usar a IA de forma direcionada.\n\n**Acesso:** Valido por 1 ano.\n\n**Preciso ter experiencia com IA?** Nao. O metodo ensina do zero como criar sua conta e fazer pedidos que geram resultados.\n\n**Funciona para qualquer nicho?** Sim. Basta informar a IA o seu segmento e publico.\n\n**O ChatGPT cria o conteudo pronto para postar?** Ele cria a base. Voce deve revisar, adaptar e incluir sua personalidade para manter autenticidade.\n\n**Posso usar para formatos alem de Reels?** Sim. Os modelos podem ser adaptados para carrosseis, posts estaticos, stories e outros formatos.\n\n**Quanto tempo leva para aplicar?** Seguindo o metodo, e possivel criar semanas de conteudo em poucas horas.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000015', TRUE),

-- 100 Ideias de Conteudo
('100 Ideias de Conteudo - Informacoes e FAQ',
E'**O que e?**\nO 100 Ideias de Conteudo e um material criado por Julia Ottoni com uma lista extensa e variada de sugestoes de temas para postagens no Instagram, pensadas para atrair, engajar e vender. As ideias abrangem diferentes formatos como posts, stories, carrosseis e reels.\n\n**Para que serve?**\nServe para eliminar o bloqueio criativo e garantir consistencia nas postagens, oferecendo ideias prontas que podem ser adaptadas para diferentes estilos e estrategias. Permite ter sempre um banco de temas e otimizar o tempo de planejamento.\n\n**Acesso:** Valido por 1 ano.\n\n**As ideias funcionam para qualquer nicho?** Sim. Voce pode ajustar exemplos, linguagem e referencias para se adaptar ao seu mercado.\n\n**Preciso seguir todas as ideias na ordem?** Nao. Elas podem ser usadas de forma avulsa ou organizadas no seu proprio cronograma.\n\n**Inclui roteiros prontos?** Nao. Sao sugestoes de temas e abordagens, mas voce pode combina-las com modelos ou roteiros para criar o conteudo final.\n\n**Serve so para Instagram?** Nao. As ideias tambem podem ser adaptadas para TikTok, LinkedIn, Facebook e outras redes.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000016', TRUE),

-- Cores que Vendem
('Cores que Vendem - Informacoes e FAQ',
E'**O que e?**\nO Cores que Vendem e um material criado por Julia Ottoni que ensina como escolher e aplicar as cores ideais para o seu negocio de forma estrategica. Baseado em fundamentos de branding e psicologia das cores, o guia mostra como as cores influenciam emocoes, percepcoes e decisoes de compra.\n\n**Para que serve?**\nServe para ajudar empreendedoras a definirem uma paleta de cores que transmita a mensagem certa, fortaleca o posicionamento e aumente a percepcao de valor do negocio. Permite escolher cores alinhadas ao arquetipo e proposito da marca, criar combinacoes harmonicas e usar cores para gerar conexao emocional.\n\n**Acesso:** Valido por 1 ano.\n\n**Preciso ja ter um logotipo?** Nao. O guia pode ser usado tanto para criar a identidade visual do zero quanto para atualizar uma ja existente.\n\n**Serve para qualquer nicho?** Sim. A metodologia e adaptavel a qualquer area de atuacao.\n\n**Preciso usar apenas uma cor?** Nao. O guia explica como criar combinacoes estrategicas que incluem cores principais, secundarias e de apoio.\n\n**As cores escolhidas vao mudar meu posicionamento?** Elas reforcam e comunicam visualmente seu posicionamento, mas o branding envolve outros elementos alem das cores.\n\n**O guia ensina a aplicar as cores no Instagram?** Sim. Ele traz orientacoes para uso das cores em redes sociais e outros materiais visuais.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000017', TRUE),

-- Como Personalizar seu WhatsApp Business
('Como Personalizar seu WhatsApp Business - Informacoes e FAQ',
E'**O que e?**\nO Como Personalizar seu WhatsApp Business e um guia pratico que ensina a configurar e personalizar a conta do WhatsApp Business para torna-la mais profissional e eficiente no atendimento. Mostra como ajustar as informacoes da empresa, criar mensagens automaticas, organizar conversas e aplicar recursos que facilitam a comunicacao com clientes.\n\n**Para que serve?**\nServe para empreendedores que querem aproveitar todos os recursos do WhatsApp Business para otimizar o atendimento, aumentar a credibilidade e melhorar a experiencia do cliente. Permite configurar perfil comercial, criar mensagens automaticas, usar etiquetas e personalizar a comunicacao.\n\n**Acesso:** Valido por 1 ano.\n\n**Posso usar no WhatsApp comum?** Nao. Essas funcoes sao exclusivas do WhatsApp Business.\n\n**Preciso pagar para ter WhatsApp Business?** Nao. O aplicativo e gratuito e pode ser baixado na loja do seu celular.\n\n**Funciona para qualquer tipo de negocio?** Sim. E util para qualquer segmento que utilize WhatsApp como canal de comunicacao.\n\n**O guia ensina a criar catalogos?** Sim. Ele inclui orientacoes para criar e personalizar o catalogo de produtos/servicos.\n\n**As mensagens automaticas substituem o atendimento humano?** Nao. Elas agilizam o contato inicial, mas o atendimento personalizado continua sendo essencial.',
'Produtos Julia Ottoni', 'a1000000-0000-0000-0000-000000000018', TRUE);


-- ============================================
-- BASE DE CONHECIMENTO - PRODUTOS CLEITON
-- ============================================

INSERT INTO public.knowledge_base (title, content, category, product_id, is_active) VALUES

-- 50 Scripts Prontos para o WhatsApp
('50 Scripts Prontos para o WhatsApp - Informacoes e FAQ',
E'**O que e?**\nO 50 Scripts e um conjunto de 50 modelos prontos de mensagens persuasivas para WhatsApp, criados para ajudar empreendedores a aumentar suas vendas e otimizar o processo de atendimento. Com esses scripts, voce vai poder responder rapidamente a objecoes, engajar clientes de forma eficiente e fechar mais vendas sem perder tempo.\n\n**Para que serve?**\nServe para agilizar o atendimento e aumentar a taxa de conversao no WhatsApp, oferecendo respostas estrategicas e persuasivas para diferentes momentos da jornada de compra do cliente.\n\n**Acesso:** Valido por 1 ano.\n\n**Como acessar:**\n- Acesse: https://www.scriptgo.app/login\n- Login: Seu e-mail de compra\n- Senha padrao: 12345678 (voce ira trocar depois)\n\n**E adaptavel a qualquer nicho?** Sim. Os scripts sao estruturas que voce pode adaptar para o seu mercado, produto e linguagem.\n\n**Funciona para todos os processos de venda?** Sim. Os modelos cobrem diferentes etapas: primeiro contato, quebra de objecoes, follow-up e fechamento.\n\n**Preciso usar exatamente como esta escrito?** Nao. Os scripts sao modelos para voce adaptar ao seu estilo de comunicacao e realidade do negocio.\n\n**Posso usar em outras plataformas?** Sim. Embora pensados para WhatsApp, podem ser adaptados para e-mail, Instagram Direct, Telegram, etc.',
'Produtos Cleiton', 'a2000000-0000-0000-0000-000000000001', TRUE),

-- Quebrando Objecoes
('Quebrando Objecoes Facilmente - Informacoes e FAQ',
E'**O que e?**\nO Quebrando Objecoes e um treinamento estrategico focado em ajudar empreendedores a superar as objecoes mais comuns durante o processo de vendas. Com tecnicas comprovadas, voce aprendera a responder de forma persuasiva e eficaz, transformando objecoes em oportunidades de fechamento.\n\n**Para que serve?**\nServe para capacitar empreendedores a lidar com as principais resistencias dos clientes, usando estrategias de comunicacao que aumentam a confianca e facilitam o fechamento de vendas.\n\n**Acesso:** Valido por 1 ano.\n\n**Como acessar:**\n- Acesse: https://cleitonquerobin1.com.br/area-de-membros/\n- Login: Seu e-mail de compra\n- Senha: performance123\n\n**E adaptavel a qualquer nicho?** Sim. As tecnicas podem ser aplicadas em qualquer mercado e adaptadas para diferentes tipos de produto ou servico.\n\n**Funciona para vendas presenciais e online?** Sim. As estrategias funcionam tanto para atendimento digital quanto presencial.\n\n**Preciso ter experiencia em vendas?** Nao. O treinamento e feito para qualquer nivel, desde iniciantes ate vendedores experientes.',
'Produtos Cleiton', 'a2000000-0000-0000-0000-000000000002', TRUE),

-- Modelos de Audio Persuasivos
('Modelos de Audio Persuasivos para WhatsApp - Informacoes e FAQ',
E'**O que e?**\nOs Modelos de Audio Persuasivos para WhatsApp sao 50 roteiros de audios prontos para voce utilizar em suas conversas de vendas, desenvolvidos para engajar e converter clientes de forma rapida e eficaz. Com mensagens impactantes e persuasivas, esses audios ajudam a responder objecoes, destacar beneficios e fechar vendas de maneira mais fluida e natural.\n\n**Para que serve?**\nServe para humanizar o atendimento no WhatsApp, criando conexao mais forte com o cliente atraves da voz, aumentando a conversao de forma pratica e autentica.\n\n**Acesso:** Valido por 1 ano.\n\n**Como acessar:**\n- Acesse: https://cleitonquerobin1.com.br/area-de-membros/\n- Login: Seu e-mail de compra\n- Senha: performance123\n\n**E adaptavel a qualquer nicho?** Sim. Os roteiros podem ser personalizados para o seu mercado e estilo de comunicacao.\n\n**Preciso gravar com minha voz?** Sim. A ideia e usar sua propria voz para criar conexao e autenticidade com o cliente.\n\n**Os audios ja vem gravados?** Nao. Voce recebe os roteiros/scripts para gravar com sua voz.\n\n**Posso usar apenas os scripts em texto?** Sim, mas o diferencial e justamente usar em formato de audio para humanizar o atendimento.',
'Produtos Cleiton', 'a2000000-0000-0000-0000-000000000003', TRUE),

-- Estrategia 50 Clientes Novos
('Estrategia: 50 Clientes Novos Todos os Dias - Informacoes e FAQ',
E'**O que e?**\nE um curso que ensina a atrair de 50 a 100 novos clientes todos os dias usando 5 estrategias simples e validadas. O objetivo e fazer seu WhatsApp bombar de novos clientes te chamando, prontos para comprar, e aumentar suas vendas em 10 vezes mais.\n\n**Para que serve?**\nServe para empreendedores que querem escalar suas vendas atraves do WhatsApp, atraindo um fluxo constante de clientes qualificados e prontos para comprar.\n\n**Acesso:** Valido por 1 ano.\n\n**Como acessar:**\n- Acesse: https://cleitonquerobin1.com.br/area-de-membros/\n- Login: Seu e-mail de compra\n- Senha: performance123\n\n**E adaptavel a qualquer nicho?** Sim. As estrategias funcionam para diferentes mercados e podem ser ajustadas ao seu negocio.\n\n**Preciso investir em trafego pago?** Depende da estrategia escolhida. O curso apresenta 5 estrategias diferentes, algumas organicas e outras pagas.\n\n**Em quanto tempo vejo resultados?** Isso varia conforme a aplicacao e o nicho, mas muitos alunos reportam aumento de contatos ja nas primeiras semanas.\n\n**Preciso de equipe para aplicar?** Nao necessariamente. As estrategias podem ser aplicadas por voce mesmo, mas ter suporte pode acelerar os resultados.',
'Produtos Cleiton', 'a2000000-0000-0000-0000-000000000004', TRUE),

-- Implementacao IA
('Implementacao da Ferramenta de Inteligencia Artificial - Informacoes e FAQ',
E'**O que e?**\nE uma implementacao de Inteligencia Artificial personalizada, com aulas praticas para aplicar no seu negocio e acesso a IA por um periodo de teste. Essa IA ja vem pronta, com estrutura pensada para atendimento, vendas e qualificacao de leads no WhatsApp.\n\nInclui: um passo a passo completo de como usar IA para automatizar o atendimento no WhatsApp; uma ferramenta com 7 dias de teste gratis, alem da possibilidade de personalizar totalmente sua IA - desde tom de voz ate o tipo de informacao que ela entrega.\n\n**Para que serve?**\nVoce adquire a implementacao, recebe acesso a uma area de membros com um passo a passo super simples. Em 30 minutos, voce conecta a IA ao seu WhatsApp. A partir dai, ela comeca a responder seus clientes automaticamente, 24h por dia, de forma inteligente e personalizada. A IA entende o que o cliente quer, envia mensagens persuasivas, quebra objecoes e ajuda a conduzir o atendimento ate o fechamento.\n\nAlem disso, voce consegue acompanhar tudo com dados reais: quantas pessoas chamaram, quantas avancaram no funil, onde estao parando e o que pode melhorar.\n\n**Acesso:** Valido por 1 ano ao material de implementacao. A ferramenta de IA tem 7 dias de teste gratis. Apos o teste, ha uma assinatura mensal para continuar usando.\n\n**Como acessar:**\n- Acesse: https://cleitonquerobin1.com.br/area-de-membros/\n- Login: Seu e-mail de compra\n- Senha: performance123\n\n**Tenho que pagar mais algum valor alem dos R$29,90?**\nO que voce adquiriu por R$29,90 foi a implementacao de IA personalizada com aulas praticas e acesso a IA por periodo de teste de 7 dias. Se voce for buscar no mercado uma solucao similar, os valores geralmente comecam em R$10 mil a R$30 mil. O acesso ao plano mensal so e cobrado depois do periodo de teste gratuito. Nos primeiros 7 dias voce usa a IA totalmente de graca. A assinatura so comeca se voce quiser continuar depois.\n\n**E adaptavel a qualquer nicho?** Sim, mas funciona melhor em alguns processos de venda especificos no WhatsApp. A IA pode ser totalmente personalizada para o seu negocio.\n\n**Preciso saber programar?** Nao. O passo a passo e simples e voce consegue implementar em cerca de 30 minutos.\n\n**A IA substitui completamente o atendimento humano?** Nao. Ela automatiza a primeira etapa do atendimento, qualifica leads e ajuda a conduzir ate o fechamento. Para situacoes mais complexas, o atendimento humano continua sendo importante.\n\n**Consigo personalizar o tom de voz da IA?** Sim. Voce pode configurar o tom de voz, tipo de informacoes fornecidas e comportamento da IA para que ela atenda exatamente como voce gostaria.',
'Produtos Cleiton', 'a2000000-0000-0000-0000-000000000005', TRUE);


-- ============================================
-- ATUALIZAR SYSTEM PROMPT DA SOFIA
-- ============================================

UPDATE public.ai_config
SET config_value = E'Voce e a assistente virtual de suporte da Bethel. Seu nome e Sofia.\n\nVoce atende clientes que compraram produtos digitais low ticket da Julia Ottoni e do Cleiton (Bethel).\n\nPRODUTOS JULIA OTTONI:\n- 50 Modelos de Conteudo\n- Sequencias de Stories para Vender Muito\n- Gatilhos Mentais: 16 Ganchos Poderosos\n- Plano Pratico: 7 Dias para Lotar a Sua Agenda\n- 6 Formas de Gravar Reels Magneticos\n- Teste dos Arquetipos\n- Guia: Looks de Cada Arquetipo\n- Como Criar um Posicionamento Magnetico\n- Rotina de Stories de Cada Arquetipo\n- Modelos Prontos de Conteudo para Vender Mais\n- Templates de Posts para um Feed Arquetipico\n- Maquinas de Conteudos IA\n- Metodo Posicionamento Milionario\n- Cronograma de Postagens 90 Dias\n- Metodo Maquina de Conteudos\n- 100 Ideias de Conteudo\n- Cores que Vendem\n- Como Personalizar seu WhatsApp Business\n\nPRODUTOS CLEITON:\n- 50 Scripts Prontos para o WhatsApp\n- Quebrando Objecoes Facilmente\n- Modelos de Audio Persuasivos para WhatsApp\n- Estrategia: 50 Clientes Novos Todos os Dias\n- Implementacao da Ferramenta de Inteligencia Artificial\n\nREGRAS:\n1. Responda APENAS com base nas informacoes fornecidas no contexto dos artigos da base de conhecimento.\n2. Se a informacao nao estiver no contexto, diga que nao encontrou a resposta e sugira que o cliente abra um ticket para atendimento humano.\n3. Seja educada, objetiva e empatica.\n4. Use linguagem simples e clara, em portugues do Brasil.\n5. Nao invente informacoes. Nao alucine.\n6. Se o cliente estiver com raiva ou frustrado, acolha primeiro e depois responda.\n7. Formate suas respostas de forma organizada quando necessario.\n8. NUNCA compartilhe informacoes tecnicas internas do sistema.\n9. Para problemas de acesso, sempre pergunte qual produto o cliente comprou para dar as instrucoes corretas.\n10. Se nao souber a resposta, direcione para o suporte humano via WhatsApp: wa.me/5549998402162\n11. Horario de atendimento do suporte humano: Segunda a sexta, 8h30 as 20h.'
WHERE config_key = 'system_prompt';

-- Adicionar nome da IA se nao existir
INSERT INTO public.ai_config (config_key, config_value)
VALUES ('ai_name', 'Sofia')
ON CONFLICT (config_key) DO NOTHING;
