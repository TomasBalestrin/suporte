// apply-fix.mjs — aplica o subset "estanca agora" da feature sofia-kb-correcao.
// UTF-8 safe (Node nativo). Trava: aborta se o bloco antigo do system_prompt nao bater.
// Uso: node apply-fix.mjs            (dry-run: so valida e mostra o que faria)
//      node apply-fix.mjs --apply    (executa o write em prod)
import { readFileSync, writeFileSync } from 'node:fs';

const APPLY = process.argv.includes('--apply');
const REF = 'zeocxcfiyhzsztwjllvl';
const URL = `https://api.supabase.com/v1/projects/${REF}/database/query`;

const envLine = readFileSync('C:/Users/lluys/Desktop/PROJETOS/Disparotey/.env.local', 'utf8')
  .split(/\r?\n/).find(l => l.startsWith('SUPABASE_ACCESS_TOKEN_SUPORTE='));
const TOKEN = envLine.split('=').slice(1).join('=').trim().replace(/^"|"$/g, '');

async function q(sql) {
  const res = await fetch(URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

const read = (id) => readFileSync(`./fix-content/${id}.md`, 'utf8').replace(/\s+$/, '');

const c799 = read('799731f5');
const c43  = read('43fff20f');
const caca = read('aca9f143');
const c4d  = read('4d0c6ca0');

// --- system_prompt: replace cirurgico do bloco do Teste dos Arquetipos ---
const oldBlock =
`Teste dos Arquétipos (sem login necessário):
- Link direto (única URL /quillforms/ válida): https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/`;
const newBlock =
`Teste dos Arquétipos (produto PAGO — acesso pela área de membros Julia Academy):
- Área de membros: https://juliaacademy.com.br/ · Login: e-mail usado na compra · Senha: ottoni123
- (uso interno, NÃO orientar como caminho principal ao cliente) URL do formulário: https://cleitonquerobin.com.br/quillforms/perpetuo-teste-dos-arquetipos/`;

const prompt = (await q("SELECT config_value FROM ai_config WHERE config_key='system_prompt';"))[0].config_value;
writeFileSync('./ai_config-system_prompt-FULL-backup.txt', prompt, 'utf8');
console.log(`system_prompt vivo: ${prompt.length} chars (backup salvo)`);

if (!prompt.includes(oldBlock)) {
  console.error('ABORT: bloco antigo do system_prompt NAO encontrado. Nada foi escrito.');
  process.exit(1);
}
const newPrompt = prompt.replace(oldBlock, newBlock);
console.log(`system_prompt novo: ${newPrompt.length} chars (delta ${newPrompt.length - prompt.length})`);

// --- monta SQL (dollar-quoting evita escapar aspas/quebras) ---
const sql = `
UPDATE knowledge_base SET content = $a799$${c799}$a799$ WHERE id = '799731f5-d527-493e-b178-d236536e20a2';
UPDATE knowledge_base SET content = $a43$${c43}$a43$ WHERE id = '43fff20f-0a26-47b2-b3b0-f403c87de1d0';
UPDATE knowledge_base SET content = $aca$${caca}$aca$ WHERE id = 'aca9f143-c1e7-4042-b692-d3d196caa9c0';
UPDATE knowledge_base SET content = $a4d$${c4d}$a4d$ WHERE id = '4d0c6ca0-4cc3-44d6-b6cd-34eb2fb8fb7f';
UPDATE knowledge_base SET is_active = false WHERE id = '3d60a09f-7af8-4dec-b378-57587a6a9384';
UPDATE knowledge_base SET is_active = false WHERE id = 'ab81f92c-d97c-4a57-a21a-fc6e80db395b';
UPDATE knowledge_base SET is_active = false WHERE id = 'a36412c0-df3f-49b2-b430-a08b88a03038';
UPDATE ai_config SET config_value = $sp$${newPrompt}$sp$ WHERE config_key = 'system_prompt';
`.trim();

if (!APPLY) {
  console.log('\n=== DRY-RUN (use --apply pra escrever) ===');
  console.log('Operacoes: 4 reescritas KB + 3 disables KB + 1 fix system_prompt');
  console.log('Tags dollar-quote OK:', !sql.includes('$a799$' + '$') );
  process.exit(0);
}

console.log('\n=== APLICANDO em prod ===');
await q(sql);
console.log('Write OK. Verificando...');

const v1 = await q("SELECT COUNT(*)::int AS n FROM knowledge_base WHERE is_active=true AND content ILIKE '%quiz.testedosarquetipos%';");
const v2 = await q("SELECT COUNT(*)::int AS n FROM knowledge_base WHERE is_active=true AND (content ILIKE '%é livre%' OR content ILIKE '%não exige login%' OR content ILIKE '%sem login%') AND (content ILIKE '%arqu%tipo%' OR title ILIKE '%arqu%tipo%');");
const v3 = await q("SELECT title, COUNT(*)::int AS n FROM knowledge_base WHERE is_active=true AND title IN ('Teste dos Arquétipos - Informações e FAQ','Meu acesso expirou, o que fazer','Por quanto tempo terei acesso ao produto') GROUP BY title ORDER BY title;");
const v4 = await q("SELECT (config_value ILIKE '%sem login necessário%')::int AS ainda_tem_sem_login, (config_value ILIKE '%produto PAGO%')::int AS tem_pago FROM ai_config WHERE config_key='system_prompt';");

console.log('C1 link morto ativo (esperado 0):', v1[0].n);
console.log('C2 "livre/sem login" sobre arquetipo ativo (esperado 0):', v2[0].n);
console.log('C3 titulos sem duplicata ativa (esperado n=1 cada):', JSON.stringify(v3));
console.log('C4 system_prompt:', JSON.stringify(v4[0]));
