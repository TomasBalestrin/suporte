-- Seed: Respostas prontas importadas como artigos da knowledge_base
-- Para que a IA (Sofia) recupere essas respostas via busca semantica nos atendimentos.
-- Embedding fica NULL; rodar endpoint /api/admin/knowledge-base/generate-embeddings depois.

INSERT INTO public.knowledge_base (title, content, category, is_active)
VALUES
  (
    'Confirmacao de reembolso processado',
    E'Quando o cliente pergunta sobre o status do reembolso ja solicitado/processado, informar que o reembolso foi feito e a plataforma tem prazo de ate 7 dias uteis para devolver o valor. Orientar a aguardar esse prazo.\n\nResposta modelo:\n"Seu reembolso foi feito, a plataforma tem um prazo de ate 7 dias uteis. Agora e so aguardar."',
    'reembolso',
    TRUE
  ),
  (
    'Acesso ao produto Cleiton Querobin (area de membros principal)',
    E'Quando o cliente pergunta como acessar os produtos do Cleiton Querobin (area de membros geral), fornecer:\n\nLink: https://cleitonquerobin1.com.br\nLogin: mesmo e-mail usado na compra\nSenha: performance123\n\nEssa e a area de membros principal do Cleiton. Para o produto especifico "50 Scripts", usar outro link (ver artigo de acesso 50 Scripts).',
    'acesso',
    TRUE
  ),
  (
    'Acesso ao produto Julia Ottoni (Julia Academy)',
    E'Quando o cliente pergunta como acessar os produtos da Julia Ottoni, fornecer:\n\nLink: https://juliaacademy.com.br/\nLogin: mesmo e-mail usado na compra\nSenha: ottoni123\n\nEssa e a area de membros de todos os produtos da Julia Ottoni (50 Modelos de Conteudo, Stories, Gatilhos, Posicionamento, etc.).',
    'acesso',
    TRUE
  ),
  (
    'Acesso ao produto 50 Scripts Prontos para WhatsApp',
    E'Quando o cliente pergunta como acessar o produto "50 Scripts" (scripts prontos para WhatsApp) do Cleiton Querobin, fornecer:\n\nLink: https://50scripts.cleitonquerobin.com.br/\nLogin: e-mail usado na compra\nSenha: performance123\n\nAtencao: 50 Scripts tem link diferente da area de membros principal do Cleiton.',
    'acesso',
    TRUE
  ),
  (
    'Pedido de dados para identificar compra',
    E'Quando a IA nao consegue identificar o cliente no sistema (Fluxon retorna vazio) e precisa localizar a compra, pedir ao cliente:\n- Nome completo\n- E-mail usado na compra\n- CPF\n\nEsses 3 dados sao suficientes para localizar qualquer compra nas plataformas Hotmart e PagTrust. Nao pedir dados que o cliente ja forneceu na mesma conversa.',
    'identificacao',
    TRUE
  ),
  (
    'Como solicitar reembolso de compra via Hotmart',
    E'Quando o cliente quer SOLICITAR reembolso (ainda nao foi processado) e a compra foi feita na Hotmart:\n\nO reembolso deve ser solicitado diretamente na plataforma de compra. Prazo: ate 7 dias apos a data da compra.\n\nLink oficial Hotmart: https://help.hotmart.com/pt-br/article/360061973392/como-solicitar-o-reembolso-da-minha-compra\n\nA Bethel nao processa reembolso pelo suporte — e obrigatorio o cliente solicitar diretamente na plataforma.',
    'reembolso',
    TRUE
  ),
  (
    'Como solicitar reembolso de compra via PagTrust',
    E'Quando o cliente quer SOLICITAR reembolso (ainda nao foi processado) e a compra foi feita na PagTrust:\n\nO reembolso deve ser solicitado diretamente na plataforma de compra. Prazo: ate 7 dias apos a data da compra.\n\nLink oficial PagTrust: https://dashboard.pagtrust.com.br/reembolso.html\n\nA Bethel nao processa reembolso pelo suporte — e obrigatorio o cliente solicitar diretamente na plataforma.',
    'reembolso',
    TRUE
  ),
  (
    'Suporte da IA Nextrack (IA nao envia mensagens / problemas tecnicos da IA)',
    E'Quando o cliente reclama de problemas com a IA Nextrack (IA nao envia mensagens, nao funciona, erro tecnico no produto de IA), encaminhar para o suporte especifico da Nextrack:\n\nWhatsApp: +55 11 94605-4203\n\nA Bethel nao atende questoes tecnicas da IA Nextrack — o suporte e feito pela propria equipe do produto.',
    'suporte_tecnico',
    TRUE
  );
