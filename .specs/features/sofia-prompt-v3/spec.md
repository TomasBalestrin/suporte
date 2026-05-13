# Spec: sofia-prompt-v3

**Status**: specify
**Owner**: hughie (specify) → frenchie (design) → kimiko (execute)
**Iniciada**: 2026-04-29
**Scope**: Medium

## Objetivo

Reescrever o system prompt da Sofia (chat de suporte Bethel) para corrigir cinco comportamentos problemáticos documentados em 413 respostas reais coletadas entre 2026-03-05 e 2026-04-29: saudação compulsória em toda resposta, assinatura proibida, loop de divergência de produto, afirmações falsas de verificação sem dados do Fluxon, e — o mais crítico — alucinação financeira (promessas de "7 dias de teste gratuito" e "assinatura mensal" que nunca existiram). Junto ao novo prompt, ajustar `temperature` de 0.8 para 0.2 e `confidence_threshold` de 0.4 para 0.6 no `ai_config`, e remover do prompt as instruções de tools function-calling que foram copiadas da Sofia do Fluxon (WhatsApp) e nunca funcionaram neste contexto de chat web. O objetivo mensurável é baixar thumbs-down de 17.2% para menos de 8% em 14 dias.

## Critérios de Sucesso (mensuráveis)

- [ ] Thumbs-down em `ai_usage_stats` cai para < 8% em 14 dias após deploy (hoje 17.2%)
- [ ] Confidence média em `ai_usage_stats` sobe para > 0.55 em 14 dias após deploy (hoje 0.539)
- [ ] Métrica auxiliar: nenhuma resposta nova após deploy contém "Atenciosamente, Time Bethel Educação", "verifiquei" sem dado Fluxon, ou loop pingue-pongue de divergência de produto
- [ ] **CRÍTICO**: zero respostas pós-deploy contendo informação financeira inventada (período de teste, valor de assinatura, prazo de cobrança, desconto, promoção)

SQL de auditoria para Starlight/Kimiko verificarem antes e depois do deploy:

```sql
-- Padrões proibidos pós-deploy (deve retornar 0 linhas)
SELECT id, created_at, LEFT(response, 200)
FROM ai_usage_stats
WHERE created_at > NOW() - INTERVAL '14 days'
  AND (
    response ILIKE '%Atenciosamente%'
    OR response ILIKE '%7 dias%'
    OR response ILIKE '%teste gratuito%'
    OR response ILIKE '%período de avaliação%'
    OR response ILIKE '%assinatura mensal%'
  )
ORDER BY created_at DESC;

-- Taxa de thumbs-down (meta: < 0.08)
SELECT
  COUNT(*) FILTER (WHERE was_helpful = false)::float / NULLIF(COUNT(*) FILTER (WHERE was_helpful IS NOT NULL), 0) AS taxa_thumbsdown,
  AVG(confidence_score) AS confidence_media
FROM ai_usage_stats
WHERE created_at > NOW() - INTERVAL '14 days';
```

## Casos de Uso (cenários reais derivados de thumbs-down históricos)

**Caso 1 — Cliente pede atendimento humano**
- Situação: cliente digita "quero falar com um humano" ou "preciso de atendimento humano"
- Comportamento ATUAL ruim: Sofia responde com parágrafo explicando horários e pedindo mais dados antes de qualquer escala
- Comportamento ESPERADO: reconhece o pedido na primeira linha, confirma que vai abrir ticket, retorna `requires_ticket: true` na API — sem burocracia

**Caso 2 — Cliente menciona golpe ou fraude**
- Situação: cliente escreve "acho que cai num golpe", "isso é fraude", "vou pro Procon"
- Comportamento ATUAL ruim: Sofia responde de forma neutra como se fosse dúvida técnica comum, não escala
- Comportamento ESPERADO: tom acolhedor e firme, reconhece a gravidade, escala imediatamente (`requires_ticket: true`) — sem tentar resolver ela mesma

**Caso 3 — Cliente pergunta sobre "7 dias de teste" ou valores de assinatura**
- Situação: cliente pergunta "qual o valor da mensalidade?" ou "quando acabam meus 7 dias de teste?"
- Comportamento ATUAL ruim: Sofia inventa resposta detalhada com "período de teste de 7 dias" e "assinatura mensal após o período" — alucinação documentada em thumbs-down 2026-04-29
- Comportamento ESPERADO: responde honestamente que não tem essa informação no sistema, e escala para humano que pode confirmar

**Caso 4 — Cliente menciona produto diferente do registrado no Fluxon**
- Situação: form mostra `[Produto: Julia Academy]`, cliente diz "comprei o 50 Scripts"
- Comportamento ATUAL ruim: Sofia entra em loop perguntando "qual produto você comprou?" a cada resposta, mesmo após cliente já ter respondido
- Comportamento ESPERADO: levanta a divergência UMA vez com frase educada ("vi aqui que sua compra está registrada como X, mas se comprou Y vou te ajudar assim mesmo"), depois resolve sem voltar ao assunto

**Caso 5 — Cliente sem compra no Fluxon (contexto vazio)**
- Situação: Fluxon não retorna compra, `[Produto: X]` não vem injetado
- Comportamento ATUAL ruim: Sofia diz "verifiquei seus dados e não encontrei sua compra" — usa verbo de ação que implica verificação ativa que ela não fez
- Comportamento ESPERADO: "não localizei seu acesso no sistema, pode me informar o e-mail que usou na compra?" — sem fingir que consultou algo

**Caso 6 — Primeira mensagem do chat**
- Situação: cliente abre o chat e manda primeira pergunta
- Comportamento ATUAL ruim: "Abençoado dia! Espero que esteja bem. Sou a Sofia, assistente da Bethel Educação. Como posso ajudá-lo hoje?" antes de qualquer conteúdo — 26.6% das 413 respostas assim
- Comportamento ESPERADO: saudação breve opcional ("Olá!" ou "Oi!") só se vier ao caso; "Abençoado dia" é variação permitida em raras ocasiões, não padrão; pode ir direto à resposta

**Caso 7 — Segunda mensagem em diante no mesmo chat**
- Situação: cliente já recebeu primeira resposta e manda follow-up
- Comportamento ATUAL ruim: Sofia repete saudação ("Abençoado dia, tudo bem?") e assina "Atenciosamente, Time Bethel Educação" em toda resposta — 47 ocorrências (11.4%)
- Comportamento ESPERADO: zero saudação, zero assinatura, ir direto ao ponto

**Caso 8 — Site ou plataforma fora do ar**
- Situação: cliente diz "não consigo acessar o site", "página não abre"
- Comportamento ATUAL: Sofia orienta passos de troubleshooting (limpar cache, trocar navegador, etc.)
- Comportamento ESPERADO: manter comportamento atual — esse fluxo funciona bem, não mudar

## Comportamentos Esperados

### Fast-paths (intent crítica avaliada antes da KB)

Esses casos devem ser tratados pelo prompt antes de qualquer consulta RAG:

- "quero falar com humano" / "atendimento humano" / "falar com pessoa" / "falar com atendente" → escala (`requires_ticket: true`) + mensagem curta confirmando ("Entendido, vou abrir um ticket para você agora. Um agente retornará em breve.")
- "golpe", "fraude", "processar", "Procon", "Decon", "chargeback" → escala + tom acolhedor sem minimizar
- 3+ reclamações sobre o mesmo problema no mesmo chat → escala
- Qualquer pergunta sobre valor de assinatura, período de teste, prazo de cobrança, desconto, promoção → escala ("Não tenho essa informação aqui, vou conectar você com nossa equipe que pode confirmar.")
- Site fora do ar (sinais: "não abre", "erro 404", "página branca") → orientação de troubleshooting padrão (manter)

### Anti-alucinação (regras inegociáveis)

- NUNCA usar "verifiquei", "confirmei", "encontrei sua compra", "localizei seu pedido" a não ser que o dado esteja explicitamente presente no contexto injetado do Fluxon
- NUNCA inventar URL com sufixo numérico (ex: `/quillforms/formulario-67/`) — usar APENAS link que veio explicitamente do campo `access_link` do Fluxon, ou link genérico documentado na `knowledge_base`
- **NUNCA mencionar teste gratuito, período de avaliação, valor de assinatura, prazo de cobrança, desconto ou promoção** — se o cliente perguntar sobre qualquer desses, escalar para humano
- Credenciais de acesso: APENAS as três plataformas documentadas:
  - `juliaacademy.com.br` — senha `ottoni123`
  - `cleitonquerobin1.com.br` — senha `performance123`
  - `50scripts.cleitonquerobin.com.br` — senha `performance123`
  - Nada além disso. Se o produto não for nenhum desses, usar APENAS o link que vier do Fluxon.

### Formato e tom

- Saudação: OPCIONAL, APENAS na primeira mensagem do chat. "Abençoado dia" é variação permitida de forma rara — não é padrão, não é obrigatória
- Demais mensagens do mesmo chat: zero saudação, zero assinatura, ir direto ao conteúdo
- Assinatura "Atenciosamente, Time Bethel Educação": PROIBIDA em qualquer mensagem
- Comprimento: respostas curtas e diretas. Evitar listar 5 perguntas de confirmação — se precisar de dados, pedir uma coisa só por mensagem
- Loop de coleta de dados: não repetir a mesma pergunta se o cliente já respondeu ou ignorou

### Comportamento com `[Produto: X]` injetado

O código em `src/app/api/ai/chat/route.ts` injeta `[Produto: ${nome}]` na query quando o `product_id` está disponível no form. Comportamento esperado:

- Cliente NÃO menciona produto na pergunta → Sofia ignora a injeção, responde a pergunta diretamente
- Cliente menciona produto que BATE com o `[Produto: X]` injetado → responde sem mencionar divergência
- Cliente menciona produto DIFERENTE do `[Produto: X]` injetado → menciona UMA vez de forma educada ("notei que sua compra está registrada como X, mas se comprou Y vou ajudar assim mesmo") e segue resolvendo sem voltar ao assunto

### Ajuste de config (parte do escopo desta feature)

| Parâmetro | Valor atual | Valor v3 | Razão |
|---|---|---|---|
| `temperature` | 0.8 | 0.2 | Suporte precisa de respostas determinísticas, não criativas |
| `confidence_threshold` | 0.4 | 0.6 | Evita passar contexto RAG fraco que induz alucinação |

## Fora de Escopo (deferred)

- Implementação de tools function-calling de verdade (`sofia-tools-v1`) — deferred até v3 estabilizar
- Filtro de input gating contra auto-replies de bots externos (`sofia-input-hygiene`) — deferred; 346 das unanswered são provavelmente lixo de bots externos, não afetam thumbs-down diretamente
- Reprocessamento das 346 unanswered para alimentar a `knowledge_base` — escopo separado
- Auditoria completa da `knowledge_base` em busca de artigos com informações financeiras incorretas — **Frenchie deve checar durante Design** se há algum artigo contendo "7 dias", "teste gratuito", "período de avaliação", "assinatura mensal"; se encontrar, a correção do artigo entra no escopo da feature ou vira task paralela (decisão do Frenchie)

## Riscos e Dependências

- **Dependência de autenticação**: edição do `system_prompt` via painel admin exige usuário autenticado com `isAdmin()` em `/api/admin/ai-config`. Kimiko precisa de acesso ao painel ou editar direto via SQL na `ai_config`.
- **Risco de regressão**: prompt novo pode quebrar respostas que hoje funcionam (acesso à plataforma, troubleshooting de site). Mitigação: Frenchie documenta o prompt atual em `.specs/features/sofia-prompt-v3/prompt-backup.md` antes do deploy; rollback = restaurar via painel admin.
- **Risco de medição de thumbs-down**: feedback de 👍/👎 depende de ação ativa do cliente — taxa de feedback é baixa (82 respostas com feedback em 413 totais = 19.9%). As métricas de "confidence média", "padrões proibidos via SQL" e ausência de alucinação financeira são auditáveis sem depender do cliente.
- **Risco de KB poluída**: se houver artigo na `knowledge_base` com conteúdo sobre "7 dias de teste" ou "assinatura mensal", Sofia v3 pode continuar alucinando mesmo com prompt corrigido, porque o RAG vai injetar o conteúdo errado no contexto. Frenchie deve auditar obrigatoriamente durante Design.
- **Risco de injeção `[Produto: X]`**: a regra do prompt depende da Sofia distinguir "produto do form" vs "produto mencionado pelo cliente" — se a injeção misturar os dois sem separação clara, o comportamento pode ser imprevisível. Frenchie deve avaliar se é necessário passar `formProduct` e `fluxonProduct` como campos separados no contexto, em vez de um único `[Produto: X]`.

## Decisões registradas

- **2026-04-29 (decided_by: hughie)**: tools function-calling fica deferred. Sofia v3 = só texto. A seção "USO DE FERRAMENTAS (tools)" do prompt atual deve ser removida inteiramente.
- **2026-04-29 (decided_by: hughie)**: injeção `[Produto: X]` mantida no código; comportamento controlado via instrução no prompt. Frenchie decide se precisa de fix de código na fase Design.
- **2026-04-29 (decided_by: hughie)**: intent "quero humano" e gatilhos de fraude/golpe → auto-escala com `requires_ticket: true`. Sem etapas intermediárias.
- **2026-04-29 (decided_by: hughie)**: "Abençoado dia" mantido como variação rara permitida, apenas na primeira mensagem. Não é padrão, não é obrigatório.
- **2026-04-29 (decided_by: butcher)**: regra anti-alucinação financeira é CRÍTICA e bloqueia merge. Zero tolerância.
- **2026-04-29 (decided_by: butcher)**: `temperature=0.2` e `confidence_threshold=0.6` fazem parte do escopo desta feature.

## Próxima fase: Design (Frenchie)

Frenchie deve:

1. Ler `STATE.md` e este `spec.md` integralmente
2. Auditar a `knowledge_base` via SQL em busca de artigos contendo "7 dias", "teste gratuito", "período de avaliação", "assinatura mensal", "cobrança" — propor correção ou exclusão de qualquer artigo que contenha informação financeira não verificada
3. Decidir se o controle do comportamento `[Produto: X]` é suficiente via prompt, ou se o código precisa passar `formProduct` e `fluxonProduct` como campos separados
4. Fazer snapshot do prompt atual em `.specs/features/sofia-prompt-v3/prompt-backup.md` (rollback)
5. Propor estrutura do novo prompt v3 (seções, ordem, tamanho aproximado em tokens)
6. Definir plano de rollback explícito: quem executa, como verifica, tempo máximo antes de rollback automático
7. Escrever `.specs/features/sofia-prompt-v3/design.md`
