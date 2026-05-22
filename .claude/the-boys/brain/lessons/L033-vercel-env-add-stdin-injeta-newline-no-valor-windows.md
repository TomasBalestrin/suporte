---
type: lesson
id: L033
title: "`printf '%s\\n' | vercel env add` injeta \\r\\n no valor (Windows/Git Bash) → 401 silencioso com o token CORRETO"
date: 2026-05-21
owners:
  - "[[MM]]"
  - "[[Bruto]]"
occurrences: 1
severity: high
related:
  - "[[L032]]"
---

# L033 — Secret alimentado por stdin com newline guarda o `\n`/`\r\n` junto e quebra comparação byte-a-byte

## Gatilho

Setar um secret/env var via CLI que **lê o valor de stdin** (`vercel env add`, `gh secret set`, `wrangler secret put`, `fly secrets`, `supabase secrets set`…), no **Windows/Git Bash**, alimentando com `echo "$V" |` ou `printf '%s\n' "$V" |`.

## Erro

2026-05-21, deploy do Hub Lead (F8-Sheets). Setei o token de leitura:
```
printf '%s\n' "$TOKEN" | npx vercel env add SHEETS_TOKEN production
```
O `\n` (e provável `\r\n` do Git Bash no Windows) foi **armazenado junto com o valor** → o valor guardado tinha **66 chars** (token de 64 + 2 de lixo). O endpoint compara com `timingSafeEqual(token, expected)`, que retorna `false` por **diferença de comprimento** → **401 com o token CORRETO**.

Falha **silenciosa e traiçoeira**: o deploy diz "ok", o `vercel env ls` mostra a var "Encrypted/Production", tudo parece certo — mas toda requisição autenticada dá 401. Quase passou batido porque o caso negativo (sem token → 401) também é o esperado; só o teste do caminho **positivo** (token certo → 200) revelou. Custou um redeploy.

## Correção Enforçada

1. **Alimente stdin com `printf '%s'` (SEM `\n`).** O EOF do pipe encerra a leitura — não precisa de newline, e assim nada de lixo entra no valor.
2. **Nunca `echo "$V" |`** (echo adiciona `\n`) nem `printf '%s\n'` pra valores comparados byte-a-byte: tokens, hashes, chaves, IDs.
3. **Verifique o valor armazenado**, não confie no "set ok": `vercel env pull` + medir o **comprimento** do valor (tem que bater com o gerado). Comprimento errado = lixo embutido.
4. **Smoke test de auth tem que incluir o caminho POSITIVO** (token correto → 200), não só o negativo (sem token → 401) — senão o erro de length passa despercebido.

## Onde se aplica

- **Windows / Git Bash** + qualquer CLI que recebe secret por **stdin** (vercel, supabase, fly, wrangler, `gh secret set`, kubectl…).
- Especialmente tokens validados com **timing-safe / comparação exata de comprimento** — onde 1 byte a mais = rejeição total.
- Mesma família do hábito "valor sensível via shell no Windows corrompe" (cf. UTF-8 via argv do bash no Windows) — o shell injeta bytes que você não vê. Sempre **medir o que ficou armazenado**.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` antes do commit. Lição que não chega no `.cursor/rules/the-boys-lessons.mdc` é teatro (ver [[L004]]).
