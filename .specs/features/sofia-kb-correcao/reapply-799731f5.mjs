import { readFileSync } from 'node:fs';
const REF = 'zeocxcfiyhzsztwjllvl';
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const envLine = readFileSync('C:/Users/lluys/Desktop/PROJETOS/Disparotey/.env.local', 'utf8')
  .split(/\r?\n/).find(l => l.startsWith('SUPABASE_ACCESS_TOKEN_SUPORTE='));
const TOKEN = envLine.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');
async function q(sql) {
  const res = await fetch(URL, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }) });
  const t = await res.text(); if (!res.ok) throw new Error(`HTTP ${res.status}: ${t}`);
  try { return JSON.parse(t); } catch { return t; }
}
const c799 = readFileSync('./fix-content/799731f5.md', 'utf8').replace(/\s+$/, '');
await q(`UPDATE knowledge_base SET content = $a799$${c799}$a799$ WHERE id = '799731f5-d527-493e-b178-d236536e20a2';`);
console.log('799731f5 reescrito (limpo).');
const v1 = await q("SELECT COUNT(*)::int AS n FROM knowledge_base WHERE is_active=true AND content ILIKE '%quiz.testedosarquetipos%';");
const v2 = await q("SELECT COUNT(*)::int AS n FROM knowledge_base WHERE is_active=true AND (content ILIKE '%é livre%' OR content ILIKE '%não exige login%' OR content ILIKE '%sem login%') AND (content ILIKE '%arqu%tipo%' OR title ILIKE '%arqu%tipo%');");
const v3 = await q("SELECT COUNT(*)::int AS n FROM knowledge_base WHERE is_active=true AND content ILIKE '%juliaacademy%' AND title ILIKE '%Teste dos Arqu%';");
console.log('C1 link morto ativo (esperado 0):', v1[0].n);
console.log('C2 livre/sem login sobre arquetipo ativo (esperado 0):', v2[0].n);
console.log('C3b artigo 799731f5 aponta juliaacademy (esperado >=1):', v3[0].n);
