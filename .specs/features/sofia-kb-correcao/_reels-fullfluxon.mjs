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
const rows = await q(`SELECT created_at::text AS ts, role, tool_name, content
  FROM ai_conversation_messages WHERE content ILIKE '%quillforms/reels%' ORDER BY created_at;`);
rows.forEach((r,i) => {
  console.log(`\n===== ocorrência ${i+1} | [${r.ts.slice(0,16)}] role=${r.role}${r.tool_name ? ' tool='+r.tool_name : ''} =====`);
  console.log(r.content);
});
