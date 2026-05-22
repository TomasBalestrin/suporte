---
type: lesson
id: L029
title: "Next.js App Router: trocar cookie via document.cookie + router.refresh() não invalida o RSC cache — usar server action + revalidatePath"
date: 2026-05-19
owners:
  - "[[Bruto]]"
occurrences: 1
severity: low
related:
  - "[[L010-whatsapp-lid-pn-dichotomy]]"
---

# L029 — Cookie client-side + router.refresh() não invalida RSC cache no App Router

## Gatilho

Componente client troca um cookie que Server Components leem (ex.: "chip ativo", "tenant selecionado", "idioma"). Padrão ingênuo:

```tsx
const setChip = (id: string) => {
  document.cookie = `chip-ativo=${id}; path=/`
  router.refresh()
}
```

Sintoma: a UI **não reflete a troca** até o usuário dar F5 manual. As Server Components continuam renderizando com o valor antigo do cookie.

## Erro

`router.refresh()` re-busca o RSC payload, mas:
1. O cookie escrito via `document.cookie` só vale pra **próxima** request HTTP — o refresh em andamento pode usar o estado anterior.
2. Mesmo com `export const dynamic = 'force-dynamic'` na page, o **Router Cache do cliente** (camada do Next, não do navegador) pode servir a versão em cache da rota até ser invalidada explicitamente.
3. `router.refresh()` invalida só a rota atual; se múltiplas páginas/layout leem o cookie, não há garantia de invalidação coordenada.

Resultado: estado "meio trocado" — cookie novo no browser, mas Server Components com dado velho.

## Correção Enforçada

Setar o cookie no **servidor** via server action e invalidar o cache com `revalidatePath`:

```ts
// app/.../actions.ts
"use server"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

export async function setChipAtivoAction(id: string) {
  ;(await cookies()).set("chip-ativo", id, { path: "/", maxAge: 31536000, sameSite: "lax" })
  revalidatePath("/dashboard", "layout") // invalida a subtree inteira do layout
}
```

```tsx
// componente client
const setChip = (id: string) => {
  setChipId(id) // update otimista da UI local
  startTransition(async () => {
    await setChipAtivoAction(id) // servidor seta cookie + revalida
    router.refresh()             // repaint imediato com dado fresco
  })
}
```

Pontos-chave:
- **`revalidatePath(path, 'layout')`** invalida todas as páginas filhas daquele layout — não só a rota atual. Use quando o cookie afeta vários menus.
- A server action garante que o cookie está commitado **antes** do refresh, eliminando a race.
- Manter o update otimista local (`setChipId(id)`) pra a UI do próprio seletor responder na hora.

## Onde se aplica

- Next.js App Router (13.4+) com Server Components lendo cookies via `cookies()`.
- Qualquer "seletor global" que muda contexto compartilhado: tenant, workspace, chip/conta ativa, locale, tema persistido server-side.
- NÃO necessário se o valor só é lido client-side (aí `document.cookie` + estado React basta).

## Anti-padrões que evita

- "setei o cookie e dei refresh mas só atualiza com F5"
- espalhar `router.refresh()` em vários lugares torcendo pra invalidar
- desligar cache com `force-dynamic` e achar que resolve o Router Cache do cliente (não resolve sozinho)

## Aplicado no FluxonApp em 2026-05-19

`ChipAtivoSelector.tsx` trocava `document.cookie` + `router.refresh()` — páginas `disparar`/`fluxos`/`grupos` não atualizavam sem F5. Fix: `src/lib/actions/chip-ativo.ts` com `setChipAtivoAction` + `revalidatePath('/dashboard','layout')`. Commit `27c694b`.

---

> Após registrar, rodar `npm run build && npm run sync:cursor` no repo do harness antes do commit.
