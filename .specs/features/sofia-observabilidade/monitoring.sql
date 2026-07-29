-- =============================================================================
-- Sofia Observabilidade — SQL de Monitoramento (Fase 1)
-- Projeto: Bethel Suporte | Project ref: zeocxcfiyhzsztwjllvl
-- Criado por: MM (DevOps/Obs) | 2026-05-22
--
-- CONTEXTO:
--   O "Sofia v2 Refactor" trocou o modelo de dados. A tabela `ai_usage_stats`
--   parou de receber INSERTs em 2026-05-13 15:34 BRT. As respostas reais da
--   Sofia passaram a viver em `ai_conversation_messages` (role='assistant').
--   Este arquivo é o monitoramento repontado para a fonte de verdade correta.
--
-- COMO RODAR (Management API):
--   TOKEN=<SUPABASE_ACCESS_TOKEN_SUPORTE>
--   PROJECT_REF=zeocxcfiyhzsztwjllvl
--   curl -s -X POST \
--     "https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query" \
--     -H "Authorization: Bearer ${TOKEN}" \
--     -H "Content-Type: application/json" \
--     -d '{"query": "<sql aqui>"}'
--
-- TABELA MORTA (não usar para monitoramento vivo):
--   ai_usage_stats — último registro: 2026-05-13 15:34 BRT | total: 446 rows
-- =============================================================================


-- -----------------------------------------------------------------------------
-- [Q1] FOTO GERAL — Contagem e janela temporal das 3 tabelas principais
-- Usar como health check inicial em qualquer diagnóstico.
-- -----------------------------------------------------------------------------
SELECT
    'ai_usage_stats'          AS tabela,
    COUNT(*)                  AS total,
    MIN(created_at)           AS primeiro,
    MAX(created_at)           AS ultimo
FROM ai_usage_stats
UNION ALL
SELECT
    'ai_conversations',
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
FROM ai_conversations
UNION ALL
SELECT
    'ai_conversation_messages',
    COUNT(*),
    MIN(created_at),
    MAX(created_at)
FROM ai_conversation_messages
ORDER BY tabela;


-- -----------------------------------------------------------------------------
-- [Q2] VOLUME DIÁRIO — Respostas da Sofia nos últimos 14 dias
-- Indica atividade real; role='assistant' = resposta da Sofia.
-- tool_calls = uso de ferramenta (consultar_fluxon, consultar_wordpress, etc.)
-- -----------------------------------------------------------------------------
SELECT
    DATE(created_at AT TIME ZONE 'America/Sao_Paulo') AS dia,
    COUNT(*) FILTER (WHERE role = 'assistant')         AS respostas_assistant,
    COUNT(*) FILTER (WHERE role = 'user')              AS msgs_usuario,
    COUNT(*) FILTER (WHERE role = 'tool')              AS tool_calls,
    COUNT(*)                                           AS total_mensagens
FROM ai_conversation_messages
WHERE created_at >= NOW() - INTERVAL '14 days'
GROUP BY dia
ORDER BY dia;


-- -----------------------------------------------------------------------------
-- [Q3] VARREDURA DE VENENO — Respostas com conteúdo incorreto (diário)
-- Padrões de veneno identificados durante o período cego (13/05–21/05):
--   - quiz.testedosarquetipos: Sofia indicava link de teste como "livre/sem login"
--   - Atenciosamente / Abençoado: saudação formal fora do tom
--   - 7 dias: prazo de reembolso mencionado incorretamente
--   - teste grátis / assinatura mensal: oferta errada
-- Expectativa pós-fix 22/05: ZERO em todos os venenos.
-- -----------------------------------------------------------------------------
SELECT
    DATE(created_at AT TIME ZONE 'America/Sao_Paulo')                       AS dia,
    COUNT(*)                                                                  AS total_assistant,
    SUM(CASE WHEN content ILIKE '%quiz.testedosarquetipos%'            THEN 1 ELSE 0 END) AS veneno_quiz_arquetipos,
    SUM(CASE WHEN content ILIKE '%livre%' AND content ILIKE '%arquetipos%' THEN 1 ELSE 0 END) AS veneno_livre_arquetipos,
    SUM(CASE WHEN content ILIKE '%Atenciosamente%'                     THEN 1 ELSE 0 END) AS veneno_atenciosamente,
    SUM(CASE WHEN content ILIKE '%Abençoa%' OR content ILIKE '%Abencoa%' THEN 1 ELSE 0 END) AS veneno_abencoad,
    SUM(CASE WHEN content ILIKE '%7 dias%'                             THEN 1 ELSE 0 END) AS veneno_7dias,
    SUM(CASE WHEN content ILIKE '%teste gr%tis%'                       THEN 1 ELSE 0 END) AS veneno_teste_gratis,
    SUM(CASE WHEN content ILIKE '%assinatura mensal%'                  THEN 1 ELSE 0 END) AS veneno_assinatura_mensal
FROM ai_conversation_messages
WHERE role = 'assistant'
  AND created_at >= NOW() - INTERVAL '14 days'
GROUP BY dia
ORDER BY dia;


-- -----------------------------------------------------------------------------
-- [Q4] AMOSTRAS DE VENENO — Mensagens contaminadas para análise manual
-- Substituir o filtro de datas conforme necessário.
-- -----------------------------------------------------------------------------
SELECT
    m.created_at AT TIME ZONE 'America/Sao_Paulo'  AS horario_br,
    c.product_id,
    LEFT(m.content, 400)                            AS preview
FROM ai_conversation_messages m
JOIN ai_conversations c ON c.id = m.conversation_id
WHERE m.role = 'assistant'
  AND (
      m.content ILIKE '%quiz.testedosarquetipos%'
   OR m.content ILIKE '%Atenciosamente%'
   OR m.content ILIKE '%assinatura mensal%'
   OR m.content ILIKE '%7 dias%'
   OR m.content ILIKE '%teste gr%tis%'
  )
ORDER BY m.created_at DESC
LIMIT 20;


-- -----------------------------------------------------------------------------
-- [Q5] TAXA DE USO DE TOOLS — Pre-fetch disparando? (por dia)
-- Ferramentas conhecidas: consultar_fluxon, consultar_wordpress,
--   solicitar_mais_dados, orientar_reembolso, reenviar_whatsapp_entrega
-- Se consultar_fluxon / consultar_wordpress = 0 por vários dias consecutivos,
-- o pre-fetch pode ter parado — investigar.
-- -----------------------------------------------------------------------------
SELECT
    DATE(created_at AT TIME ZONE 'America/Sao_Paulo')                           AS dia,
    COUNT(DISTINCT conversation_id)                                              AS conversas_com_tool,
    SUM(CASE WHEN tool_name = 'consultar_fluxon'    THEN 1 ELSE 0 END)          AS fluxon_calls,
    SUM(CASE WHEN tool_name = 'consultar_wordpress' THEN 1 ELSE 0 END)          AS wordpress_calls,
    SUM(CASE WHEN tool_name = 'solicitar_mais_dados' THEN 1 ELSE 0 END)         AS solicitar_dados_calls,
    SUM(CASE WHEN tool_name = 'orientar_reembolso'  THEN 1 ELSE 0 END)          AS orientar_reembolso_calls,
    COUNT(*)                                                                     AS total_tool_calls
FROM ai_conversation_messages
WHERE role = 'tool'
  AND created_at >= NOW() - INTERVAL '14 days'
GROUP BY dia
ORDER BY dia;


-- -----------------------------------------------------------------------------
-- [Q6] COBERTURA DE TOOLS — % de conversas que dispararam alguma tool
-- Parâmetro: janela de 14 dias. Ajustar conforme necessário.
-- Referência: no período cego (13/05–22/05) a taxa foi de 21.6% (25/116).
-- -----------------------------------------------------------------------------
SELECT
    COUNT(DISTINCT c.id)                                                           AS total_conversas,
    COUNT(DISTINCT CASE WHEN t.conversation_id IS NOT NULL THEN c.id END)         AS conversas_com_tool,
    ROUND(
        100.0 * COUNT(DISTINCT CASE WHEN t.conversation_id IS NOT NULL THEN c.id END)
        / NULLIF(COUNT(DISTINCT c.id), 0),
        1
    )                                                                              AS pct_com_tool
FROM ai_conversations c
LEFT JOIN ai_conversation_messages t
    ON t.conversation_id = c.id AND t.role = 'tool'
WHERE c.created_at >= NOW() - INTERVAL '14 days';


-- -----------------------------------------------------------------------------
-- [Q7] SAÚDE DAS RESPOSTAS — Tamanho médio/mediano e 5 mais recentes
-- Respostas muito curtas (< 50 chars) podem indicar fallback/erro silencioso.
-- Respostas muito longas (> 800 chars) podem indicar prompt vazando contexto.
-- -----------------------------------------------------------------------------
SELECT
    AVG(LENGTH(content))::int                                                AS media_chars,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY LENGTH(content))::int       AS mediana_chars,
    MAX(LENGTH(content))                                                     AS maior_chars,
    MIN(LENGTH(content))                                                     AS menor_chars,
    COUNT(*)                                                                 AS total_respostas
FROM ai_conversation_messages
WHERE role = 'assistant'
  AND created_at >= NOW() - INTERVAL '14 days';

-- Amostra das 5 mais recentes:
SELECT
    m.created_at AT TIME ZONE 'America/Sao_Paulo'  AS horario_br,
    c.product_id,
    LENGTH(m.content)                               AS chars,
    LEFT(m.content, 300)                            AS preview
FROM ai_conversation_messages m
JOIN ai_conversations c ON c.id = m.conversation_id
WHERE m.role = 'assistant'
ORDER BY m.created_at DESC
LIMIT 5;


-- -----------------------------------------------------------------------------
-- [Q8] INVENTÁRIO DE TOOLS — Todos os tool_names em uso (histórico completo)
-- Usar para detectar tool nova inesperada ou tool sumindo.
-- -----------------------------------------------------------------------------
SELECT
    tool_name,
    COUNT(*)                                                        AS calls,
    MIN(created_at AT TIME ZONE 'America/Sao_Paulo')               AS primeiro_uso,
    MAX(created_at AT TIME ZONE 'America/Sao_Paulo')               AS ultimo_uso
FROM ai_conversation_messages
WHERE role = 'tool'
GROUP BY tool_name
ORDER BY calls DESC;


-- =============================================================================
-- [Q9] DISTRIBUIÇÃO DE CONFIDENCE — Qualidade média das respostas (Fase 2+)
-- Dado: só existe pós-deploy 2026-05-22 (~T2 route.ts + migration 017).
-- Métricas:
--   - avg/min/max: score 0-100 (baseado em similarity com KB)
--   - histograma: contagem por faixas (baixa <40, média 40-59, alta 60-79, ótima 80-100)
-- Objetivo: alertar se avg cai abaixo de 65 (indicador de KB desgastada ou model shift).
-- =============================================================================
SELECT
    ROUND(AVG(confidence))::int                                          AS avg_confidence,
    MIN(confidence)                                                      AS min_confidence,
    MAX(confidence)                                                      AS max_confidence,
    COUNT(*)                                                             AS total_com_confidence,
    ROUND(100.0 * COUNT(*) FILTER (WHERE confidence < 40)
        / NULLIF(COUNT(*), 0), 1)                                       AS pct_baixa,
    ROUND(100.0 * COUNT(*) FILTER (WHERE confidence >= 40 AND confidence < 60)
        / NULLIF(COUNT(*), 0), 1)                                       AS pct_media,
    ROUND(100.0 * COUNT(*) FILTER (WHERE confidence >= 60 AND confidence < 80)
        / NULLIF(COUNT(*), 0), 1)                                       AS pct_alta,
    ROUND(100.0 * COUNT(*) FILTER (WHERE confidence >= 80)
        / NULLIF(COUNT(*), 0), 1)                                       AS pct_otima
FROM ai_conversation_messages
WHERE role = 'assistant'
  AND confidence IS NOT NULL;

-- Distribuição por faixa:
SELECT
    CASE
        WHEN confidence < 40 THEN 'Baixa (<40)'
        WHEN confidence < 60 THEN 'Média (40-59)'
        WHEN confidence < 80 THEN 'Alta (60-79)'
        ELSE 'Ótima (≥80)'
    END                                                                  AS faixa,
    COUNT(*)                                                             AS contagem
FROM ai_conversation_messages
WHERE role = 'assistant'
  AND confidence IS NOT NULL
GROUP BY faixa
ORDER BY faixa;


-- =============================================================================
-- [Q10] TAXA DE FEEDBACK — Thumbs up/down das respostas (Fase 2+)
-- Dado: só existe pós-deploy 2026-05-22 (~T3 feedback/route.ts reaponta para
--       ai_conversation_messages).
-- Métrica:
--   - thumbs_down_rate: (false count / total votes) × 100
--   - total_votos: soma de was_helpful NOT NULL
-- Objetivo: alertar se taxa sobe acima de 15% (indicador de piora na qualidade).
-- =============================================================================
SELECT
    COUNT(*) FILTER (WHERE was_helpful = true)                          AS thumbs_up,
    COUNT(*) FILTER (WHERE was_helpful = false)                         AS thumbs_down,
    COUNT(*) FILTER (WHERE was_helpful IS NOT NULL)                     AS total_votos,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE was_helpful = false)
        / NULLIF(COUNT(*) FILTER (WHERE was_helpful IS NOT NULL), 0),
        1
    )                                                                    AS taxa_thumbs_down_pct
FROM ai_conversation_messages
WHERE role = 'assistant'
  AND was_helpful IS NOT NULL;


-- =============================================================================
-- [Q11] WP CONTA NAO ENCONTRADA + CROSS-REFERENCE HIT (sofia-purchase-lookup)
-- Deploy: 2026-05-23. Feature: cross-reference WP com e-mail canonico do Fluxon.
--
-- Sinal 1 (conta nao encontrada) — indica volume de casos onde o cliente
--   informou um e-mail que o WP nao reconheceu. Esperado cair apos deploy.
-- Sinal 2 (cross-reference hit) — conta cases onde o retry com e-mail canonico
--   do Fluxon salvou a consulta. Deve aparecer nos primeiros dias pos-deploy.
-- Critério de regressão: se "nao_encontrei" subir muito (>20% sobre baseline)
--   sem "cross_ref_hit" correspondente, o retry pode estar falhando silencioso.
-- =============================================================================
SELECT
    DATE(created_at AT TIME ZONE 'America/Sao_Paulo')                             AS dia,
    COUNT(*) FILTER (WHERE role = 'assistant')                                     AS total_respostas,
    COUNT(*) FILTER (
        WHERE role = 'assistant'
          AND (
              content ILIKE '%nao encontrei%'
           OR content ILIKE '%nao encontro%'
           OR content ILIKE '%nao localizei%'
           OR content ILIKE '%nenhuma conta%'
           OR content ILIKE '%nenhuma compra%'
          )
    )                                                                              AS nao_encontrei,
    COUNT(*) FILTER (
        WHERE role = 'assistant'
          AND (
              content ILIKE '%localiz% sob o e-mail%'
           OR content ILIKE '%encontr% sob o e-mail%'
           OR content ILIKE '%conta localizada%'
          )
    )                                                                              AS cross_ref_hit
FROM ai_conversation_messages
WHERE created_at >= '2026-05-23'
GROUP BY dia
ORDER BY dia;


-- =============================================================================
-- GAPS QUE SOBRAM (irrecuperáveis para período 13/05–22/05 — só Fase 2 resolve)
-- 1. confidence: calculado em route.ts:443 mas nunca persistido na v2.
--    ai_usage_stats.confidence_score era preenchido na v1 (último: 2026-05-13).
--    RESOLVIDO EM FASE 2: colunas confidence + was_helpful adicionadas à
--    ai_conversation_messages (migration 017); persistência em route.ts (T2).
-- 2. feedback (thumbs up/down): feedback/route.ts gravava em ai_usage_stats
--    (tabela morta). Nenhum feedback do período cego foi persistido.
--    RESOLVIDO EM FASE 2: feedback/route.ts reaponta para conversation_id
--    e atualiza was_helpful na mensagem assistant mais recente (T3).
-- 3. tool_result: presente na coluna mas não usamos para scoring ainda.
--    Fase 3 pode explorar tool_result para inferir sucesso de consulta.
-- =============================================================================
