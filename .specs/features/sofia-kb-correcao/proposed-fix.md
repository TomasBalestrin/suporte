# Proposed fix — subset "estanca agora" (7 artigos)

**Para review da Luz Estrela ANTES do write em prod** (mandato do usuário 2026-05-21).
**Banco**: Supabase `zeocxcfiyhzsztwjllvl` (prod). **Snapshot rollback**: `kb-snapshot-pre-fix.json` (UTF-8 fiel).
**Verdade da fonte confirmada**: Teste dos Arquétipos é PAGO; acesso sempre via `juliaacademy.com.br` + `ottoni123`; `quiz.testedosarquetipos.com.br` está MORTO; quillforms é canônico mas secundário.
**RPC `search_knowledge_base` filtra `is_active = TRUE`** (001:349) — desativar duplicata remove do RAG. ✅

## Operações (7)

| # | id | título | operação | conteúdo novo |
|---|---|---|---|---|
| 1 | `799731f5` | Teste dos Arquétipos — como acessar... | **REESCREVER** (mantém ativo) | `fix-content/799731f5.md` |
| 2 | `43fff20f` | Teste dos Arquétipos - Informações e FAQ | **REESCREVER** (mantém ativo) | `fix-content/43fff20f.md` |
| 3 | `3d60a09f` | Teste dos Arquétipos - Informações e FAQ | **DESATIVAR** (dup de #2) | `is_active = false` |
| 4 | `aca9f143` | Meu acesso expirou, o que fazer | **REESCREVER** (mantém ativo) | `fix-content/aca9f143.md` |
| 5 | `ab81f92c` | Meu acesso expirou, o que fazer | **DESATIVAR** (dup de #4) | `is_active = false` |
| 6 | `4d0c6ca0` | Por quanto tempo terei acesso ao produto | **REESCREVER** (mantém ativo) | `fix-content/4d0c6ca0.md` |
| 7 | `a36412c0` | Por quanto tempo terei acesso ao produto | **DESATIVAR** (dup de #6) | `is_active = false` |

## Diff crítico — artigo `799731f5` (o ofensor do incidente)

**ANTES (trechos):**
- `Link oficial do teste: https://quiz.testedosarquetipos.com.br` ← LINK MORTO
- `Não exige login — é grátis e aberto`
- `Cliente quer FAZER o teste pela 1ª vez → fornece link direto (não precisa de compra/login)`
- Mensagem sugerida: *"O Teste dos Arquétipos é livre — você pode fazer ou refazer quantas vezes quiser: 🔗 https://quiz.testedosarquetipos.com.br ... Não precisa de login nem de compra prévia..."* ← **isto foi enviado à cliente paga no SUP-2026-0329**

**DEPOIS:** ver `fix-content/799731f5.md` — produto pago, acesso sempre via `juliaacademy.com.br` + `ottoni123`, fluxo de "senha errada" → "Esqueci minha senha"/ticket. Zero "grátis"/"sem login". Link morto eliminado. Quillforms só como nota de "única URL de formulário válida", não como caminho de acesso.

## Diffs menores (artigos de FAQ/prazo)

- `43fff20f`: linha `**Acesso:** Permanente no link [quillforms]` → `**Acesso:** É um produto pago da Julia Ottoni, acessado pela área de membros da Julia Academy (juliaacademy.com.br)...`. Resto do FAQ intacto.
- `aca9f143` / `4d0c6ca0`: linha do Teste dos Arquétipos → `**Teste dos Arquétipos** (produto pago): acesso permanente pela área de membros da Julia Academy (juliaacademy.com.br...)`. Resto intacto.

## Fora deste subset (próxima fase da feature)

- Dedup dos outros **49 pares** limpos (sem erro de conteúdo) — `UPDATE is_active=false` em bloco, sob bênção do MM (risco operacional de 49 disables em prod).
- Monitoramento 48h.

## Verificação pós-write (critérios de sucesso)

```sql
-- C1: zero ativos com link morto → esperado 0
SELECT COUNT(*) FROM knowledge_base WHERE is_active=true AND content ILIKE '%quiz.testedosarquetipos%';
-- C2: zero ativos dizendo livre/grátis/sem login sobre arquétipo → esperado 0
SELECT COUNT(*) FROM knowledge_base WHERE is_active=true
  AND (content ILIKE '%é livre%' OR content ILIKE '%grátis%' OR content ILIKE '%não exige login%' OR content ILIKE '%sem login%')
  AND (content ILIKE '%arqu%tipo%' OR title ILIKE '%arqu%tipo%');
-- C3: títulos de arquétipo FAQ/prazo/expirou sem duplicata ativa → esperado 1 cada
SELECT title, COUNT(*) FROM knowledge_base WHERE is_active=true
  AND title IN ('Teste dos Arquétipos - Informações e FAQ','Meu acesso expirou, o que fazer','Por quanto tempo terei acesso ao produto')
  GROUP BY title;
```

## Mecanismo de write (UTF-8 safe — lição FluxonApp)

Node script: lê os `.md` (UTF-8), monta UPDATEs com dollar-quoting, POST via Management API com `JSON.stringify` (escape correto, sem BOM). NUNCA via argv do PowerShell. Snapshot já garantido.
