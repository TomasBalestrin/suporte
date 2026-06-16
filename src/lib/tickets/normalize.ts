/**
 * Lógica PURA de normalização de ticket (sem I/O) — testável isoladamente.
 * Extraída do createTicket/route.ts conforme a disciplina da suite de regressão da Sofia.
 */

export interface RawTicketMessage {
  role: string
  content: string
  confidence?: number
}

export interface TicketMessageRow {
  sender_type: 'customer' | 'ai'
  content: string
  is_internal_note: boolean
}

/**
 * Normaliza o histórico (form: {user|ai}; auto-create: {user|assistant|tool}) para
 * linhas da tabela `messages`. Filtra role='tool' — JSON cru de tool_result não pode
 * poluir o histórico que o atendente humano lê (A Lenda, red-team 2026-06-16).
 */
export function normalizeTicketMessages(messages: RawTicketMessage[] | undefined): TicketMessageRow[] {
  if (!messages || messages.length === 0) return []
  return messages
    .filter((m) => m.role !== 'tool')
    .map((m) => ({
      sender_type: m.role === 'user' ? 'customer' : 'ai',
      content: m.content,
      is_internal_note: false,
    }))
}

/**
 * Compõe title/description de um ticket de escalonamento automático da Sofia.
 * GARANTE description ≥ 20 chars por construção — nunca deixa o min20 do schema
 * matar o ticket quando o relato é curto (A Lenda: "inverte a lógica — o backend
 * garante description válida, não valida e rejeita").
 */
export function buildEscalationTicketFields(opts: {
  motivo?: string | null
  resumo?: string | null
  relato?: string | null
}): { title: string; description: string } {
  const motivo = (opts.motivo && opts.motivo.trim()) || 'atendimento humano'
  const partes = [
    opts.resumo?.trim() || '',
    opts.relato?.trim() ? `Relato do cliente: ${opts.relato.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim()
  const descBase = partes || `Cliente solicitou atendimento humano. Motivo: ${motivo}.`
  const description = descBase.length >= 20 ? descBase : `Escalonamento automatico da Sofia (${motivo}). ${descBase}`
  const title = `Escalonamento: ${motivo}`.slice(0, 100)
  return { title, description }
}
