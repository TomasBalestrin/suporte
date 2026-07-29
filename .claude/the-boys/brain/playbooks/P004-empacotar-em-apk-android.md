---
type: playbook
id: P004
title: "Empacotar projeto web em APK Android via Capacitor (2 padrões)"
category: packaging
date: 2026-05-15
owners:
  - "[[A Lenda]]"
  - "[[MM]]"
  - "[[Bruto]]"
related:
  - "[[fluxonapp]]"
  - "[[bethel-anuncios]]"
  - "[[L013-multiplas-sessoes-claude-paralelas-mesmo-repo]]"
---

# P004 — Empacotar projeto web em APK Android (Capacitor)

## Quando usar

O usuário quer que um projeto web (Next.js, Vite, qualquer SPA/SSR) vire **APK Android sideloadável** pra equipe interna. Sem Play Store, sem iOS (esse playbook não cobre — exige Mac + dev cert da Apple).

**Não usar:**
- Pra projeto que **precisa** de notificação push nativa rica antes do v1 do APK. Push via FCM exige plugin separado + backend que dispara — entra como fase 2.
- Pra app que vai pra **Play Store na primeira release**. Capacitor funciona, mas exige keystore com pass forte + bundle (`.aab` em vez de `.apk`) + signing key armazenada na Play Console. Mudar pass de keystore depois é trabalho.
- Pra projeto **iOS-first**. Capacitor suporta iOS, mas o playbook aqui cobre só Android.

## Decisão preliminar — qual padrão?

| Critério | **Padrão A: `server.url` externa** | **Padrão B: bundle local** |
|---|---|---|
| Stack | Next.js SSR / qualquer backend que **exige servidor** | SPA estático (Vite, CRA, Astro static) |
| Como funciona | WebView aponta pra `https://app.vercel.app` em runtime | `npm run build` → assets copiados pro APK |
| Rebuild APK quando? | Só ao mudar config nativa (plugin, ícone, `appId`) | A cada release de UI |
| Funciona offline? | ❌ (precisa de internet pro Vercel) | ✅ (assets locais) |
| OAuth / deep links | Funciona normal (URL externa) | Precisa de `androidScheme: https` + deep link config |
| Tamanho APK típico | 3-4 MB | 5-10 MB (depende do bundle) |
| Casos reais | [[fluxonapp]] (Next.js 16 SSR) | [[bethel-anuncios]] (React + Vite 7) |
| **Recomendação default** | ✅ se backend exige servidor | ✅ se app é puramente client-side |

**Regra prática**: se o projeto roda no Vercel/qualquer hosting e o frontend precisa de SSR ou rotas API server-side, use **Padrão A**. Se é SPA pura, use **Padrão B**.

> **Não cair em TWA (bubblewrap)** — apesar de leve (1.3 MB), TWA mostra barra do Chrome em pull-to-refresh. Bethel Anúncios não tem esse defeito porque é Capacitor; FluxonApp começou em TWA, Eduardo flagrou e migramos. Decisão registrada em STATE do FluxonApp 2026-05-14. **Capacitor sempre que possível.**

## Pré-requisitos (Windows)

Setup do ambiente Android (1ª vez por máquina, depois reutiliza):

1. **JDK 21 (Capacitor 8)** — vem com Android Studio em `C:/Program Files/Android/Android Studio/jbr`. Confirmar:
   ```cmd
   "C:\Program Files\Android\Android Studio\jbr\bin\java.exe" -version
   ```
   Deve mostrar `openjdk version "21.x.x"`.

2. **Android SDK** — instalado pelo Android Studio em `C:/Users/<usuario>/AppData/Local/Android/Sdk`. Confirmar que tem:
   - `cmdline-tools/latest/bin/sdkmanager.bat`
   - `build-tools/34.0.0/` (ou superior — pelo menos uma versão estável)
   - `platforms/android-34/`

3. **Env vars** (setar uma vez no Windows, escopo User):
   - `ANDROID_HOME=C:\Users\<usuario>\AppData\Local\Android\Sdk`
   - `JAVA_HOME=C:\Program Files\Android\Android Studio\jbr`
   - PATH += `%ANDROID_HOME%\platform-tools` (pra `adb`)

4. **Keystore** — gerar 1x e backup:
   ```cmd
   keytool -genkey -v -keystore android.keystore -alias myapp -keyalg RSA -keysize 2048 -validity 10000
   ```
   - Pass: forte se Play Store futura; `android`/`android` aceitável **só** se uso interno sideload.
   - **CRÍTICO**: backup em 2 lugares (`Downloads/<projeto>-android.keystore` + drive externo). Se perder, próximas releases não podem ser update da atual (Android exige mesma assinatura).
   - Anotar pass + alias + DN em local seguro (1Password, gerenciador interno).

## Padrão A — `server.url` externa (recomendado pra Next.js / SSR)

Casos cobertos por [[fluxonapp]]. Tempo médio: ~30min na 1ª vez, ~5min em rebuilds de config nativa.

### Passos

1. **Confirmar que a versão prod do app está deployada e estável**. `server.url` aponta pra prod — se prod estiver quebrada, o APK quebra junto.
   ```cmd
   curl -I https://app.vercel.app
   ```
   Tem que retornar `200 OK`.

2. **Criar pasta isolada do projeto Capacitor** (NÃO dentro do repo principal — APK + node_modules nativos não merecem viver lá):
   ```cmd
   mkdir C:\tmp\<projeto>-cap
   cd C:\tmp\<projeto>-cap
   npm init -y
   ```

3. **Instalar Capacitor 8** (alinhado com Bethel Anúncios e FluxonApp):
   ```cmd
   npm i @capacitor/core@^8 @capacitor/cli@^8
   npm i @capacitor/android@^8 @capacitor/app@^8 @capacitor/status-bar@^8 @capacitor/splash-screen@^8 @capacitor/keyboard@^8
   npm i -D @capacitor/assets@^3
   ```

4. **Inicializar projeto Capacitor**:
   ```cmd
   npx cap init "<App Name>" com.<org>.<projeto>
   ```
   - `appId` deve ser único globalmente. Convenção Bethel: `com.bethel.<slug>`.
   - **Importante**: se for update de TWA ou versão anterior, **manter o mesmo `appId`** pra atualizar in-place.

5. **Editar `capacitor.config.ts`**:
   ```ts
   import type { CapacitorConfig } from '@capacitor/cli'

   const config: CapacitorConfig = {
     appId: 'com.bethel.<projeto>',
     appName: '<App Name>',
     webDir: 'public',
     server: {
       url: 'https://<projeto>.vercel.app',
       cleartext: false,
     },
     plugins: {
       SplashScreen: {
         launchShowDuration: 1500,
         backgroundColor: '#001321',  // navy canon Bethel
         showSpinner: false,
       },
       StatusBar: {
         style: 'DARK',
         backgroundColor: '#001321',
       },
       Keyboard: {
         resize: 'body',
       },
     },
   }

   export default config
   ```

6. **Criar `public/index.html` stub** (não usado em runtime — `server.url` redireciona, mas Capacitor exige o `webDir` existir):
   ```html
   <!DOCTYPE html><html><body><p>Loading...</p></body></html>
   ```

7. **Gerar ícones e splash** com `@capacitor/assets`:
   ```cmd
   mkdir assets
   # colocar assets/icon.png (1024x1024) e assets/splash.png (2732x2732)
   npx capacitor-assets generate --android
   ```

8. **Adicionar plataforma Android**:
   ```cmd
   npx cap add android
   ```
   Gera pasta `android/` com projeto Gradle completo.

9. **Configurar signing no `android/app/build.gradle`** — adicionar antes do `buildTypes`:
   ```groovy
   signingConfigs {
       release {
           storeFile file('C:/tmp/<projeto>-cap/android.keystore')
           storePassword 'android'
           keyAlias 'myapp'
           keyPassword 'android'
       }
   }
   ```
   E no `buildTypes.release`:
   ```groovy
   release {
       signingConfig signingConfigs.release
       minifyEnabled false
       proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
   }
   ```
   > **Atenção AGP 9.x**: usar `proguard-android-optimize.txt`, **não** `proguard-android.txt` (registrado em [[bethel-anuncios]] como pegadinha).

10. **Copiar keystore pra pasta do projeto** (ou ajustar `storeFile` pra path absoluto):
    ```cmd
    copy android.keystore C:\tmp\<projeto>-cap\android.keystore
    ```

11. **Build APK release**:
    ```cmd
    cd android
    set JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
    .\gradlew.bat assembleRelease
    ```
    APK final em: `android/app/build/outputs/apk/release/app-release.apk`.

12. **Renomear e mover pro Downloads** (convenção):
    ```cmd
    copy android\app\build\outputs\apk\release\app-release.apk C:\Users\<usuario>\Downloads\<projeto>-v<versao>.apk
    ```

13. **Distribuir** — anexar pelo WhatsApp / link interno. Equipe precisa habilitar "instalar de fontes desconhecidas" no celular.

### Rebuild (versões futuras)

Mudou config nativa (plugin novo, ícone, `appId`, splash)?
```cmd
cd C:\tmp\<projeto>-cap
npx cap sync android        # atualiza android/ com novos plugins/config
cd android
.\gradlew.bat assembleRelease
copy app\build\outputs\apk\release\app-release.apk C:\Users\<usuario>\Downloads\<projeto>-v<versao+1>.apk
```

**Mudou só código do app (UI, rotas, regra)?** Nada a fazer com o APK — o `server.url` carrega a versão nova do Vercel automaticamente. Equipe só precisa fechar e abrir o app.

## Padrão B — bundle local (recomendado pra SPA estático)

Casos cobertos por [[bethel-anuncios]]. Tempo médio: ~45min na 1ª vez, ~15min a cada release de UI.

### Diferenças do Padrão A

- `webDir` aponta pro output do build (`dist/`, `build/`, conforme bundler).
- **Sem** `server.url` no `capacitor.config.ts`.
- Precisa `androidScheme: https` pra OAuth funcionar.
- Deep link OAuth: `com.<org>.<projeto>://auth/callback`.
- A cada release de UI: `npm run build && npx cap sync android && gradlew assembleRelease`.

### Snippet `capacitor.config.ts` (Padrão B)

```ts
const config: CapacitorConfig = {
  appId: 'com.<org>.<projeto>',
  appName: '<App Name>',
  webDir: 'dist',  // ou 'build'
  android: {
    androidScheme: 'https',  // OAuth requer
  },
  plugins: {
    // mesmo bloco do Padrão A
  },
}
```

### Pegadinhas do Padrão B (cf. [[bethel-anuncios]])

- **CORS**: a origin do app dentro do APK é `https://localhost`. O backend Vercel precisa whitelisting essa origin (`secureEndpoint` permite `https://localhost`).
- **Deep link OAuth**: registrar `com.<org>.<projeto>://auth/callback` no provedor (Google/Supabase) E no `AndroidManifest.xml` (`<intent-filter>` em `MainActivity`).
- **Plugins de push**: `@capacitor/push-notifications` precisa de Firebase config (`google-services.json` em `android/app/`). Configurar via Firebase Console.

## Armadilhas / "não faça"

- **NÃO tentar TWA (bubblewrap)** — bug do gradlew.bat no Windows, bug do bubblewrap doctor com error msg confusa, e em runtime mostra barra Chrome em pull-to-refresh. Cf. [[fluxonapp]] §"Migração TWA → Capacitor". Capacitor sempre.
- **NÃO** perder o keystore — sem ele, próxima versão do APK não vira update da atual (Android rejeita). 2 backups, sempre.
- **NÃO** versionar o APK no repo principal — fica em `C:/tmp/<projeto>-cap/` (Padrão A) ou no `public/` do próprio repo (Padrão B, ver [[bethel-anuncios]]).
- **NÃO** usar JDK 17 com Capacitor 8 — exige JDK 21. (JDK 17 é pra bubblewrap, que não usamos mais.) Cf. [[fluxonapp]] decision 2026-05-14.
- **NÃO** trocar `appId` entre versões — Android trata como app completamente diferente. Mesmo `appId` + mesmo keystore = update in-place.
- **CORS / `androidScheme: https`** — origin do APK não é `https://app.vercel.app`, é `https://localhost` (Padrão B) ou a URL do `server.url` (Padrão A). Whitelisting CORS no backend.
- **`gradlew assembleRelease` com JAVA_HOME errado** — se rodar com JDK 17, falha cryptic. Setar `JAVA_HOME` antes (ou usar `set JAVA_HOME=...` na mesma linha de comando).

## Aceite

APK pronto se:

- [ ] Instalado no celular Android via sideload (precisa "instalar de fontes desconhecidas" ON na primeira vez).
- [ ] Abre sem crash de boot (status bar com cor correta, splash com logo, fade pra app real em <2s).
- [ ] Login funciona (cookie/session preservada entre sessões do app).
- [ ] Navegação interna não mostra barra de URL do Chrome (se mostrar, voltou pra TWA por engano).
- [ ] Pull-to-refresh **não** mostra barra Chrome (gate principal).
- [ ] Push notification funciona se foi escopo (gate opcional, FCM exige Firebase config).
- [ ] Versão visível em algum lugar do app (settings ou rodapé) — pra suporte da equipe não precisar perguntar "qual APK você instalou?".

## Próximas onda (deixar registrado pra futuro)

- **Push notification via FCM** — exige Firebase project + `google-services.json` + plugin `@capacitor/push-notifications`. Backend dispara via FCM Admin SDK. Ver `brain/projects/bethel-anuncios.md` pro padrão de uso.
- **iOS** — Capacitor suporta, mas exige Mac + Apple dev cert ($99/ano). Fora desse playbook.
- **Google Play Store distribution** — exige bundle `.aab` (não `.apk`), keystore com pass forte, Play Console signing key. Migração de sideload pra Play Store = trabalho de algumas horas.

## Notas

- Playbook codifica 2 implementações vivas (FluxonApp + Bethel Anúncios). Replica 1 deles, ou cria o terceiro projeto com confiança.
- Se aparecer um 4º caso de uso (ex.: iOS, ou app que precisa offline-first), expandir aqui em vez de criar P005 — paralelo a "P002 mapear projeto" que cobre N projetos.
- Pegadinha de paralelismo aplicada — se múltiplas sessões mexerem no mesmo projeto Capacitor, [[L013-multiplas-sessoes-claude-paralelas-mesmo-repo]]: sempre `git fetch + status + log` antes de qualquer Write, e nunca afirmar "APK instalado" sem o usuário confirmar.
