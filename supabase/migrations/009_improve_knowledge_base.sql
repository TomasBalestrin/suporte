-- ============================================
-- MIGRATION 009: Melhoria da Base de Conhecimento
-- Reescrita dos artigos com acentuação correta
-- e redução do threshold de confiança da IA
-- ============================================

-- Reduzir threshold de confiança para melhorar respostas da Sofia
UPDATE public.ai_config SET config_value = '0.5' WHERE config_key = 'confidence_threshold';
INSERT INTO public.ai_config (config_key, config_value) VALUES ('confidence_threshold', '0.5') ON CONFLICT (config_key) DO NOTHING;

-- ============================================
-- ATUALIZAR ARTIGOS GERAIS COM ACENTUAÇÃO
-- ============================================

UPDATE public.knowledge_base SET
  title = 'Como acessar meu produto após a compra',
  content = E'Para acessar seu produto após a compra, siga as instruções de acordo com o tipo de produto:\n\n**Produtos da Julia Ottoni:**\n- Acesse: https://juliaacademy.com.br/\n- Login: Seu e-mail de compra\n- Senha: ottoni123\n\n**Produtos do Cleiton:**\n- Acesse: https://cleitonquerobin1.com.br/area-de-membros/\n- Login: Seu e-mail de compra\n- Senha: performance123\n\n**50 Scripts:**\n- Acesse: https://www.scriptgo.app/login\n- Login: Seu e-mail de compra\n- Senha padrão: Script@123 (você irá trocar depois)\n\n**Couply:**\n- Acesse: www.usecouply.app/login\n- Login: Seu e-mail de compra\n- Senha padrão: 12345678 (você irá trocar depois)\n\n**Teste dos Arquétipos:**\n- Acesse: https://juliaottoni.com/teste-dos-arquetipos/'
WHERE title = 'Como acessar meu produto apos a compra';

UPDATE public.knowledge_base SET
  title = 'Não consigo acessar minha conta - problemas de login',
  content = E'Se você não consegue acessar sua conta, siga estes passos:\n\n1. Verifique se está usando o e-mail correto (o mesmo usado na compra)\n2. Use a senha padrão do produto:\n   - Produtos Julia Ottoni: ottoni123\n   - Produtos Cleiton: performance123\n   - 50 Scripts: Script@123\n   - Couply: 12345678\n3. Verifique se está acessando a plataforma correta do seu produto\n\nSe mesmo assim não conseguir, abra um ticket na plataforma de suporte informando:\n- Nome completo\n- E-mail de compra\n- Nome do produto adquirido'
WHERE title = 'Nao consigo acessar minha conta - problemas de login';

UPDATE public.knowledge_base SET
  title = 'Quais são as formas de pagamento',
  content = E'Aceitamos as seguintes formas de pagamento:\n\n- **PIX**: Pagamento à vista\n- **Cartão de crédito**: Parcelamento em até 12x\n\nOs pagamentos são processados pelas plataformas Hotmart ou Pagtrust.'
WHERE title = 'Quais sao as formas de pagamento';

UPDATE public.knowledge_base SET
  title = 'Garantia e reembolso - como funciona',
  content = E'Sim! Você tem **7 dias de garantia** a partir da data da compra.\n\nPara solicitar o reembolso, basta entrar em contato através da própria plataforma de compra (Hotmart ou Pagtrust) onde realizou a aquisição.\n\nO prazo de 7 dias é contado a partir da data de confirmação da compra.'
WHERE title = 'Garantia e reembolso - como funciona';

UPDATE public.knowledge_base SET
  title = 'Horário de atendimento do suporte',
  content = E'Nosso horário oficial de atendimento é:\n\n- **Segunda a sexta-feira**: 8h30 às 20h\n\nObservação: Eventualmente atendemos além do horário e aos finais de semana, mas não como algo fixo.'
WHERE title = 'Horario de atendimento do suporte';

UPDATE public.knowledge_base SET
  title = 'Por quanto tempo terei acesso ao produto',
  content = E'O tempo de acesso varia conforme o produto:\n\n- **Maioria dos produtos**: Acesso válido por **1 ano** a partir da data da compra\n- **Materiais em Trello** (como 50 Modelos de Conteúdo e Modelos Prontos de Conteúdo para Vender Mais): Acesso **vitalício**, desde que você mantenha seus dados de acesso salvos\n- **Teste dos Arquétipos**: Disponível permanentemente no link https://juliaottoni.com/teste-dos-arquetipos/\n\nConsulte a descrição específica do seu produto para confirmar o prazo.'
WHERE title = 'Por quanto tempo terei acesso ao produto';

UPDATE public.knowledge_base SET
  title = 'Posso acessar os produtos pelo celular',
  content = E'Sim! Todos os produtos são acessíveis por **computador, tablet e celular**. Basta acessar a plataforma correspondente pelo navegador do seu dispositivo.'
WHERE title = 'Posso acessar os produtos pelo celular';

UPDATE public.knowledge_base SET
  title = 'Não recebi o e-mail de confirmação da compra',
  content = E'Se você não recebeu o e-mail de confirmação após a compra:\n\n1. **Verifique sua caixa de spam ou lixo eletrônico** - muitas vezes o e-mail vai para lá\n2. Aguarde alguns minutos, pois pode haver um pequeno atraso\n\nO produto também é enviado por WhatsApp, porém esse não é um canal de suporte.\n\nSe não encontrar, abra um ticket na plataforma de suporte informando:\n- Nome completo\n- E-mail de compra\n- Nome do produto'
WHERE title = 'Nao recebi o e-mail de confirmacao da compra';

UPDATE public.knowledge_base SET
  title = 'Posso compartilhar meu acesso com outras pessoas',
  content = E'**Não.** O acesso é individual e intransferível, vinculado ao e-mail de compra.\n\nO compartilhamento de credenciais pode resultar no **bloqueio da conta**.'
WHERE title = 'Posso compartilhar meu acesso com outras pessoas';

UPDATE public.knowledge_base SET
  title = 'Tenho dúvidas sobre como aplicar o conteúdo do produto',
  content = E'Sim! Nossa equipe de suporte pode tirar dúvidas sobre como usar e aplicar os materiais.\n\nAbra um ticket na plataforma de suporte para que possamos ajudar.\n\nHorário de atendimento: Segunda a sexta-feira, das 8h30 às 20h.'
WHERE title = 'Tenho duvidas sobre como aplicar o conteudo do produto';

-- ============================================
-- ATUALIZAR ARTIGOS PRODUTOS JULIA OTTONI
-- ============================================

UPDATE public.knowledge_base SET
  title = '50 Modelos de Conteúdo - Informações e FAQ',
  content = E'**O que é?**\nO 50 Modelos de Conteúdo é um quadro no Trello com cinquenta ideias e roteiros prontos para postagens no Instagram. Cada modelo vem acompanhado de explicação, exemplos e instruções para que você adapte ao seu nicho e grave seus próprios vídeos, mantendo autenticidade e conexão com seu público.\n\n**Para que serve?**\nServe para ajudar empreendedoras e prestadoras de serviço a criarem conteúdo estratégico de forma mais rápida e prática, economizando tempo e evitando bloqueios criativos. O objetivo é aumentar o engajamento, atrair clientes e gerar vendas no Instagram.\n\n**Acesso:** Vitalício ao quadro no Trello, desde que mantenha seus dados de acesso salvos.\n\n**Preciso aparecer nos vídeos?** Não obrigatoriamente, mas para melhores resultados, é recomendado adaptar os roteiros para o seu estilo e gravar com sua presença.\n\n**Funciona para qualquer nicho?** Sim, os modelos são adaptáveis para qualquer área.\n\n**Já vem pronto para postar?** Não. São modelos para você se inspirar, com explicação e exemplos. Você precisa adaptar e gravar seus vídeos de acordo com o seu nicho.\n\n**Posso usar fora do Instagram?** Sim, você pode adaptar para TikTok, Reels do Facebook e outras plataformas de vídeo curto.'
WHERE title = '50 Modelos de Conteudo - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Sequências de Stories para Vender Muito - Informações e FAQ',
  content = E'**O que é?**\nO Sequências de Stories para Vender Muito é um guia estratégico criado por Julia Ottoni com scripts e orientações para criar stories no Instagram que realmente convertem. Ele mostra, passo a passo, como apresentar seu serviço, criar conexão, responder objeções e fazer ofertas irresistíveis.\n\n**Para que serve?**\nServe para transformar stories em um canal de vendas ativo e eficiente, ajudando a apresentar serviços de forma clara, mostrar resultados, gerar desejo e levar o seguidor à ação.\n\n**Acesso:** Válido por 1 ano.\n\n**Preciso seguir exatamente as sequências?** Não. Você pode seguir à risca ou adaptar os exemplos e linguagem para o seu negócio.\n\n**Funciona para qualquer nicho?** Sim. As estratégias e estruturas funcionam para qualquer área de atuação.\n\n**Preciso aparecer nos stories?** É recomendado, pois aumenta a conexão, mas é possível adaptar para imagens, textos e vídeos de bastidores ou produtos.\n\n**Posso usar fora do Instagram?** Sim. As sequências podem ser adaptadas para reels, lives, TikTok e outras plataformas visuais.'
WHERE title = 'Sequencias de Stories para Vender Muito - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Gatilhos Mentais: 16 Ganchos Poderosos - Informações e FAQ',
  content = E'**O que é?**\nO Gatilhos Mentais - 16 Ganchos Poderosos para Engajar e Vender é um material criado por Julia Ottoni com frases de abertura (ganchos) prontas para Reels e conteúdos de Instagram. Dividido em categorias estratégicas como dor e desejo, curiosidade e quebra de objeções.\n\n**Para que serve?**\nServe para ajudar empreendedoras a iniciarem seus conteúdos de forma impactante, prendendo a atenção do público nos primeiros segundos. Potencializa o alcance e aumenta a taxa de retenção.\n\n**Acesso:** Válido por 1 ano.\n\n**Funcionam para qualquer nicho?** Sim. Basta personalizar os espaços em branco com termos, dores ou desejos específicos do seu público.\n\n**Preciso usar exatamente como está?** Não. Você pode usar literalmente ou adaptar para o seu estilo e comunicação.\n\n**Só posso usar em Reels?** Não. Eles funcionam também para stories, posts, lives e até anúncios pagos.\n\n**Os ganchos substituem o conteúdo?** Não. Eles são apenas a abertura para chamar atenção - o conteúdo e a entrega precisam sustentar a promessa inicial.'
WHERE title = 'Gatilhos Mentais: 16 Ganchos Poderosos - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Plano Prático: 7 Dias para Lotar a Sua Agenda - Informações e FAQ',
  content = E'**O que é?**\nO Desafio 7 Dias para Lotar a Sua Agenda é um plano prático criado por Julia Ottoni para ajudar empreendedoras e prestadoras de serviço a atraírem mais clientes no Instagram em apenas uma semana. Traz ações diárias com exercícios prontos que combinam estratégias de posicionamento, criação de conteúdo, prova social e gatilhos de urgência.\n\n**Para que serve?**\nServe para acelerar resultados, transformando o perfil do Instagram em uma vitrine profissional que atrai e converte seguidores em clientes.\n\n**Acesso:** Válido por 1 ano.\n\n**Preciso seguir exatamente os 7 dias na ordem?** Sim. A sequência foi criada para gerar impacto crescente.\n\n**Funciona para qualquer nicho?** Sim. Os exercícios podem ser adaptados para qualquer área.\n\n**Posso repetir o desafio?** Sim. Você pode refazer sempre que precisar impulsionar suas vendas.\n\n**O que preciso ter antes de começar?** Clareza sobre o seu serviço, público-alvo, diferenciais e um perfil de Instagram pronto para receber novos clientes (bio ajustada, conteúdos alinhados e link de contato).'
WHERE title = 'Plano Pratico: 7 Dias para Lotar a Sua Agenda - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = '6 Formas de Gravar Reels Magnéticos - Informações e FAQ',
  content = E'**O que é?**\nO 6 Formas de Gravar Reels Magnéticos é um material/treinamento criado por Julia Ottoni que apresenta seis formatos comprovados de vídeos curtos para Instagram, pensados para prender a atenção nos primeiros segundos e aumentar o engajamento.\n\n**Para que serve?**\nServe para ajudar empreendedoras a criar conteúdos mais atrativos e com maior potencial de viralização no Instagram, gerando conexão com o público e aumentando a chance de conversão em vendas.\n\n**Acesso:** Válido por 1 ano.\n\n**Funciona para qualquer nicho?** Sim. Os formatos podem ser adaptados para qualquer área.\n\n**Preciso aparecer nos vídeos?** Não é obrigatório, mas recomendado para criar mais conexão.\n\n**Posso usar em outras redes sociais?** Sim. Funcionam no TikTok, Kwai, Reels do Facebook e Shorts do YouTube.\n\n**Preciso de equipamentos profissionais?** Não. É possível aplicar usando apenas o celular, com boa iluminação e enquadramento.\n\n**Esses formatos podem ser repetidos?** Sim. Você pode reutilizar os mesmos modelos trocando o tema ou abordagem.'
WHERE title = '6 Formas de Gravar Reels Magneticos - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Teste dos Arquétipos - Informações e FAQ',
  content = E'**O que é?**\nO Teste dos Arquétipos é uma ferramenta desenvolvida por Julia Ottoni para identificar quais arquétipos de marca predominam na sua comunicação e personalidade empreendedora. O teste é simples, rápido e online, e ao final você recebe um diagnóstico detalhado com os três arquétipos dominantes.\n\n**Para que serve?**\nServe para ajudar empreendedoras a construírem uma marca mais autêntica, alinhada à sua essência e capaz de gerar maior conexão emocional com o público.\n\n**Acesso:** Permanente no link https://juliaottoni.com/teste-dos-arquetipos/\n\n**Preciso ter conhecimento prévio sobre arquétipos?** Não. Todo o conteúdo é explicado de forma clara e prática.\n\n**Recebo o resultado na hora?** Sim. Após responder o teste, o resultado é gerado na hora, mas não fica salvo. Por isso é muito importante anotar ou tirar um print da tela.\n\n**Posso aplicar os resultados sozinha?** Sim. O material traz dicas e exemplos para que você possa começar a aplicar de forma independente.\n\n**Esse teste é só para quem trabalha com Instagram?** Não. Ele pode ser aplicado em qualquer negócio que queira melhorar o posicionamento e a comunicação.'
WHERE title = 'Teste dos Arquetipos - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Guia: Looks de Cada Arquétipo - Informações e FAQ',
  content = E'**O que é?**\nO Guia - Os Looks de Cada Arquétipo é um material criado por Julia Ottoni que ensina como transmitir seus arquétipos de marca por meio das roupas. O guia mostra, para cada arquétipo, quais estilos, cores, tecidos e peças-chave melhor expressam sua identidade.\n\n**Para que serve?**\nServe para ajudar empreendedoras a usarem o vestuário como ferramenta estratégica de vendas e branding. Ao aplicar as orientações, é possível comunicar personalidade, transmitir autoridade e gerar desejo.\n\n**Acesso:** Válido por 1 ano.\n\n**Preciso saber meus arquétipos antes?** Sim, para aplicar de forma estratégica é ideal saber seus arquétipos - o Teste dos Arquétipos da Julia identifica isso.\n\n**Funciona para qualquer tipo de negócio?** Sim. O posicionamento visual ajuda a reforçar autoridade e gerar conexão.\n\n**Preciso comprar roupas novas?** Não necessariamente. Você pode adaptar o que já tem no guarda-roupa.\n\n**O guia substitui uma consultoria de imagem?** Não. Ele é um complemento prático, mas não substitui um trabalho personalizado com profissional de moda/estilo.\n\n**Posso combinar mais de um arquétipo?** Sim. Muitas empreendedoras têm arquétipos complementares e podem mesclar elementos de cada um.'
WHERE title = 'Guia: Looks de Cada Arquetipo - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Como Criar um Posicionamento Magnético - Informações e FAQ',
  content = E'**O que é?**\nO Posicionamento Magnético é um guia estratégico e prático criado por Julia Ottoni para prestadoras de serviço, empresárias e profissionais liberais que desejam construir uma marca forte, autêntica e memorável usando os arquétipos como base. O material é dividido em capítulos que abordam desde a compreensão dos arquétipos até a construção de uma narrativa envolvente e implementação de um plano de ação.\n\n**Para que serve?**\nServe para guiar a criação ou reposicionamento de uma marca pessoal ou empresarial de forma estratégica e consistente. A empreendedora aprende a entender e aplicar seus arquétipos, identificar o público-alvo, criar uma proposta de valor única e construir uma narrativa que conecta emocionalmente com o cliente.\n\n**Acesso:** Válido por 1 ano.\n\n**Preciso conhecer meus arquétipos antes?** Sim. Identificar seus arquétipos é essencial para direcionar a comunicação.\n\n**Funciona para qualquer área?** Sim. O método pode ser adaptado para diferentes áreas de atuação.\n\n**O guia substitui um curso de branding?** Não. Ele é um material de aplicação prática que complementa e potencializa estratégias de branding.\n\n**Posso aplicar sozinha?** Sim, seguindo o passo a passo, mas o acompanhamento pode acelerar resultados.\n\n**Qual a entrega final?** Uma marca pessoal clara, consistente, alinhada à sua essência e com um plano estruturado de comunicação e posicionamento.'
WHERE title = 'Como Criar um Posicionamento Magnetico - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Rotina de Stories de Cada Arquétipo - Informações e FAQ',
  content = E'**O que é?**\nO Rotina de Stories para Cada Arquétipo é um planejamento semanal de stories criado pela Julia Ottoni, com sugestões de conteúdo para cada dia da semana alinhadas aos 12 arquétipos (Mago, Governante, Bobo da Corte, Amante, Rebelde, Criador, Inocente, Herói, Sábio, Cuidador, Explorador, etc.).\n\n**Para que serve?**\nServe para manter consistência e estratégia nos stories, fortalecendo posicionamento e conexão diária com o público. Ajuda a postar com clareza, conectar linguagem ao seu arquétipo e aumentar respostas, cliques e DMs.\n\n**Acesso:** Válido por 1 ano.\n\n**Preciso postar todos os dias?** Não. Use a rotina como guia. Se não der para postar todos os dias, priorize 3 a 5 dias e mantenha consistência.\n\n**E se eu tiver mais de um arquétipo?** Escolha 1 dominante para ser a base e intercale elementos do 2º/3º arquétipo em dias específicos.\n\n**Não sei meu arquétipo. Posso usar?** Pode, usando o que mais combina com você. Mas o ideal é fazer o Teste dos Arquétipos para alinhar 100%.\n\n**Posso adaptar os temas para Reels e feed?** Sim. Transforme o tema do dia em Reels e use prints/recortes no feed.\n\n**Posso repetir a rotina todo mês?** Sim. Reaproveite a estrutura, mude exemplos, CTAs e provas sociais.\n\n**Como medir se está funcionando?** Acompanhe respostas nas caixinhas, taxa de visualização/retenção, cliques no link da bio e DMs iniciadas após os stories.'
WHERE title = 'Rotina de Stories de Cada Arquetipo - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Modelos Prontos de Conteúdo para Vender Mais - Informações e FAQ',
  content = E'**O que é?**\nO Modelos de Conteúdo é um material criado por Julia Ottoni que reúne ideias e estruturas prontas para postagens estratégicas no Instagram. Inclui diferentes tipos de conteúdos (educacionais, emocionais, de prova social, de oferta, entre outros). O acesso é feito por um quadro no Trello.\n\n**Para que serve?**\nServe para ajudar empreendedoras a criarem conteúdo de forma rápida, consistente e estratégica, evitando bloqueio criativo e garantindo que cada post tenha um objetivo claro - seja engajar, gerar conexão ou vender.\n\n**Acesso:** Vitalício ao quadro no Trello, desde que mantenha o link salvo e suas credenciais de acesso.\n\n**Funciona para qualquer nicho?** Sim. Os modelos são adaptáveis a qualquer área de atuação.\n\n**Os modelos já vem prontos para postar?** Não. São roteiros e estruturas para você adaptar e criar seu próprio conteúdo.\n\n**Preciso aparecer nos conteúdos?** Não é obrigatório, mas conteúdos com a sua presença tendem a gerar mais conexão e engajamento.\n\n**Posso usar em outras redes sociais?** Sim. Os modelos podem ser adaptados para TikTok, Facebook, LinkedIn e YouTube Shorts.'
WHERE title = 'Modelos Prontos de Conteudo para Vender Mais - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Templates de Posts para um Feed Arquetípico - Informações e FAQ',
  content = E'**O que é?**\nO Templates de Post para Arquétipos é um conjunto de modelos editáveis no Canva, criados por Julia Ottoni, desenvolvidos especialmente para os 12 arquétipos de marca. Cada pacote traz designs personalizados com cores, fontes, elementos e estilos visuais que reforçam a identidade de cada arquétipo.\n\n**Para que serve?**\nServe para ajudar empreendedoras a criarem conteúdos visuais no Instagram de forma rápida, profissional e alinhada ao seu posicionamento de marca. Permite manter estética coerente e atrativa no feed.\n\n**Acesso:** Válido por 1 ano.\n\n**Preciso saber design para usar?** Não. Os modelos são editáveis no Canva, que é uma ferramenta intuitiva e fácil de usar.\n\n**Funciona para qualquer nicho?** Sim. O design é adaptável, basta ajustar cores, textos e imagens.\n\n**Como faço para editar?** Baixe em PDF padrão, abra um novo design no Canva e faça upload do arquivo. Ele ficará disponível para edições.\n\n**Os templates já vem com conteúdo escrito?** Alguns vem com textos de exemplo, mas a ideia é que você personalize.\n\n**Preciso de assinatura paga do Canva?** Não necessariamente. A maioria dos elementos funciona na versão gratuita do Canva.\n\n**Posso usar em outras redes?** Sim. Podem ser exportados e usados no Facebook, Pinterest, LinkedIn e até materiais impressos.'
WHERE title = 'Templates de Posts para um Feed Arquetipico - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Máquinas de Conteúdos IA - Informações e FAQ',
  content = E'**O que é?**\nO Máquinas de Conteúdos é um GPT personalizado criado por Julia Ottoni para ajudar empreendedoras e prestadoras de serviço a criarem conteúdos para Instagram de forma prática, estratégica e adaptada ao seu nicho, público e principais dificuldades.\n\n**Para que serve?**\nServe para facilitar a criação de conteúdo, eliminando o bloqueio criativo e ajudando a manter consistência nas postagens. Permite receber ideias prontas adaptadas ao seu segmento e persona, criar conteúdos estratégicos e planejar postagens de forma rápida.\n\n**Acesso:** Válido por 1 ano.\n\n**Funciona para qualquer nicho?** Sim. O GPT é treinado para adaptar as sugestões ao seu segmento.\n\n**Ele posta no Instagram por mim?** Não. Ele cria as ideias, textos e roteiros, e você faz a publicação.\n\n**Preciso saber usar IA antes?** Não. O uso é simples, basta fazer as perguntas ou pedir os conteúdos.\n\n**Posso pedir mais de um formato para o mesmo tema?** Sim. Você pode solicitar versões para post, carrossel, reels ou stories sobre o mesmo assunto.\n\n**As sugestões são iguais para todos?** Não. O GPT considera o seu nicho, público e preferências para gerar respostas personalizadas.\n\n**Ele substitui um social media?** Não necessariamente. Ele é um facilitador, mas o toque humano e a estratégia geral continuam sendo importantes.'
WHERE title = 'Maquinas de Conteudos IA - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Método Posicionamento Milionário - Informações e FAQ',
  content = E'**O que é?**\nO Método Posicionamento Milionário é um programa criado por Julia Ottoni que ensina, passo a passo, como construir um posicionamento de marca autêntico, estratégico e altamente lucrativo usando os arquétipos como base. Combina aulas práticas, materiais de apoio e exercícios aplicáveis.\n\n**Para que serve?**\nServe para ajudar mulheres empreendedoras a se posicionarem de forma clara e estratégica, transformando sua imagem e comunicação em um diferencial competitivo. Com o método, é possível descobrir e aplicar seus arquétipos, construir comunicação coerente, aumentar o valor percebido e ticket médio, e atrair clientes ideais.\n\n**Acesso:** Válido por 1 ano.\n\n**Preciso saber meu arquétipo antes?** Não. O método inclui o Teste dos Arquétipos para identificar seus dominantes.\n\n**Funciona só para Instagram?** Não. As estratégias podem ser aplicadas em qualquer rede social ou presença online.\n\n**É só sobre imagem?** Não. O método aborda posicionamento de forma completa, incluindo comunicação, estratégia e construção de autoridade.\n\n**Serve para qualquer nicho?** Sim. Pode ser adaptado para diferentes áreas, desde prestadoras de serviço até infoprodutoras.\n\n**Em quanto tempo vejo resultados?** Depende da aplicação, mas muitas alunas notam aumento de autoridade e interesse do público nas primeiras semanas.\n\n**Recebo acompanhamento da Julia?** Sim, dependendo da modalidade adquirida, há suporte e feedback personalizado.'
WHERE title = 'Metodo Posicionamento Milionario - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Cronograma de Postagens 90 Dias - Informações e FAQ',
  content = E'**O que é?**\nO Cronograma de Postagens - 90 Dias é um planejamento estratégico criado por Julia Ottoni para ajudar empreendedoras a manterem consistência no Instagram. Traz 3 meses completos de sugestões de conteúdos diários, equilibrando postagens de atração, conexão, prova social e vendas.\n\n**Para que serve?**\nServe para facilitar a criação e organização dos conteúdos no Instagram, eliminando a dúvida sobre "o que postar". Permite manter frequência sem gastar horas pensando em ideias, alternar tipos de conteúdo e planejar com antecedência.\n\n**Acesso:** Válido por 1 ano.\n\n**Preciso seguir exatamente como está?** Não. Você pode adaptar as ideias conforme seu nicho, público e rotina.\n\n**Funciona para qualquer área?** Sim. O cronograma é genérico o suficiente para servir de base a diferentes segmentos.\n\n**Inclui artes ou só ideias?** O produto é focado no planejamento de temas e formatos. As artes podem ser criadas por você ou com templates complementares.\n\n**Posso repetir o mesmo cronograma depois?** Sim. É possível reaplicar a sequência, fazendo pequenas adaptações.\n\n**Serve só para Instagram?** Não. A lógica de distribuição de conteúdo pode ser adaptada para TikTok, Facebook, LinkedIn e outras redes.\n\n**Quanto tempo leva para implementar?** Você pode começar a aplicar imediatamente, já que o material vem pronto e organizado.'
WHERE title = 'Cronograma de Postagens 90 Dias - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Método Máquina de Conteúdos - Informações e FAQ',
  content = E'**O que é?**\nO Método Máquina de Conteúdos é um treinamento prático criado por Julia Ottoni que ensina a produzir conteúdos estratégicos para Instagram de forma rápida e personalizada, combinando os 50 Modelos de Conteúdo com a inteligência artificial do ChatGPT. É dividido em etapas que mostram desde a criação da conta no ChatGPT até como transformar cada modelo em roteiros magnéticos.\n\n**Para que serve?**\nServe para ajudar empreendedoras a criarem conteúdos de forma consistente e adaptada ao seu nicho, economizando tempo e eliminando bloqueios criativos. Permite transformar ideias em roteiros prontos para Reels, stories e carrosseis, gerar conteúdos ilimitados e usar a IA de forma direcionada.\n\n**Acesso:** Válido por 1 ano.\n\n**Preciso ter experiência com IA?** Não. O método ensina do zero como criar sua conta e fazer pedidos que geram resultados.\n\n**Funciona para qualquer nicho?** Sim. Basta informar a IA o seu segmento e público.\n\n**O ChatGPT cria o conteúdo pronto para postar?** Ele cria a base. Você deve revisar, adaptar e incluir sua personalidade para manter autenticidade.\n\n**Posso usar para formatos além de Reels?** Sim. Os modelos podem ser adaptados para carrosseis, posts estáticos, stories e outros formatos.\n\n**Quanto tempo leva para aplicar?** Seguindo o método, é possível criar semanas de conteúdo em poucas horas.'
WHERE title = 'Metodo Maquina de Conteudos - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = '100 Ideias de Conteúdo - Informações e FAQ',
  content = E'**O que é?**\nO 100 Ideias de Conteúdo é um material criado por Julia Ottoni com uma lista extensa e variada de sugestões de temas para postagens no Instagram, pensadas para atrair, engajar e vender. As ideias abrangem diferentes formatos como posts, stories, carrosseis e reels.\n\n**Para que serve?**\nServe para eliminar o bloqueio criativo e garantir consistência nas postagens, oferecendo ideias prontas que podem ser adaptadas para diferentes estilos e estratégias. Permite ter sempre um banco de temas e otimizar o tempo de planejamento.\n\n**Acesso:** Válido por 1 ano.\n\n**As ideias funcionam para qualquer nicho?** Sim. Você pode ajustar exemplos, linguagem e referências para se adaptar ao seu mercado.\n\n**Preciso seguir todas as ideias na ordem?** Não. Elas podem ser usadas de forma avulsa ou organizadas no seu próprio cronograma.\n\n**Inclui roteiros prontos?** Não. São sugestões de temas e abordagens, mas você pode combiná-las com modelos ou roteiros para criar o conteúdo final.\n\n**Serve só para Instagram?** Não. As ideias também podem ser adaptadas para TikTok, LinkedIn, Facebook e outras redes.'
WHERE title = '100 Ideias de Conteudo - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Cores que Vendem - Informações e FAQ',
  content = E'**O que é?**\nO Cores que Vendem é um material criado por Julia Ottoni que ensina como escolher e aplicar as cores ideais para o seu negócio de forma estratégica. Baseado em fundamentos de branding e psicologia das cores, o guia mostra como as cores influenciam emoções, percepções e decisões de compra.\n\n**Para que serve?**\nServe para ajudar empreendedoras a definirem uma paleta de cores que transmita a mensagem certa, fortaleça o posicionamento e aumente a percepção de valor do negócio. Permite escolher cores alinhadas ao arquétipo e propósito da marca, criar combinações harmônicas e usar cores para gerar conexão emocional.\n\n**Acesso:** Válido por 1 ano.\n\n**Preciso já ter um logotipo?** Não. O guia pode ser usado tanto para criar a identidade visual do zero quanto para atualizar uma já existente.\n\n**Serve para qualquer nicho?** Sim. A metodologia é adaptável a qualquer área de atuação.\n\n**Preciso usar apenas uma cor?** Não. O guia explica como criar combinações estratégicas que incluem cores principais, secundárias e de apoio.\n\n**As cores escolhidas vão mudar meu posicionamento?** Elas reforçam e comunicam visualmente seu posicionamento, mas o branding envolve outros elementos além das cores.\n\n**O guia ensina a aplicar as cores no Instagram?** Sim. Ele traz orientações para uso das cores em redes sociais e outros materiais visuais.'
WHERE title = 'Cores que Vendem - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Como Personalizar seu WhatsApp Business - Informações e FAQ',
  content = E'**O que é?**\nO Como Personalizar seu WhatsApp Business é um guia prático que ensina a configurar e personalizar a conta do WhatsApp Business para torná-la mais profissional e eficiente no atendimento. Mostra como ajustar as informações da empresa, criar mensagens automáticas, organizar conversas e aplicar recursos que facilitam a comunicação com clientes.\n\n**Para que serve?**\nServe para empreendedores que querem aproveitar todos os recursos do WhatsApp Business para otimizar o atendimento, aumentar a credibilidade e melhorar a experiência do cliente. Permite configurar perfil comercial, criar mensagens automáticas, usar etiquetas e personalizar a comunicação.\n\n**Acesso:** Válido por 1 ano.\n\n**Posso usar no WhatsApp comum?** Não. Essas funções são exclusivas do WhatsApp Business.\n\n**Preciso pagar para ter WhatsApp Business?** Não. O aplicativo é gratuito e pode ser baixado na loja do seu celular.\n\n**Funciona para qualquer tipo de negócio?** Sim. É útil para qualquer segmento que utilize WhatsApp como canal de comunicação.\n\n**O guia ensina a criar catálogos?** Sim. Ele inclui orientações para criar e personalizar o catálogo de produtos/serviços.\n\n**As mensagens automáticas substituem o atendimento humano?** Não. Elas agilizam o contato inicial, mas o atendimento personalizado continua sendo essencial.'
WHERE title = 'Como Personalizar seu WhatsApp Business - Informacoes e FAQ';

-- ============================================
-- ATUALIZAR ARTIGOS PRODUTOS CLEITON
-- ============================================

UPDATE public.knowledge_base SET
  title = '50 Scripts Prontos para o WhatsApp - Informações e FAQ',
  content = E'**O que é?**\nO 50 Scripts é um conjunto de 50 modelos prontos de mensagens persuasivas para WhatsApp, criados para ajudar empreendedores a aumentarem suas vendas e otimizarem o processo de atendimento. Com esses scripts, você vai poder responder rapidamente a objeções, engajar clientes de forma eficiente e fechar mais vendas sem perder tempo.\n\n**Para que serve?**\nServe para agilizar o atendimento e aumentar a taxa de conversão no WhatsApp, oferecendo respostas estratégicas e persuasivas para diferentes momentos da jornada de compra do cliente.\n\n**Acesso:** Válido por 1 ano.\n\n**Como acessar:**\n- Acesse: https://www.scriptgo.app/login\n- Login: Seu e-mail de compra\n- Senha padrão: Script@123 (você irá trocar depois)\n\n**É adaptável a qualquer nicho?** Sim. Os scripts são estruturas que você pode adaptar para o seu mercado, produto e linguagem.\n\n**Funciona para todos os processos de venda?** Sim. Os modelos cobrem diferentes etapas: primeiro contato, quebra de objeções, follow-up e fechamento.\n\n**Preciso usar exatamente como está escrito?** Não. Os scripts são modelos para você adaptar ao seu estilo de comunicação e realidade do negócio.\n\n**Posso usar em outras plataformas?** Sim. Embora pensados para WhatsApp, podem ser adaptados para e-mail, Instagram Direct, Telegram, etc.'
WHERE title = '50 Scripts Prontos para o WhatsApp - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Quebrando Objeções Facilmente - Informações e FAQ',
  content = E'**O que é?**\nO Quebrando Objeções é um treinamento estratégico focado em ajudar empreendedores a superar as objeções mais comuns durante o processo de vendas. Com técnicas comprovadas, você aprenderá a responder de forma persuasiva e eficaz, transformando objeções em oportunidades de fechamento.\n\n**Para que serve?**\nServe para capacitar empreendedores a lidar com as principais resistências dos clientes, usando estratégias de comunicação que aumentam a confiança e facilitam o fechamento de vendas.\n\n**Acesso:** Válido por 1 ano.\n\n**Como acessar:**\n- Acesse: https://cleitonquerobin1.com.br/area-de-membros/\n- Login: Seu e-mail de compra\n- Senha: performance123\n\n**É adaptável a qualquer nicho?** Sim. As técnicas podem ser aplicadas em qualquer mercado e adaptadas para diferentes tipos de produto ou serviço.\n\n**Funciona para vendas presenciais e online?** Sim. As estratégias funcionam tanto para atendimento digital quanto presencial.\n\n**Preciso ter experiência em vendas?** Não. O treinamento é feito para qualquer nível, desde iniciantes até vendedores experientes.'
WHERE title = 'Quebrando Objecoes Facilmente - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Modelos de Áudio Persuasivos para WhatsApp - Informações e FAQ',
  content = E'**O que é?**\nOs Modelos de Áudio Persuasivos para WhatsApp são 50 roteiros de áudios prontos para você utilizar em suas conversas de vendas, desenvolvidos para engajar e converter clientes de forma rápida e eficaz. Com mensagens impactantes e persuasivas, esses áudios ajudam a responder objeções, destacar benefícios e fechar vendas de maneira mais fluida e natural.\n\n**Para que serve?**\nServe para humanizar o atendimento no WhatsApp, criando conexão mais forte com o cliente através da voz, aumentando a conversão de forma prática e autêntica.\n\n**Acesso:** Válido por 1 ano.\n\n**Como acessar:**\n- Acesse: https://cleitonquerobin1.com.br/area-de-membros/\n- Login: Seu e-mail de compra\n- Senha: performance123\n\n**É adaptável a qualquer nicho?** Sim. Os roteiros podem ser personalizados para o seu mercado e estilo de comunicação.\n\n**Preciso gravar com minha voz?** Sim. A ideia é usar sua própria voz para criar conexão e autenticidade com o cliente.\n\n**Os áudios já vem gravados?** Não. Você recebe os roteiros/scripts para gravar com sua voz.\n\n**Posso usar apenas os scripts em texto?** Sim, mas o diferencial é justamente usar em formato de áudio para humanizar o atendimento.'
WHERE title = 'Modelos de Audio Persuasivos para WhatsApp - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Estratégia: 50 Clientes Novos Todos os Dias - Informações e FAQ',
  content = E'**O que é?**\nÉ um curso que ensina a atrair de 50 a 100 novos clientes todos os dias usando 5 estratégias simples e validadas. O objetivo é fazer seu WhatsApp bombar de novos clientes te chamando, prontos para comprar, e aumentar suas vendas em 10 vezes mais.\n\n**Para que serve?**\nServe para empreendedores que querem escalar suas vendas através do WhatsApp, atraindo um fluxo constante de clientes qualificados e prontos para comprar.\n\n**Acesso:** Válido por 1 ano.\n\n**Como acessar:**\n- Acesse: https://cleitonquerobin1.com.br/area-de-membros/\n- Login: Seu e-mail de compra\n- Senha: performance123\n\n**É adaptável a qualquer nicho?** Sim. As estratégias funcionam para diferentes mercados e podem ser ajustadas ao seu negócio.\n\n**Preciso investir em tráfego pago?** Depende da estratégia escolhida. O curso apresenta 5 estratégias diferentes, algumas orgânicas e outras pagas.\n\n**Em quanto tempo vejo resultados?** Isso varia conforme a aplicação e o nicho, mas muitos alunos reportam aumento de contatos já nas primeiras semanas.\n\n**Preciso de equipe para aplicar?** Não necessariamente. As estratégias podem ser aplicadas por você mesmo, mas ter suporte pode acelerar os resultados.'
WHERE title = 'Estrategia: 50 Clientes Novos Todos os Dias - Informacoes e FAQ';

UPDATE public.knowledge_base SET
  title = 'Implementação da Ferramenta de Inteligência Artificial - Informações e FAQ',
  content = E'**O que é?**\nÉ uma implementação de Inteligência Artificial personalizada, com aulas práticas para aplicar no seu negócio e acesso à IA por um período de teste. Essa IA já vem pronta, com estrutura pensada para atendimento, vendas e qualificação de leads no WhatsApp.\n\nInclui: um passo a passo completo de como usar IA para automatizar o atendimento no WhatsApp; uma ferramenta com 7 dias de teste grátis, além da possibilidade de personalizar totalmente sua IA - desde tom de voz até o tipo de informação que ela entrega.\n\n**Para que serve?**\nVocê adquire a implementação, recebe acesso a uma área de membros com um passo a passo super simples. Em 30 minutos, você conecta a IA ao seu WhatsApp. A partir daí, ela começa a responder seus clientes automaticamente, 24h por dia, de forma inteligente e personalizada. A IA entende o que o cliente quer, envia mensagens persuasivas, quebra objeções e ajuda a conduzir o atendimento até o fechamento.\n\nAlém disso, você consegue acompanhar tudo com dados reais: quantas pessoas chamaram, quantas avançaram no funil, onde estão parando e o que pode melhorar.\n\n**Acesso:** Válido por 1 ano ao material de implementação. A ferramenta de IA tem 7 dias de teste grátis. Após o teste, há uma assinatura mensal para continuar usando.\n\n**Como acessar:**\n- Acesse: https://cleitonquerobin1.com.br/area-de-membros/\n- Login: Seu e-mail de compra\n- Senha: performance123\n\n**Tenho que pagar mais algum valor além dos R$29,90?**\nO que você adquiriu por R$29,90 foi a implementação de IA personalizada com aulas práticas e acesso à IA por período de teste de 7 dias. Se você for buscar no mercado uma solução similar, os valores geralmente começam em R$10 mil a R$30 mil. O acesso ao plano mensal só é cobrado depois do período de teste gratuito. Nos primeiros 7 dias você usa a IA totalmente de graça. A assinatura só começa se você quiser continuar depois.\n\n**É adaptável a qualquer nicho?** Sim, mas funciona melhor em alguns processos de venda específicos no WhatsApp. A IA pode ser totalmente personalizada para o seu negócio.\n\n**Preciso saber programar?** Não. O passo a passo é simples e você consegue implementar em cerca de 30 minutos.\n\n**A IA substitui completamente o atendimento humano?** Não. Ela automatiza a primeira etapa do atendimento, qualifica leads e ajuda a conduzir até o fechamento. Para situações mais complexas, o atendimento humano continua sendo importante.\n\n**Consigo personalizar o tom de voz da IA?** Sim. Você pode configurar o tom de voz, tipo de informações fornecidas e comportamento da IA para que ela atenda exatamente como você gostaria.'
WHERE title = 'Implementacao da Ferramenta de Inteligencia Artificial - Informacoes e FAQ';

-- ============================================
-- ATUALIZAR SYSTEM PROMPT DA SOFIA COM ACENTUAÇÃO
-- ============================================

UPDATE public.ai_config
SET config_value = E'Você é a assistente virtual de suporte da Bethel. Seu nome é Sofia.\n\nVocê atende clientes que compraram produtos digitais low ticket da Julia Ottoni e do Cleiton (Bethel).\n\nPRODUTOS JULIA OTTONI:\n- 50 Modelos de Conteúdo\n- Sequências de Stories para Vender Muito\n- Gatilhos Mentais: 16 Ganchos Poderosos\n- Plano Prático: 7 Dias para Lotar a Sua Agenda\n- 6 Formas de Gravar Reels Magnéticos\n- Teste dos Arquétipos\n- Guia: Looks de Cada Arquétipo\n- Como Criar um Posicionamento Magnético\n- Rotina de Stories de Cada Arquétipo\n- Modelos Prontos de Conteúdo para Vender Mais\n- Templates de Posts para um Feed Arquetípico\n- Máquinas de Conteúdos IA\n- Método Posicionamento Milionário\n- Cronograma de Postagens 90 Dias\n- Método Máquina de Conteúdos\n- 100 Ideias de Conteúdo\n- Cores que Vendem\n- Como Personalizar seu WhatsApp Business\n\nPRODUTOS CLEITON:\n- 50 Scripts Prontos para o WhatsApp\n- Quebrando Objeções Facilmente\n- Modelos de Áudio Persuasivos para WhatsApp\n- Estratégia: 50 Clientes Novos Todos os Dias\n- Implementação da Ferramenta de Inteligência Artificial\n\nREGRAS:\n1. Responda APENAS com base nas informações fornecidas no contexto dos artigos da base de conhecimento.\n2. Se a informação não estiver no contexto, diga que não encontrou a resposta e sugira que o cliente abra um ticket para atendimento humano.\n3. Seja educada, objetiva e empática.\n4. Use linguagem simples e clara, em português do Brasil.\n5. Não invente informações. Não alucine.\n6. Se o cliente estiver com raiva ou frustrado, acolha primeiro e depois responda.\n7. Formate suas respostas de forma organizada quando necessário.\n8. NUNCA compartilhe informações técnicas internas do sistema.\n9. Para problemas de acesso, sempre pergunte qual produto o cliente comprou para dar as instruções corretas.\n10. Se não souber a resposta, direcione o cliente para abrir um ticket na plataforma de suporte para atendimento humano.\n11. Horário de atendimento do suporte humano: Segunda a sexta, 8h30 às 20h.\n12. O produto também é enviado por WhatsApp, porém o WhatsApp NÃO é um canal de suporte. Sempre oriente o cliente a usar a plataforma de suporte.'
WHERE config_key = 'system_prompt';

-- ============================================
-- NOVOS ARTIGOS: Perguntas frequentes em linguagem natural
-- ============================================

INSERT INTO public.knowledge_base (title, content, category, is_active) VALUES

('Esqueci minha senha, como faço para recuperar',
E'Se você esqueceu a senha de acesso ao seu produto, veja as senhas padrão abaixo:\n\n- **Produtos Julia Ottoni** (juliaacademy.com.br): ottoni123\n- **Produtos Cleiton** (cleitonquerobin1.com.br): performance123\n- **50 Scripts** (scriptgo.app): Script@123\n- **Couply** (usecouply.app): 12345678\n\nSe você já trocou a senha padrão e não lembra a nova, tente usar a opção "Esqueci minha senha" na página de login da plataforma para receber um link de redefinição no seu e-mail.\n\nSe não conseguir, abra um ticket no suporte informando:\n- Nome completo\n- E-mail de compra\n- Nome do produto',
'Acesso', TRUE),

('Meu acesso expirou, o que fazer',
E'O acesso à maioria dos produtos tem validade de **1 ano** a partir da data da compra.\n\nSe o seu acesso expirou e você deseja continuar utilizando o produto, entre em contato com nosso suporte abrindo um ticket na plataforma.\n\nExceções com acesso vitalício:\n- **50 Modelos de Conteúdo** (quadro no Trello): acesso permanente\n- **Modelos Prontos de Conteúdo para Vender Mais** (quadro no Trello): acesso permanente\n- **Teste dos Arquétipos**: disponível permanentemente em https://juliaottoni.com/teste-dos-arquetipos/',
'Acesso', TRUE),

('Como usar o quadro no Trello para acessar meu produto',
E'Alguns produtos como o **50 Modelos de Conteúdo** e os **Modelos Prontos de Conteúdo para Vender Mais** são entregues como um quadro no Trello.\n\nPara acessar:\n1. Crie uma conta gratuita em https://trello.com se ainda não tiver\n2. Verifique seu e-mail de compra — o link de acesso ao quadro foi enviado para lá\n3. Clique no link recebido para abrir o quadro diretamente\n\n**Importante:** Salve o link do quadro nos seus favoritos, pois o acesso é vitalício mas depende de você manter o link.\n\nSe não encontrar o e-mail com o link, verifique o spam ou abra um ticket no suporte.',
'Acesso', TRUE),

('Não encontrei meu produto na área de membros',
E'Se você não encontra seu produto na área de membros, siga estes passos:\n\n1. Confirme que está logado com o **e-mail correto** (o mesmo usado na compra)\n2. Verifique se está na plataforma certa:\n   - **Produtos Julia Ottoni**: https://juliaacademy.com.br/\n   - **Produtos Cleiton**: https://cleitonquerobin1.com.br/area-de-membros/\n   - **50 Scripts**: https://www.scriptgo.app/login\n3. Aguarde até 24h após a confirmação do pagamento para o acesso ser liberado\n\nSe o problema persistir, abra um ticket no suporte informando:\n- Nome completo\n- E-mail de compra\n- Nome do produto adquirido\n- Comprovante de pagamento (se possível)',
'Acesso', TRUE),

('Como editar os templates no Canva',
E'Para editar os Templates de Posts para um Feed Arquetípico no Canva:\n\n1. Acesse https://www.canva.com e faça login (a conta gratuita já funciona)\n2. Baixe o arquivo de template recebido no seu produto (formato PDF padrão)\n3. No Canva, clique em **"Criar design"** ou **"Upload"**\n4. Faça o upload do arquivo PDF\n5. Após o upload, clique nas camadas de texto para editar nome, cores e conteúdo\n6. Salve e exporte no formato desejado\n\n**Dica:** Para trocar cores e fontes, use o painel lateral do Canva. A maioria dos elementos funciona na versão gratuita.',
'Uso do Produto', TRUE),

('Comprei o produto errado, posso trocar',
E'Para situações de compra errada, você tem duas opções:\n\n**Opção 1 — Reembolso (dentro de 7 dias):**\nSe a compra foi realizada há menos de 7 dias, você pode solicitar o reembolso diretamente na plataforma de compra (Hotmart ou Pagtrust) e realizar uma nova compra do produto correto.\n\n**Opção 2 — Suporte:**\nAbra um ticket na plataforma de suporte explicando a situação. Nossa equipe vai verificar as possibilidades de ajudar.\n\nHorário de atendimento: Segunda a sexta-feira, das 8h30 às 20h.',
'Pagamento', TRUE),

('Quero solicitar reembolso, como faço',
E'Você tem **7 dias de garantia** contados a partir da data de confirmação da compra.\n\nPara solicitar o reembolso:\n1. Acesse a plataforma onde realizou a compra (**Hotmart** ou **Pagtrust**)\n2. Vá até "Minhas Compras" ou "Histórico de Pedidos"\n3. Selecione o produto e solicite o reembolso\n\nO prazo para processamento varia conforme a plataforma e a forma de pagamento:\n- **PIX e boleto**: normalmente 1 a 5 dias úteis\n- **Cartão de crédito**: pode levar até 2 faturas para aparecer no extrato\n\nSe tiver dificuldades, abra um ticket no suporte com:\n- Nome completo\n- E-mail de compra\n- Nome do produto\n- Data da compra',
'Pagamento', TRUE),

('O produto funciona no celular ou só no computador',
E'Todos os produtos são acessíveis pelo **celular, tablet e computador**.\n\nBasta abrir o navegador do seu dispositivo e acessar a plataforma correspondente:\n- **Produtos Julia Ottoni**: https://juliaacademy.com.br/\n- **Produtos Cleiton**: https://cleitonquerobin1.com.br/area-de-membros/\n- **50 Scripts**: https://www.scriptgo.app/login\n- **Trello** (50 Modelos e Modelos Prontos): baixe o app Trello gratuito na loja do seu celular\n- **Canva** (Templates): baixe o app Canva gratuito\n\nNão é necessário instalar nenhum programa específico.',
'Geral', TRUE),

('Quanto tempo demora para liberar meu acesso após a compra',
E'O acesso é liberado automaticamente após a **confirmação do pagamento**:\n\n- **PIX**: confirmação quase imediata (normalmente em minutos)\n- **Cartão de crédito**: confirmação em até 1 hora\n- **Boleto bancário**: após 1 a 3 dias úteis para compensação\n\nApós a confirmação, você receberá um e-mail com as instruções de acesso. Verifique também a caixa de **spam**.\n\nSe após 24h da confirmação ainda não tiver acesso, abra um ticket no suporte informando:\n- Nome completo\n- E-mail de compra\n- Nome do produto\n- Comprovante de pagamento',
'Acesso', TRUE),

('Posso baixar o conteúdo do produto para assistir offline',
E'Depende do produto:\n\n- **Aulas em vídeo** (plataforma de membros): normalmente não é possível fazer download, mas você pode acessar pelo app ou navegador sempre que quiser\n- **Materiais em PDF**: sim, você pode baixar e salvar no seu dispositivo\n- **Quadros no Trello**: acesse pelo app do Trello (disponível para iOS e Android), que permite visualizar offline os cartões já carregados\n- **Templates no Canva**: você pode exportar os designs prontos como PNG, PDF ou JPG\n\nPara dúvidas específicas sobre download de um produto, abra um ticket no suporte.',
'Uso do Produto', TRUE),

('Não estou conseguindo acessar a área de membros do Cleiton',
E'Para acessar os produtos do Cleiton, siga as instruções:\n\n**Endereço:** https://cleitonquerobin1.com.br/area-de-membros/\n**Login:** Seu e-mail de compra\n**Senha:** performance123\n\nSe a senha padrão não funcionar:\n1. Clique em "Esqueci minha senha" na página de login\n2. Verifique seu e-mail (inclusive spam) para receber o link de redefinição\n\nSe mesmo assim não conseguir, abra um ticket no suporte informando:\n- Nome completo\n- E-mail de compra\n- Nome do produto adquirido',
'Acesso', TRUE),

('Não estou conseguindo acessar a área de membros da Julia Ottoni',
E'Para acessar os produtos da Julia Ottoni, siga as instruções:\n\n**Endereço:** https://juliaacademy.com.br/\n**Login:** Seu e-mail de compra\n**Senha:** ottoni123\n\nSe a senha padrão não funcionar:\n1. Clique em "Esqueci minha senha" na página de login\n2. Verifique seu e-mail (inclusive spam) para receber o link de redefinição\n\nSe mesmo assim não conseguir, abra um ticket no suporte informando:\n- Nome completo\n- E-mail de compra\n- Nome do produto adquirido',
'Acesso', TRUE),

('Como funciona o GPT personalizado das Máquinas de Conteúdos IA',
E'O GPT personalizado das Máquinas de Conteúdos IA é acessado pelo **ChatGPT** (chat.openai.com).\n\nPara usar:\n1. Acesse sua área de membros em https://juliaacademy.com.br/\n2. Lá você encontrará o link direto para o GPT personalizado\n3. Clique no link — ele abrirá diretamente no ChatGPT\n4. Você precisa ter uma conta gratuita no ChatGPT para usar\n\nO GPT já vem configurado para criar conteúdos para Instagram. Basta dizer seu nicho e pedir o tipo de conteúdo que quer (post, Reels, carrossel, stories).\n\nSe tiver dúvidas sobre como acessar, abra um ticket no suporte.',
'Uso do Produto', TRUE),

('Como conectar a IA ao meu WhatsApp',
E'A implementação da IA para WhatsApp (produto do Cleiton) funciona assim:\n\n1. Acesse sua área de membros em https://cleitonquerobin1.com.br/area-de-membros/\n2. Siga o passo a passo disponível no material — leva em torno de 30 minutos\n3. O processo envolve conectar a ferramenta de IA ao seu número de WhatsApp seguindo as instruções da plataforma\n\n**Importante:** O produto inclui 7 dias de teste gratuito da ferramenta de IA. Após esse período, é necessário uma assinatura mensal para continuar usando.\n\nSe tiver dificuldade na configuração, abra um ticket no suporte.',
'Uso do Produto', TRUE),

('O suporte responde no WhatsApp',
E'**Não.** O WhatsApp **não é um canal oficial de suporte**.\n\nO produto pode ser enviado por WhatsApp, mas para obter atendimento da equipe de suporte, você deve abrir um ticket diretamente nesta plataforma.\n\n**Horário de atendimento:**\nSegunda a sexta-feira, das 8h30 às 20h\n\nEventualmente atendemos além do horário e aos finais de semana, mas não como algo fixo.\n\nPor aqui, a nossa assistente Sofia pode ajudar com dúvidas frequentes a qualquer hora. Para problemas mais complexos, abra um ticket para atendimento humano.',
'Suporte', TRUE),

('Recebi um produto diferente do que comprei',
E'Se você recebeu acesso a um produto diferente do que comprou, siga estes passos:\n\n1. Confirme o nome do produto na sua confirmação de compra (e-mail ou recibo)\n2. Verifique se está na plataforma correta para o produto adquirido\n3. Se realmente houve um erro, abra um ticket no suporte informando:\n   - Nome completo\n   - E-mail de compra\n   - Nome do produto que deveria ter recebido\n   - Print do comprovante de compra\n\nNosso time irá verificar e corrigir o acesso.\n\nHorário de atendimento: Segunda a sexta-feira, das 8h30 às 20h.',
'Suporte', TRUE),

('Posso parcelar a compra e em quantas vezes',
E'Sim! Aceitamos parcelamento no **cartão de crédito em até 12 vezes**.\n\nFormas de pagamento disponíveis:\n- **PIX**: pagamento à vista com confirmação imediata\n- **Cartão de crédito**: parcelamento em até 12x (sujeito à aprovação do cartão)\n\nOs pagamentos são processados pelas plataformas **Hotmart** ou **Pagtrust**, dependendo do produto.',
'Pagamento', TRUE),

('O que acontece se eu trocar de celular ou computador, perco o acesso',
E'Não! Você **não perde o acesso** ao trocar de dispositivo.\n\nO acesso é vinculado ao seu **e-mail e senha**, não ao dispositivo. Basta:\n1. Acessar a plataforma do produto pelo novo dispositivo\n2. Fazer login com o mesmo e-mail e senha de sempre\n\nPara o Trello: faça login na sua conta Trello — o quadro estará disponível automaticamente.',
'Geral', TRUE),

('Meu link do Trello não está funcionando',
E'Se o link do quadro no Trello não está abrindo ou mostra erro de permissão:\n\n1. Certifique-se de estar **logado no Trello** com sua conta\n2. Tente abrir o link em uma **aba anônima** para verificar se é problema de cache\n3. Verifique se o link está correto (ele foi enviado por e-mail no momento da compra)\n\nSe ainda não funcionar, abra um ticket no suporte informando:\n- Nome completo\n- E-mail de compra\n- Nome do produto (50 Modelos de Conteúdo ou Modelos Prontos)\n\nVamos reenviar o acesso.',
'Problemas Técnicos', TRUE);

-- Zerar embeddings de todos os artigos para forçar regeneração
UPDATE public.knowledge_base SET embedding = NULL WHERE is_active = TRUE;
