// REVERTE a mudança em produtos.url_acesso — restaura os valores originais do snapshot.
// Motivo: url_acesso alimenta a ENTREGA (webhook/compra, entregas, email). Usuário confirmou
// que as entregas estão todas certas → os quillforms originais eram os links corretos.
import { readFileSync } from 'node:fs';
const envTxt = readFileSync('C:/Users/lluys/Desktop/PROJETOS/Disparotey/.env.local', 'utf8').split(/\r?\n/);
const get = (k) => { const l = envTxt.find(x => x.startsWith(k + '=')); return l ? l.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '') : null; };
const SUPA_URL = get('NEXT_PUBLIC_SUPABASE_URL');
const SR = get('SUPABASE_SERVICE_ROLE_KEY');
const H = { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json' };
const snap = JSON.parse(readFileSync('./fluxon-produtos-snapshot-pre-fix.json', 'utf8'));
console.log(`Restaurando ${snap.length} linhas pro url_acesso original:`);
let ok = 0;
for (const row of snap) {
  const r = await fetch(`${SUPA_URL}/rest/v1/produtos?id=eq.${row.id}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=representation' }, body: JSON.stringify({ url_acesso: row.url_acesso }) });
  const body = JSON.parse(await r.text());
  if (!r.ok) { console.log(`  ERRO ${row.nome}: ${JSON.stringify(body).slice(0,200)}`); continue; }
  ok += body.length;
  console.log(`  ✓ ${row.nome} → ${row.url_acesso}`);
}
console.log(`\nRestauradas: ${ok}/${snap.length}`);
// verificação: nenhum dos 4 está com juliaacademy agora
const ids = snap.map(s => `id.eq.${s.id}`).join(',');
const chk = await fetch(`${SUPA_URL}/rest/v1/produtos?select=nome,url_acesso&or=(${encodeURIComponent(ids)})`, { headers: H });
const after = JSON.parse(await chk.text());
console.log('\nEstado pós-revert:');
after.forEach(p => console.log(`  ${p.nome}: ${p.url_acesso}`));
