---
type: project
name: Hub Lead
aliases:
  - hub-lead
  - HubLead
folder: "c:/Users/lluys/Desktop/PROJETOS/hub-lead"
repo: "https://github.com/eduardotkfm-maker/hub-lead"
stack: [nextjs, supabase, python, google-apps-script, vercel]
deploy: "vercel (dashboard Next.js, prod hub-lead.vercel.app) + Supabase sa-east-1 (banco) + Python CLI local (import batch, sem servidor)"
status: active
owner: ["[[Hughie]]"]
mapped_by: "[[Francês]]"
mapped_at: 2026-05-22
related: ["[[Fluxon]]", "[[FluxonApp]]"]
---

# Projeto: Hub Lead

> Notas que ajudam o time a trabalhar neste projeto sem re-perguntar. Curto e factual. Decisão local do projeto vai em `.specs/project/STATE.md` dele, não aqui.
> Mapeado por: Francês (brownfield), 2026-05-22. Fonte: STATE.md real + código aberto.

## O que é

- Hub central de leads da MV4 — fonte única de verdade para captura, dedup/merge, enriquecimento e consulta de leads (NÃO é sistema de disparo; disparo é Fluxon/FluxonApp).
- **Pasta**: `c:/Users/lluys/Desktop/PROJETOS/hub-lead` · **Repo**: `eduardotkfm-maker/hub-lead` (privado) · **Stack**: Python (motor de import/normalização/dedup) + Next.js 15 + Supabase/Postgres + Google Apps Script · **Deploy**: Vercel (dashboard) + Supabase `kwqbprjdvkgkpchpevpi` (org TT Solutions, sa-east-1).
- IDs/refs: Supabase project ref `kwqbprjdvkgkpchpevpi` · Vercel URL `https://hub-lead.vercel.app` · Supabase do Fluxon (fonte de sync) `citwaazfegjixoaupzxj`.

## Arquitetura em 30s

Três módulos com fronteira dura (D006/D005):

1. **`src/lead_core/`** (Python puro, sem I/O): `models.py` (schema canônico Pydantic v2), `phone.py` (normalização BR via `phonenumbers` + regex, nunca float64 — notação científica `5.53E12` perde dígito), `merge.py` (decide novo/merge/quarentena; precedência por-campo, auditável, reversível via `lead_audit`).
2. **`src/ingest/`** (Python, CLI): lê XLSX/CSV multi-aba (`xlsx_reader.py`, `mapping.py` infere schema), roda pelo `lead_core`, escreve no Postgres via `psycopg3` (`sink.py`). Roda em batch local — nunca em prod serverless.
3. **`web/`** (Next.js 15, App Router, TypeScript + Tailwind): dashboard admin gated (Supabase Auth, `getUser()` JWT server-side), rotas públicas (`/f/{slug}` cadastro, `/checkin/{slug}` check-in, `/r/{code}` redirect rastreável), webhook de ingestão (`POST /ingest`), pull de sheets (`GET /api/sheets/pull`), feed CRM (`GET /api/leads/feed`, fail-closed), cron Fluxon-sync (`/api/cron/fluxon-sync`, `*/10`).

Banco: Supabase/Postgres, **RLS ligada em todas as tabelas desde o dia 1** (78k+ dados pessoais, LGPD). 17 migrations em `supabase/migrations/0001_init.sql` … `0017_event_partial_responses.sql`.

Google Apps Script (`apps-script/`): `Push.gs` envia leads novos de uma planilha via `POST /ingest`; `Pull.gs` puxa leads incrementais via `GET /api/sheets/pull` (keyset por `updated_at`).

## Como rodar localmente

**Dashboard (Next.js):**
```
cd web && npm install && npm run dev
```
Requer `.env.local` em `web/` com: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `INGEST_TOKEN`, `SHEETS_TOKEN`, `CRON_SECRET`, `FLUXON_SUPABASE_URL`, `FLUXON_SERVICE_ROLE_KEY`. (Credenciais não commitadas — pedir ao Eduardo ou buscar no `.env` do projeto.)

**Motor Python (import):**
```
python -m venv .venv && .venv\Scripts\activate
pip install -e .[dev]
python -m ingest.run_import <arquivo.xlsx>   # dry-run por padrão
```
Requer `.env` na raiz com `SUPABASE_PROJECT_REF` + `SUPABASE_DB_PASSWORD` (session pooler `aws-1-sa-east-1.pooler.supabase.com:5432`). Token de management do Supabase fica no `.env.local` do Fluxon (`PROJETOS/Disparotey`).

**Testes:**
```
# Python
pytest                  # 72+ testes com hypothesis (property tests de phone/merge)

# Next.js
cd web && npm test      # vitest, ~367+ testes
cd web && npm run typecheck
```

## Armadilhas / "não faça"

- **Telefone como float64**: pandas lê `5.53E12` e perde dígitos. `xlsx_reader.py` força leitura como `str`/`Decimal` (via `dtype=str` ou BigInt no TS). Não alterar isso.
- **Duas fontes de verdade de normalização**: `src/lead_core/phone.py` (Python) e `web/src/lib/phone-normalize.ts` (TypeScript). Se mexer em uma, sincronizar a outra. Divergência silenciosa passa pelo gate (D017).
- **`origem_tag` é imutável** (proveniência do lead): nunca re-apontar no UPDATE; "mesclagem" de tags usa `merged_into` (camada de agrupamento não-destrutiva, D026). Rasgar viola o modelo de dados central.
- **Migrations são sequenciais** — antes de criar qualquer nova: olhar `supabase/migrations/` no `main` atual e reservar o próximo número no STATE.md (dois chats podem pegar o mesmo se não reservarem — já aconteceu, L032/D027).
- **`sink.py` é batch local, não cron**: o bloqueio de uso recorrente foi levantado no D016, mas o sink nunca teve infra de agendamento — não plugar em cron sem revisar o D012. O cron real é o Fluxon-sync (`/api/cron/fluxon-sync`).
- **`FEED_TOKENS` não setado = feed fail-closed (503)**: o egress CRM (`/api/leads/feed`) foi buildado propositalmente fechado. Para abrir: setar `FEED_TOKENS="label:secret,..."` na Vercel e redeployar.
- **Consentimento LGPD nos forms**: default off por decisão do usuário. O builder exibe aviso vermelho quando desligado. Não remover o código de consent — só a UI o esconde (D-20260522-0000).
- **Check-in é superfície de enumeração de PII**: tela pública mostra nome completo + dados mascarados (e-mail, WhatsApp). Rate-limit + resposta uniforme estão nos guardrails (D021). Qualquer mudança no que o check-in expõe exige gate da Luz Estrela.
- **Supabase token de management**: vive no `.env.local` do Fluxon (`PROJETOS/Disparotey`), NÃO no hub-lead. Sem ele não roda migrations via CLI/API.
- **`INGEST_TOKEN` e `SHEETS_TOKEN` na Vercel podem ter `\r\n` injetado** se setados via `printf '%s\n'` — re-setar com `printf '%s'` (64 chars limpos). Já correu uma vez (D101).

## Estado atual

Base de **127.683 leads** em produção (Supabase), **RLS ativa em todas as tabelas**. Dashboard LIVE em `https://hub-lead.vercel.app` (Supabase Auth, invite-only — login `contato@mv4digital.com.br`). Formulários públicos funcionais (cadastro + check-in + redirect rastreável). Sync Fluxon rodando a cada 10min via Vercel Cron (requer plano Pro). Sheets bidirecional via Apps Script. Feed CRM buildado mas fechado (sem `FEED_TOKENS`). 17 migrations aplicadas em prod.

Maior buraco operacional: **observabilidade zero** — sem Sentry, sem alerta de cron morto, rate-limit em memória por instância (sem `@vercel/kv` cross-instância).

Próximos itens priorizados (do STATE.md, 2026-05-23):
1. Observabilidade/Ops (alerta de cron, Sentry, rate-limit cross-instância)
2. Métricas por formulário (conversão cadastros × abandonos)
3. Retenção/TTL de PII — abandonos e `lead_audit` sem política de expurgo
4. NextApps CRM — feed aguardando contrato técnico deles

Detalhe completo (decisões D001–D-20260522-0200): `.specs/project/STATE.md` no repo.

## Pessoas / contexto

- **Eduardo (usuário)** — dono do produto, opera o hub internamente (MV4). Credenciais de acesso ao dashboard: `contato@mv4digital.com.br`. Supabase org: TT Solutions (`ofznnjzvtteadfvchchl`), mesma do Fluxon e Bethel.
- **Calibração internal** (D001): gates mais leves, UAT como smoke test, security reforçado para qualquer dado pessoal (LGPD).
- **Relação com Fluxon** (`PROJETOS/Disparotey`): Fluxon Supabase (`citwaazfegjixoaupzxj`) é a fonte de leads do sync contínuo; helpers SSR-safe do hub foram inspirados/reusados de lá. NÃO confundir com FluxonApp (Baileys, VPS Hetzner).
