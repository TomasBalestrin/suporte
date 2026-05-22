---
type: project
name: Bethel Contratos
aliases:
  - Bethel Contratos
  - bethel-contratos
  - BETHEL CONTRATOS
folder: C:/Users/lluys/Desktop/PROJETOS/BETHEL CONTRATOS
stack: [next, typescript, supabase, tailwind, react-pdf, pdf-lib, resend]
deploy: vercel
status: active
mapped_by: "[[Bruto]]"
mapped_at: 2026-05-15
related:
  - "[[fluxonapp]]"
  - "[[bethel-anuncios]]"
  - "[[bethel-rh]]"
---

# Projeto: Bethel Contratos
> Notas que ajudam o time a trabalhar neste projeto sem re-perguntar. Curto e factual. Decisão local do projeto vai no `.specs/project/STATE.md` dele, não aqui — aqui é o resumo "como funciona / o que lembrar".
> Mapeado por: Bruto (brownfield, com STATE.md já maduro), 2026-05-15. Fonte: `AGENTS.md` + `.specs/project/{PROJECT.md,STATE.md}` + leitura da estrutura.

## O que é
- Sistema interno de **assinatura digital de contratos** pra Bethel — clone funcional do D4Sign focado no núcleo: upload PDF (ou geração a partir de modelo) → enviar pra signatários → coletar assinatura (canvas ou fonte cursiva) → arquivar com audit trail (hash SHA-256 + IP + UA + timestamp). Mata dependência de D4Sign/DocuSign/Clicksign.
- **Pasta**: `C:/Users/lluys/Desktop/PROJETOS/BETHEL CONTRATOS` (com espaço — sempre quotar) · **Stack**: Next.js 16 (App Router) + TypeScript + Tailwind + Supabase (Auth + Postgres + Storage + RLS); shadcn (style `base-nova`) + Radix + lucide + sonner + tanstack/react-query + @supabase/ssr; **@react-pdf/renderer** (server-only, gera PDF do contrato a partir de modelo) + **pdf-lib** (anexa termo de assinatura no PDF final) + **jszip** (extrai texto de `.docx` no editor de modelo) + **Resend** (e-mail).
- **Deploy**: Vercel — `https://bethel-contratos.vercel.app` (projeto `bethel-contratos` no team `tt-solucoes-projects`, criado/deployado via `vercel` CLI logado como `tomasbalestrin`). **Sem GitHub conectado** — deploy é `vercel deploy --prod --yes` from local dir; `.vercel/` já linkado. Sem domínio custom.
- **Usuários**: Equipe Bethel (≤5 internas, autenticadas); signatários externos via link único + token assinado e expirável.
- **Ecossistema**: parte do "Bethel" da MV4 Digital. **Integra com [[fluxonapp]]** (envio do link de assinatura por WhatsApp via Baileys, endpoint `POST /api/external/send`). **Design system importado de BETHEL CS** (Navy `#001321` / Gold `#B19365`).

## Arquitetura em 30s
- **Front**: Next.js App Router. Rotas autenticadas (equipe): `/contratos` (dashboard), `/contratos/novo` (escolhe "subir PDF" ou "a partir de modelo"), `/contratos/[id]/{preencher,enviar}`, `/contratos/[id]` (detalhe + AuditTimeline + download), `/modelos`, `/modelos/{novo,[id]/editar}`. Rotas públicas (signatário externo): `/(public)/assinar/[token]`, `/assinar/{erro,obrigado,recusado}`. Auth via `/login`, `/reset-password`, `/callback` (Supabase Auth).
- **Server Actions**: `src/app/actions/{auth,contracts,contracts-modelo,modelos}.ts` — mutações Postgres. `enviarContrato` faz UPDATE+INSERT em 2 chamadas (dívida T18-D01: ainda não atomizado em RPC).
- **Renderização de PDF de contrato (caminho "a partir de modelo")**: `src/lib/pdf-contrato-generico.tsx` (server-only) — substitui `{{vars}}` por tipo (cpf/cnpj/moeda/data…) → parseia markdown mínimo (`# / ## / ### / - / **bold**`) via `src/lib/modelo-corpo.ts` → desenha A4 sóbrio Times-Roman P&B. **Template-como-dado**: `corpo` (texto md) + `variaveis` (jsonb estruturado) salvos no banco; sem componente React por modelo.
- **PDF final assinado**: termo de assinatura (nome, e-mail, IP, UA, timestamp UTC, hash SHA-256 do original + assinatura) anexado ao PDF original via **pdf-lib**, hash final recalculado e armazenado.
- **Banco** (Supabase, projeto **novo**, isolado do FluxonApp): `profiles`, `contratos` (`status`: rascunho/enviado/parcialmente_assinado/assinado/expirado/recusado/cancelado; `origem`: upload/modelo; `corpo_customizado` opcional pra edição livre por contrato), `signatarios` (com `telefone` opcional pra WhatsApp), `modelos_contrato` (versionado append-only, D2.9 — editar modelo já-usado vira versão N+1, nunca muta), `modelos_contrato_eventos` (audit administrativo), `eventos_auditoria` (audit jurídico do fluxo de assinatura, **trigger immutable** `trg_eventos_auditoria_immutable`). RLS em tudo. Trigger compartilhado `fn_set_updated_at()` (BEFORE UPDATE) → mexe `atualizado_em` (não `updated_at`! — ver armadilha).
- **Storage**: bucket `contratos-originais` (PDFs subidos + PDFs gerados a partir de modelo + PDFs finais assinados).
- **Cron**: `/api/cron/marcar-expirados` (protegido por `CRON_SECRET`).

## Como rodar localmente
- `npm install` → `npm run dev` (Next, `localhost:3000`). Build: `npm run build` (production build).
- Env vars (`.env.local` + Vercel Production): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY` (key real `re_STp4...` em prod), `EMAIL_FROM` (até `bethelapps.com` ser verificado, é `onboarding@resend.dev` — só envia pro e-mail da conta Resend), `CRON_SECRET`, `NEXT_PUBLIC_APP_URL`, **opcionais p/ WhatsApp**: `FLUXONAPP_API_URL=https://fluxonapp.vercel.app`, `FLUXONAPP_API_KEY` (a externa, não o `SERVICE_SECRET`), `FLUXONAPP_CONTRACT_CHIP_ID` (UUID do chip do FluxonApp — hoje `6797f4c3-a3ab-4314-b368-d79f42d39133` = EQUIPE CLEITON, que é **chip de teste**, trocar pro de produção quando definir).
- Sem `FLUXONAPP_*` setado → caminho WhatsApp aparece desabilitado no `/enviar` (graceful degradation; só e-mail funciona).
- **Migrations**: `supabase/migrations/*.sql`. Aplicar via `c:/tmp/apply-migration-bethel.mjs` (Management API, igual ao Bethel Anúncios). `.docx` upload usa `jszip` em memória (sem `unzip` CLI — não existe na Vercel).
- **Deploy de mudanças**: `cd "BETHEL CONTRATOS" && vercel deploy --prod --yes`.

## Armadilhas / "não faça"
- **NUNCA** rodar `npm run build` enquanto o `next dev` está rodando — corrompe o `.next/` (erro `Cannot find module ./vendor-chunks/...`). Parar o dev server antes, ou `rm -rf .next` + reiniciar.
- **Sempre testar write-path no banco de verdade**, não só rastrear código. Em 2026-05-08 a hotfix `20260508120700` (`SET search_path`) reescreveu o corpo de `fn_set_updated_at()` e errou o nome da coluna (`updated_at` em vez de `atualizado_em`) — **TODO `UPDATE` em `contratos`/`profiles`/`signatarios` falhou em silêncio por 4 dias** porque os UATs/gates foram só code-trace. Fix em `20260512120400`. Lição: UAT interativo no navegador não é opcional pra mutations.
- **D2.9 (snapshot append-only) é sagrado**: editar modelo já-usado → cria versão N+1, NUNCA muta `corpo`/`variaveis`/`nome` da linha antiga. Contrato gerado guarda `modelo_id`+`modelo_versao` apontando pra versão congelada + PDF imutável no bucket + `hash_original`. Brecha aqui = **BLOCKER** pro Luz Estrela.
- **Soldier Boy bloqueia**: cor literal em JSX (use token); fonte fora do canon (Geist via `next/font/local`); border-radius arbitrário (só 6/10/14/20/24); componente duplicado (verificar `design-system/registry.json` antes de criar). **Exceção D2.7**: hex literal **é permitido** dentro do renderer `@react-pdf/renderer` (não é JSX, é `Style` object — sem alternativa via token).
- **Variável opcional vazia** ainda deixa vírgula solta em frases tipo "...CNPJ , com endereço..." (`710e300` corrigiu o `[__]`, mas a vírgula órfã é per-modelo — reescrever a frase do CNPJ via `/modelos/<id>/editar`).
- **IP via `x-forwarded-for`** é forjável em ambientes sem reverse proxy confiável (Vercel + Cloudflare normalizam ok, documentar antes de self-host).
- **Storage cleanup em rollback parcial**: se `storage.remove` falhar após INSERT em `contratos` falhar, o PDF fica órfão no bucket (cron de cleanup só quando o volume justificar).
- **Encoding pt-BR via curl no Windows**: já mordeu na sessão da feature 005 (UAT do WhatsApp) — `curl` do Git Bash estraga literais não-ASCII em argv. Usar script Node (`fetch` + `JSON.stringify`) ou `--data-binary @arquivo.json`. Ver [[feedback-utf8-bash-windows]].
- **Quirk do `onWhatsApp`**: número-do-próprio-chip resolve como "não tem WhatsApp" no smoke test do `/api/external/send`. Usar outro número pra testar.
- **Modelos ativos sem revisão jurídica**: os 7 modelos seedados (`movi-trafego-pago`, `bethel-mentoria-elite-premium`, `bethel-implementacao-conteudo`, `bethel-mentoria-{premium-semestral,premium-trimestral}`, `next-implementacao-{comercial,ia}`) estão `ativo=true` em prod **sem a passada jurídica humana**. 6 divergências conhecidas vs `.docx`-fonte registradas no STATE.md — corrigir via `/modelos/<id>/editar` antes de uso real. O downstream (membro da equipe pré-visualiza o PDF antes de enviar) é a rede de segurança.
- **Pendências MVP Readiness** (PROD checklist): PROD-03 (domínio Resend `bethelapps.com` — DNS no Hostinger sem acesso, parado); PROD-05 (rate limit em `/assinar/[token]` e `/api/contratos/[id]/gerar-pdf` — não feito); PROD-07 (Sentry/logs estruturados — só `console.error` hoje).
- **Sem ICP-Brasil no MVP** (princípio do PROJECT.md). Audit trail próprio basta pra uso interno; ICP entra só quando cliente externo exigir formalmente.

## Estado atual
- **Em produção** desde 2026-05-12: `bethel-contratos.vercel.app`. MVP funcional 100% E2E + features 006–010 todas em prod.
- **Feature ativa: 010 — renderer custom PDF fiel ao `.docx`** (modo iterativo). Modelo `bethel-mentoria-elite-premium` v3 roda com renderer custom `src/lib/renderers/elite-v1/EliteV1Pdf.tsx` (componente React PDF de ~774 linhas que reproduz o Word — tabelas Quadro A→I navy `#1F3864`, 15 cláusulas, página de assinaturas). Decisão arquitetural (2026-05-15): usuário **descartou LibreOffice/Gotenberg na VPS Hetzner** ("porque tá colocando o BETHEL na VPS?") → renderer React por modelo, sem VPS/sem custo. **Revisão visual iterativa em curso**: usuário compara prévia vs `.docx` no Word e aponta ajustes; cada um vira commit + deploy. **Página 1 (Quadro Resumo) revisada e deployada em 2026-05-20** (4 fixes: alínea do PRAZO `I` não `J`; ENTREGÁVEIS em box navy + borda; alíneas com ponto `A.`; `;` nos itens). **Falta revisar páginas 2+ (cláusulas 1→15)** — Helvetica≠Calibri faz a paginação automática divergir; aplicar `<View break>`/`wrap={false}` onde o usuário apontar.
- **Features em prod**: 001 MVP · 002 templates-contrato · 003 construtor-de-templates · 004 edição-livre do corpo · 005 entrega-por-WhatsApp ([[fluxonapp]]) · 006 link-only-WhatsApp-vitrine · 007 RBAC admin role (`profiles.role` + `is_admin()` + RLS dupla) · **008 conformidade legal/LGPD** (aceite ativo do método na `/assinar` + página `/privacidade` + cláusula MP 2.200-2/2001 nos modelos + guards backend — **fechou o flanco legal**) · 009 upload `.docx` como contrato · 010 renderer custom EliteV1.
- **Próximos**: (1) revisar cláusulas 2+ do EliteV1; (2) aplicar a mesma metodologia (renderer custom fiel) nos 3 modelos Bethel restantes (`implementacao-conteudo`, `premium-semestral`, `premium-trimestral`) — usuário precisa enviar os `.docx`; antes do 2º, extrair `_shared/` (F010-D04).
- **Gaps operacionais abertos**: `privacidade@bethel.com` precisa ser caixa real e monitorada (canal LGPD da página `/privacidade` — hoje pode ser fictício); PROD-03 (domínio Resend `bethelapps.com`, DNS Hostinger sem acesso), PROD-05 (rate limit), PROD-07 (Sentry).

## Pessoas / contexto
- **Empresa**: MV4 Digital (ecossistema "Bethel"). Cliente final: Bethel Educação + Movi + Next (3 empresas que usam os modelos seedados).
- **Conta Vercel** pro deploy: `tomasbalestrin` (team `tt-solucoes-projects`). **Conta Resend**: idem (key `re_STp4...` em prod).
- O projeto usa o fluxo SDD (`.specs/`) e o harness The Boys.
- **Princípios de produto** (Bruto): (1) audit trail antes de bonito; (2) hash SHA-256 do original e do final em todo registro; (3) token de signatário externo é uso único + TTL; (4) **sem ICP-Brasil** — conformidade via "assinatura avançada" (Lei 14.063/2020 + MP 2.200-2/2001 Art. 10 §2º "admitido pelas partes"), com aceite expresso coletado (Feature 008). ICP só entra se cliente externo formal exigir.
- **Canon visual**: Navy/Gold importado de BETHEL CS — Primary `#001321`, Accent `#B19365`, Geist (variable, via `next/font/local`).

## Fontes
- `AGENTS.md` (project agent brief), `CLAUDE.md` (1 linha — só `@AGENTS.md`), `.specs/project/PROJECT.md`, `.specs/project/STATE.md`, `.specs/features/{001..010}-*/`, `package.json`, `next.config.js`, `tailwind.config.ts`, `design-system/{tokens.json,registry.json}` (importado de BETHEL CS), `supabase/migrations/`, `src/lib/renderers/` (renderers custom por modelo), `vercel.json`.
