---
type: project
name: Bethel Infra
aliases:
  - Bethel Infra
  - bethel-infra
folder: C:/Users/lluys/Desktop/PROJETOS/bethel-infra
stack: [android, java, gradle, work-profile-api]
deploy: sideload-apk
status: archived
archived_at: 2026-05-15
archived_reason: "Exploracao inicial revelou trade-off ruim. Work Profile = limite 2 instancias; fork VirtualApp = R$100k+/ano + risco banimento; cliente Baileys proprio = duplica FluxonApp (rejeitado). Repo GitHub arquivado, APK deletado. L016 (AIDL Windows javac) preservada por ser licao generica."
mapped_by: "[[Bruto]]"
mapped_at: 2026-05-15
related: ["[[fluxonapp]]", "[[bethel-anuncios]]", "[[L016]]"]
---

# Projeto: Bethel Infra (ARQUIVADO em 2026-05-15)

> **ENGAVETADO.** Ver `ENGAVETADO.md` na pasta local pra resumo da decisao. Conteudo abaixo preservado pra contexto historico.

## O que é
App Android nativo (Java) **multi-instanciador de apps** — permite à equipe Bethel rodar múltiplas instâncias de qualquer app (WhatsApp, Telegram, etc.) num mesmo celular via **Work Profile** do Android (API oficial). Uso interno equipe Bethel (5-10 pessoas, sideload, sem Play Store).

**Hard fork de [PeterCxy/Shelter](https://github.com/PeterCxy/Shelter)** (GPL-3.0). Mantém 100% da lógica Java/Android do upstream; muda só identidade externa (applicationId, app_name, provider authorities, cores). Estratégia de manutenção: pull periódico de upstream + rebrand commits em cima.

**Limite estrutural:** Work Profile API oficial = **2 instâncias por app** (1 oficial + 1 no perfil isolado). Pra 3 chips WhatsApp num celular: WhatsApp oficial + WhatsApp Business + Bethel Infra → WhatsApp clonado = 3 contas, todas legítimas, todas suportadas pelo Android. **NÃO usa VirtualApp/DroidPlugin** (frameworks que conseguem N instâncias mas quebram em Android 14+).

## Arquitetura em 30s
- **Stack**: Java + Android nativo + Gradle + AIDL + Work Profile API. NÃO usa Capacitor/web.
- **Motor**: Shelter usa `DevicePolicyManager` + `BroadcastReceiver` pra criar Work Profile, virar profile manager, instalar app pares no profile isolado. Cross-profile communication via AIDL services (`IShelterService`, `IFileShuttleService`, etc.).
- **Build**: `./gradlew assembleRelease` na raiz. Output em `app/build/outputs/apk/release/app-release.apk`.
- **Signing**: keystore Bethel master compartilhada com FluxonApp (SHA-256 `0FC738AF...FFE519`), copiada como `keystore.jks` na raiz (gitignored). Pass `android`/`android`. Alias `android`.
- **Submódulo**: `libs/SetupWizardLibrary` (de `gitea.angry.im/PeterCxy/SetupWizardLibrary`). Inicializar com `git submodule update --init --recursive` após clone.
- **Versioning**: `versionCode` = git rev-list count, `versionName` = `git describe --tags --dirty`. Pra build limpo, tag antes de buildar.

## Como rodar localmente
```
# Pré-reqs: JDK 21 (Android Studio jbr), Android SDK build-tools 35.0.0, platforms/android-35
git clone https://github.com/eduardotkfm-maker/bethel-infra.git
cd bethel-infra
git submodule update --init --recursive
# Copia keystore.jks da master Bethel (FluxonApp tem em C:/tmp/fluxonapp-twa/android.keystore)
JAVA_HOME="C:\Program Files\Android\Android Studio\jbr" ./gradlew.bat assembleRelease
# APK: app/build/outputs/apk/release/app-release.apk
```

Em Windows, JAVA_HOME deve apontar pra JDK 21 (Android Studio). Capacitor 8 também exige 21, fica alinhado. Bubblewrap (não usado aqui) exigiria JDK 17 separado.

## Armadilhas / "não faça"
- **`net.typeblog.shelter` Java package mantido inalterado** — refactor de centenas de imports + AIDL bindings + intent action strings pra zero ganho funcional. O que muda a identidade externa do app é `applicationId` no `build.gradle`, NÃO o package Java.
- **Provider authorities devem ser únicos** — `com.bethel.infra.{files,documents}` (NÃO `net.typeblog.shelter.{files,documents}`) pra coexistir com Shelter original instalado no mesmo device.
- **AIDL no Windows quebra com `\u` no path**: AIDL injeta path absoluto no Javadoc dos `.java` gerados; quando passa por `\util\` (pasta do package), o javac trata `\u` como início de unicode escape mesmo em comentário e falha com "illegal unicode escape". Fix versionado em `app/build.gradle` (task `afterEvaluate` que strippa a linha "* Using:" dos gerados antes do compileJava). Ver [[L016]]. **Sem esse fix, `./gradlew assembleRelease` falha em qualquer máquina Windows com path contendo `\u`** (qualquer pasta cujo nome comece com `u` minúsculo, ex.: `\util\`, `\users` — sim, mas no Windows o path geralmente é `\Users` capital, então só `\util\` é o ponto real).
- **Keystore.jks fora do repo** — `.gitignore` cobre `*.jks` e `*.keystore`. Backup local; perder = não pode mais fazer update do APK na equipe (Android exige mesma assinatura).
- **NÃO usar `git push --force` em master** — repo tem 2 remotes (`origin` = `eduardotkfm-maker/bethel-infra`, `upstream` = `PeterCxy/Shelter`). Force-push em origin não é destrutivo (uso interno), mas force em upstream nunca.
- **Updates do upstream**: `git fetch upstream && git merge upstream/master` periodicamente. Conflitos esperados em build.gradle, strings.xml, colors.xml (nossos rebrands em cima dos deles).
- **Ícone ainda é o do Shelter** (pendente v0.2) — pra trocar, substituir `app/src/main/res/mipmap-*` + `ic_freeze_*`.

## Estado atual
- **v0.1.0 buildado e signed** em `C:/Users/lluys/Downloads/bethel-infra-v0.1.0.apk` (2.3 MB). package=`com.bethel.infra`, versionCode=510. Tag `v0.1.0` em origin.
- **Pendente UAT no celular**: equipe instala via sideload, testa criação de Work Profile, clone do WhatsApp.
- **Roadmap próximas versões** (se v0.1 validar):
  - **v0.2** — UI Bethel Material 3 customizada, tutorial in-app, ícone Bethel próprio, lista curada de apps recomendados pra clonar.
  - **v1.0** — backup de dados por instância, sync de notificação central, atalhos rápidos.

## Pessoas / contexto
- **Eduardo** (`eduardotkfm-maker`) — dono, define escopo. Use case central: equipe Bethel tem 3 chips WhatsApp (Carlos, Jessica, EQUIPE CLEITON), hoje cada um precisa de celular físico separado. v0.1 permite 1 celular rodar 2 chips simultaneamente (oficial + Work Profile); combinado com WhatsApp Business da Meta = 3 chips num celular.
- Conta GitHub repo: `eduardotkfm-maker/bethel-infra`. License GPL-3.0 (herdada do Shelter — uso interno não exige distribuição de source, mas se distribuir o APK precisa oferecer source).
- Empresa: MV4 Digital ("Bethel" ecossistema), mesma família do FluxonApp / Bethel Anúncios / Bethel Contratos.

## Fontes
- Repo origin: https://github.com/eduardotkfm-maker/bethel-infra
- Upstream: https://github.com/PeterCxy/Shelter (mirror de https://gitea.angry.im/PeterCxy/Shelter)
- Decisões registradas neste arquivo + commits `7f566e9` (rebrand) e `8bd069d` (fix AIDL Windows)
- Playbook genérico de APK: [[P004-empacotar-em-apk-android]] (Padrão Capacitor; Bethel Infra usa stack diferente — Java nativo, não Capacitor — então P004 não aplica direto, mas a parte de pré-reqs Windows e keystore é compartilhada).
