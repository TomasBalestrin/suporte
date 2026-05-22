# Auditoria — Fluxon `produtos.url_acesso` vs verdade canônica

**Data**: 2026-05-21 · **Fonte**: tabela `produtos` do Fluxon (Supabase `citwaazfegjixoaupzxj`, via PostgREST service-role).
**Por que importa**: `produtos.url_acesso` alimenta (1) a mensagem de **entrega no WhatsApp** e (2) o `link_acesso` que a tool `consultar_fluxon` devolve pra Sofia. Link errado aqui = cliente recebe link errado na entrega E a Sofia repete.
**Verdade canônica** (prompt/KB SUPORTE): Julia → `juliaacademy.com.br`/ottoni123 · Cleiton → `cleitonquerobin1.com.br`/performance123 · 50 Scripts → `50scripts.cleitonquerobin.com.br` · Implementação IA → fluxo especial de onboarding (a confirmar).

## Quadro (17 linhas, com duplicatas)

| Produto | url_acesso atual | Avaliação |
|---|---|---|
| 50 SCRIPTS (×2) | `50scripts.cleitonquerobin.com.br/` | ✅ correto |
| REELS MAGNETICOS | `cleitonquerobin.com.br/quillforms/reels-magneticos/` | ❌ **ERRADO** (confirmado: deveria ser juliaacademy) |
| METODO POSICIONAMENTO MILIONARIO | `cleitonquerobin.com.br/quillforms/julia-ottoni-01/` | ❌ suspeito (produto Julia → juliaacademy?) |
| IMPLEMENTAÇÃO JULIA (×2) | `cleitonquerobin.com.br/quillforms/julia-implementacao-de-ia/` | ❓ quillforms — legítimo (onboarding especial) ou errado? |
| IMPLEMENTAÇÃO CLEITON (×2) | `cleitonquerobin.com.br/quillforms/implementacao-cleiton-67/` | ❓ quillforms — legítimo (onboarding especial) ou errado? |
| TESTE DOS ARQUETIPOS / ARQUÉTIPOS (×2) | `cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/` | ❓ user disse "sempre área de membros" (juliaacademy) — então este também está errado? |
| Mentoria Ao Vivo - Cleiton | `lps.cleitonquerobin2.com/mentoria-ao-vivo` | ❓ provável LP legítima de mentoria ao vivo |
| Mentoria Ao Vivo - Julia | `lps.cleitonquerobin2.com/mentoria-ao-vivo-3` | ❓ idem |
| IA da Julia | (vazio) | ⚠️ sem link — comprador recebe "produto sem link cadastrado" |
| IA do Cleiton | (vazio) | ⚠️ sem link |
| Reels | (vazio) | ⚠️ sem link (duplicata pobre de REELS MAGNETICOS?) |
| Teste Arquétipos | (vazio) | ⚠️ sem link (duplicata pobre) |
| Aula Julia 31/03 19h30 | (vazio) | evento, provavelmente OK sem link |

## Problemas-classe identificados

1. **Links quillforms errados** (≥1 confirmado: Reels): produtos da Julia apontando pra `cleitonquerobin.com.br/quillforms/...` em vez de `juliaacademy.com.br`. O prompt da Sofia já tratava esses como inválidos (rule 2), mas a fonte (Fluxon) não foi corrigida.
2. **`url_acesso` vazio** em 4-5 produtos ativos → entrega sem link + Sofia escala.
3. **Duplicatas** na tabela `produtos` (50 SCRIPTS, IMPLEMENTAÇÃO JULIA/CLEITON, TESTE ARQUÉTIPOS ×2 + variações de acento/caixa) — mesma doença de dedup da KB do SUPORTE.
4. **Contradição arquitetural no prompt**: rule 2 proíbe URLs quillforms, mas a regra de prioridade manda "usar o link de entrega do Fluxon". Quando o Fluxon tem link quillforms errado, as duas regras brigam e o dado errado vence.

## Pendente de confirmação do usuário (L031 — não escrever sem fonte)
- Implementação IA (Julia/Cleiton): quillforms é onboarding legítimo ou link errado?
- Método Posicionamento Milionário: juliaacademy?
- Teste dos Arquétipos no Fluxon: juliaacademy (consistente com "sempre área de membros") ou mantém quillforms?
- Produtos com url_acesso vazio: qual o link correto de cada?

## ⚠️ Natureza do fix (quando confirmado)
Escrita em `produtos.url_acesso` no **Fluxon prod** afeta entregas reais de WhatsApp → confirmar-primeiro, com gate do MM/A Lenda. Não é write trivial como a KB.

## ✅ APLICADO (2026-05-21, confirmado pelo usuário)

Via `fluxon-fix-urls.mjs --apply` (PostgREST service-role). Snapshot rollback: `fluxon-produtos-snapshot-pre-fix.json`.

**4 linhas corrigidas** (`url_acesso` → `https://juliaacademy.com.br/`):
- REELS MAGNETICOS (era `quillforms/reels-magneticos/`)
- METODO POSICIONAMENTO MILIONARIO (era `quillforms/julia-ottoni-01/`)
- TESTE DOS ARQUÉTIPOS + TESTE DOS ARQUETIPOS (era `quillforms/perpetuo-teste-dos-arquetipos/`)

`login_instrucao` dos 4 já estava correto (ottoni123) — não mexido. Verificação pós-write: 0 linhas com url antigo.

**Decisões do usuário (2026-05-21):**
- Implementação IA (Julia/Cleiton) quillforms = **legítimos** (onboarding real) → NÃO tocados.
- Demais produtos Julia (Método, Teste) → juliaacademy, igual Reels.

## Ainda aberto (NÃO feito — precisa de decisão/fonte)
- **url_acesso vazio**: IA da Julia, IA do Cleiton, Reels (dup), Teste Arquétipos (dup) → entrega sem link. Precisa do link correto de cada.
- **Dedup da tabela `produtos`**: 50 SCRIPTS, IMPLEMENTAÇÃO JULIA/CLEITON, TESTE ×2 (+ variação de acento/caixa) duplicados.
- **Prompt rule 2 (menor)**: cita `implementacao-cleiton-67` / `julia-implementacao-de-ia` como exemplos de "URL inválida a não inventar" — mas são reais (vêm do Fluxon). Comportamento OK (proíbe inventar, permite usar o do Fluxon), mas os exemplos confundem. Limpar quando mexer no prompt.
