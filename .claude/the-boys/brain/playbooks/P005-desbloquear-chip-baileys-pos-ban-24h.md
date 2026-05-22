---
type: playbook
id: P005
title: "Desbloquear chip Baileys pós-ban 24h no VPS Hetzner (FluxonApp)"
category: ops
date: 2026-05-19
owners:
  - "[[Bruto]]"
  - "[[MM]]"
related:
  - "[[L022-baileys-disconnect-multiplo-trigga-ban-24h]]"
---

# P005 — Desbloquear chip Baileys pós-ban 24h no VPS Hetzner (FluxonApp)

## Quando usar

Chip do FluxonApp ficou em `status='erro'` após ter levado ban de 24h do WhatsApp (loop disconnect/connect <30min). O ban acabou (já passou ≥24h), mas:

- Painel não consegue gerar QR ("Chip já pareado") ou
- Connect retorna 401 em loop (auto-restore reinjeta creds banidas) ou
- Status oscila entre `erro` e `desconectado` sem nunca subir.

**Sintoma raiz**: `auth/<phone>/creds.json` em disco no container + N backups no bucket `chip-auth-backups/<chipId>/` contêm as **mesmas creds banidas**. Botão "Reconectar" não resolve porque só faz `disconnect→connect` (não toca disco nem Storage).

## Pré-requisitos

- Acesso SSH ao VPS: `ssh -i ~/.ssh/oracle_fluxonapp root@89.167.78.26` (chave da Eduardo).
- Container `deploy-fluxonapp-service-1` rodando.
- Saber o `phone` (chave do mount em `/app/auth/<phone>`) e o `chip_id` (chave do bucket `chip-auth-backups/<chip_id>`).
- Confirmação de que o ban realmente acabou (≥24h desde último 401). Se ainda dentro do ban, é tiro no escuro — vai banir de novo no próximo connect.

## Passos

1. **Diagnóstico inicial** — confirma estado:
   ```bash
   ssh -i ~/.ssh/oracle_fluxonapp root@89.167.78.26 '
     C=deploy-fluxonapp-service-1
     docker exec $C ls -la /app/auth/<phone>/ | head -5
     docker exec $C node -e "require(\"http\").get(\"http://localhost:3031/health\",r=>{let d=\"\";r.on(\"data\",c=>d+=c);r.on(\"end\",()=>console.log(d))})"
   '
   ```
   Espera ver: pasta com `creds.json` + status `erro` no /health.

2. **Mover backups banidos no Supabase Storage** (sem isso, auto-restore reinjeta creds banidas no próximo connect):
   ```bash
   ssh ... 'docker exec deploy-fluxonapp-service-1 node -e "
     const{createClient}=require(\"@supabase/supabase-js\");
     const s=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY);
     const CHIP=\"<chip_id>\";
     const STAMP=new Date().toISOString().replace(/[:.]/g,\"-\");
     (async()=>{
       const list=await s.storage.from(\"chip-auth-backups\").list(CHIP,{limit:100});
       for(const f of list.data){
         await s.storage.from(\"chip-auth-backups\").move(CHIP+\"/\"+f.name,\"_banned_\"+STAMP+\"_\"+CHIP+\"/\"+f.name);
       }
       console.log(\"movidos:\",list.data.length);
     })();
   "'
   ```
   Por que mover e não apagar? Mantém histórico forensico sem custar busca futura.

3. **Mover pasta auth do container pra /tmp** (mesmo princípio — não apagar):
   ```bash
   ssh ... 'docker exec deploy-fluxonapp-service-1 sh -c "mv /app/auth/<phone> /tmp/_banned_<phone>_$(date -u +%Y%m%dT%H%M%SZ)"'
   ```

4. **Reciclar a sessão** (`disconnect` + `connect` + `qr-code`) — **apenas 1 ciclo**:
   ```bash
   ssh ... '
     C=deploy-fluxonapp-service-1
     SECRET=$(docker exec $C printenv SERVICE_SECRET)
     docker exec $C node -e "
       const h=require(\"http\");
       const p=(path)=>new Promise(r=>{const q=h.request({host:\"localhost\",port:3031,path,method:\"POST\",headers:{\"x-service-secret\":\"$SECRET\"}},res=>{let d=\"\";res.on(\"data\",c=>d+=c);res.on(\"end\",()=>r({s:res.statusCode,b:d}))});q.end()});
       (async()=>{
         console.log(\"dc:\",JSON.stringify(await p(\"/api/chips/<phone>/disconnect\")));
         await new Promise(r=>setTimeout(r,1500));
         console.log(\"cn:\",JSON.stringify(await p(\"/api/chips/<phone>/connect\")));
         await new Promise(r=>setTimeout(r,4000));
         console.log(\"qr:\",JSON.stringify(await p(\"/api/chips/<phone>/qr-code\")).slice(0,200));
       })();
     "
   '
   ```
   ⚠️ **NÃO repetir o ciclo se o QR não sair de primeira.** Espera 2-3min, faz só `/qr-code` (não `disconnect+connect`). Repetir disconnect/connect <30min trigga novo ban 24h (L022).

5. **Operador escaneia QR no painel** `/dashboard/chips` → clica "Gerar QR" no card do chip → WhatsApp do celular → Aparelhos conectados → Conectar aparelho.

## Verificação

- `/health` retorna `status: "conectado"` pro chip em ≤10s após o scan.
- Painel mostra "Conectado".
- Teste de smoke: enviar 1 mensagem de teste pra um número conhecido → chega.

## Variações

- **Múltiplos chips banidos juntos**: aplicar o playbook 1 por 1, **nunca em paralelo** — restart de container global = N disconnect+connect simultâneos = risco de re-ban.
- **Chip em status `desconectado`** (não `erro`): pode pular o passo 2 (Storage) — geralmente não tem auto-restore ativo. Mas se passou pelo loop ban antes, melhor limpar Storage por garantia.
- **Sem acesso SSH**: o operador não consegue resolver sozinho hoje. Pendência aberta: criar endpoint `POST /api/chips/:phone/reset-auth` no service + botão "Resetar auth e parear" no `ChipCard` quando `status ∈ {erro, desconectado >5min}` (ver pendência na issue do FluxonApp).

## Lições aprendidas

- **Auto-restore agressivo é faca de dois gumes** (L022 contexto): se as creds em backup também estão banidas, o auto-restore só serve pra perpetuar o problema. Considerar adicionar marker `banned: true` no metadata do backup quando 401 ocorrer consecutivamente, e pular esses backups no restore.
- **"Reconectar" do painel ilude**: front oferece `disconnect→connect` que não toca disco nem Storage. Quem só usa o painel acha que tá fazendo o reset certo, mas tá só batendo botão. Botão "Resetar auth" precisa existir.
- **1 ciclo por sessão, não N**: a tentação de "tentar de novo" é fortíssima quando o QR não sai — mas o WhatsApp conta cada tentativa. Espera passar 2-3min antes de qualquer retry.

## Histórico de execução

- 2026-05-19 — Carlos (5549999742914, chip_id 880bdf22) — ban acabou ~20h BRT, playbook executado, conectou em 1 tentativa. Backups movidos: 7 arquivos. Auth disco movido pra `/tmp/_banned_carlos_20260519T201230Z`. **Operador: Bruto (SSH direto, autorizado por Eduardo).**

---

> Após registrar, rodar `npm run build && npm run sync:cursor` no repo do harness antes do commit.