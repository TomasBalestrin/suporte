-- Seed: Respostas prontas para atendimento ao cliente
-- Inserir respostas predefinidas na tabela quick_replies

INSERT INTO public.quick_replies (shortcut, title, content, is_active)
VALUES
  (
    'reembolso-confirmado',
    'Confirmacao de Reembolso',
    E'Ola, tudo bem? Abencoado dia!\n\nSeu reembolso foi feito, a plataforma tem um prazo de ate 7 dias uteis. Agora e so aguardar, combinado?\n\nTenha um otimo e abencoado dia!\n\nAtenciosamente,\n\nTime Bethel Educacao',
    true
  ),
  (
    'acesso-cleiton',
    'Infos de acesso Cleiton',
    E'Ola, tudo bem? Abencoado dia!\n\nPara acessar basta Clicar no Link abaixo:\n\nhttps://cleitonquerobin1.com.br\n\nE utilizar o seguinte login:\n\nE-mail: (e o mesmo e-mail que voce utilizou no momento da compra)\n\nSenha: performance123\n\nAtenciosamente,\n\nTime Cleiton Querobin',
    true
  ),
  (
    'acesso-julia',
    'Infos de acesso Julia',
    E'Ola, tudo bem? Abencoado dia!\n\nPara acessar basta Clicar no Link abaixo:\n\nLink de acesso: https://juliaacademy.com.br/\nLogin: (e o mesmo e-mail que voce utilizou no momento da compra)\n\nSenha: ottoni123\n\nAtenciosamente,\n\nTime Bethel Educacao',
    true
  ),
  (
    'acesso-50scripts',
    'Acesso 50 Scripts',
    E'Ola, tudo bem? Abencoado dia!\n\nVoce pode estar acessando no seguinte link:\n\nhttps://50scripts.cleitonquerobin.com.br/\nLogin: seu e-mail de compra\nsenha: performance123\n\nAtenciosamente,\n\nTime Bethel Educacao',
    true
  ),
  (
    'pedido-dados',
    'Pedido de dados',
    E'Ola, tudo bem? Abencoado dia!\n\nPor gentileza, poderia enviar o nome completo, e-mail de compra e CPF?',
    true
  ),
  (
    'reembolso-hotmart',
    'Reembolso Hotmart',
    E'Ola, tudo bem? Abencoado dia!\n\nA solicitacao do reembolso deve ocorrer diretamente nas plataformas a qual voce realizou aquisicao dos produtos. O prazo e de ate 07 dias apos a data da compra.\n\nSua compra foi feita atraves da plataforma Hotmart, logo, o reembolso deve ser solicitado via esse link: https://help.hotmart.com/pt-br/article/360061973392/como-solicitar-o-reembolso-da-minha-compra\n\nAtenciosamente,\n\nTime Bethel Educacao',
    true
  ),
  (
    'reembolso-pagtrust',
    'Reembolso Pagtrust',
    E'Ola, tudo bem? Abencoado dia!\n\nA solicitacao do reembolso deve ocorrer diretamente nas plataformas a qual voce realizou aquisicao dos produtos. O prazo e de ate 07 dias apos a data da compra.\n\nSua compra foi feita atraves da plataforma Pagtrust, logo, o reembolso deve ser solicitado via esse link: https://dashboard.pagtrust.com.br/reembolso.html\n\nAtenciosamente,\n\nTime Bethel Educacao',
    true
  ),
  (
    'suporte-nextrack',
    'Suporte Nextrack IA',
    E'Ola, tudo bem? Abencoado dia!\n\nNesse caso, por gentileza, poderia entrar em contato com o suporte especifico da IA?\n\nSegue o contato abaixo (WhatsApp):\n\n+55 11 94605-4203\n\nAtenciosamente,\n\nTime Bethel Educacao',
    true
  )
ON CONFLICT (shortcut) DO NOTHING;
