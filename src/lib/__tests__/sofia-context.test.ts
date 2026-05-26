import { describe, it, expect } from 'vitest'
import {
  KEYWORDS_ACESSO,
  computeConfidence,
  buildFluxonContext,
  buildDadosOperacionais,
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

    it('returns escalonamento note when fluxonSemCompra=true', () => {
      const msg = buildDadosOperacionais(null, true)
      expect(msg).toContain('DADOS OPERACIONAIS')
      expect(msg).toContain('nenhuma compra localizada')
      expect(msg).toContain('integra Hotmart e PagTrust')
      expect(msg).toContain('NUNCA afirme que o cliente nao comprou')
      expect(msg).toContain('comprovante')
      expect(msg).toContain('ticket')
      expect(msg).toContain('ESCALE')
    })

    it('returns empty string when neither context nor semCompra', () => {
      const msg = buildDadosOperacionais(null, false)
      expect(msg).toBe('')
    })

    it('preserves exact escalonamento text (byte-for-byte)', () => {
      const msg = buildDadosOperacionais(null, true)
      // Check for the exact escalation note as it appears in route.ts
      expect(msg).toContain('confirme UMA vez')
      expect(msg).toContain('e-mail/CPF informado e o EXATO')
      expect(msg).toContain('NAO repita "nao encontrei sua compra"')
      expect(msg).toContain('peca que ele tenha em maos o comprovante/ID da transacao')
      expect(msg).toContain('plataforma onde comprou')
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
})
