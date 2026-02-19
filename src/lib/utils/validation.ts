import { z } from 'zod'

export const ticketFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('Email invalido'),
  phone: z.string().min(14, 'Telefone invalido').max(15),
  product_id: z.string().uuid('Selecione um produto'),
  category_id: z.string().uuid('Selecione uma categoria'),
  description: z
    .string()
    .min(20, 'Descreva seu problema com pelo menos 20 caracteres')
    .max(2000, 'Descricao muito longa (maximo 2000 caracteres)'),
})

export type TicketFormData = z.infer<typeof ticketFormSchema>

export const loginSchema = z.object({
  email: z.string().email('Email invalido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})

export type LoginFormData = z.infer<typeof loginSchema>

export const productSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
})

export type ProductFormData = z.infer<typeof productSchema>

export const categorySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  is_active: z.boolean().optional(),
})

export type CategoryFormData = z.infer<typeof categorySchema>

export const messageSchema = z.object({
  content: z.string().min(1, 'Mensagem nao pode ser vazia'),
  is_internal_note: z.boolean().optional(),
})

export type MessageFormData = z.infer<typeof messageSchema>

export const satisfactionSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
})

export type SatisfactionFormData = z.infer<typeof satisfactionSchema>

export const quickReplySchema = z.object({
  shortcut: z.string().min(1, 'Atalho obrigatorio').max(20, 'Maximo 20 caracteres').regex(/^[a-z0-9_-]+$/, 'Apenas letras minusculas, numeros, _ e -'),
  title: z.string().min(2, 'Titulo deve ter pelo menos 2 caracteres'),
  content: z.string().min(5, 'Conteudo deve ter pelo menos 5 caracteres'),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
})

export type QuickReplyFormData = z.infer<typeof quickReplySchema>

export const tagSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(30, 'Maximo 30 caracteres'),
  color: z.string().min(4, 'Cor invalida').max(7),
})

export type TagFormData = z.infer<typeof tagSchema>

export const slaConfigSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  first_response_minutes: z.number().min(1, 'Minimo 1 minuto'),
  resolution_minutes: z.number().min(1, 'Minimo 1 minuto'),
  is_active: z.boolean().optional(),
})

export type SlaConfigFormData = z.infer<typeof slaConfigSchema>
