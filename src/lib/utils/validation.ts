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
