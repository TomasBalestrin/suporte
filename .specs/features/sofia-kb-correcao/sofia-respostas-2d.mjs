import { readFileSync, writeFileSync } from 'node:fs';
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

const rows = await q(`
SELECT m.created_at, m.role, m.content, c.customer_email, c.ticket_id
FROM ai_conversation_messages m
JOIN ai_conversations c ON c.id = m.conversation_id
WHERE m.created_at >= NOW() - INTERVAL '2 days' AND m.role IN ('user','assistant','ai')
ORDER BY c.id, m.created_at;`);

// agrupa por conversa (sequencial pela ordem)
const POISON = /quiz\.testedosarquetipos|é livre|nao exige login|não exige login|sem login|grátis|gratuito/i;
let out = `# Respostas da Sofia — últimos 2 dias (fonte: ai_conversation_messages)\n`;
out += `Total de mensagens (user+IA): ${rows.length}\n\n`;
let recaidas = 0;
let convKey = null, convN = 0;
for (const r of rows) {
  const key = `${r.ticket_id || ''}|${r.customer_email || ''}`;
  if (key !== convKey) { convKey = key; convN++; out += `\n=== Conversa ${convN} — ${r.customer_email || 's/ email'}${r.ticket_id ? ' · ticket ' + r.ticket_id : ''} ===\n`; }
  const who = (r.role === 'user') ? 'CLIENTE' : 'SOFIA';
  const flag = (who === 'SOFIA' && POISON.test(r.content)) ? '  ⚠️RECAIDA' : '';
  if (flag) recaidas++;
  const ts = r.created_at.slice(5, 16);
  out += `[${ts}] ${who}${flag}: ${r.content.replace(/\n+/g, ' ⏎ ')}\n`;
}
writeFileSync('./sofia-respostas-2d.txt', out, 'utf8');
console.log(`Conversas: ${convN} | mensagens: ${rows.length} | respostas da Sofia com padrão venenoso: ${recaidas}`);
console.log('Arquivo completo: sofia-respostas-2d.txt');
console.log('\n--- PRIMEIRAS ~14 linhas ---');
console.log(out.split('\n').slice(3, 17).join('\n'));
