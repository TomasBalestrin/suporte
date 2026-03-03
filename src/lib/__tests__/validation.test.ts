import { describe, it, expect } from 'vitest'
import {
  ticketFormSchema,
  loginSchema,
  productSchema,
  categorySchema,
  messageSchema,
  satisfactionSchema,
  quickReplySchema,
  tagSchema,
  slaConfigSchema,
} from '@/lib/utils/validation'

describe('ticketFormSchema', () => {
  it('accepts valid ticket data', () => {
    const result = ticketFormSchema.safeParse({
      name: 'Joao Silva',
      email: 'joao@email.com',
      cpf: '123.456.789-00',
      phone: '(11) 99999-9999',
      product_id: 'prod-123',
      category_id: 'cat-456',
      description: 'Preciso de ajuda com meu produto que nao funciona corretamente',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short name', () => {
    const result = ticketFormSchema.safeParse({
      name: 'Jo',
      email: 'joao@email.com',
      cpf: '123.456.789-00',
      phone: '(11) 99999-9999',
      product_id: 'prod-123',
      category_id: 'cat-456',
      description: 'Preciso de ajuda com meu produto',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid email', () => {
    const result = ticketFormSchema.safeParse({
      name: 'Joao Silva',
      email: 'invalid-email',
      cpf: '123.456.789-00',
      phone: '(11) 99999-9999',
      product_id: 'prod-123',
      category_id: 'cat-456',
      description: 'Preciso de ajuda com meu produto',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid cpf format', () => {
    const result = ticketFormSchema.safeParse({
      name: 'Joao Silva',
      email: 'joao@email.com',
      cpf: '12345678900',
      phone: '(11) 99999-9999',
      product_id: 'prod-123',
      category_id: 'cat-456',
      description: 'Preciso de ajuda com meu produto',
    })
    expect(result.success).toBe(false)
  })

  it('rejects invalid phone format', () => {
    const result = ticketFormSchema.safeParse({
      name: 'Joao Silva',
      email: 'joao@email.com',
      cpf: '123.456.789-00',
      phone: '11999999999',
      product_id: 'prod-123',
      category_id: 'cat-456',
      description: 'Preciso de ajuda com meu produto',
    })
    expect(result.success).toBe(false)
  })

  it('rejects short description', () => {
    const result = ticketFormSchema.safeParse({
      name: 'Joao Silva',
      email: 'joao@email.com',
      cpf: '123.456.789-00',
      phone: '(11) 99999-9999',
      product_id: 'prod-123',
      category_id: 'cat-456',
      description: 'Curto demais',
    })
    expect(result.success).toBe(false)
  })
})

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({
      email: 'admin@test.com',
      password: 'senhasegura',
    })
    expect(result.success).toBe(true)
  })

  it('rejects short password', () => {
    const result = loginSchema.safeParse({
      email: 'admin@test.com',
      password: '123',
    })
    expect(result.success).toBe(false)
  })
})

describe('productSchema', () => {
  it('accepts valid product', () => {
    const result = productSchema.safeParse({ name: 'Produto X', description: 'desc' })
    expect(result.success).toBe(true)
  })

  it('rejects short name', () => {
    const result = productSchema.safeParse({ name: 'P' })
    expect(result.success).toBe(false)
  })
})

describe('categorySchema', () => {
  it('accepts valid category', () => {
    const result = categorySchema.safeParse({ name: 'Suporte Tecnico' })
    expect(result.success).toBe(true)
  })
})

describe('messageSchema', () => {
  it('accepts valid message', () => {
    const result = messageSchema.safeParse({ content: 'Ola, preciso de ajuda' })
    expect(result.success).toBe(true)
  })

  it('rejects empty message', () => {
    const result = messageSchema.safeParse({ content: '' })
    expect(result.success).toBe(false)
  })
})

describe('satisfactionSchema', () => {
  it('accepts valid rating', () => {
    const result = satisfactionSchema.safeParse({ rating: 5, comment: 'Otimo!' })
    expect(result.success).toBe(true)
  })

  it('rejects out-of-range rating', () => {
    const result = satisfactionSchema.safeParse({ rating: 6 })
    expect(result.success).toBe(false)
  })

  it('rejects zero rating', () => {
    const result = satisfactionSchema.safeParse({ rating: 0 })
    expect(result.success).toBe(false)
  })
})

describe('quickReplySchema', () => {
  it('accepts valid quick reply', () => {
    const result = quickReplySchema.safeParse({
      shortcut: 'ola-boas-vindas',
      title: 'Boas Vindas',
      content: 'Ola! Bem-vindo ao suporte.',
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid shortcut characters', () => {
    const result = quickReplySchema.safeParse({
      shortcut: 'Ola Mundo!',
      title: 'Test',
      content: 'Test content here',
    })
    expect(result.success).toBe(false)
  })
})

describe('tagSchema', () => {
  it('accepts valid tag', () => {
    const result = tagSchema.safeParse({ name: 'Urgente', color: '#FF0000' })
    expect(result.success).toBe(true)
  })
})

describe('slaConfigSchema', () => {
  it('accepts valid SLA config', () => {
    const result = slaConfigSchema.safeParse({
      priority: 'high',
      first_response_minutes: 30,
      resolution_minutes: 240,
    })
    expect(result.success).toBe(true)
  })

  it('rejects invalid priority', () => {
    const result = slaConfigSchema.safeParse({
      priority: 'super_urgent',
      first_response_minutes: 30,
      resolution_minutes: 240,
    })
    expect(result.success).toBe(false)
  })
})
