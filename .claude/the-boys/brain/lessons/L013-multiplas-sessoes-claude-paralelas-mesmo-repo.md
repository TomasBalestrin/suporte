---
type: lesson
id: L013
title: "Múltiplas sessões Claude no mesmo repo: sempre git fetch+log antes de qualquer ação, sempre confirmar deploy depois do push"
date: 2026-05-15
owners:
  - "[[Bruto]]"
  - "[[MM]]"
  - "[[A Lenda]]"
occurrences: 1
severity: high
related:
  - "[[L012-vercel-fluxon-nao-auto-deploya]]"
  - "[[fluxonapp]]"
---

# L013 — Múltiplas sessões Claude trabalhando em paralelo no mesmo repo

## Gatilho

O usuário tem **duas (ou mais) janelas/sessões do Claude Code abertas simultaneamente no mesmo projeto** (VSCode + uma segunda instância, ou duas abas do desktop app). As sessões executam tarefas em paralelo sem que nenhuma das duas saiba que a outra existe.

Aconteceu em 2026-05-15 no FluxonApp: enquanto esta sessão fazia hardening de bucket + LidAliasesWorker + spec da Onda 4.1, outra sessão paralela executou os 3 follow-ups da rota `/api/media/presigned` + **implementou a Onda 4.1 inteira** + fix de CTA duplicado. Dezenas de commits apareceram "do nada" entre meus turnos.

## Erro

**3 modos de falha observados (e mais 1 possível):**

1. **Falsa confirmação de estado** — relatei "feature X está em prod" baseado em um STATE.md que tinha 2 entradas contraditórias (linha 90: "deploy manual via CLI"; linha 353: "auto-deploy via push"). Acreditei na linha mais recente sem checar `vercel ls`. **Resultado**: o usuário foi testar no celular sem que o Vercel tivesse deployado o código novo. Mentira de boa fé, mas mentira.

2. **`git add` virou no-op silencioso** — eu fiz `git add` de 9 arquivos da Onda 4.1; só 1 ficou staged porque os outros já batiam byte-a-byte com HEAD (a outra sessão já tinha commitado). Sem verificação extra, eu teria commitado parcial e gerado um commit sem sentido.

3. **Quase sobrescrevi trabalho da outra sessão** — editei `Skeleton.tsx` corrigindo `size-8/10/12 → size-9/11/14` baseado em pegada do Soldier Boy no design.md. Acabou virando no-op porque a outra sessão já tinha corrigido antes do commit, mas se eu tivesse editado pra valor *diferente* (e.g. `size-10/12/16`), teria pisado em decisão alheia sem nem saber.

4. **(Possível, não observado)** — edição concorrente no mesmo arquivo na mesma linha, gerando conflito de merge no `git push` ou perda de trabalho via `git checkout HEAD -- arquivo` precipitado.

## Causa

Sessões do Claude Code (CLI ou extensão VSCode) **não compartilham contexto entre si**. Cada sessão:
- Lê o estado do FS/git no início e cacheia
- Não recebe notificação de mudanças externas no working tree
- Não sabe da existência de outras sessões no mesmo repo

O usuário pode legitimamente abrir 2 sessões pra paralelizar trabalho — mas precisa avisar (e os Claudes precisam se policiar).

## Correção Enforçada

### Início de turno (todo turno, não só sessão nova)

Quando o usuário manda um prompt que vai disparar **ação** (não só pergunta), antes da primeira `Write`/`Edit`/`Bash` de side-effect:

```bash
git fetch --all --quiet
git status
git log --oneline -10
```

Se aparecer commits novos desde o último turno **que eu não fiz**, ou se `git status` mostrar alteração em arquivos que eu não toquei → **pausar e reler antes de agir**. Não é overhead — é higiene de concorrência.

### Antes de afirmar "está em prod"

**Nunca afirmar deploy sem verificação direta.** Não confiar em:
- STATE.md (pode ter info desatualizada/conflitante)
- "Vercel deveria ter pegado o push"
- Memória de turnos anteriores nesta mesma sessão

Verificação canônica:
```bash
vercel ls <project> | head -3   # idade do último deploy
vercel inspect <prod-url> | head -10   # data do build atual
```

Se idade > minutos atrás do meu push, **deploy não pegou** — rodar `vercel --prod --yes` manualmente.

### Antes de editar arquivo "novo"

Quando vou criar um arquivo ou editar um que estava untracked há minutos:

```bash
git log --oneline -3 -- <path>
```

Se aparecer commit recente que não foi meu → a outra sessão já tocou. Ler o conteúdo atual antes de qualquer Write/Edit.

### Quando rodar agente (Soldier Boy, Kimiko, etc.)

Avisar o agente no prompt: "Pode haver execução paralela em outra sessão — antes de criar/editar, verifica `git status` e `git log -3 -- <path-alvo>`." Vai pra cabeça do agente como instrução, ele decide.

### Ao fechar tarefa pro user

Sempre confirmar **dois eixos** no relatório final:
1. **Em master?** (`git log origin/master --oneline -1`)
2. **Em prod?** (`vercel ls | head -2` pra projetos sem auto-deploy)

Se um dos dois falhar, **dizer explicitamente** "commitado mas não deployado" — não dar impressão de tarefa fechada quando não está.

## Onde se aplica

- Sempre que o usuário tem múltiplos editores/sessões abertos. **Default seguro: assumir que tem.**
- Particularmente crítico em:
  - **Repos com deploy manual** (projetos Vercel em `tt-solucoes-projects` — ver [[L012-vercel-fluxon-nao-auto-deploya]]).
  - **Mudanças em arquivos hot-path** (rotas API, components canon, STATE.md, design system).
  - **Tarefas longas** onde o usuário pode ter ido testar algo em paralelo e voltado.

## Pegando na planta

- Sentir cheiro de "isso aqui mudou e eu não me lembro de ter feito" → parar e diagnosticar. Não bater Edit em cima.
- Se o `git status` antes de um turno mostrar arquivo modificado que eu lembro de ter visto limpo → outra mão mexeu.
- Se o usuário falar de uma feature que "deveria estar funcionando" e eu não cheguei a ver/checar diretamente em prod → suspeitar de deploy ausente antes de suspeitar de bug no código.

## TODO defendido

Não sugerir solução automática de "lockfile entre sessões" — o Claude Code não tem mecanismo nativo pra isso. A solução é processual: higiene de início de turno + paranoia sadia.

## Notas

- Não rotular paralelismo como "ruim". Em 2026-05-15 funcionou muito bem (sessões fizeram peças complementares sem conflito real). Só **não dá pra fingir que não está acontecendo** — tem que se ajustar.
- Se o usuário começar a perceber que "as duas sessões repetem trabalho" → orientar ele a dividir explicitamente o escopo entre elas antes de soltar ambas.
