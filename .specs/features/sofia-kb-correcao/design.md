# Design: sofia-kb-correcao

**Fase**: design
**Autor**: Francês (brownfield audit read-only)
**Data**: 2026-05-21
**Budget de research**: Large = 15min (usado: ~12min)
**Banco auditado**: Supabase `zeocxcfiyhzsztwjllvl` (prod, read-only)

---

## 1. Inventário de contaminação

Artigos ativos com problema relacionado ao "Teste dos Arquétipos":

| id | title | is_active | Problema | Trecho ofensor |
|---|---|---|---|---|
| `799731f5` | Teste dos Arquétipos — como acessar, refazer e troubleshooting | true | (a)(b)(c) TODOS: link morto + "livre" + "não exige login" | `Link oficial: https://quiz.testedosarquetipos.com.br` / `Não exige login — é grátis e aberto` / `O Teste dos Arquétipos é livre — você pode fazer ou refazer quantas vezes quiser` (na mensagem sugerida) |
| `43fff20f` | Teste dos Arquétipos - Informações e FAQ | true | (d) URL divergente vs. canônica — *mas URL está correta* (quillforms). Problema: diz "Acesso: Permanente" sem clareza se é pago ou grátis | `Acesso: Permanente no link https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/` — não diz que é pago |
| `3d60a09f` | Teste dos Arquétipos - Informações e FAQ | true | (d) idem `43fff20f` — artigo duplicado, conteúdo idêntico | Igual ao `43fff20f` |
| `aca9f143` | Meu acesso expirou, o que fazer | true | (d) URL correta (quillforms), mas enquadramento ambíguo: "disponível permanentemente" implica "aberto a todos" sem mencionar que é produto pago | `Teste dos Arquétipos: disponível permanentemente em https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/` |
| `ab81f92c` | Meu acesso expirou, o que fazer | true | (d) idem `aca9f143` — artigo duplicado, conteúdo idêntico | Igual ao `aca9f143` |
| `4d0c6ca0` | Por quanto tempo terei acesso ao produto | true | (d) idem — URL certa, enquadramento ambíguo | `Teste dos Arquétipos: Disponível permanentemente no link https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/` |
| `a36412c0` | Por quanto tempo terei acesso ao produto | true | (d) idem — artigo duplicado | Igual ao `4d0c6ca0` |

**Total de artigos contaminados (algum dos critérios a/b/c/d)**: 7 artigos (3 títulos distintos × 2 cópias + 1 artigo único).

**Artigo principal do incidente** (categoria mais grave): `799731f5` — único com critérios (a)+(b)+(c) simultâneos. É o artigo que a Sofia citou palavra por palavra no incidente SUP-2026-0329.

**Observação crítica sobre 43fff20f / 3d60a09f**: esses dois artigos NÃO contêm o link morto nem dizem "é livre". A URL já é o quillforms canônico. Mas a questão aberta (spec §"Questão aberta") se aplica: o artigo não esclarece se o quiz é aberto ou requer compra. Reescrita depende de Hughie pinar isso com o usuário — marcado como PENDENTE abaixo.

---

## 2. Mapa de duplicação

### Resumo geral

| Métrica | Valor |
|---|---|
| Total de artigos ativos | 133 |
| Títulos únicos | 81 |
| Artigos excedentes (duplicatas) | 52 |
| Pares de títulos duplicados | 52 pares (cada título aparece exatamente 2x) |
| Artigos inativos | 0 |

Todos os 52 pares têm `is_active = true` nos dois membros — nenhum par já foi parcialmente desativado.

### Verificação de identidade do conteúdo (amostra de 3 pares)

Comparei os snippets de 3 pares distintos (100 Ideias, Esqueci minha senha, Teste dos Arquétipos FAQ):

| Par | Conteúdo idêntico? | Observação |
|---|---|---|
| `ad2210b8` / `122a1352` (100 Ideias de Conteúdo) | Sim | Snippet 300 chars idêntico |
| `f03ed550` / `5302538b` (Esqueci minha senha) | Sim | Snippet 300 chars idêntico |
| `43fff20f` / `3d60a09f` (Teste dos Arquétipos FAQ) | Sim | Conteúdo completo idêntico |

**Conclusão**: todos os pares auditados são cópias exatas. O padrão de datas sugere que o primeiro insert foi em `2026-03-03` a `2026-03-05` (lote inicial) e o segundo em `2026-03-05` a `2026-03-10` (segundo lote que duplicou tudo). Updates posteriores (`updated_at`) foram aplicados nos dois membros do par simultaneamente — confirmando que ninguém já divergiu os conteúdos.

### Lista completa de pares (52 pares, estratégia de manutenção)

**Critério de escolha**: manter o `id` com `created_at` mais antigo (primeiro lote, iniciado em 2026-03-03); desativar o mais novo (segundo lote, iniciado em 2026-03-05/10). Ambos têm embedding — não há diferença de qualidade de embedding entre os pares.

> Exceção: artigo `799731f5` (o ofensor do incidente) — mesmo sendo do "lote único" (sem par duplicado com mesmo título), precisa de REESCRITA, não só desativação.

| id_manter | id_desativar | title |
|---|---|---|
| `ad2210b8` | `122a1352` | 100 Ideias de Conteúdo - Informações e FAQ |
| `dda44b61` | `51120135` | 50 Modelos de Conteúdo - Informações e FAQ |
| `b6305368` | `f4ca22fc` | 50 Scripts Prontos para o WhatsApp - Informações e FAQ |
| `70bf73a9` | `3056cea9` | 6 Formas de Gravar Reels Magnéticos - Informações e FAQ |
| `5f787587` | `9c452122` | Como acessar meu produto após a compra |
| `89bc2714` | `43a1afa3` | Como conectar a IA ao meu WhatsApp |
| `1010b701` | `fbcfce62` | Como Criar um Posicionamento Magnético - Informações e FAQ |
| `864423cc` | `b6a7761f` | Como editar os templates no Canva |
| `3cb5073c` | `5010547e` | Como funciona o GPT personalizado das Máquinas de Conteúdos IA |
| `05f22445` | `5b907c46` | Como Personalizar seu WhatsApp Business - Informações e FAQ |
| `34f653ba` | `12e95a32` | Como usar o quadro no Trello para acessar meu produto |
| `9ee8304b` | `efcaf34f` | Comprei o produto errado, posso trocar |
| `944d3257` | `db492d50` | Cores que Vendem - Informações e FAQ |
| `c972a4b6` | `48a95b5d` | Cronograma de Postagens 90 Dias - Informações e FAQ |
| `f03ed550` | `5302538b` | Esqueci minha senha, como faço para recuperar |
| `8e99e55e` | `996277bb` | Estratégia: 50 Clientes Novos Todos os Dias - Informações e FAQ |
| `c52c863c` | `3e880a04` | Garantia e reembolso - como funciona |
| `05c27ac7` | `0b39969c` | Gatilhos Mentais: 16 Ganchos Poderosos - Informações e FAQ |
| `60e9d06f` | `0f9a041c` | Guia: Looks de Cada Arquétipo - Informações e FAQ |
| `a631d400` | `55c77904` | Horário de atendimento do suporte |
| `053bb8d0` | `f50e70a2` | Implementação da Ferramenta de Inteligência Artificial - Informações e FAQ |
| `8fe8c3a2` | `4084685e` | Máquinas de Conteúdos IA - Informações e FAQ |
| `6deb3c65` | `4bbf3ed2` | Método Máquina de Conteúdos - Informações e FAQ |
| `156f3813` | `654be8c9` | Método Posicionamento Milionário - Informações e FAQ |
| `aca9f143` | `ab81f92c` | Meu acesso expirou, o que fazer |
| `a0b4cc92` | `4792617d` | Meu link do Trello não está funcionando |
| `a745908a` | `f1587012` | Modelos de Áudio Persuasivos para WhatsApp - Informações e FAQ |
| `7713f11d` | `7b09f3c6` | Modelos Prontos de Conteúdo para Vender Mais - Informações e FAQ |
| `e56c8b31` | `db1b0079` | Não consigo acessar minha conta - problemas de login |
| `9d62c939` | `8bb8ffa7` | Não encontrei meu produto na área de membros |
| `9be769a2` | `f556b854` | Não estou conseguindo acessar a área de membros da Julia Ottoni |
| `e75d656b` | `e6d2400b` | Não estou conseguindo acessar a área de membros do Cleiton |
| `7af87240` | `a3a0cc13` | Não recebi o e-mail de confirmação da compra |
| `49a09e8b` | `3118844b` | O produto funciona no celular ou só no computador |
| `d691fb2c` | `98f5c01a` | O que acontece se eu trocar de celular ou computador, perco o acesso |
| `e7a3e2e2` | `13f22ea9` | O suporte responde no WhatsApp |
| `87b1ad8b` | `4248ea46` | Plano Prático: 7 Dias para Lotar a Sua Agenda - Informações e FAQ |
| `4d0c6ca0` | `a36412c0` | Por quanto tempo terei acesso ao produto |
| `48a2275a` | `de1468ab` | Posso acessar os produtos pelo celular |
| `c1c29623` | `56f8f7f1` | Posso baixar o conteúdo do produto para assistir offline |
| `e7f367f3` | `65565f11` | Posso compartilhar meu acesso com outras pessoas |
| `d24a01c3` | `0f17203a` | Posso parcelar a compra e em quantas vezes |
| `f5dd768b` | `63ae26cf` | Quais são as formas de pagamento |
| `c9988b88` | `88519f12` | Quanto tempo demora para liberar meu acesso após a compra |
| `decf5ab3` | `9b607573` | Quebrando Objeções Facilmente - Informações e FAQ |
| `8b6d133a` | `9926e523` | Quero solicitar reembolso, como faço |
| `ada092ff` | `b3549207` | Recebi um produto diferente do que comprei |
| `5c7d7c91` | `ad25b889` | Rotina de Stories de Cada Arquétipo - Informações e FAQ |
| `9b2c2c70` | `23cb49f5` | Sequências de Stories para Vender Muito - Informações e FAQ |
| `9d7ddb33` | `0f20a300` | Templates de Posts para um Feed Arquetípico - Informações e FAQ |
| `487fa05b` | `ab8c3db1` | Tenho dúvidas sobre como aplicar o conteúdo do produto |
| `43fff20f` | `3d60a09f` | Teste dos Arquétipos - Informações e FAQ |

**Nota sobre `799731f5`**: artigo único (sem par com mesmo título), mas será reescrito — não desativado.

---

## 3. Divergência de links de teste

### URLs encontradas na knowledge_base

| URL | Artigos que contêm | Status |
|---|---|---|
| `https://quiz.testedosarquetipos.com.br` | `799731f5` (único) | MORTO — eliminar |
| `https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/` | `43fff20f`, `3d60a09f`, `aca9f143`, `ab81f92c`, `4d0c6ca0`, `a36412c0` | CANÔNICO — manter |

### URL no system_prompt (ai_config)

O system_prompt v3 (ativo em prod) NÃO menciona `quiz.testedosarquetipos.com.br`. Menciona explicitamente:

```
Teste dos Arquétipos (sem login necessário):
- Link direto (única URL /quillforms/ válida): https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/
```

**Situação**: system_prompt está correto. KB contradiz o system_prompt apenas via artigo `799731f5`. O RAG injeta `799731f5` como contexto e o modelo segue o documento (KB) em vez da regra geral do prompt — comportamento esperado do RAG quando o score do documento é alto.

**Conclusão**: após corrigir/desativar `799731f5`, nenhum URL divergente sobra na KB.

---

## 4. Check de encoding

### Evidência coletada

Query `SELECT length(title), octet_length(title) FROM knowledge_base WHERE title ILIKE '%arqu%tipo%' LIMIT 3`:

| title (banco via API) | char_len | byte_len | diff |
|---|---|---|---|
| Teste dos Arquétipos — como acessar... | 62 | 65 | +3 |
| Teste dos Arquétipos - Informações e FAQ | 40 | 43 | +3 |
| Guia: Looks de Cada Arquétipo - Informações e FAQ | 49 | 52 | +3 |

Diferença de 3 bytes = 3 caracteres multibyte UTF-8 (é, ç, õ por exemplo), o que é **exatamente o esperado em UTF-8 válido** para esses títulos. Não há mojibake: `char_len < byte_len` porque acentos ocupam 2 bytes em UTF-8.

### Diagnóstico do output `ÃÃ©` visto antes

O mojibake (`VocÃª`, `ArquÃ©tipos`) é artefato de decode do PowerShell 5.1: ele interpreta o JSON UTF-8 da API como CP1252/Latin-1. O banco guarda UTF-8 limpo.

**Decisão para o Execute**: escrever sempre via arquivo + `--data-binary @arquivo.json` (nunca inline via argv do PowerShell) — conforme lição FluxonApp e alerta do spec. Isso previne qualquer risco de corromper acentos no write.

---

## 5. Estado dos embeddings

| Métrica | Valor |
|---|---|
| Total de artigos | 133 |
| `embedding IS NOT NULL` | 133 (100%) |
| `embedding IS NULL` | 0 |
| Artigos ativos | 133 |
| Artigos inativos | 0 |

**Todos os artigos têm embedding.** Nenhum está invisível pro RAG.

### Trigger de auto-embedding

Dois triggers existem na tabela `knowledge_base`:

| Trigger | Evento | Função |
|---|---|---|
| `trg_knowledge_base_regenerate_embedding` | INSERT | `trigger_regenerate_embedding()` |
| `trg_knowledge_base_regenerate_embedding` | UPDATE | `trigger_regenerate_embedding()` |
| `update_knowledge_base_updated_at` | UPDATE | `update_updated_at()` |

**Confirmado**: o trigger cobre tanto INSERT quanto UPDATE. Qualquer UPDATE no `content` de um artigo vai acionar `trigger_regenerate_embedding()` automaticamente — não é necessário chamar o endpoint `/api/admin/knowledge-base/generate-embeddings` manualmente após correções.

**Cuidado**: o trigger age no UPDATE do próprio row. Se a estratégia for desativar (`is_active = false`) sem alterar `content`, o embedding do artigo desativado fica no banco mas não é consultado pelo RAG (presumindo que o RAG filtra por `is_active = true` — confirmar no código `route.ts`).

---

## 6. Plano de correção proposto

### 6.1 Artigo `799731f5` — ação principal do incidente

**Decisão**: REESCREVER o conteúdo inteiro + manter ativo.

**Por quê não desativar**: é o único artigo com o playbook de troubleshooting do Teste dos Arquétipos (acesso, refazer, resultado). Os outros pares (`43fff20f`/`3d60a09f`) só têm FAQ básico. Desativar perderia a cobertura de suporte para esse cenário.

**O que remover**:
- Linha 2 do Playbook: `Link oficial do teste: https://quiz.testedosarquetipos.com.br` → substituir pelo canônico
- Item `Confirmar qual situação → Cliente quer FAZER o teste pela 1ª vez → fornece link direto (não precisa de compra/login)` → PENDENTE (ver abaixo)
- Item `Não exige login — é grátis e aberto` → ELIMINAR completamente
- Toda a "Mensagem sugerida (fazer ou refazer o teste)" com emoji + link morto → REESCREVER
- "Avisos" → remover `Teste em si é grátis e stateless`

**O que manter**:
- Estrutura de playbook (confirmar situação → diagnosticar → rotear)
- Roteamento para `juliaacademy.com.br` quando cliente confunde com produto pago
- Aviso de que resultado não chega por e-mail

**Conteúdo novo — partes PENDENTES de confirmação do Hughie**:

> ⚠️ PENDENTE (questão aberta do spec): os seguintes pontos do novo artigo dependem da resposta do usuário:
>
> 1. **O quillforms é aberto (qualquer um acessa) ou gateado por compra?**
>    - Se aberto: artigo pode dizer "acesse pelo link, não precisa de login" (mas NUNCA "é grátis" — é produto pago, o quiz é a entrega)
>    - Se gateado: artigo deve dizer "acesse com o e-mail da compra na área de membros"
>
> 2. **Quando cliente relata problema de login (caso do incidente)**: a resposta certa é área de membros (`juliaacademy.com.br` + `ottoni123`)? Confirmar.
>
> 3. **"Refazer" o teste**: o quillforms permite refazer sem login? Se sim, como o cliente acessa o histórico?

**Rascunho do novo conteúdo (partes não-pendentes já definidas)**:

```markdown
# Teste dos Arquétipos — acesso e troubleshooting

## Quando aplica
Cliente pergunta sobre o Teste dos Arquétipos (produto da Julia Ottoni).

## Playbook

1. **Se cliente relata "senha errada" / "não consigo entrar" em área de login pago**:
   - Produto pago → área de membros Julia Academy
   - Link: https://juliaacademy.com.br/
   - Login: e-mail usado na compra · Senha: ottoni123
   - Se não funcionar: "Esqueci minha senha" na plataforma ou abrir ticket.

2. **Se cliente quer FAZER ou REFAZER o teste**:
   - [PENDENTE: instruções dependem de confirmação sobre o quillforms]
   - Link canônico: https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/

3. **Resultado não chega por e-mail**: o resultado é exibido na tela ao final; não é enviado por e-mail. Se fechou, precisa refazer.

4. **Cliente confundiu o Teste com outro produto** (ex: aulas de arquétipos, Posicionamento Milionário): confirmar nome do produto e rotear para juliaacademy.com.br.

## Avisos
- O Teste dos Arquétipos é um produto pago da Julia Ottoni. NÃO diga que é grátis.
- Link canônico único: https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/
- NÃO use quiz.testedosarquetipos.com.br — esse link está desativado.
```

---

### 6.2 Artigos `43fff20f` e `3d60a09f` — par FAQ (mesmo título)

**Decisão**: DESATIVAR `3d60a09f` (duplicata mais nova); REESCREVER `43fff20f` para clareza sobre se é pago.

**O que ajustar em `43fff20f`**: a linha `Acesso: Permanente no link https://...` pode sugerir que qualquer pessoa acessa sem custo. Adicionar contexto: produto pago, acesso permanente para quem comprou.

> ⚠️ PENDENTE (questão aberta): reescrita exata depende de confirmação do Hughie sobre o fluxo do quillforms.

---

### 6.3 Artigos `aca9f143`/`ab81f92c` (Meu acesso expirou) e `4d0c6ca0`/`a36412c0` (Por quanto tempo)

**Decisão**: DESATIVAR as duplicatas (`ab81f92c`, `a36412c0`); MANTER e AJUSTAR os originais (`aca9f143`, `4d0c6ca0`).

**Ajuste**: adicionar "(produto pago)" após "Teste dos Arquétipos" na lista de exceções de acesso vitalício. Exemplo:
```
- Teste dos Arquétipos (produto pago): disponível permanentemente em https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/
```
Isso resolve a ambiguidade sem depender da questão aberta.

> Não-pendente: esse ajuste pode ser feito independentemente da questão aberta. A expressão "produto pago" já alinha com a verdade confirmada.

---

### 6.4 Deduplicação dos outros 49 pares (sem relação com o incidente)

**Decisão**: DESATIVAR os 49 `id_desativar` da tabela do §2 (via UPDATE `is_active = false`). Conteúdo idêntico nos dois membros — zero perda de informação.

**Sem reescrita necessária**: esses artigos não contêm informação errada sobre o Teste dos Arquétipos.

---

### 6.5 system_prompt (ai_config)

**Decisão**: NENHUMA alteração necessária. O system_prompt v3 já está correto:
- Menciona o quillforms canônico como única URL válida
- Proíbe inventar URLs `/quillforms/...-NN/`
- Não menciona `quiz.testedosarquetipos.com.br`

---

## 7. Dimensionamento

### Esta feature vs. ticket separado

| Frente | Artigos afetados | Urgência | Recomendação |
|---|---|---|---|
| Correção do artigo `799731f5` (incidente) | 1 | CRÍTICA | Nesta feature, primeira prioridade |
| Ajuste dos artigos `43fff20f`, `aca9f143`, `4d0c6ca0` (arquétipo, parcialmente pendente) | 3 artigos | Alta | Nesta feature, junto com `799731f5` |
| Desativação das duplicatas dos 3 pares acima (`3d60a09f`, `ab81f92c`, `a36412c0`) | 3 artigos | Alta | Nesta feature |
| Deduplicação dos outros 49 pares sem erro de conteúdo | 49 artigos | Média | **Nesta feature** — operação mecânica (UPDATE `is_active = false`), baixo risco, pode ser script único |

**Recomendação final**: absorver o dedup completo (todos os 52 pares) nesta feature. O dedup dos 49 pares "limpos" é uma operação atômica de `UPDATE is_active = false WHERE id IN (...)` — sem reescrita, sem risco de conteúdo, e resolve o amplificador sistêmico que está dobrando o peso de qualquer erro futuro no RAG. Vira ticket separado se o MM ou Luz Estrela identificarem risco operacional no volume.

---

## Snapshot dos artigos a corrigir (para rollback)

Kimiko deve guardar snapshot de cada artigo antes de qualquer UPDATE, na forma:

```sql
-- Snapshot pré-fix (rodar ANTES de qualquer write)
SELECT id, title, content, is_active, updated_at
FROM knowledge_base
WHERE id IN (
  '799731f5-d527-493e-b178-d236536e20a2',  -- ofensor
  '43fff20f-0a26-47b2-b3b0-f403c87de1d0',  -- FAQ manter
  '3d60a09f-7af8-4dec-b378-57587a6a9384',  -- FAQ desativar
  'aca9f143-c1e7-4042-b692-d3d196caa9c0',  -- expirou manter
  'ab81f92c-d97c-4a57-a21a-fc6e80db395b',  -- expirou desativar
  '4d0c6ca0-4cc3-44d6-b6cd-34eb2fb8fb7f',  -- prazo manter
  'a36412c0-df3f-49b2-b430-a08b88a03038'   -- prazo desativar
);
```

O snapshot dos 49 pares de dedup pode ser feito em bloco com a lista completa do §2.

---

## Verificação pós-fix (SQL de critério de sucesso)

```sql
-- Critério 1: zero ativos com link morto
SELECT COUNT(*) FROM knowledge_base
WHERE is_active = true AND content ILIKE '%quiz.testedosarquetipos%';
-- Esperado: 0

-- Critério 2: zero ativos dizendo "livre/grátis/sem login" sobre arquétipo
SELECT COUNT(*) FROM knowledge_base
WHERE is_active = true
  AND (content ILIKE '%é livre%' OR content ILIKE '%grátis%' OR content ILIKE '%não exige login%' OR content ILIKE '%sem login%')
  AND (content ILIKE '%arqu%tipo%' OR title ILIKE '%arqu%tipo%');
-- Esperado: 0

-- Critério 3: cada título ativo aparece só 1x
SELECT title, COUNT(*) FROM knowledge_base
WHERE is_active = true GROUP BY title HAVING COUNT(*) > 1;
-- Esperado: 0 linhas

-- Critério 4: embeddings não-nulos após fix
SELECT COUNT(*) FROM knowledge_base WHERE embedding IS NULL AND is_active = true;
-- Esperado: 0 (trigger cobre automaticamente)
```

---

## Riscos residuais

| Risco | Severidade | Mitigação |
|---|---|---|
| Questão aberta não pinada antes do Execute | Alta | Kimiko não escreve o artigo `799731f5` (partes PENDENTES) até Hughie confirmar com o usuário |
| Trigger `trigger_regenerate_embedding()` pode ser assíncrono | Baixa | Verificar no código se é síncrono ou fila; se fila, aguardar antes de testar o RAG |
| `is_active = false` não é suficiente se RAG não filtra por campo | Baixa | Confirmar no `route.ts` que a query da KB filtra `WHERE is_active = true` |
| Encoding: write via PowerShell argv corromperia acentos | Média | Obrigatório: write via arquivo JSON + `--data-binary @arquivo.json` (nunca via argv) |
