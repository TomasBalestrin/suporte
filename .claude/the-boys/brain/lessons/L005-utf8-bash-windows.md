---
type: lesson
id: L005
title: "Texto UTF-8 nunca via argv do bash no Windows — sempre via @file"
date: 2026-05-14
owners:
  - "[[Bruto]]"
occurrences: 1
severity: critical
related: []
---

# L005 — Texto UTF-8 nunca via argv do bash no Windows — sempre via @file

## Gatilho

Mandar mensagem de WhatsApp (ou qualquer string com acentos / emoji) via `curl -d` montando o JSON com interpolação de variável bash (`-d "$(node -e ... "$TEXT")"`) ou heredoc `-d <<EOF` no Git Bash / MSYS / MinGW do Windows. Acontece em endpoints `send-text`, `send-message`, webhook de teste, qualquer chamada ad-hoc com texto pt-BR.

## Erro

Os caracteres acentuados (`á`, `é`, `ç`, `ã`) viram `�` (replacement character `U+FFFD`) e emojis viram `??`. O bash do Windows interpola a variável usando a codificação do shell (CP1252 / Latin-1), o byte vai pro Node/curl como UTF-8 inválido, persiste corrompido no DB e chega corrompido no celular do destinatário. **Cliente real recebe a mensagem com `Parab�ns! Voc� foi aprovado(a)`** — vergonha pública, e mais difícil de detectar pq parte do texto chega ok.

Incidente concreto (FluxonApp 2026-05-14): teste manual de `/api/chips/<phone>/send-text` corrompeu acentos de `Parabéns! Você foi aprovado(a)... 🎉` virando `Parab�ns! Voc� foi aprovado(a)... ??`. Bug NÃO afetava o worker (ele monta a string em JS UTF-8 nativo) — só o curl ad-hoc.

## Correção Enforçada

**Para texto com qualquer caractere não-ASCII em comando ad-hoc:**

1. Escrever o JSON num arquivo via Write tool (ou `node -e "fs.writeFileSync(...)"`):
   ```json
   {"jid": "...", "text": "Parabéns! 🎉"}
   ```

2. Mandar via `curl --data-binary @arquivo.json` (NÃO `-d`, NÃO interpolar variável bash):
   ```bash
   curl -X POST https://... \
     -H "Content-Type: application/json; charset=utf-8" \
     --data-binary @C:/tmp/body.json
   ```

3. **NUNCA** fazer:
   - `curl -d "{\"text\":\"$VAR\"}"` (variável vai com encoding do shell)
   - `curl -d "$(node -e ... "$TEXT")"` (mesma coisa)
   - `printf '...' | curl -d @-` com heredoc contendo acentos no terminal

Validação: SEMPRE conferir o texto no DB / log de saída antes de declarar "enviado". `select texto from mensagens where wamid='...'` é o oráculo.

## Onde se aplica

- **Tudo que rodar no Git Bash / MSYS / MinGW / Cygwin do Windows** com texto pt-BR / emoji.
- Stacks afetadas: bash + curl + qualquer endpoint que aceita JSON.
- **NÃO afeta** WSL (que é Linux real, UTF-8 nativo).
- **NÃO afeta** PowerShell desde que use `-Encoding UTF8` em `Out-File`/`Set-Content`.
- **NÃO afeta** o código Node/JS do projeto (string UTF-8 nativa).
