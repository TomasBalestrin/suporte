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
const fix = await q("SELECT updated_at::text FROM knowledge_base WHERE id='799731f5-d527-493e-b178-d236536e20a2';");
const sp = await q("SELECT updated_at::text FROM ai_config WHERE config_key='system_prompt';");
const now = await q("SELECT NOW()::text AS now;");
console.log('AGORA (UTC):', now[0].now);
console.log('FIX artigo 799731f5 (updated_at):', fix[0].updated_at);
console.log('FIX system_prompt (updated_at):', sp[0]?.updated_at || 'sem coluna updated_at');
console.log('\n--- Respostas venenosas da Sofia (2d) com timestamp ---');
const poison = await q(`SELECT created_at::text AS ts, LEFT(content,90) AS c
  FROM ai_conversation_messages
  WHERE created_at >= NOW() - INTERVAL '2 days' AND role IN ('assistant','ai')
    AND (content ILIKE '%quiz.testedosarquetipos%' OR content ILIKE '%não exige login%' OR content ILIKE '%nao exige login%' OR content ILIKE '%é livre%' OR content ILIKE '%grátis%' OR content ILIKE '%gratuito%')
  ORDER BY created_at;`);
poison.forEach(p => console.log(`  ${p.ts}  ${p.c.replace(/\n/g,' ')}`));
