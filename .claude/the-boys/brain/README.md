# 🧠 brain/ — o segundo cérebro do The Boys

> Memória **compartilhada e versionada** sobre como o usuário trabalha. O time consulta isto antes de assumir/chutar. Vive aqui no harness (privado) e é **vendorizado** pra `.claude/the-boys/brain/` de cada projeto via `node install/sync.mjs --target <projeto>`.

## O que tem aqui

| Arquivo | O quê |
|---|---|
| `how-we-work.md` | Convenções gerais do usuário — commit, branch, deploy, "sempre confirmar X", preferências de tooling/stack, idioma, identidade git. |
| `stacks/<stack>.md` | Padrões por stack (`nextjs.md`, `supabase.md`, …). Use `templates/stack.md` como esqueleto. |
| `projects/<projeto>.md` | Notas por projeto (`fluxonapp.md`, `fluxon.md`, …). Use `templates/projeto-mapeado.md` como esqueleto. |
| `decisions.md` | Lições e decisões **recorrentes / cross-projeto** — o que vale em **todos** os projetos. (≠ `STATE.md` de um projeto, que é só daquele.) Novas entradas via `templates/decisao.md`. |
| `learned-patterns.md` | Memória Autônoma (F20) — padrões de erro recorrentes registrados pelas personas. Novas entradas via `templates/licao-f20.md`; depois rodar `npm run build && npm run sync:cursor`. |
| `templates/` | Esqueletos canônicos pro Obsidian Templates plugin (`Cmd+P` → "Insert template"). Configurado em `.obsidian/templates.json`. |
| `views/` | `.base` files do Obsidian Bases — tabelas filtráveis sobre `projects/`, `stacks/`, decisões e lições. |
| `canvas/` | Diagramas visuais do harness (gate ladder, arquitetura). Dono: [[A Lenda]]. |

## Como consultar

Antes de assumir como um projeto/o usuário trabalha: leia `how-we-work.md`, o `stacks/<a-stack-do-projeto>.md` se existir, o `projects/<este-projeto>.md` se existir, e dê uma passada no `decisions.md`. Num projeto cliente, isso está em `.claude/the-boys/brain/`.

## Como contribuir (regra)

- O **canônico** é o `brain/` aqui no **repo do harness**. Aprendeu algo novo sobre como o usuário trabalha → registre **aqui**, não na cópia vendorizada do projeto.
- Depois de editar: `node install/sync.mjs --target <projeto>` propaga pro `.claude/the-boys/brain/` do projeto; commite lá.
- Mantenha entradas **curtas e factuais**. Não invente. Se não tem certeza, marque "(a confirmar)".
- Coisa específica de **um** projeto → `projects/<proj>.md`. Coisa que vale em vários → `how-we-work.md` ou `decisions.md`. Coisa de **um** projeto que é decisão local → o `STATE.md` daquele projeto, não aqui.

## Não-objetivos (por ora)

- Write-back automático projeto → harness — não tem; edite o canônico à mão.
- Busca semântica / indexação — não tem.
- Ser um repo separado — não é; é pasta no harness (privado, D017).
