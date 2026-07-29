// Corrige produtos.url_acesso errados no Fluxon (prod). Julia products: quillforms -> juliaacademy.
// node fluxon-fix-urls.mjs          (dry-run: snapshot + mostra o que mudaria)
// node fluxon-fix-urls.mjs --apply  (PATCH em prod)
import { readFileSync, writeFileSync } from 'node:fs';
const APPLY = process.argv.includes('--apply');
const envTxt = readFileSync('C:/Users/lluys/Desktop/PROJETOS/Disparotey/.env.local', 'utf8').split(/\r?\n/);
const get = (k) => { const l = envTxt.find(x => x.startsWith(k + '=')); return l ? l.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '') : null; };
const SUPA_URL = get('NEXT_PUBLIC_SUPABASE_URL');
const SR = get('SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const NEW = 'https://juliaacademy.com.br/';
const TARGETS = [
  'https://cleitonquerobin.com.br/quillforms/reels-magneticos/',
  'https://cleitonquerobin.com.br/quillforms/julia-ottoni-01/',
  'https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/',
];
// snapshot ANTES (todas as linhas alvo)
const orFilter = TARGETS.map(u => `url_acesso.eq.${u}`).join(',');
const snapRes = await fetch(`${SUPA_URL}/rest/v1/produtos?select=id,nome,url_acesso,login_instrucao&or=(${encodeURIComponent(orFilter)})`, { headers: H });
const snap = JSON.parse(await snapRes.text());
writeFileSync('./fluxon-produtos-snapshot-pre-fix.json', JSON.stringify(snap, null, 2), 'utf8');
console.log(`Linhas alvo: ${snap.length} (snapshot salvo)`);
snap.forEach(p => console.log(`  • ${p.nome} | ${p.url_acesso} | login: ${p.login_instrucao || '(vazio)'}`));
console.log(`\nTODAS passariam a: ${NEW}`);

if (!APPLY) { console.log('\n=== DRY-RUN (use --apply pra escrever no Fluxon prod) ==='); process.exit(0); }

console.log('\n=== APLICANDO PATCH no Fluxon prod ===');
let total = 0;
for (const old of TARGETS) {
  const r = await fetch(`${SUPA_URL}/rest/v1/produtos?url_acesso=eq.${encodeURIComponent(old)}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ url_acesso: NEW }) });
  const body = JSON.parse(await r.text());
  if (!r.ok) { console.log(`  ERRO em ${old}: ${JSON.stringify(body).slice(0,200)}`); continue; }
  total += body.length;
  console.log(`  ✓ ${body.length} linha(s): ${old.split('/quillforms/')[1]} → juliaacademy`);
}
console.log(`\nTotal atualizado: ${total}`);
// verificação: ainda sobra quillforms nesses 3?
const chk = await fetch(`${SUPA_URL}/rest/v1/produtos?select=nome,url_acesso&or=(${encodeURIComponent(orFilter)})`, { headers: H });
const left = JSON.parse(await chk.text());
console.log(`Linhas com url antigo ainda presentes (esperado 0): ${left.length}`);
