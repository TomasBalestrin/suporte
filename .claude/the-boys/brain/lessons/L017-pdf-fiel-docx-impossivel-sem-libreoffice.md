---
type: lesson
id: L017
title: "PDF visualmente fiel a um .docx exige LibreOffice — @react-pdf não reproduz a paginação automática do Word"
date: 2026-05-15
owners:
  - "[[Frances]]"
  - "[[A Lenda]]"
related:
  - "[[bethel-contratos]]"
  - "[[react-pdf]]"
  - "[[docx]]"
occurrences: 1
severity: high
---

# L017 — PDF idêntico ao Word (incluindo paginação) é virtualmente impossível só com @react-pdf

## Gatilho

Você precisa gerar um PDF a partir de um modelo `.docx` do Word **mantendo fidelidade visual** (tabelas, cores, alíneas, espaçamento) **E** mantendo a **mesma quantidade/distribuição de páginas** que o Word mostra. Pensa em usar `@react-pdf/renderer` server-side porque não quer dependência de infraestrutura externa.

## O que acontece de verdade

`@react-pdf/renderer` consegue reproduzir o visual (tabelas via `<View>` flexbox, cores via `backgroundColor`, layout estruturado) — isso funciona bem com investimento de tempo no componente. **Mas a paginação será diferente**, mesmo com spacing/fontes calibradas.

**Causa raiz**: o Word/LibreOffice calculam onde quebrar página usando:
- **Métricas exatas de Calibri** (largura de cada caractere, kerning, hinting) — fonte proprietária Microsoft, não disponível em Linux/Vercel sem registrar substituto métrico (Carlito = aproximação)
- **Algoritmo interno do Office** pra cálculo de orphan/widow lines, espacamento, tabelas que não devem quebrar
- **Configurações específicas** do documento (`compatibilityMode`, `printerSettings`)

O `@react-pdf` usa **Helvetica nativa** (sem registro) ou **outras fontes via Font.register** + algoritmo de paginação próprio (yoga layout engine). Mesmo com tudo calibrado, vai dar **número de páginas próximo, não exato**.

**Probe que comprova**: analisei o XML interno de um `.docx` de contrato (`MENTORIA ELITE PREMIUM (2).docx`, 22.485 caracteres de corpo, mostrava "Página 1 de 9" no Word). Resultado do script `extract-docx-paginas.mjs`:

```
Quebras forçadas (Ctrl+Enter): 1
Quebras renderizadas (cache do Word): 0
Total de páginas detectadas via XML: 2
```

**Só 1 quebra forçada no documento todo** (antes da Página de Assinaturas). As outras 8 quebras visuais são **calculadas pelo Word em runtime** — não estão no XML.

## Caminhos quando isso acontece

### A — Aceitar paginação aproximada (recomendado pra escopo interno B2C)
- Investir tempo no componente React PDF reproduzindo o visual fiel
- Aceitar que o número de páginas vai ser próximo mas não exato
- Documento juridicamente equivalente (texto + cláusulas + assinaturas idênticos)
- Custo: tempo de componente (3-5h por modelo Bethel-elite-premium grau)

### B — LibreOffice headless (Gotenberg)
- Container Docker + endpoint REST que aceita `.docx` preenchido e devolve PDF
- **Resultado**: paginação 100% idêntica ao Word
- **Custo**: infra nova (VPS, container, deploy, monitoramento)
- **Recomendado se**: cliente paga jurídico que exige fidelidade exata, ou contrato vai a juízo regularmente

### C — Modo iterativo de breaks manuais (sob medida)
- Render visual fiel via @react-pdf (caminho A)
- Usuário testa, aponta pontos específicos onde quer quebra de página
- Adicionar `<View break>` em pontos manualmente
- **Resultado**: paginação próxima do desejado sem 100%, sem infra nova
- **Custo**: iteração colaborativa (boa pra escopo pequeno, 1 modelo, contrato interno)

## Como pegar isso na planta (próxima vez)

- **Antes de prometer fidelidade visual a um `.docx`**: pergunte ao usuário se ele quer **fidelidade de conteúdo** (texto, cláusulas, dados) ou **fidelidade pixel-perfect** (paginação, fontes exatas, larguras). São coisas diferentes — clarificar evita expectativa errada.
- **Antes de propor LibreOffice/Gotenberg**: pergunte primeiro se o usuário tolera caminho A (paginação aproximada). Se sim, evita complexidade de infra desnecessária.
- **Probe rápido**: extrair `word/document.xml` do `.docx` (é zip) e contar `<w:br w:type="page"/>`. Se for próximo do número total de páginas mostradas no Word, paginação é forçada (reproduzível). Se for muito menor (como o caso Bethel: 1 forçada vs 9 visíveis), é paginação automática (não reproduzível sem LibreOffice).

## Notas

- **`@react-pdf/renderer`** é excelente pra reproduzir layout visual rico (tabelas, cores, flex). Não tente fazer ele "ser o Word" — ele é uma engine de PDF própria.
- **Helvetica vs Calibri**: Helvetica é nativa do PDF spec (não precisa registrar), Calibri exige `Font.register()` com fonte open-source equivalente (Carlito). Mesmo registrando Carlito, paginação ainda difere — métricas são próximas mas não idênticas.
- **`<View break>` no @react-pdf**: força quebra de página antes do elemento. Aceita boolean ou condicional. Use em iteração com usuário pra forçar quebras em pontos específicos.
- **Detectado em prod no [[bethel-contratos]]** (2026-05-15, Feature 010). Usuário escolheu modo iterativo (caminho C). Aceito como dívida F010-D03: porta aberta pra LibreOffice se virar dor.
- Ver [[L013-multiplas-sessoes-claude-paralelas-mesmo-repo]] e [[L014-create-or-replace-function-novo-arg-default-cria-overload]] e [[L015-supabase-jwt-claim-role-null-no-dashboard]] — outras lições da mesma onda do BETHEL CONTRATOS.
