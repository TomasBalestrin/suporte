-- Seed: Troubleshooting guiado (arvore de decisao) para Sofia diagnosticar casos tecnicos.
-- Embedding NULL — gerar depois via script ou endpoint admin.

INSERT INTO public.knowledge_base (title, content, category, is_active)
VALUES
  (
    'Troubleshooting: cliente diz que nao recebeu WhatsApp com link de acesso',
    E'Arvore de decisao quando cliente reclama que "nao recebeu WhatsApp" / "nao chegou link" / "sumiu a mensagem":\n\n1. VERIFIQUE NO FLUXON PRIMEIRO. Se houver `whatsapp_entrega` em alguma compra:\n   - status="delivered" ou "read" -> Mensagem foi entregue. Cliente pode ter apagado ou nao viu. Use tool `reenviar_whatsapp_entrega` para reenviar.\n   - status="failed" ou "undelivered" -> Numero provavelmente bloqueou a Meta. Orientar cliente a verificar se tem conta WhatsApp ativa no numero da compra. Se confirmar, use `reenviar_whatsapp_entrega`.\n   - status="sent" ha mais de 30 min sem delivered -> Provavel bloqueio. Reenviar.\n   - sem status -> Entrega nunca saiu. Use `reenviar_whatsapp_entrega`.\n\n2. Se NAO ha compra no Fluxon: compra pendente de aprovacao OU cadastro com dados diferentes. Pedir data/plataforma/numero do pedido (nao repetir dados ja fornecidos).\n\n3. NUNCA prometer reenvio sem ter rodado a tool. NUNCA afirmar "ja reenviei" sem confirmacao da tool.',
    'troubleshooting',
    TRUE
  ),
  (
    'Troubleshooting: area de membros nao carrega / pagina em branco / erro 502/503',
    E'Arvore de decisao para problemas tecnicos da area de membros:\n\nSINAIS de queda do site (nao e erro do cliente):\n- "This Account has been suspended"\n- "Contact your hosting provider"\n- "404 not found" / "502 bad gateway" / "503 service unavailable"\n- "site fora do ar" / "nao carrega" / "pagina em branco"\n\nACAO quando detectar esses sinais:\n1. NAO fornecer link nem senha — nao resolve, o site esta fora do ar.\n2. Informar com calma: "Nossa equipe tecnica ja foi notificada. A area de membros esta em manutencao. Pode aguardar alguns minutos e tentar novamente?"\n3. NAO prometer prazo exato de restabelecimento.\n\nSINAIS de problema do cliente (NAO do site):\n- "senha incorreta" / "email invalido" -> orientar o recuperar-senha do produto.\n- "esqueci email usado" -> pedir CPF para localizar no Fluxon.\n- "nao lembro nada" -> tool `solicitar_mais_dados`.',
    'troubleshooting',
    TRUE
  ),
  (
    'Troubleshooting: cliente confunde produto comprado vs. produto que quer acessar',
    E'Arvore de decisao para mismatch de produto:\n\nQuando houver DIVERGENCIA entre produto selecionado no formulario e compras reais no Fluxon:\n\n1. NUNCA forneca link, login ou senha de nenhum produto antes de esclarecer.\n2. Liste claramente o que o cliente disse que comprou vs. o que consta no sistema.\n3. Pergunte: "Poderia confirmar qual produto realmente comprou? Se comprou o X mas nao aparece, pode ter sido com outro email/CPF — me informe qual usou."\n4. AGUARDE resposta antes de agir.\n\nPRODUTOS FREQUENTEMENTE CONFUNDIDOS:\n- "Area de membros do Cleiton" (link https://cleitonquerobin1.com.br) ≠ "50 Scripts" (link https://50scripts.cleitonquerobin.com.br/). Sao produtos separados.\n- "Julia Academy" e area geral: todos os produtos da Julia estao em https://juliaacademy.com.br/ com o mesmo login.\n- "Implementacao IA" pode ser IMP CLEITON ou IMP JULIA — checar produto especifico no Fluxon antes de responder.',
    'troubleshooting',
    TRUE
  );
