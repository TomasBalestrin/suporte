/**
 * Sofia context building — pure functions extracting deterministic logic
 * from route.ts. No I/O, no side effects.
 */

export const KEYWORDS_ACESSO = /\b(n[aã]o cons[ie]g[uo]|esquec(i|eu)|perdi (a|o)? ?(senha|login|acesso)|email inv[aá]lido|senha inv[aá]lida|n[aã]o (recebi|consigo entrar|funciona|acesso)|n[aã]o consigo logar|esqueci a senha)\b/i

/**
 * Compute confidence score from similarity.
 */
export function computeConfidence(bestSimilarity: number): number {
  return Math.round(bestSimilarity * 100)
}

/**
 * Build Fluxon context from raw API response.
 * Returns { fluxonContext, fluxonSemCompra, fluxonCanonicalEmail }
 */
export function buildFluxonContext(fl: any): {
  fluxonContext: string | null
  fluxonSemCompra: boolean
  fluxonCanonicalEmail: string | null
  identificacao: string | null
  temLink: boolean
  produtosComprados: string[]
} {
  const fluxonCanonicalEmail = fl?.cliente?.email ?? null
  const identificacao = fl?.identificacao ?? null

  if (Array.isArray(fl.compras) && fl.compras.length > 0) {
    const temLink = fl.compras.some((c: any) => !!c.link_acesso)
    const produtosComprados = fl.compras
      .map((c: any) => (typeof c.produto === 'string' ? c.produto.trim() : ''))
      .filter((p: string) => !!p)
    const parts: string[] = [fl.diagnostico_resumido || '']
    parts.push(`\nHistorico de compras (${fl.compras.length}):`)
    for (const c of fl.compras) {
      parts.push(
        `- ${c.produto} (${c.plataforma}, ha ${c.dias_desde_compra} dia(s)) | WhatsApp: ${c.whatsapp_entrega?.delivery_status || 'sem status'} | Link: ${c.link_acesso || '(sem link)'} | Login: ${c.login_instrucao || '(sem instrucao)'}`
      )
    }
    const fluxonContext = parts.filter(Boolean).join('\n')
    return { fluxonContext, fluxonSemCompra: false, fluxonCanonicalEmail, identificacao, temLink, produtosComprados }
  }

  return { fluxonContext: null, fluxonSemCompra: true, fluxonCanonicalEmail, identificacao, temLink: false, produtosComprados: [] }
}

/**
 * Build "DADOS OPERACIONAIS" message block from context and semCompra flag.
 * Reproduces exact text from route.ts (byte-for-byte including escalonamento note).
 */
export function buildDadosOperacionais(fluxonContext: string | null, fluxonSemCompra: boolean): string {
  if (fluxonContext) {
    return `\n[DADOS OPERACIONAIS — Fluxon: compras/entregas REAIS deste cliente. PRIORIZE sobre a base de conhecimento para acesso/login/link/entrega/reembolso. CONDUTA: se o cliente relata problema de acesso (bloqueado, nao aparece, nao consigo acessar, nao recebi, nao funcionou) e ha link/login abaixo, ENTREGUE o link e o login direto e pergunte se ele consegue acessar AGORA — faca isso ANTES de encaminhar para um humano. Se a compra foi ha pouco (hoje/ontem), avise que a liberacao pode levar alguns minutos. So encaminhe para um atendente humano se: (a) o cliente disser que ainda nao conseguiu DEPOIS de receber o link, (b) o produto que ele menciona NAO esta na lista de compras abaixo, ou (c) for reembolso/pagamento/algo fora do seu alcance. NUNCA encaminhe so porque o cliente disse "bloqueado/nao funciona" sem antes entregar o link que voce tem aqui.]\n${fluxonContext}\n`
  }
  if (fluxonSemCompra) {
    return `\n[DADOS OPERACIONAIS — Fluxon: nenhuma compra localizada para os dados informados (a busca cobre Hotmart e PagTrust; ausencia AQUI nao prova que o cliente nao comprou — pode ser e-mail/CPF divergente ou outra plataforma). CONDUTA: NAO diga ao cliente que "nao encontrou a compra" e NAO escale por causa disso. Atenda normalmente pelo produto/area de membros: se souber o produto, mande o link e a senha-padrao e faca o troubleshooting de acesso (e-mail correto -> Esqueci minha senha -> qual erro aparece). Se precisar, confirme UMA vez se o e-mail/CPF e o EXATO usado na compra. So encaminhe para um atendente humano se, DEPOIS do troubleshooting, o cliente ainda nao conseguir acessar OU se for algo que voce nao resolve (reembolso, e-mail de compra divergente, pagamento). NUNCA afirme que o cliente nao comprou.]\n`
  }
  return ''
}

/**
 * Build WordPress access candidates list (dedup case-insensitive, preserve order).
 */
export function buildWpCandidates(typedEmail: string | null, canonicalEmail: string | null): string[] {
  const rawCandidates = [typedEmail, canonicalEmail].filter((e): e is string => !!e)
  const seen = new Set<string>()
  return rawCandidates.filter(e => {
    const k = e.toLowerCase()
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

/**
 * Annotate WordPress context with divergence notice if matched email differs from typed.
 */
export function annotateWpDivergence(wpContext: string, matchedEmail: string, typedEmail: string | null): string {
  if (typedEmail && matchedEmail.toLowerCase() !== typedEmail.toLowerCase()) {
    return `\n(Conta localizada sob o e-mail ${matchedEmail}, diferente do informado pelo cliente — informe isso a ele.)${wpContext}`
  }
  return wpContext
}

/**
 * Normaliza nome de produto para comparação tolerante entre catálogos
 * (Suporte `products.name` vs Fluxon `compras[].produto`): lowercase, sem
 * acentos, só alfanumérico separado por espaço.
 */
function normalizeProdName(s: string): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/**
 * O produto informado no formulário consta nas compras reais do Fluxon?
 * Match tolerante (igualdade normalizada OU inclusão de substring em qualquer
 * direção) — nomes divergem levemente entre catálogos. Falso-divergente é
 * seguro por design: a conduta de divergência (1 compra) entrega a compra REAL
 * mencionando, então no pior caso a Sofia nomeia a compra pelo rótulo do Fluxon.
 */
export function produtoConstaNasCompras(productName: string, produtosComprados: string[]): boolean {
  const a = normalizeProdName(productName)
  if (!a) return false
  return produtosComprados.some((p) => {
    const b = normalizeProdName(p)
    return !!b && (a === b || a.includes(b) || b.includes(a))
  })
}

/**
 * Constrói o bloco `[PRODUTO DO CLIENTE]` do system prompt reconciliando o
 * produto do FORMULÁRIO (dropdown, um palpite do cliente) com a COMPRA REAL do
 * Fluxon (a verdade). Raiz corrigida (2026-07-08, incidente Josy/558288037365):
 * o dropdown vinha com autoridade imperativa maior que a compra real → a Sofia
 * mandava o produto errado quando divergiam. Regra-mãe: **a compra real do
 * Fluxon prevalece sobre o dropdown**. Sem compra no Fluxon, mantém o legado
 * (confia no dropdown, única pista). Decisão do dono na divergência de 1 compra:
 * entregar a compra real MENCIONANDO ("localizei sua compra como Y").
 */
export function buildProdutoContextBlock(productName: string | null, produtosComprados: string[]): string {
  const header = '[PRODUTO DO CLIENTE — prevalece sobre a Regra 9]'
  const temCompras = Array.isArray(produtosComprados) && produtosComprados.length > 0

  // Sem compra real no Fluxon → comportamento legado: confia no dropdown do form.
  if (!temCompras) {
    return `${header}\n${productName
      ? `O cliente informou o produto no formulario: "${productName}". Use este produto para dar o link e as instrucoes corretas. NAO pergunte "qual produto voce comprou" — voce ja sabe qual e.`
      : `O cliente NAO informou o produto. Em duvidas de acesso, pergunte qual produto ele comprou antes de dar instrucoes.`}`
  }

  const lista = produtosComprados.map((p) => `"${p}"`).join(', ')

  // Form vazio, mas há compra real → usa a compra real como fonte de verdade.
  if (!productName) {
    return `${header}\nA(s) compra(s) REAL(is) deste cliente no Fluxon: ${lista}. Use ESTA(S) compra(s) como fonte de verdade do produto — de o link e as instrucoes da compra real. ${produtosComprados.length > 1
      ? 'Como ha mais de uma compra, confirme qual delas ele precisa acessar antes de mandar credenciais.'
      : 'NAO pergunte "qual produto voce comprou" — voce ja sabe qual e.'}`
  }

  // Form bate com uma compra real → confirma e usa (caminho feliz).
  if (produtoConstaNasCompras(productName, produtosComprados)) {
    return `${header}\nO cliente informou "${productName}" no formulario e ISSO CONSTA nas compras reais dele. Use este produto para dar o link e as instrucoes corretas. NAO pergunte "qual produto voce comprou" — voce ja sabe qual e.`
  }

  // Form DIVERGE das compras reais.
  if (produtosComprados.length === 1) {
    // 1 compra → entrega a REAL, mencionando a divergência (decisão do dono 2026-07-08).
    return `${header}\nATENCAO — DIVERGENCIA: o cliente selecionou "${productName}" no formulario, mas a compra REAL registrada e ${lista}. A COMPRA REAL PREVALECE. Atenda pelo produto ${lista}: de o link e as instrucoes da compra real e mencione ao cliente, de forma natural, que voce localizou a compra dele como ${lista}. NAO mande o link nem as instrucoes de "${productName}" — ele NAO comprou esse produto. NAO escale por causa desta divergencia: o cliente TEM compra real, resolva entregando o acesso dela.`
  }
  // N compras, nenhuma bate → lista e confirma.
  return `${header}\nATENCAO — DIVERGENCIA: o cliente selecionou "${productName}" no formulario, mas isso NAO consta nas compras reais dele. As compras REAIS sao: ${lista}. NAO mande instrucoes de "${productName}". Liste as compras reais e confirme com o cliente qual delas ele precisa acessar antes de mandar credenciais.`
}
