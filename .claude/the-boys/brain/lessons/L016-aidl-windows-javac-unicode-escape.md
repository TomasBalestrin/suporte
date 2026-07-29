---
type: lesson
id: L016
title: "AIDL no Windows: '\\u' em path quebra javac com 'illegal unicode escape' em comentário"
date: 2026-05-15
owners:
  - "[[MM]]"
  - "[[A Lenda]]"
occurrences: 1
severity: high
related:
  - "[[bethel-infra]]"
---

# L016 — AIDL no Windows injeta path no Javadoc; javac quebra com `\u` literal

## Gatilho

Build Gradle de projeto Android que usa AIDL (Android Interface Definition Language), no **Windows**, com working dir contendo qualquer pasta cujo nome comece com `u` minúsculo (ex.: `\util\`, `\users\<lowercase>`, `\update\`, qualquer sub-package Java cujo nome comece com `u` minúsculo).

Sintoma:
```
error: illegal unicode escape
* Using: C:\Users\<user>\...\app\src\main\aidl\<pkg>\util\IFoo.aidl
                                                       ^
1 error
```

Reproduzido em [[bethel-infra]] (fork de Shelter, package `net.typeblog.shelter.util`) no primeiro `./gradlew assembleRelease` em Windows 11 (2026-05-15).

## Erro

O plugin AIDL do Android Gradle Plugin (AGP) injeta o **comando completo de invocação** (incluindo paths absolutos) num Javadoc `/* Using: <path> */` no topo de cada `.java` gerado a partir de `.aidl`. No Windows o path usa backslashes.

Java compilador processa **`\u`** como prefixo de unicode escape **em qualquer posição do source file, inclusive em comentários** ([JLS §3.3](https://docs.oracle.com/javase/specs/jls/se21/html/jls-3.html#jls-3.3)). Se `\u` for seguido por menos de 4 hex chars, falha com "illegal unicode escape" — **mesmo em comentário**.

`\util` = `\u` + `tilI` → `t` não é hex → erro.

## Causa

Java unicode escape funciona no nível de "input element" (antes do tokenizer), antes mesmo da remoção de comentários. Esse é um quirk infame da spec — `// A` é equivalente a `// A`, e `// \uXYZ` é erro sintático.

AGP AIDL plugin não escapa nem strippa esse path no Windows. Em Linux/Mac os paths usam `/` e o problema some.

## Correção Enforçada

Adicionar uma task `afterEvaluate` no `app/build.gradle` que strippa a linha `* Using: ...` dos `.java` gerados antes de `compileJavaWithJavac`:

```groovy
afterEvaluate {
    tasks.matching { it.name.startsWith('compile') && it.name.endsWith('JavaWithJavac') }.all { task ->
        task.doFirst {
            fileTree(dir: layout.buildDirectory.dir('generated/aidl_source_output_dir'))
                .matching { include '**/*.java' }
                .each { f ->
                    def text = f.text
                    def cleaned = text.replaceAll(/(?m)^\s*\*\s+Using:.*$/, ' * Using: <path stripped for Windows javac>')
                    if (text != cleaned) {
                        f.text = cleaned
                    }
                }
        }
    }
}
```

**Idempotente** (só reescreve se mudou). **Não afeta builds em Linux/Mac** (regex match-nothing nesses sistemas porque paths não têm `\` que escape unicode).

Snippet vivo em [bethel-infra/app/build.gradle](C:/Users/lluys/Desktop/PROJETOS/bethel-infra/app/build.gradle).

## Onde se aplica

- **Sempre que** rodar `./gradlew assembleRelease` (ou `assembleDebug`) em projeto Android com AIDL, **em Windows**, com qualquer pasta no path contendo `u` minúsculo (mais comum: package Java `*.util.*`).
- Sub-fix opcional: renomear pasta `util` pra `utils` ou `helper` — funciona pra projeto próprio mas inviável em forks com convenção do upstream.
- **Não se aplica** em Linux/Mac (paths separados por `/`).

## Pegando na planta (próxima vez)

- Build Android novo em Windows + erro "illegal unicode escape" + caret no Javadoc do `.java` gerado por AIDL → aplicar o snippet acima direto.
- Se o projeto NÃO usa AIDL (raro mas possível em apps simples sem Service cross-process), problema não acontece.
- Se decidir migrar pra Linux/WSL pra builds: também resolve, mas não vale a pena migrar dev environment inteiro por isso — fix Gradle é 20 linhas e cobre todos os contributors Windows futuros.

## Notas

- Bug existe **há anos** no AGP (referências em issues do issuetracker.google.com), mas Google não prioriza porque devs Android usam majoritariamente Linux/Mac.
- Workaround alternativo via `tasks.compileReleaseJavaWithJavac.options.compilerArgs += ['-Xlint:-options']` **não funciona** — não é warning, é erro de fase léxica.
- Outros projetos Android Java em Windows da família Bethel (FluxonApp, Bethel Anúncios) **não veem esse bug** porque são Capacitor (frontend web embedded, sem AIDL próprio do projeto — só AIDL interno do Capacitor plugin que já vem com seu próprio workaround).
- Se algum projeto futuro herdar AIDL (ex.: Service Android nativo com binder IPC), aplicar este fix preventivamente no `build.gradle`.
