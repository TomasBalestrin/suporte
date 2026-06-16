import { describe, it, expect } from 'vitest'
import { normalizeTicketMessages, buildEscalationTicketFields } from '@/lib/tickets/normalize'

describe('normalizeTicketMessages', () => {
  it('retorna [] para undefined ou vazio', () => {
    expect(normalizeTicketMessages(undefined)).toEqual([])
    expect(normalizeTicketMessages([])).toEqual([])
  })

  it('filtra role=tool (JSON cru de tool_result nao vai pro historico do atendente)', () => {
    const out = normalizeTicketMessages([
      { role: 'user', content: 'oi' },
      { role: 'tool', content: '{"encontrado_em":"julia"}' },
      { role: 'assistant', content: 'ola' },
    ])
    expect(out).toHaveLength(2)
    expect(out.some((m) => m.content.includes('encontrado_em'))).toBe(false)
  })

  it('mapeia user->customer e qualquer outro role->ai', () => {
    const out = normalizeTicketMessages([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'ai', content: 'c' },
    ])
    expect(out.map((m) => m.sender_type)).toEqual(['customer', 'ai', 'ai'])
    expect(out.every((m) => m.is_internal_note === false)).toBe(true)
  })

  it('preserva a ordem das mensagens', () => {
    const out = normalizeTicketMessages([
      { role: 'user', content: '1' },
      { role: 'assistant', content: '2' },
      { role: 'user', content: '3' },
    ])
    expect(out.map((m) => m.content)).toEqual(['1', '2', '3'])
  })
})

describe('buildEscalationTicketFields', () => {
  it('compoe description com resumo + relato', () => {
    const { title, description } = buildEscalationTicketFields({
      motivo: 'reembolso',
      resumo: 'Cliente quer estorno da compra de ontem.',
      relato: 'Quero meu dinheiro de volta',
    })
    expect(title).toBe('Escalonamento: reembolso')
    expect(description).toContain('Cliente quer estorno')
    expect(description).toContain('Relato do cliente: Quero meu dinheiro de volta')
  })

  it('GARANTE description >= 20 chars mesmo com relato curtissimo e sem resumo', () => {
    const { description } = buildEscalationTicketFields({ motivo: 'x', resumo: '', relato: 'oi' })
    expect(description.length).toBeGreaterThanOrEqual(20)
  })

  it('usa fallback quando tudo vazio (sem matar o ticket)', () => {
    const { title, description } = buildEscalationTicketFields({ motivo: null, resumo: null, relato: null })
    expect(title).toBe('Escalonamento: atendimento humano')
    expect(description.length).toBeGreaterThanOrEqual(20)
    expect(description).toContain('atendimento humano')
  })

  it('trunca o title em 100 chars', () => {
    const { title } = buildEscalationTicketFields({ motivo: 'a'.repeat(200), resumo: 'r', relato: 'x' })
    expect(title.length).toBeLessThanOrEqual(100)
  })

  it('faz trim e ignora resumo so-espacos', () => {
    const { description } = buildEscalationTicketFields({ motivo: 'acesso', resumo: '   ', relato: 'nao consigo entrar na area de membros' })
    expect(description.startsWith('Relato do cliente:')).toBe(true)
  })
})
