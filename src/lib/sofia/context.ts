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
} {
  const fluxonCanonicalEmail = fl?.cliente?.email ?? null
  const identificacao = fl?.identificacao ?? null

  if (Array.isArray(fl.compras) && fl.compras.length > 0) {
    const temLink = fl.compras.some((c: any) => !!c.link_acesso)
    const parts: string[] = [fl.diagnostico_resumido || '']
    parts.push(`\nHistorico de compras (${fl.compras.length}):`)
    for (const c of fl.compras) {
      parts.push(
        `- ${c.produto} (${c.plataforma}, ha ${c.dias_desde_compra} dia(s)) | WhatsApp: ${c.whatsapp_entrega?.delivery_status || 'sem status'} | Link: ${c.link_acesso || '(sem link)'} | Login: ${c.login_instrucao || '(sem instrucao)'}`
      )
    }
    const fluxonContext = parts.filter(Boolean).join('\n')
    return { fluxonContext, fluxonSemCompra: false, fluxonCanonicalEmail, identificacao, temLink }
  }

  return { fluxonContext: null, fluxonSemCompra: true, fluxonCanonicalEmail, identificacao, temLink: false }
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
