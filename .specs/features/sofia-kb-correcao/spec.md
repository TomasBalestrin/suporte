# Spec: sofia-kb-correcao

**Status**: specify
**Owner**: hughie (specify) → frenchie (design/audit KB) → kimiko (execute) → starlight (review) → mm (ship) → hughie (UAT) → butcher (merge)
**Iniciada**: 2026-05-21
**Scope**: Large (provisório — Frenchie reconfirma na Design)
**Tier**: Opus (correção user-facing de produção, escrita em dado vivo — Edgar pre-flight)
**Gatilho**: Incidente ticket SUP-2026-0329 (ver `STATE.md` → "Incidente 2026-05-21")

## Objetivo

Corrigir a `knowledge_base` viva da Sofia (SUPORTE, Supabase `zeocxcfiyhzsztwjllvl`) para que ela pare de dizer que o "Teste dos Arquétipos" é grátis/sem login e pare de mandar o link morto `quiz.testedosarquetipos.com.br`. A causa não é o modelo nem a config (prompt v3 ativo, temp 0.2, threshold 0.6) — é **conteúdo errado e contraditório na KB**, amplificado por duplicação de artigos. O escopo cobre três frentes acopladas:

1. **Correção de conteúdo** — eliminar o enquadramento "é livre / não exige login" e o link `quiz.testedosarquetipos.com.br`; convergir todo "Teste dos Arquétipos" para a verdade confirmada (produto pago) e o link canônico único.
2. **Convergência de links** — garantir que TODO artigo + o system_prompt apontem para a mesma URL canônica; nenhuma URL órfã/divergente sobra na KB.
3. **Deduplicação** (`sofia-kb-dedup` absorvido) — quase todo artigo está duplicado 2x, o que dobra o peso de qualquer narrativa errada no top-5 do RAG. Frenchie dimensiona se entra inteiro nesta feature ou vira fase final.

## Verdade da fonte (confirmada pelo usuário 2026-05-21 — NÃO reinventar, L031)

- "Teste dos Arquétipos" é **PAGO**. Não existe quiz grátis público.
- Link canônico único: `https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/`.
- `https://quiz.testedosarquetipos.com.br` está **morto** — eliminar de toda a KB.
- Credenciais de área de membros (inalteradas): Julia → `juliaacademy.com.br` / `ottoni123`; Cleiton → `cleitonquerobin1.com.br` / `performance123`; 50 Scripts → `50scripts.cleitonquerobin.com.br` / `performance123`.

## ⚠️ Questão aberta — BLOQUEIA o conteúdo do fix (Hughie pina com o usuário)

"Produto pago" + "link de teste sem login" se contradizem na superfície. Antes de reescrever os artigos, pinar:

1. O comprador do "Teste dos Arquétipos" recebe o quê, exatamente? O quillforms `/perpetuo-...` é aberto (qualquer um abre) ou gateado por compra?
2. Quando a Sofia deve mandar o **quillforms** (fazer/refazer o teste) vs. o **login da área de membros** (`juliaacademy.com.br` + `ottoni123`)?
3. No caso do print (cliente travada num login pago com "senha errada"): a resposta correta é a área de membros, certo? Confirmar o fluxo de "senha errada" (orientar "Esqueci minha senha" / reenviar credencial-padrão / abrir ticket?).

> ASSUNÇÃO PROVISÓRIA do Butcher (Hughie confirma/derruba): quem reclama de "senha errada" / login que não abre → caminho **área de membros** (juliaacademy + ottoni123 + "Esqueci minha senha"); o quillforms só quando o cliente quer literalmente *fazer/refazer o teste*. A Sofia precisa desambiguar por intenção, não por palavra-chave "arquétipo".

## Critérios de Sucesso (mensuráveis)

- [ ] Zero artigos ativos na `knowledge_base` contendo `quiz.testedosarquetipos.com.br` (hoje ≥1: `799731f5`)
- [ ] Zero artigos ativos contendo "é livre", "não exige login", "grátis e aberto", "não precisa de login" referente ao Teste dos Arquétipos
- [ ] Todo "Teste dos Arquétipos" na KB aponta para a URL canônica única; nenhuma URL de teste divergente
- [ ] system_prompt e KB concordam sobre o link (sem contradição)
- [ ] Auditoria SQL pós-fix: `SELECT count(*) FROM knowledge_base WHERE content ILIKE '%quiz.testedosarquetipos%' OR content ILIKE '%não exige login%' OR content ILIKE '%é livre%'` retorna 0 (ativos)
- [ ] (se dedup entrar) cada título de artigo aparece 1x entre os ativos
- [ ] Embeddings regerados para todo artigo alterado/criado (senão RAG não acha — débito D3 do brain)
- [ ] Monitoramento 48h: nenhuma resposta nova com o link morto ou enquadramento "grátis"

## Casos de Uso

**Caso A — cliente travado em login pago (o do incidente)**
- Cliente: "comprei o teste de arquétipo, fala que a senha está errada" + print de login pago
- ATUAL ruim: "é livre, não exige login" + link do quiz morto
- ESPERADO: reconhecer que é acesso a produto pago → orientar área de membros correta (`juliaacademy.com.br` + `ottoni123`) e "Esqueci minha senha"; se não resolver, abrir ticket. NUNCA dizer que é grátis.

**Caso B — cliente quer FAZER/REFAZER o teste**
- Cliente: "como faço o teste dos arquétipos?" / "como refaço?"
- ESPERADO: link canônico do quillforms (conforme decisão da questão aberta). Sem prometer e-mail de resultado.

**Caso C — cliente confunde teste com produto pago de arquétipos**
- Cliente comprou "Posicionamento Milionário"/"Implementação IA Julia" e fala em "arquétipos"
- ESPERADO: desambiguar UMA vez, rotear pra área de membros paga. Não despejar o quiz.

## Fora de escopo (deferred)

- Reescrita do system_prompt v3 (está saudável — só ajuste pontual se a Design provar necessidade de regra anti-"é grátis")
- Tools function-calling (`sofia-tools-v1`)
- Input gating (`sofia-input-hygiene`)
- Reprocessamento das 346 unanswered

## Riscos e dependências

- **Escrita em dado vivo de prod** (KB customer-facing). Mitigação: snapshot dos artigos antes do write; MM define rollback; Luz Estrela revisa o diff antes de aplicar.
- **Encoding UTF-8** — leitura via Management API mostrou mojibake. Confirmar que o banco guarda UTF-8 limpo; escrever via arquivo/`--data-binary`, nunca via argv (lição FluxonApp). Bloqueia o Execute até confirmado.
- **Embeddings** — todo artigo alterado precisa ter o embedding regerado (`/api/admin/knowledge-base/generate-embeddings` ou trigger `016`), senão a correção fica invisível pro RAG.
- **Push bloqueado** — repo `TomasBalestrin/suporte`, user `eduardotkfm-maker` sem permissão de push (T15.1 do v3 ficou bloqueado). Edição de KB é via SQL/Management API, não precisa de push; mas qualquer mudança de `route.ts`/prompt em código tem o mesmo gargalo de antes.
- **Dedup** pode ser grande (~55 pares). Frenchie decide se fatia.

## Próxima fase: Design (Frenchie)

1. Ler `STATE.md` (incidente 2026-05-21) e este `spec.md`.
2. Auditar a KB viva: enumerar TODO artigo que (a) cita o teste dos arquétipos, (b) contém `quiz.testedosarquetipos`, (c) diz "é livre/grátis/sem login", (d) tem URL de teste divergente; e mapear TODOS os pares duplicados (id + título).
3. Confirmar status de encoding do banco (UTF-8 limpo?).
4. Propor o conteúdo corrigido de cada artigo (depende da questão aberta — coordenar com Hughie).
5. Definir estratégia de dedup (qual id mantém, qual desativa) e plano de regeneração de embeddings.
6. Plano de rollback (snapshot + critério).
7. Escrever `.specs/features/sofia-kb-correcao/design.md`.
