# ui-pitfalls — erros clássicos de design, pegos na planta

> Checklist de armadilhas de UI/CSS que aparecem repetidamente. **O Soldier Boy roda isto na fase `design`** — contra o `design.md`, antes de virar código — e aponta os que se aplicam. A **Luz Estrela revalida** no merge. Pegar na planta custa minutos; pegar em produção custa um incidente.
>
> Formato de cada entrada: **Sintoma** (o que o usuário vê) · **Causa** (o erro) · **Fix** (a propriedade/pattern concreto). Genérico por padrão; coisa específica de stack vai em `brain/stacks/<stack>.md`.
>
> Curadoria: o usuário ajusta/adiciona. Achou um clássico novo num projeto? Registre aqui.

---

### 1. Barra lateral / header sobe (rola) junto com a página
- **Sintoma**: o usuário scrolla o conteúdo e a sidebar (ou o topo fixo) "vai embora" pra cima junto.
- **Causa**: a sidebar/header está no fluxo normal do documento, dentro do mesmo container que scrolla.
- **Fix**: ou `position: sticky; top: 0` (segue na viewport, ainda ocupa espaço no layout) ou `position: fixed` (sai do fluxo — compense o espaço no `main`). Melhor ainda: **layout em grid** — `display: grid; grid-template-columns: <sidebar> 1fr;` com a `<main>` recebendo `overflow-y: auto; height: 100dvh` e a sidebar/header ficando estáticos por construção. Em layout de app, o que scrolla é o `<main>`, não a página.

### 2. Barra de scroll não segue a cor do tema
- **Sintoma**: tema escuro/grafite ativo, mas a scrollbar continua branca/cinza-padrão do SO — destoa.
- **Causa**: ninguém estilizou a scrollbar; ela usa o estilo nativo.
- **Fix**: estilize derivando das CSS vars do tema, cobrindo **todos os temas** (claro/escuro/grafite). Padrão de hoje (`scrollbar-color`, suportado em Firefox e Chromium recentes):
  ```css
  :root { --scrollbar-thumb: color-mix(in srgb, var(--muted-foreground) 35%, transparent); --scrollbar-track: transparent; }
  * { scrollbar-width: thin; scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track); }
  /* fallback WebKit, se precisar de mais controle: */
  *::-webkit-scrollbar { width: 8px; height: 8px; }
  *::-webkit-scrollbar-track { background: var(--scrollbar-track); }
  *::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 4px; }
  *::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--muted-foreground) 55%, transparent); }
  ```
  Não use cor fixa — derive do token. Sem setas (`::-webkit-scrollbar-button { display: none }`).

### 3. `100vh` quebra em mobile
- **Sintoma**: tela "passa do fim" no celular; ou um rodapé fixo fica escondido atrás da barra do navegador; ou aparece um pulo quando a barra de URL some/aparece.
- **Causa**: `100vh` no mobile inclui a área da barra do navegador (que aparece/some).
- **Fix**: use `100dvh` (dynamic viewport height) pra altura que acompanha; `100svh`/`100lvh` quando quiser o estado pequeno/grande explicitamente. Fallback: `min-height: 100vh; min-height: 100dvh;`.

### 4. Layout shift / CLS — conteúdo "salta" enquanto carrega
- **Sintoma**: a página re-arranja depois de carregar — imagem aparece e empurra o texto, fonte troca e muda a altura, banner aparece e desloca tudo.
- **Causa**: elementos sem espaço reservado: `<img>` sem `width`/`height`/`aspect-ratio`; fontes sem `font-display`; conteúdo assíncrono (anúncio, embed, lista) sem placeholder.
- **Fix**: `<img>` sempre com `width` + `height` (ou `aspect-ratio`); `@font-face { font-display: swap }` (ou `optional`); reserve a caixa de qualquer conteúdo que chega depois (skeleton com a altura final).

### 5. Z-index war
- **Sintoma**: o modal fica atrás do header; o tooltip some debaixo de um card; alguém colocou `z-index: 9999` e o próximo colocou `99999`.
- **Causa**: z-index ad-hoc, sem escala, e camadas criadas por `transform`/`opacity`/`position` sem ninguém perceber (stacking contexts).
- **Fix**: defina uma **escala de z-index** em tokens e use só ela: ex. `--z-dropdown: 1000; --z-sticky: 1100; --z-overlay: 1200; --z-modal: 1300; --z-toast: 1400`. Nada de número solto. Cuidado com `transform`/`filter`/`will-change` em ancestrais — eles criam stacking context novo e seu `z-index` alto vira inútil.

### 6. `outline: none` sem foco de teclado visível
- **Sintoma**: navegando por teclado (Tab), não dá pra ver onde você está. (Quebra acessibilidade — e o pessoal de QA/auditoria pega.)
- **Causa**: alguém fez `*:focus { outline: none }` pra "ficar limpo" e não repôs nada.
- **Fix**: nunca remova o foco sem substituir. Use `:focus-visible` (só aparece em navegação por teclado, não no clique de mouse): `:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }`. Em componentes custom, garanta que o foco vai pro elemento certo e que o anel respeita o tema.

### 7. Texto estoura / empurra o container num flex
- **Sintoma**: um nome/URL/label longo "estica" o card, ou empurra o botão pra fora, ou cria scroll horizontal.
- **Causa**: filho de flex/grid não encolhe — o `min-width` default é `auto`, não `0`.
- **Fix**: `min-width: 0` nos filhos de flex/grid que contêm texto que pode crescer; combine com `overflow: hidden; text-overflow: ellipsis; white-space: nowrap` (truncar) ou `overflow-wrap: anywhere`/`word-break: break-word` (quebrar). Em grid, `minmax(0, 1fr)` em vez de `1fr`.

### 8. Tabela sem scroll horizontal no mobile
- **Sintoma**: tabela larga estoura a tela no celular — ou some o final das colunas, ou a página inteira ganha scroll-x.
- **Causa**: a `<table>` não cabe e ninguém deu uma estratégia responsiva.
- **Fix**: envolva a tabela num wrapper `overflow-x: auto` (e `-webkit-overflow-scrolling: touch`); ou, se for o caso, troque por layout de card/lista em telas pequenas. Nunca deixe a tabela ditar a largura do `body`.

### 9. Interação só no `:hover` (não funciona em touch)
- **Sintoma**: dropdown/submenu/tooltip que só abre passando o mouse — no celular não abre nunca.
- **Causa**: lógica de abrir presa ao `:hover`.
- **Fix**: abra por **click/tap** (com `:hover` como atalho extra no desktop, se quiser). Pra tooltip informativo essencial, dê uma forma de acessar no touch (tap, ou jogue a info no layout). `@media (hover: hover)` pra distinguir, se precisar.

### 10. Modal mal-feito
- **Sintoma**: o modal não fecha no ESC; o foco continua "atrás" dele (Tab vaza pro conteúdo de baixo); a página continua scrollando atrás; leitor de tela não anuncia.
- **Causa**: modal montado como uma `<div>` solta sem os comportamentos esperados.
- **Fix**: feche no ESC e no clique no backdrop; **trap de foco** dentro do modal (foco vai pro modal ao abrir, volta pro gatilho ao fechar); `aria-modal="true"` + `role="dialog"` + `aria-labelledby`; bloqueie o scroll do `<body>` enquanto aberto (`overflow: hidden` no body, compensando a largura da scrollbar pra não dar "pulo"). Use `<dialog>` nativo ou uma lib de a11y se possível.

### 11. Cor/medida hardcoded em vez de token
- **Sintoma**: `#B19365` no CSS; `border-radius: 10px` solto; `margin-top: 13px`. Muda o tema/escala e fica pela metade.
- **Causa**: não consultou o `design-system/tokens.json` / `registry.json`.
- **Fix**: use os tokens — `color: var(--gold)`, `border-radius: var(--radius-md)`, espaçamento da escala. (O Soldier Boy já enforça isso; está aqui pra completar o checklist.)

### 12. Tema escuro/grafite meia-boca
- **Sintoma**: troca pro tema escuro e 80% fica certo, mas um card, um input, um ícone continuam claros (ou vice-versa). Ou usa `prefers-color-scheme` mas só cobre parte.
- **Causa**: cores hardcoded em alguns componentes; ou o tema é via classe (`.dark`, `.graphite`) mas não foi aplicado em tudo.
- **Fix**: **todas** as cores via token; o token é que muda por tema. Teste cada tela em **cada tema**. Se for 3-way (claro/escuro/grafite), os três têm que estar 100%. Bordas, sombras, scrollbar (item 2), placeholders, estados de hover — tudo.

### 13. Scroll duplo / `overflow:hidden` quebrando filho
- **Sintoma**: dois scrollbars (a página e um container interno); ou um conteúdo que devia scrollar não scrolla; ou o `body` não scrolla mais e nem todos sabem por quê.
- **Causa**: `overflow: hidden`/`auto` em ancestral errado; altura fixa em container que devia crescer; `height: 100%` numa cadeia que não tem `height` definido lá em cima.
- **Fix**: decida **quem** scrolla (geralmente o `<main>` em app, o `<body>` em página de conteúdo) e seja consistente. `overflow: hidden` no `body` só quando há um scroll container interno deliberado. Cadeia de `height: 100%` precisa de `html, body { height: 100% }` (ou usar `100dvh` direto).

### 14. Scroll horizontal acidental na página inteira
- **Sintoma**: dá pra arrastar a página pro lado uns pixels; aparece uma scrollbar embaixo sem motivo.
- **Causa**: algum elemento estoura a largura — `width: 100vw` (inclui a scrollbar!), `margin`/`padding` negativo, imagem/`<pre>`/iframe sem `max-width`, `position: absolute` com `right` negativo, grid/flex com filho que não encolhe (item 7).
- **Fix**: ache o culpado (`* { outline: 1px solid red }` ou DevTools); prefira `width: 100%` a `100vw`; `img, video, iframe, pre, table { max-width: 100% }`; `overflow-x: hidden` só como último recurso e no wrapper certo (não no `body` "pra esconder o problema").

### 15. Estados de elemento interativo faltando ou inconsistentes
- **Sintoma**: botão que não muda no hover; input que não mostra foco; link "morto" que parece desabilitado; botão desabilitado que ainda parece clicável.
- **Causa**: só o estado "normal" foi estilizado.
- **Fix**: todo interativo tem `:hover`, `:active`, `:focus-visible`, `:disabled` (e `:checked`/`aria-*` onde couber), consistentes entre os componentes. Botão desabilitado: `opacity` + `cursor: not-allowed` + `pointer-events: none` (ou tratar no handler). Link sem destino: não é link — é texto ou botão.

### 16. `<div onClick>` no lugar de `<button>`/`<a>` (e o contrário)
- **Sintoma**: não dá pra ativar com teclado; leitor de tela não anuncia como botão; ou um `<a href="#">` que na verdade é uma ação.
- **Causa**: usou a tag errada por preguiça de resetar estilo.
- **Fix**: **ação** → `<button>` (resete o estilo: `appearance: none; background: none; border: 0; ...`). **Navegação** → `<a href>`. Se *tiver* que usar `<div>`/`<span>` clicável (não tem): `role="button"` + `tabindex="0"` + handler de `keydown` (Enter/Space) + `cursor: pointer`. Quase nunca compensa.

### 17. Sem skeleton / loading state
- **Sintoma**: a tela pisca em branco, depois "salta" quando os dados chegam; ou fica um spinner gigante no meio do nada.
- **Causa**: nenhum estado intermediário entre "vazio" e "carregado".
- **Fix**: skeleton com **a forma e a altura do conteúdo final** (reduz CLS — item 4); ou ao menos um placeholder com a altura certa. Estado de erro e estado vazio também — não só o "feliz".

### 18. `<label>` não associado ao input
- **Sintoma**: clicar no rótulo não foca o campo; leitor de tela não casa rótulo e campo; área de clique minúscula.
- **Causa**: `<label>Email</label>` solto, ou texto num `<span>`/`<div>`.
- **Fix**: `<label for="email">` + `<input id="email">`, ou `<label>Email <input></label>` (wrapping). Placeholder **não** é rótulo. Campo obrigatório: marque visualmente **e** com `aria-required`/`required`.

### 19. Imagem/ícone sem `alt` adequado
- **Sintoma**: leitor de tela lê o nome do arquivo (`IMG_4821.png`), ou ignora uma imagem informativa; ou anuncia um ícone decorativo poluindo.
- **Causa**: `alt` ausente, ou `alt` automático ruim.
- **Fix**: imagem **informativa** → `alt` com o conteúdo/intenção real. Imagem/ícone **decorativo** → `alt=""` (vazio, explícito) e/ou `aria-hidden="true"`. Ícone que é o único conteúdo de um botão → `aria-label` no botão.

### 20. Layout testado só em desktop
- **Sintoma**: no celular/tablet, um botão importante fica fora da tela, dois elementos se sobrepõem, o menu não abre, a tabela some.
- **Causa**: design feito em 1440px e ponto.
- **Fix**: teste em **breakpoints reais** (≈360px, 768px, 1024px, 1440px); conteúdo crítico (ações primárias, navegação, erro) tem que estar acessível em todos; mobile-first ajuda a não esquecer. Touch targets ≥ ~44px. Texto não fica abaixo de ~14px sem motivo.
