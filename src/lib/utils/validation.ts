import { z } from 'zod'

export const ticketFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
  email: z.string().email('E-mail inválido'),
  cpf: z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido. Use o formato XXX.XXX.XXX-XX'),
  phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido. Use o formato (XX) XXXXX-XXXX'),
  product_id: z.string().min(1, 'Selecione um produto'),
  category_id: z.string().min(1, 'Selecione uma categoria'),
  description: z
    .string()
    .min(20, 'Descreva seu problema com pelo menos 20 caracteres')
    .max(2000, 'Descrição muito longa (máximo 2000 caracteres)'),
})

export type TicketFormData = z.infer<typeof ticketFormSchema>

export const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
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
  content: z.string().min(1, 'Mensagem não pode ser vazia').max(10000, 'Mensagem muito longa (máximo 10.000 caracteres)'),
  is_internal_note: z.boolean().optional(),
})

export type MessageFormData = z.infer<typeof messageSchema>

export const satisfactionSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
})

export type SatisfactionFormData = z.infer<typeof satisfactionSchema>

export const quickReplySchema = z.object({
  shortcut: z.string().min(1, 'Atalho obrigatório').max(20, 'Máximo 20 caracteres').regex(/^[a-z0-9_-]+$/, 'Apenas letras minúsculas, números, _ e -'),
  title: z.string().min(2, 'Título deve ter pelo menos 2 caracteres'),
  content: z.string().min(5, 'Conteúdo deve ter pelo menos 5 caracteres'),
  category: z.string().optional(),
  is_active: z.boolean().optional(),
})

export type QuickReplyFormData = z.infer<typeof quickReplySchema>

export const tagSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(30, 'Máximo 30 caracteres'),
  color: z.string().min(4, 'Cor inválida').max(7),
})

export type TagFormData = z.infer<typeof tagSchema>

export const slaConfigSchema = z.object({
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  first_response_minutes: z.number().min(1, 'Mínimo 1 minuto'),
  resolution_minutes: z.number().min(1, 'Mínimo 1 minuto'),
  is_active: z.boolean().optional(),
})

export type SlaConfigFormData = z.infer<typeof slaConfigSchema>

export const automationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  trigger_type: z.enum(['ticket_created', 'ticket_updated', 'status_changed', 'sla_approaching', 'sla_breached', 'no_response']),
  conditions: z.record(z.string(), z.unknown()).optional(),
  actions: z.record(z.string(), z.unknown()).optional(),
  is_active: z.boolean().optional(),
})
export type AutomationFormData = z.infer<typeof automationSchema>

export const aiConfigSchema = z.object({
  config_key: z.string().min(1),
  config_value: z.string(),
})
export type AiConfigFormData = z.infer<typeof aiConfigSchema>

export const knowledgeBaseSchema = z.object({
  title: z.string().min(3, 'Título deve ter pelo menos 3 caracteres'),
  content: z.string().min(10, 'Conteúdo deve ter pelo menos 10 caracteres'),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
})
export type KnowledgeBaseFormData = z.infer<typeof knowledgeBaseSchema>

export const userSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['admin', 'agent']),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
})
export type UserFormData = z.infer<typeof userSchema>

export const userUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  role: z.enum(['admin', 'agent']).optional(),
  is_active: z.boolean().optional(),
})
export type UserUpdateFormData = z.infer<typeof userUpdateSchema>

export const ticketUpdateSchema = z.object({
  status: z.enum(['open', 'awaiting_customer', 'in_progress', 'resolved', 'resolved_ia', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assigned_agent_id: z.string().uuid().nullable().optional(),
})
export type TicketUpdateFormData = z.infer<typeof ticketUpdateSchema>

export const aiFeedbackSchema = z.object({
  usage_stat_id: z.string().uuid(),
  was_helpful: z.boolean(),
})
export type AiFeedbackFormData = z.infer<typeof aiFeedbackSchema>

export const aiSuggestSchema = z.object({
  customer_question: z.string().min(1, 'Pergunta do cliente obrigatória'),
  ticket_description: z.string().optional(),
  messages: z.array(z.object({
    sender_type: z.string(),
    content: z.string(),
  })).optional(),
})
export type AiSuggestFormData = z.infer<typeof aiSuggestSchema>
