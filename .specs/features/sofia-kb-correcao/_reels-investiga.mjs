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

console.log('===== 1) Artigos ATIVOS sobre Reels =====');
const reels = await q(`SELECT id, title, is_active, content FROM knowledge_base
  WHERE is_active=true AND (title ILIKE '%reels%' OR content ILIKE '%reels%') ORDER BY title;`);
reels.forEach(r => { console.log(`\n--- ${r.id.slice(0,8)} | ${r.title}`); console.log(r.content); });

console.log('\n\n===== 2) Censo de links quillforms na KB ATIVA =====');
const qf = await q(`SELECT id, title, regexp_matches(content, 'https?://[^ )\\n]*quillforms[^ )\\n]*', 'g') AS url
  FROM knowledge_base WHERE is_active=true AND content ILIKE '%quillforms%';`);
qf.forEach(r => console.log(`  ${r.id.slice(0,8)} | ${r.title} → ${r.url}`));
if (!qf.length) console.log('  (nenhum link quillforms em artigo ativo)');

console.log('\n===== 3) system_prompt contém link errado de reels? =====');
const sp = await q(`SELECT (config_value ILIKE '%quillforms/reels%')::int AS tem_reels_quillforms,
  (config_value ILIKE '%Reels Magnéticos%')::int AS menciona_reels FROM ai_config WHERE config_key='system_prompt';`);
console.log('  ', JSON.stringify(sp[0]));
