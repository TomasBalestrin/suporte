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
// Todas as mensagens (INCLUSIVE tool) das conversas do robertastev no dia 20
const rows = await q(`SELECT m.created_at::text AS ts, m.role, m.tool_name, m.content
  FROM ai_conversation_messages m JOIN ai_conversations c ON c.id = m.conversation_id
  WHERE c.customer_email = 'robertastev@gmail.com'
  ORDER BY m.conversation_id, m.created_at;`);
rows.forEach(r => {
  const tag = r.role === 'tool' ? `TOOL(${r.tool_name})` : r.role.toUpperCase();
  console.log(`[${r.ts.slice(5,16)}] ${tag}: ${String(r.content).replace(/\n/g,' ').slice(0,400)}`);
});
// Existe QUALQUER tool result na base com quillforms/reels?
console.log('\n--- Algum tool result historico citou quillforms/reels? ---');
const any = await q(`SELECT COUNT(*)::int n FROM ai_conversation_messages WHERE content ILIKE '%quillforms/reels%';`);
console.log('  ocorrencias de quillforms/reels em qualquer mensagem:', any[0].n);
