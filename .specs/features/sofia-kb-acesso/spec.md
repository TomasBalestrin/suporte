# Feature: sofia-kb-acesso — passe de KB de Acesso/Login + hotfix quillforms

> **Scope**: Large · **Tier**: Opus (user-facing, copy que cliente lê) · **Owner de fase**: Bruto (orquestra) → Kimiko (execute) → Luz Estrela (gate) → MM (deploy/embeddings) → Hughie (UAT) → Bruto (merge)
> **Origem**: unifica M3+M4 da investigação `sofia-melhorias-0616`. Research brownfield em `sofia-kb-acesso/` (Francês, 2026-06-19).

## Problema (evidência fresca, 7d até 2026-06-19)

- **37% das respostas em `conf=0`** (32/86). Thumbs-down 70% (amostra pequena).
- **Acesso e Login = 60% do volume** (62/103 conversas). É a dor nº1.
- `fluxon_identificacao: nao_encontrado = 43` (~metade dos clientes não identificados).
- **Diagnóstico (Francês)**: NÃO é falta de conteúdo — 133 artigos na KB, **0 embedding NULL**. O conf=0 vem de **mismatch semântico**: o artigo existe mas a palavra do cliente ≠ a palavra do artigo, e o vetor não passa do threshold (0.6). A Sofia improvisa sobre artigo que tem mas não achou.
- **🔴 Regressão viva**: `quillforms/implementacao-cleiton-67` em 2 respostas PÓS-fix M2 (16/06 e 18/06). Cliente pagante recebendo URL alucinada. (`7 dias` morreu de vez — tudo pré-fix.)

## Decisões (decided_by: usuário, 2026-06-19)

- **D1 — Sequência**: BATCH. Hotfix do quillforms + passe de KB num único deploy gated (como M1/M2).
- **D2 — PDF do teste**: NÃO existe. Resultado do Teste dos Arquétipos só exibe na tela ao final. Artigo orienta ver na tela / refazer se expirou.
- **D3 — Criação de conta**: automática e imediata na compra (Hotmart/PagTrust → área de membros). Logo "senha padrão não entra" = e-mail errado/digitação, NÃO falta de conta. Troubleshooting: confirmar e-mail exato da compra → reset → escala se não resolver.
- **D4 — Corte de escopo (Bruto)**: P6 ("3 configurações secretas do Instagram") **fora do pacote** — travado em fato de produto não respondido (Q2) + frequência 1×. Vira débito.
- **D5 — Categoria**: artigos novos usam a categoria canônica **`acesso`** (minúsculo, a do seed 011). NÃO criar 4ª variante. Limpeza das 3 variantes + 47 duplicatas inativas = débito separado.

## Restrições inegociáveis

- **🚨 L034 (elefante rosa)**: PROIBIDO listar URL/token proibido no system_prompt ou em artigo ("nunca envie quillforms/implementacao-67"). Citar o token re-injeta ele — foi o que causou a regressão M2→hotfix. **Fix é sempre POSITIVO**: afirmar só a verdade correta com o wording do cliente. O artigo P4 corrige a alucinação dizendo o que É (área de membros), nunca o que NÃO é.
- **Embedding obrigatório**: todo artigo novo/editado precisa de embedding gerado (`POST /api/admin/knowledge-base/generate-embeddings` ou equivalente) ANTES de valer — artigo sem embedding = invisível pro RAG (gotcha conhecido).
- **Sem schema change**. Só conteúdo (`knowledge_base`) + `ai_config.system_prompt`. Backup do prompt antes de tocar.

## Escopo do pacote (P1-P5 + M3)

| ID | Tipo | Título / direção | Produto | Wording-alvo do cliente |
|---|---|---|---|---|
| P1 | KB | "Senha padrão não entra no primeiro acesso" — conta é imediata; confirmar e-mail EXATO da compra, reset, escala se não resolver | Todos | "a senha padrão não entra", "e-mail e senha padrão não funcionam", "a senha não está entrando" |
| P2 | KB | "Produto/aulas aparecem bloqueados dentro da área de membros" — causas (progressão de módulo, produto diferente do comprado, compra não processada) e conduta por causa | Todos | "está trancado nos meus produtos", "acesso a plataforma mas não todas as aulas" |
| P3 | KB | "Resultado do Teste dos Arquétipos — onde ver" — só na tela ao final, não há PDF/e-mail; como refazer se a página expirou | Julia Ottoni | "não recebi o resultado em PDF", "não recebi o resultado do teste" |
| P4 | KB | **(hotfix quillforms)** "Implementação IA é acessada pela área de membros — não é app" — acesso online pelo navegador na área de membros [URL correta]; afirmação POSITIVA, L034-safe | Implementação Cleiton/Julia | "esperava um aplicativo", "cadê o instalador", "implementação cleiton acesso" |
| P5 | KB | "Link do Teste dos Arquétipos não abre / página inexistente" — rota correta do teste, diferença entre URL do teste e URL de acesso ao produto | Julia Ottoni | "clico no link e diz que a página não existe", "não consigo fazer o teste" |
| M3 | prompt | Ramos no `system_prompt`: (a) "cliente esperava um app" → área de membros online; (b) "senha padrão não entra" → confirmar e-mail exato → reset → escala. POSITIVO, sem listar proibições. | — | — |

## Verificação (a real, não "torço pra funcionar")

A correção é semântica → tem que ser **medida**, não suposta:
1. Após inserir + gerar embeddings, rodar `search_knowledge_base` com cada **wording-alvo** da tabela e confirmar que o artigo novo retorna **acima do threshold (0.6)**. Eval harness reusa o padrão de `sofia-melhorias-0616/investigate-7d.mjs` (read-only, node do Cursor).
2. `tsc` 0 · `vitest` verde · `next build` 0.
3. UAT em prod (e-mail controlado `contato@mv4digital.com.br`): disparar cada wording-alvo no `/suporte/ajuda` e confirmar resposta correta + sem `quillforms/implementacao-*`.
4. Pós-deploy: rerodar `investigate-7d.mjs` em 48h — esperar conf=0 cair e quillforms = 0.

## Deploy / Rollback

- **Deploy**: aplicar SQL (KB) + `ai_config.system_prompt` (com backup) via Management API; `vercel --prod`. Sem migration → rollback 1-clique (código) + restaurar backup do prompt (cache 5min).
- **Critério de rollback**: quillforms reaparece, conf=0 não cai, ou explosão de resposta errada.

## Débitos registrados (fora do pacote)

- **Trilha 3 — buraco de arquitetura**: cliente sem produto selecionado (`nao_encontrado` ~50%) perde o boost `[Produto: X]` na busca → RAG pior. Maior, separado.
- Categoria: 3 variantes de "Acesso" + 47 duplicatas inativas → consolidar.
- Chave órfã `knowledge_base_threshold=0.7` no banco (código lê `confidence_threshold=0.6`) → remover do painel ou ligar.
- P6 "3 configurações secretas" — pendente Q2.

## Questões abertas (Hughie/Eduardo — async, não bloqueiam P1-P5)

- **Q2**: "3 Configurações Secretas do Instagram" — produto real? onde fica na área de membros Julia? (gate do P6)
- **Q5**: Teste dos Arquétipos vem junto com outro produto ou é comprado separado? (refina P3/P5)
