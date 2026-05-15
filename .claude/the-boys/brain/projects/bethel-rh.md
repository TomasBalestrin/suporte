---
type: project
name: Bethel RH
aliases:
  - Bethel RH
  - bethel-rh
  - BethelRH
folder: C:/Users/lluys/Desktop/Cursor/BethelRH
stack: [react, vite, supabase, supabase-edge-functions, gemini]
deploy: lovable
status: active
mapped_by: "[[Francês]]"
mapped_at: 2026-05-13
related: []
---

# Projeto: Bethel RH (pasta: BethelRH)
> Notas que ajudam o time a trabalhar neste projeto sem re-perguntar. Curto e factual. Decisão local do projeto vai no `.specs/project/STATE.md` dele, não aqui — aqui é o resumo "como funciona / o que lembrar".
> Mapeado por: Francês (brownfield), 2026-05-13. Fonte: CLAUDE.md + README.md + leitura da estrutura.

## O que é
- Sistema de gestão de RH da Bethel Educação: focado em recrutamento, seleção, avaliação DISC e gestão de contratos. Inclui funil de candidatos, entrevistas (com análise de áudio via IA), banco de talentos e dashboard de métricas.
- **Pasta**: `C:/Users/lluys/Desktop/Cursor/BethelRH`  ·  **Stack**: React 18 + Vite + TS + Tailwind + shadcn/ui; Supabase (Postgres+Auth+RLS+Storage+Edge Functions); Gemini (análise de áudio); xlsx (importação).
- **Deploy**: Lovable (prod via Lovable Publish ou Vercel se configurado); Supabase ref `kdikgbfljcuzgkfviaav`.
- **Diferencial**: O sistema faz a análise de áudio das entrevistas usando Gemini 2.5 Flash para gerar relatórios automáticos.

## Arquitetura em 30s
- Front: Vite/React SPA em `src/` — `/` (Dashboard), `/entrevistas`, `/funil-candidatos`, `/vagas`, `/contratos`, `/banco-de-talentos`, `/relatorios`, `/calendario`, `/cargos`, `/desligamentos`, `/custo-contratacao`.
- Componentes: Organizados por domínio em `src/components/` (`Dashboard/`, `ProcessoContratacao/`, `disc/`, `Calendario/`, `Contratos/`, `avaliacao/`, `relatorios/`). UI baseada em **shadcn/ui** (48 componentes em `src/components/ui/`).
- Back/IA: Edge Functions em `supabase/functions/` — `analyze-interview-audio` e `generate-job-description` (usam Gemini 2.5 Flash).
- Banco: Supabase. Tabelas principais: `candidatos`, `candidaturas` (dados DISC), `entrevistas` (rodadas/status), `vagas`, `contratos`, `banco_talentos`, `relatorios`, `cargos_cadastrados` (perfil DISC esperado).

## Como rodar localmente
- `npm install` → `npm run dev` (porta 5173).
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. Token Supabase CLI: `SUPABASE_ACCESS_TOKEN`.
- Deploy de Edge Functions: `SUPABASE_ACCESS_TOKEN=... npx supabase functions deploy <nome> --project-ref kdikgbfljcuzgkfviaav --no-verify-jwt`.

## Armadilhas / "não faça"
- **Datas / UTC**: O dashboard usa `mesReferencia` (YYYY-MM). Filtros SQL devem usar `Date.UTC` para garantir que o início/fim do mês não mude por fuso horário local (ver snippet em `CLAUDE.md`).
- **Lógica DISC**: A fórmula de cálculo do perfil DISC e o gabarito oficial estão em `src/components/disc/` e `TESTE_DISC_GABARITO.md`. Não alterar sem validar o gabarito.
- **Nomes de Variáveis**: O projeto usa um mix de PT/EN, mas variáveis de negócio tendem a ser em PT (ex: `mesReferencia`, `fetchAgendamentos`).
- **RLS**: Todas as tabelas têm RLS ativo. As permissões são baseadas no enum `app_role` (admin, hr_manager, interviewer, viewer). Use `useUserRole` hook para checar permissões no front.
- **SSR-safe**: Mesmo sendo SPA, prefira os helpers de formatação para manter consistência em datas e moedas.

## Estado atual
- Em desenvolvimento ativo.
- **Foco imediato**: Refinamento de papéis (Gerente) e Grupos de Mentoria (particionado Bethel/Movi).
- **Mapeamento de papéis**:
    - `admin`: Acesso total.
    - `hr_manager`: Gestão de contratos e vagas.
    - `interviewer`: Realiza entrevistas e vê relatórios.
    - `viewer`: Acesso apenas leitura ao dashboard.

## Pessoas / contexto
- Empresa: Bethel Educação.
- Gestores usam o dashboard para acompanhar o "tempo médio para fechar vaga" e "custo por contratação".
- O processo de contratação é alimentado por importação de planilhas Excel (ProcessoContratacao).

## Fontes
- `CLAUDE.md`, `README.md`, `TESTE_DISC_GABARITO.md`, `package.json`, `src/pages/Index.tsx`, `src/hooks/useUserRole.ts`.
