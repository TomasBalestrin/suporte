# Melhorias da Sofia — investigação dos 7 dias (2026-06-16)

Investigação read-only (`investigate-7d.mjs`) sobre 150 conversas / 144 respostas (09→16/06).

## Saúde
- Confidence bimodal: 40% conf=0 (sem hit na KB) / 60% em 60-79. avg=41.
- Thumbs-down 57% (13/23 votos — amostra pequena).
- Categorias: Acesso/Login 63%, Reembolso 18, Uso 26.
- Under-call pré-Fix-B: 56 sugeriram escala, 44 sem tool e sem ticket → **valida o Fix B** (dead-end real).

## Bugs corrigidos (M1 + M2, decided_by: usuário 2026-06-16)

### M1 — veneno "7 dias" (13×) — CÓDIGO
- **Causa**: tool `orientar_reembolso` retornava `{"instrucao":"Oriente sobre o prazo de 7 dias."}` (route.ts) → Sofia afirmava "você está dentro do prazo de 7 dias", violando a Regra Inegociável 19 (não tem a data da compra), gerando confusão de "data no futuro" (thumbs-down).
- **Fix** (`route.ts`): (a) tool def perde o param `dias_desde_compra`/`required` (parava de interrogar o cliente pela data); (b) resultado da tool reescrito → "reembolso é direto na Hotmart/PagTrust, NÃO afirme prazo, escale chamando escalar_para_humano". Alinhado ao brain (Bethel não processa reembolso pelo suporte).

### M2 — URL alucinada `quillforms/implementacao-cleiton-67` (3×, conf=75) — PROMPT (ai_config)
- **Causa**: a própria Regra 2 do system_prompt ENUMERAVA as URLs proibidas ("implementacao-cleiton-67, formulario-67, julia-implementacao-de-ia") — e por **L034 (elefante rosa)** citar o token proibido num prompt lido por gpt-4o-mini **re-injeta** o token, que então é emitido.
- **Fix** (runtime `ai_config`): Regra 2 + LEMBRETE FINAL item 2 reescritos SEM os tokens proibidos, em instrução POSITIVA: "Implementação IA / cursos / módulos = área de membros (Julia Academy / Cleiton Querobin), NUNCA /quillforms/; o único /quillforms/ que existe é o Teste dos Arquétipos". Backup: `system_prompt-M2-2026-06-16.txt` (e o pré-M2 = `../sofia-auto-ticket/system_prompt-NEW-2026-06-16.txt`).
- **Lição reforçada**: L034 vale também pro system_prompt, não só pra docs da KB. Disciplina de "não use X" em prompt de RAG re-injeta X — instruir só o correto, no positivo.

## Follow-ups (não aplicados)
- M3 — ramo de troubleshooting pra quando "Esqueci minha senha" não aparece pro cliente.
- M4 — cobertura de KB pros temas conf=0 (40% das perguntas não acham nada).

## Verificação
- M1: `tsc` 0 · `vitest` 129 · `build` 0. UAT em prod (reembolso → sem "7 dias").
- M2: read-back confirmou poison removido + instrução positiva presente. UAT em prod (acesso Implementação Cleiton → área de membros, não /quillforms/).
