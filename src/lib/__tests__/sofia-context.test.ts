import { describe, it, expect } from 'vitest'
import {
  KEYWORDS_ACESSO,
  computeConfidence,
  buildFluxonContext,
  buildDadosOperacionais,
  buildProdutoContextBlock,
  produtoConstaNasCompras,
  buildWpCandidates,
  annotateWpDivergence,
} from '@/lib/sofia/context'

describe('sofia/context', () => {
  // ─── KEYWORDS_ACESSO ───
  describe('KEYWORDS_ACESSO', () => {
    it('matches "não consigo acessar"', () => {
      expect(KEYWORDS_ACESSO.test('não consigo acessar minha conta')).toBe(true)
    })
    it('matches "esqueci a senha"', () => {
      expect(KEYWORDS_ACESSO.test('esqueci a senha')).toBe(true)
    })
    it('matches "não recebi o acesso"', () => {
      expect(KEYWORDS_ACESSO.test('não recebi o acesso ainda')).toBe(true)
    })
    it('matches "perdi a senha"', () => {
      expect(KEYWORDS_ACESSO.test('perdi a senha')).toBe(true)
    })
    it('does NOT match "quero cancelar"', () => {
      expect(KEYWORDS_ACESSO.test('quero cancelar minha inscrição')).toBe(false)
    })
    it('does NOT match "qual o horário"', () => {
      expect(KEYWORDS_ACESSO.test('qual o horário de atendimento')).toBe(false)
    })
  })

  // ─── computeConfidence ───
  describe('computeConfidence', () => {
    it('rounds 0.73 to 73', () => {
      expect(computeConfidence(0.73)).toBe(73)
    })
    it('rounds 0 to 0', () => {
      expect(computeConfidence(0)).toBe(0)
    })
    it('rounds 0.605 to 61 (half-up: 0.605*100=60.5)', () => {
      expect(computeConfidence(0.605)).toBe(61)
    })
    it('rounds 1 to 100', () => {
      expect(computeConfidence(1)).toBe(100)
    })
  })

  // ─── buildFluxonContext ───
  describe('buildFluxonContext', () => {
    it('returns fluxonContext with products when compras.length > 0', () => {
      const fl = {
        identificacao: 'match_cpf',
        cliente: { email: 'user@example.com' },
        diagnostico_resumido: 'Cliente ativo',
        compras: [
          {
            produto: 'Curso ABC',
            plataforma: 'hotmart',
            dias_desde_compra: 5,
            whatsapp_entrega: { delivery_status: 'enviado' },
            link_acesso: 'https://area.com/abc',
            login_instrucao: 'user@example.com',
          },
        ],
      }
      const result = buildFluxonContext(fl)
      expect(result.fluxonContext).not.toBeNull()
      expect(result.fluxonContext).toContain('Curso ABC')
      expect(result.fluxonContext).toContain('hotmart')
      expect(result.fluxonContext).toContain('Historico de compras (1)')
      expect(result.fluxonSemCompra).toBe(false)
      expect(result.fluxonCanonicalEmail).toBe('user@example.com')
      // fix C — observabilidade do pre-fetch
      expect(result.identificacao).toBe('match_cpf')
      expect(result.temLink).toBe(true)
      // fix produto-divergente (2026-07-08) — expõe as compras reais p/ reconciliar com o form
      expect(result.produtosComprados).toEqual(['Curso ABC'])
    })

    it('produtosComprados lista todas as compras e ignora produto vazio', () => {
      const fl = {
        cliente: { email: 'u@e.com' },
        compras: [
          { produto: 'Formatos de Conteúdos', plataforma: 'pagtrust', dias_desde_compra: 1 },
          { produto: '  ', plataforma: 'pagtrust', dias_desde_compra: 1 },
          { produto: '50 Scripts', plataforma: 'hotmart', dias_desde_compra: 2 },
        ],
      }
      const result = buildFluxonContext(fl)
      expect(result.produtosComprados).toEqual(['Formatos de Conteúdos', '50 Scripts'])
    })

    it('produtosComprados=[] quando não há compra', () => {
      expect(buildFluxonContext({ compras: [] }).produtosComprados).toEqual([])
    })

    it('temLink=false when compra has no link_acesso (fix C)', () => {
      const fl = {
        identificacao: 'match_cpf',
        cliente: { email: 'user@example.com' },
        compras: [{ produto: 'Curso ABC', plataforma: 'hotmart', dias_desde_compra: 1 }],
      }
      const result = buildFluxonContext(fl)
      expect(result.fluxonSemCompra).toBe(false)
      expect(result.temLink).toBe(false)
      expect(result.identificacao).toBe('match_cpf')
    })

    it('identificacao=null and temLink=false when no compras (fix C)', () => {
      const result = buildFluxonContext({ cliente: { email: 'u@e.com' }, identificacao: 'nao_encontrado', compras: [] })
      expect(result.temLink).toBe(false)
      expect(result.identificacao).toBe('nao_encontrado')
    })

    it('returns fluxonSemCompra=true when no compras', () => {
      const fl = {
        cliente: { email: 'user@example.com' },
        compras: [],
      }
      const result = buildFluxonContext(fl)
      expect(result.fluxonContext).toBeNull()
      expect(result.fluxonSemCompra).toBe(true)
      expect(result.fluxonCanonicalEmail).toBe('user@example.com')
    })

    it('returns fluxonSemCompra=true when compras is undefined', () => {
      const fl = { cliente: { email: 'user@example.com' } }
      const result = buildFluxonContext(fl)
      expect(result.fluxonContext).toBeNull()
      expect(result.fluxonSemCompra).toBe(true)
      expect(result.fluxonCanonicalEmail).toBe('user@example.com')
    })

    it('handles empty object without throw', () => {
      const fl = {}
      const result = buildFluxonContext(fl)
      expect(result.fluxonContext).toBeNull()
      expect(result.fluxonSemCompra).toBe(true)
      expect(result.fluxonCanonicalEmail).toBeNull()
    })

    it('extracts cliente.email as canonicalEmail', () => {
      const fl = {
        cliente: { email: 'canonical@example.com' },
        compras: [],
      }
      const result = buildFluxonContext(fl)
      expect(result.fluxonCanonicalEmail).toBe('canonical@example.com')
    })
  })

  // ─── buildDadosOperacionais ───
  describe('buildDadosOperacionais', () => {
    it('returns PRIORIZE message when fluxonContext is present', () => {
      const msg = buildDadosOperacionais('Some context', false)
      expect(msg).toContain('DADOS OPERACIONAIS')
      expect(msg).toContain('PRIORIZE')
      expect(msg).toContain('Some context')
    })

    it('with-compra branch instructs to deliver link BEFORE escalating (fix A)', () => {
      const msg = buildDadosOperacionais('Historico de compras (1):\n- Curso ABC', false)
      // conduta nova: entregar o link que ela TEM antes de mandar pra humano
      expect(msg).toContain('ENTREGUE o link')
      expect(msg).toContain('ANTES de encaminhar')
      expect(msg).toContain('consegue acessar AGORA')
      // guarda anti-regressao: nao pode escalar so por "bloqueado" sem entregar o link
      expect(msg).toContain('NUNCA encaminhe so porque o cliente disse')
      // ainda escala nos casos certos (produto nao consta / reembolso / nao resolveu depois)
      expect(msg).toContain('NAO esta na lista de compras')
    })

    it('returns troubleshooting-first conduct when fluxonSemCompra=true', () => {
      const msg = buildDadosOperacionais(null, true)
      expect(msg).toContain('DADOS OPERACIONAIS')
      expect(msg).toContain('nenhuma compra localizada')
      expect(msg).toContain('Hotmart e PagTrust')
      expect(msg).toContain('NUNCA afirme que o cliente nao comprou')
      // conduta nova: troubleshooting antes de qualquer encaminhamento
      expect(msg).toContain('NAO escale')
      expect(msg).toContain('troubleshooting de acesso')
      expect(msg).toContain('Esqueci minha senha')
      expect(msg).toContain('So encaminhe para um atendente humano')
    })

    it('returns empty string when neither context nor semCompra', () => {
      const msg = buildDadosOperacionais(null, false)
      expect(msg).toBe('')
    })

    it('preserves exact troubleshooting-first text (byte-for-byte)', () => {
      const msg = buildDadosOperacionais(null, true)
      // Trava a copy NOVA (anti-escalonamento) — fragmentos-chave verbatim
      expect(msg).toContain('ausencia AQUI nao prova que o cliente nao comprou')
      expect(msg).toContain('NAO diga ao cliente que "nao encontrou a compra"')
      expect(msg).toContain('e-mail correto -> Esqueci minha senha -> qual erro aparece')
      expect(msg).toContain('DEPOIS do troubleshooting')
    })

    it('does NOT contain the old eager-escalation copy (regression guard)', () => {
      const msg = buildDadosOperacionais(null, true)
      // Estas frases causavam o "abre ticket pra tudo" — nao podem voltar
      expect(msg).not.toContain('acolha e ESCALE')
      expect(msg).not.toContain('vai abrir um ticket')
      expect(msg).not.toContain('comprovante/ID da transacao')
    })
  })

  // ─── buildWpCandidates ───
  describe('buildWpCandidates', () => {
    it('returns [typed, canonical] when both different (case-insensitive)', () => {
      const result = buildWpCandidates('typed@example.com', 'canonical@example.com')
      expect(result).toEqual(['typed@example.com', 'canonical@example.com'])
    })

    it('deduplicates case-insensitively, preserving first occurrence', () => {
      const result = buildWpCandidates('user@example.com', 'USER@EXAMPLE.COM')
      expect(result).toEqual(['user@example.com'])
    })

    it('returns [typed] when canonical is null', () => {
      const result = buildWpCandidates('typed@example.com', null)
      expect(result).toEqual(['typed@example.com'])
    })

    it('returns [] when both null', () => {
      const result = buildWpCandidates(null, null)
      expect(result).toEqual([])
    })

    it('filters empty strings', () => {
      const result = buildWpCandidates('', null)
      expect(result).toEqual([])
    })
  })

  // ─── annotateWpDivergence ───
  describe('annotateWpDivergence', () => {
    it('prefixes divergence note when matched !== typed (case-insensitive)', () => {
      const context = 'Access info here'
      const result = annotateWpDivergence(context, 'matched@example.com', 'typed@example.com')
      expect(result).toContain('Conta localizada sob o e-mail matched@example.com')
      expect(result).toContain('diferente do informado pelo cliente')
      expect(result).toContain('Access info here')
    })

    it('returns context unchanged when matched === typed (case-insensitive)', () => {
      const context = 'Access info here'
      const result = annotateWpDivergence(context, 'user@example.com', 'USER@EXAMPLE.COM')
      expect(result).toBe(context)
    })

    it('returns context unchanged when typed is null', () => {
      const context = 'Access info here'
      const result = annotateWpDivergence(context, 'matched@example.com', null)
      expect(result).toBe(context)
    })

    it('returns context unchanged when typed is undefined', () => {
      const context = 'Access info here'
      const result = annotateWpDivergence(context, 'matched@example.com', undefined as any)
      expect(result).toBe(context)
    })
  })

  // ─── produtoConstaNasCompras ───
  describe('produtoConstaNasCompras', () => {
    it('match exato normalizado (acento/caixa irrelevantes)', () => {
      expect(produtoConstaNasCompras('Formatos de Conteúdos', ['formatos de conteudos'])).toBe(true)
    })
    it('match por inclusão de substring (nomes divergem entre catálogos)', () => {
      expect(produtoConstaNasCompras('Formatos de Conteúdos', ['Formatos de Conteúdos — Cleiton Querobin'])).toBe(true)
      expect(produtoConstaNasCompras('Implementação da Ferramenta de IA', ['Implementação da Ferramenta'])).toBe(true)
    })
    it('limitação conhecida: sigla vs extenso NÃO casa (falso-divergente, mas conduta segura)', () => {
      // "IA" não é substring de "Inteligência Artificial" → vira divergente.
      // Aceito por design: na divergência de 1 compra a Sofia entrega a compra REAL
      // mencionando, então o cliente ainda recebe o acesso certo (só nomeado pelo rótulo do Fluxon).
      expect(produtoConstaNasCompras('Implementação IA', ['Implementação da Ferramenta de Inteligência Artificial'])).toBe(false)
    })
    it('NÃO casa produtos genuinamente diferentes (caso Josy)', () => {
      expect(produtoConstaNasCompras('50 Scripts Prontos para o WhatsApp', ['Formatos de Conteúdos'])).toBe(false)
    })
    it('acha o produto quando há várias compras', () => {
      expect(produtoConstaNasCompras('50 Scripts', ['Formatos de Conteúdos', '50 Scripts Prontos'])).toBe(true)
    })
    it('false para nome vazio ou lista vazia', () => {
      expect(produtoConstaNasCompras('', ['Curso ABC'])).toBe(false)
      expect(produtoConstaNasCompras('Curso ABC', [])).toBe(false)
    })
  })

  // ─── buildProdutoContextBlock ───
  describe('buildProdutoContextBlock', () => {
    it('sem compra no Fluxon + produto do form → confia no dropdown (legado)', () => {
      const b = buildProdutoContextBlock('Curso ABC', [])
      expect(b).toContain('informou o produto no formulario: "Curso ABC"')
      expect(b).toContain('NAO pergunte')
      expect(b).not.toContain('DIVERGENCIA')
    })

    it('sem compra e sem produto → pergunta qual produto', () => {
      const b = buildProdutoContextBlock(null, [])
      expect(b).toContain('NAO informou o produto')
      expect(b).toContain('pergunte qual produto')
    })

    it('form bate com a compra real → usa e não pergunta', () => {
      const b = buildProdutoContextBlock('Formatos de Conteúdos', ['Formatos de Conteúdos'])
      expect(b).toContain('ISSO CONSTA nas compras reais')
      expect(b).toContain('NAO pergunte')
      expect(b).not.toContain('DIVERGENCIA')
    })

    it('REGRESSÃO Josy: form "50 Scripts" mas compra real "Formatos de Conteúdos" → entrega a REAL, sem perguntar', () => {
      const b = buildProdutoContextBlock('50 Scripts Prontos para o WhatsApp', ['Formatos de Conteúdos'])
      // lidera com a AÇÃO: entrega o acesso da compra real
      expect(b).toContain('ENTREGUE o link')
      expect(b).toContain('"Formatos de Conteúdos"')
      // a compra real prevalece sobre o dropdown
      expect(b).toContain('PREVALECE')
      // CRÍTICO (furo do smoke E2E): proíbe perguntar qual produto — ela já sabe
      expect(b).toContain('NAO pergunte "qual produto voce comprou"')
      // menciona ao cliente (decisão do dono)
      expect(b).toContain('localizou a compra dele como')
      // e proíbe mandar o produto errado do dropdown
      expect(b).toContain('NAO mande o link nem as instrucoes de "50 Scripts Prontos para o WhatsApp"')
      // guarda anti-conflito com [DADOS OPERACIONAIS]: não escalar por causa da divergência
      expect(b).toContain('NAO escale por causa desta divergencia')
    })

    it('form vazio mas há 1 compra → usa a compra real sem perguntar', () => {
      const b = buildProdutoContextBlock(null, ['Formatos de Conteúdos'])
      expect(b).toContain('compra(s) REAL(is)')
      expect(b).toContain('"Formatos de Conteúdos"')
      expect(b).toContain('NAO pergunte')
    })

    it('form vazio com N compras → confirma qual', () => {
      const b = buildProdutoContextBlock(null, ['Curso A', 'Curso B'])
      expect(b).toContain('confirme qual')
    })

    it('divergência com N compras (nenhuma bate) → lista e confirma', () => {
      const b = buildProdutoContextBlock('Produto X', ['Curso A', 'Curso B'])
      expect(b).toContain('DIVERGENCIA')
      expect(b).toContain('NAO consta')
      expect(b).toContain('confirme com o cliente qual')
      expect(b).toContain('"Curso A", "Curso B"')
    })
  })
})
