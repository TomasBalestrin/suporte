---
type: lesson
id: L030
title: "Meta Lead Forms: nome interno do campo renomeia silenciosamente (quebra match exato) e múltipla escolha volta como key snake_case com prefixo numérico, não como label"
date: 2026-05-20
owners:
  - "[[Bruto]]"
occurrences: 2
severity: medium
related:
  - "[[L019-fix-parcial-em-1-de-N-callsites-gera-regressao-silenciosa]]"
---

# L030 — Meta Lead Forms: campo renomeia silencioso + múltipla escolha vem como "key", não label

Sync de leads de campanha Meta (Lead Forms / Instant Forms) → Google Sheets via Apps Script. Dois jeitos do dado vir "errado" na coluna, ambos culpa de como a Meta entrega `field_data`, não bug do código.

## Gatilho A — coluna vem VAZIA do nada

O `field_data[].name` (nome interno do campo, snake_case) **muda quando o formulário é editado/recriado**. Mapeamento por match exato dropa em silêncio:

```js
// quebra calado se o name mudar de 'nome_completo' pra 'full_name'
const FIELD_TO_COL = { 'nome_completo': 'Nome completo', ... }
```

Histórico real: `nome_completo` → `full_name`, `número_do_whatsapp` → `whatsapp_number`, etc. Cada rename = coluna nova vazia, descoberto só quando alguém olha a planilha.

## Gatilho B — texto vem feio: `3-_aumentar_lucro_e_escalar_sem_perder_margem_financeira`

Campo de **múltipla escolha** não devolve o label que o lead vê. Devolve a **key interna da opção**: `numero-_palavras_com_underscore`, acento preservado. Ex.:
- `1-_atrair_clientes_qualificados_de_forma_previsível`
- `4-_construir_um_time_forte_com_liderança_e_gestão_de_alta_performance`

Campo de texto livre (nome, @, whatsapp) vem normal. Só múltipla escolha vem como key.

## Correção Enforçada

**1. Fallback heurístico por palavra-chave** (depois do match exato), normalizando sem acento/caixa. Rename nunca mais zera coluna:

```js
function colByHeuristic_(fieldName) {
  const n = norm_(fieldName); // lowercase, sem acento, só [a-z0-9]
  if (n.indexOf('whats')>=0 || n.indexOf('zap')>=0 || n.indexOf('telefone')>=0 || n.indexOf('ddd')>=0) return 'WhatsApp';
  if (n.indexOf('instagram')>=0 || n.indexOf('insta')>=0) return 'Instagram';
  if (n.indexOf('fatura')>=0 || n.indexOf('receita')>=0) return 'Faturamento mensal';
  if (n.indexOf('nicho')>=0 || n.indexOf('segmento')>=0) return 'Nicho do negócio';
  if (n.indexOf('desafio')>=0 || n.indexOf('dificuldade')>=0) return 'Principal desafio';
  if (n.indexOf('nome')>=0 || n.indexOf('fullname')>=0) return 'Nome completo'; // 'nome' por último (genérico)
  return null;
}
```

**2. Prettifier do valor de múltipla escolha** — só mexe no formato `^\d+-_`, resto passa intacto (não mangle telefone com hífen nem `@joao_silva`):

```js
function prettyValue_(v) {
  if (typeof v !== 'string' || !/^\d+\s*[-–]\s*_/.test(v)) return v;
  var s = v.replace(/^\d+\s*[-–]\s*_?/, '').replace(/_/g,' ').replace(/\s+/g,' ').trim();
  return s ? s.charAt(0).toUpperCase()+s.slice(1) : v;
}
```

**3. Função de auditoria** que varre amostra dos leads e reporta % de preenchimento por coluna + cada `field_data.name` visto → coluna mapeada ou `❌ NÃO MAPEADO`. É como se descobre rename/campo novo sem caçar.

## Onde se aplica

- Qualquer ingestão de Meta Lead Forms (`/{form_id}/leads?fields=...,field_data`), Apps Script ou backend.
- Match de campo Meta → coluna/DB SEMPRE precisa de fallback heurístico, nunca só exato.
- Múltipla escolha (desafio, faturamento, posição/cargo, nicho) precisa de prettifier; texto livre não.
- `norm_` deve pular U+0300–U+036F (marcas combinantes) via loop charCode — regex literal de combinantes em arquivo é frágil no editor.

## Aplicado em (track) `docs/apps-script-leads-meta-sheets.gs` — 2026-05-20

Sync `[01] [FORMS]` → planilha `1QfplQXrhu...`. Adicionado: `colByHeuristic_`, `prettyValue_`, `extractCols_` (exato → heurístico), `auditarColunas`, `backfillColunas` (preenche só células vazias de linhas já escritas, via paginação `paging.next`), `corrigirFormato` (limpa keys já gravadas). Coluna nova "Principal desafio" (campo `hoje,_qual_é_o_principal_desafio...`) adicionada no fim (col J) pra não desalinhar as 9 existentes.

## Anti-padrões que evita

- "essa coluna parou de vir e ninguém viu" → auditoria + heurística.
- "o texto da resposta veio com underscore e número na frente" → prettifier.
- inserir coluna nova no MEIO do HEADERS (desalinha dados já escritos) → adicionar no fim.
- backfill que sobrescreve dado bom → preencher só o que está vazio.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` (ou `npm run sync:all`) no repo do harness antes do commit.
