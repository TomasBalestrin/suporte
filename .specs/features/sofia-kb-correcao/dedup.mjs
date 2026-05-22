// dedup.mjs — desativa duplicatas de conteúdo IDÊNTICO na knowledge_base.
// Regra: por título, mantém o created_at mais antigo; desativa os demais SÓ se content == do mantido.
// Variante com conteúdo divergente fica ATIVA e é sinalizada (não some informação).
// Uso: node dedup.mjs            (dry-run: diagnóstico)
//      node dedup.mjs --apply    (executa)
import { writeFileSync, readFileSync } from 'node:fs';
const APPLY = process.argv.includes('--apply');
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

const before = (await q("SELECT COUNT(*)::int n FROM knowledge_base WHERE is_active=true;"))[0].n;
console.log(`Artigos ativos ANTES: ${before}`);

// Diagnóstico: títulos com >1 ativo e quantos conteúdos distintos
const diag = await q(`SELECT title, COUNT(*)::int AS n, COUNT(DISTINCT md5(content))::int AS distinct_contents
  FROM knowledge_base WHERE is_active=true GROUP BY title HAVING COUNT(*) > 1 ORDER BY title;`);
const identicos = diag.filter(d => d.distinct_contents === 1);
const divergentes = diag.filter(d => d.distinct_contents > 1);
console.log(`Títulos com duplicata ativa: ${diag.length} | conteúdo idêntico: ${identicos.length} | DIVERGENTES: ${divergentes.length}`);
if (divergentes.length) {
  console.log('⚠️ DIVERGENTES (NÃO serão tocados — revisar à mão):');
  divergentes.forEach(d => console.log(`   - "${d.title}" (${d.n} ativos, ${d.distinct_contents} conteúdos)`));
}

if (!APPLY) {
  console.log('\n=== DRY-RUN. Use --apply pra desativar as duplicatas idênticas. ===');
  process.exit(0);
}

// Desativa: por título, mantém o mais antigo; desativa demais SÓ se content == do mantido
const disabled = await q(`WITH ranked AS (
  SELECT id, title, content,
         FIRST_VALUE(content) OVER (PARTITION BY title ORDER BY created_at ASC, id ASC) AS keep_content,
         ROW_NUMBER() OVER (PARTITION BY title ORDER BY created_at ASC, id ASC) AS rn
  FROM knowledge_base WHERE is_active = true)
UPDATE knowledge_base kb SET is_active = false
FROM ranked r
WHERE kb.id = r.id AND r.rn > 1 AND r.content = r.keep_content
RETURNING kb.id, kb.title;`);
writeFileSync('./dedup-disabled-ids.json', JSON.stringify(disabled, null, 2), 'utf8');
console.log(`\nDesativados: ${disabled.length} (lista salva em dedup-disabled-ids.json p/ rollback)`);

const after = (await q("SELECT COUNT(*)::int n FROM knowledge_base WHERE is_active=true;"))[0].n;
const dupAtivas = await q(`SELECT title, COUNT(*)::int n FROM knowledge_base WHERE is_active=true GROUP BY title HAVING COUNT(*) > 1 ORDER BY title;`);
console.log(`Artigos ativos DEPOIS: ${after} (delta ${after - before})`);
console.log(`Títulos ainda com duplicata ativa (esperado: só divergentes): ${JSON.stringify(dupAtivas)}`);
