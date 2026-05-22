import { readFileSync } from 'node:fs';
const envTxt = readFileSync('C:/Users/lluys/Desktop/PROJETOS/Disparotey/.env.local', 'utf8').split(/\r?\n/);
const get = (k) => { const l = envTxt.find(x => x.startsWith(k + '=')); return l ? l.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '') : null; };
const SUPA_URL = get('NEXT_PUBLIC_SUPABASE_URL');
const SR = get('SUPABASE_SERVICE_ROLE_KEY');
const res = await fetch(`${SUPA_URL}/rest/v1/produtos?select=nome,url_acesso,login_instrucao,ativo&order=nome.asc&limit=500`, {
  headers: { apikey: SR, Authorization: `Bearer ${SR}` } });
const t = await res.text();
if (!res.ok) { console.log(`HTTP ${res.status}: ${t.slice(0,300)}`); process.exit(1); }
const prods = JSON.parse(t);
console.log(`PRODUTOS no Fluxon: ${prods.length}\n`);
for (const p of prods) {
  const u = (p.url_acesso || '').toLowerCase();
  const flag = u.includes('quillforms') ? '  ⚠️ QUILLFORMS' : (u.includes('juliaacademy') || u.includes('cleitonquerobin1') || u.includes('50scripts') || u.includes('usecouply') || !u ? '' : '  ❓ outro domínio');
  console.log(`• ${p.nome}${p.ativo === false ? ' [inativo]' : ''}`);
  console.log(`    url_acesso: ${p.url_acesso || '(vazio)'}${flag}`);
}
const qf = prods.filter(p => (p.url_acesso||'').toLowerCase().includes('quillforms'));
console.log(`\n>>> ${qf.length} produto(s) com url_acesso QUILLFORMS (candidatos a link errado):`);
qf.forEach(p => console.log(`    - ${p.nome} → ${p.url_acesso}`));
