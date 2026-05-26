# Feature: sofia-regression-suite

> Scope: **Medium** · Tier: **Opus** (refatora handler crítico de prod). Objetivo: rede de regressão para a lógica determinística da Sofia que mexemos sem teste nessa sessão.

## Por quê
4 deploys nessa sessão tocaram prompt/route.ts/KB só com smoke manual. O brain marca o buraco 2x (sofia.md D5 + oportunidade 2: "Playwright sem cobertura de Sofia → mudança de prompt não tem regression"). A resposta da Sofia é não-determinística (LLM) — **não se testa texto do LLM**. Testa-se a **lógica determinística** que monta o contexto/decisões, hoje inline e não-testável no `route.ts`.

## Estratégia
Extrair as funções **puras** (sem I/O) de `src/app/api/ai/chat/route.ts` para um módulo `src/lib/sofia/context.ts`, refatorar o route pra importá-las (**behavior-preserving, zero mudança de comportamento**), e cobrir com Vitest. O fetch/HTTP (`consultar_fluxon`, `consultar_wordpress`, `fetchWpContext`) **permanece no route** (I/O, não é alvo).

## Funções a extrair (puras) → `src/lib/sofia/context.ts`
1. `KEYWORDS_ACESSO` (regex, exportar a const exata que está inline).
2. `computeConfidence(bestSimilarity: number): number` → `Math.round(bestSimilarity * 100)`.
3. `buildFluxonContext(fl: any): { fluxonContext: string | null; fluxonSemCompra: boolean; fluxonCanonicalEmail: string | null }` — replica a lógica do bloco pre-fetch: se `Array.isArray(fl.compras) && length>0` → monta a string de compras (diagnostico_resumido + lista); senão `fluxonSemCompra=true`; sempre captura `fl?.cliente?.email ?? null`.
4. `buildDadosOperacionais(fluxonContext: string | null, fluxonSemCompra: boolean): string` — replica o ternário atual: contexto presente → nota "DADOS OPERACIONAIS … PRIORIZE …"; `fluxonSemCompra` → a **nota de escalonamento** (a que shipamos: "integra Hotmart e PagTrust", confirmar UMA vez, ESCALAR com comprovante/ticket, "NUNCA afirme que o cliente não comprou"); senão `''`.
5. `buildWpCandidates(typedEmail: string | null, canonicalEmail: string | null): string[]` — filtra vazios, dedup case-insensitive preservando ordem `[typed, canonical]`.
6. `annotateWpDivergence(wpContext: string, matchedEmail: string, typedEmail: string | null): string` — se `matchedEmail.toLowerCase() !== typedEmail?.toLowerCase()` (e typed não-nulo) → prefixa a nota "Conta localizada sob o e-mail X, diferente do informado…"; senão devolve `wpContext` intacto.

`route.ts` passa a importar e usar essas — **sem alterar o que o usuário/Sofia vê**. A extração é mecânica (recortar inline → função → chamar).

## Testes → `src/lib/__tests__/sofia-context.test.ts` (Vitest)
- **buildDadosOperacionais** (guarda o copy de escalonamento): `fluxonSemCompra=true` → string contém "comprovante", "ticket", "Hotmart e PagTrust", "NUNCA afirme que o cliente nao comprou". contexto presente → contém "PRIORIZE". neither → `''`.
- **buildFluxonContext**: compras>0 → fluxonContext não-nulo c/ produto+link, semCompra=false, canonicalEmail de cliente.email. cliente sem compras → fluxonContext nulo, semCompra=true, canonicalEmail setado. objeto vazio → tudo nulo/false sem throw.
- **buildWpCandidates**: [typed,canonical] diferentes → `[typed, canonical]`. iguais (case-diff) → `[typed]`. canonical nulo → `[typed]`. ambos nulos → `[]`.
- **annotateWpDivergence**: matched≠typed → prefixo de divergência presente. matched==typed (case-insensitive) → inalterado. typed nulo → inalterado.
- **KEYWORDS_ACESSO**: casa "não consigo acessar", "esqueci a senha", "não recebi o acesso", "perdi o login"; NÃO casa "quero cancelar", "qual o horário de atendimento".
- **computeConfidence**: 0.73→73, 0→0, 0.605→61 (arredonda), 1→100.

## Verificação
- `npm run build` verde + `npm run test` verde (incluindo a suite nova).
- **Luz Estrela**: confirmar que o `route.ts` refatorado produz exatamente o mesmo output que antes (extração behavior-preserving) — comparar os blocos antigo vs. função.
- **MM**: deploy do route refatorado (behavior-preserving) + smoke benigno (endpoint 200, sem regressão). Sem migration.

## Gate
Kimiko (extrai + testa) → ⭐ Luz Estrela (review: extração idêntica + qualidade dos testes) → 🍼 MM (deploy + smoke) → 🔪 Bruto (merge).

## Rollback
Vercel 1-click (sem schema). Se algum teste flakar, é lógica pura — determinístico, não deve flakar.

## Fora de escopo
- Testar resposta do LLM (não-determinística). - E2E Playwright do fluxo completo (caro/flaky). - Tools de I/O (fetch).
- Extrair MAIS do que mexemos (não refatorar o handler inteiro — só os pedaços puros que tocamos).
