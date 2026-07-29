---
type: index
of: lesson
deprecated: true
removed_in: v0.15.0
---

<!-- AUTO-GENERATED — DO NOT EDIT. Conteúdo vive em brain/lessons/. -->
<!-- content-hash: 8e8c98e65eb4f73f3da2c9fa5104f0bf778418994b3570517957af75cf22f856 -->

# Learned Patterns (Memória Autônoma)

> ⚠️ **DEPRECATED** — entradas vivem em [brain/lessons/](lessons/). Este arquivo é índice gerado e será removido em v0.15.0. **Não edite aqui** — edite `brain/lessons/L###-*.md`.

| ID | Título | Owners |
|---|---|---|
| [L001](lessons/L001-ui-design-system.md) | UI & Design System | [[Soldier Boy]] |
| [L002](lessons/L002-backend-integracao.md) | Backend & Integração | [[Luz Estrela]], [[Bruto]] |
| [L003](lessons/L003-repo-vault-obsidian-no-mesmo-diretorio.md) | Repo + Vault Obsidian no mesmo diretório | [[MM]], [[Bruto]] |
| [L004](lessons/L004-edicao-em-learned-patternsmd-sem-propagar-pro-cursor.md) | Edição em learned-patterns.md sem propagar pro Cursor | [[Bruto]], [[MM]] |
| [L005](lessons/L005-utf8-bash-windows.md) | Texto UTF-8 nunca via argv do bash no Windows — sempre via @file | [[Bruto]] |
| [L006](lessons/L006-babel-path-parent-vs-parentpath.md) | Babel: path.parent ≠ path.parentPath — sempre usar parentPath pra walk | [[Luz Estrela]] |
| [L007](lessons/L007-babel-pipeline-operator-plugin-requer-proposal.md) | Babel: pipelineOperator/decorators/partialApplication plugins requerem options ou throw | [[Luz Estrela]] |
| [L008](lessons/L008-chrome-slider-vertical-deprecated.md) | Chrome: `appearance: slider-vertical` deprecated — use writing-mode + direction | [[Soldier Boy]], [[Bruto]] |
| [L009](lessons/L009-chrome-popup-body-width-multi-column.md) | Chrome popup: `<body>` com width pequena corta conteúdo multi-coluna silenciosamente | [[Soldier Boy]], [[Bruto]] |
| [L010](lessons/L010-whatsapp-lid-pn-dichotomy.md) | WhatsApp Multi-Device LID↔PN — sempre resolver antes de upsertar conversa | [[Bruto]] |
| [L011](lessons/L011-review-estrutural-nao-pega-arquivo-faltante.md) | Review estrutural não pega 'vazio significa quebrado' | [[Luz Estrela]], [[Trem-Bala]], [[MM]] |
| [L012](lessons/L012-vercel-fluxon-nao-auto-deploya.md) | Vercel não auto-deploya commits do projeto Fluxon (Disparotey) — rodar `vercel --prod` manual | [[MM]], [[Bruto]] |
| [L013](lessons/L013-multiplas-sessoes-claude-paralelas-mesmo-repo.md) | Múltiplas sessões Claude no mesmo repo: sempre git fetch+log antes de qualquer ação, sempre confirmar deploy depois do push | [[Bruto]], [[MM]], [[A Lenda]] |
| [L014](lessons/L014-create-or-replace-function-novo-arg-default-cria-overload.md) | CREATE OR REPLACE FUNCTION com novo arg DEFAULT cria OVERLOAD, não substitui | [[Luz Estrela]], [[MM]] |
| [L015](lessons/L015-supabase-jwt-claim-role-null-no-dashboard.md) | current_setting('request.jwt.claim.role') retorna NULL no Supabase Dashboard SQL Editor, não 'service_role' | [[Luz Estrela]], [[Soldier Boy]] |
| [L016](lessons/L016-aidl-windows-javac-unicode-escape.md) | AIDL no Windows: '\\u' em path quebra javac com 'illegal unicode escape' em comentário | [[MM]], [[A Lenda]] |
| [L017](lessons/L017-pdf-fiel-docx-impossivel-sem-libreoffice.md) | PDF visualmente fiel a um .docx exige LibreOffice — @react-pdf não reproduz a paginação automática do Word | [[Frances]], [[A Lenda]] |
| [L018](lessons/L018-bottom-sheet-overflow-hidden-corta-modais-sem-scroll-interno.md) | BottomSheet desktop com max-h + overflow-hidden no wrapper corta modais sem scroll interno próprio | [[Bruto]], [[Luz Estrela]] |
| [L019](lessons/L019-fix-parcial-em-1-de-N-callsites-gera-regressao-silenciosa.md) | Fix de bug em 1 callsite de N gera regressão silenciosa — sempre grep o padrão antigo antes de commit | [[Bruto]], [[Luz Estrela]], [[Frances]] |
| [L020](lessons/L020-supabase-migration-via-management-api-quando-pg-direto-falha.md) | Aplicar migration Supabase via Management API quando `pg` direto e pooler falham | [[Bruto]], [[Kimiko]], [[MM]] |
| [L021](lessons/L021-baileys-dupe-impossivel-via-lid-anonimo.md) | Cross-ref anti-duplicação de disparo é cego pra LIDs anônimos do WhatsApp | [[Bruto]] |
| [L022](lessons/L022-baileys-disconnect-multiplo-trigga-ban-24h.md) | Múltiplos disconnect+reconnect/restore num mesmo chip em <30min trigga ban WhatsApp 24h | [[Bruto]] |
| [L023](lessons/L023-welcome-worker-sem-mutex-fix-parcial-de-c503959.md) | Worker novo / refatorado tem que herdar TODAS as proteções dos peers (mutex, dedup, claim atômico) — L019 reincidente | [[Bruto]] |
| [L024](lessons/L024-queue-worker-claim-atomico-defesa-profunda.md) | Queue worker: mutex em memória sozinho é insuficiente — claim atômico via UPDATE+FOR UPDATE SKIP LOCKED é a defesa profunda | [[Bruto]] |
| [L025](lessons/L025-pipeline-fluxo-unificado-em-vez-de-singleton-por-fonte.md) | Pipeline de lead repetitivo em N fontes vira N rows numa tabela unificada — não 1 endpoint + 1 config singleton por fonte | [[Bruto]] |
| [L026](lessons/L026-coexistence-whatsapp-requer-tech-provider.md) | WhatsApp Coexistence (Business app + Cloud API no mesmo número) é gated — só Solution Partner ou Tech Provider aprovado pela Meta pode usar | [[Bruto]], [[Francês]] |
| [L027](lessons/L027-auto-start-worker-ignora-config-ativo-e-forca-true.md) | Auto-start de worker ignora flag `config.ativo` e o `start()` força ativo=true — defesa em camadas só sobrevive com fila pendente vazia | [[Bruto]], [[MM]] |
| [L028](lessons/L028-chip-pos-ban-outreach-restricted-mas-envio-ok.md) | Chip WhatsApp recém-saído de ban tem restrição granular de outreach (criar grupo/contatar novo) mas envio em grupo existente funciona | [[Bruto]] |
| [L029](lessons/L029-next-cookie-client-side-nao-invalida-rsc-cache.md) | Next.js App Router: trocar cookie via document.cookie + router.refresh() não invalida o RSC cache — usar server action + revalidatePath | [[Bruto]] |
| [L030](lessons/L030-meta-lead-forms-campo-renomeia-e-multipla-escolha-vem-como-key.md) | Meta Lead Forms: nome interno do campo renomeia silenciosamente (quebra match exato) e múltipla escolha volta como key snake_case com prefixo numérico, não como label | [[Bruto]] |
| [L031](lessons/L031-numero-de-outro-projeto-vira-fato-sem-verificar-na-fonte.md) | Número de outro projeto vira 'fato' no design sem verificar — contar na fonte antes de escrever quantidade em artefato | [[Bruto]], [[A Lenda]], [[Frances]] |
| [L032](lessons/L032-numeracao-sequencial-colide-em-trabalho-paralelo-multichat.md) | Numeração sequencial (D###, migration NNNN) colide entre 2 chats em paralelo — reserva tem que ser claim atômico + faixa por agente | [[Bruto]] |
| [L033](lessons/L033-vercel-env-add-stdin-injeta-newline-no-valor-windows.md) | `printf '%s\\n' | vercel env add` injeta \\r\\n no valor (Windows/Git Bash) → 401 silencioso com o token CORRETO | [[MM]], [[Bruto]] |
| [L034](lessons/L034-instrucao-negativa-em-rag-reinjeta-token-proibido.md) | Instrução negativa em doc de RAG re-injeta o token proibido (elefante rosa) | [[Bruto]], [[Luz Estrela]] |
