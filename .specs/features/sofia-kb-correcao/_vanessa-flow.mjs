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
// TODAS as mensagens (incl tool) das conversas da vanessa, com tool_name
const rows = await q(`SELECT m.conversation_id, m.created_at::text AS ts, m.role, m.tool_name, LEFT(m.content,260) AS c
  FROM ai_conversation_messages m JOIN ai_conversations c ON c.id=m.conversation_id
  WHERE c.customer_email='vanessacosta1082@gmail.com'
  ORDER BY m.conversation_id, m.created_at;`);
let conv=null;
for (const r of rows) {
  if (r.conversation_id !== conv) { conv = r.conversation_id; console.log(`\n===== conversa ${conv.slice(0,8)} =====`); }
  const tag = r.role==='tool' ? `TOOL(${r.tool_name})` : r.role.toUpperCase();
  console.log(`[${r.ts.slice(5,16)}] ${tag}: ${String(r.c).replace(/\n/g,' ')}`);
}
// Quantas conversas dela tiveram consultar_fluxon?
const stat = await q(`SELECT COUNT(DISTINCT c.id)::int total_convs,
   COUNT(DISTINCT c.id) FILTER (WHERE m.tool_name='consultar_fluxon')::int convs_com_fluxon
  FROM ai_conversations c JOIN ai_conversation_messages m ON m.conversation_id=c.id
  WHERE c.customer_email='vanessacosta1082@gmail.com';`);
console.log(`\n>>> vanessa: ${stat[0].total_convs} conversas, ${stat[0].convs_com_fluxon} chamaram consultar_fluxon`);
