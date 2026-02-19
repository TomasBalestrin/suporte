export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || 'Bethel Suporte'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: 'Aberto',
  awaiting_customer: 'Aguardando Cliente',
  in_progress: 'Em Andamento',
  resolved: 'Resolvido',
  resolved_ia: 'Resolvido pela IA',
  closed: 'Fechado',
}

export const TICKET_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  awaiting_customer: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  in_progress: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
  resolved_ia: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  closed: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  medium: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  urgent: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const SENDER_TYPE_LABELS: Record<string, string> = {
  customer: 'Cliente',
  agent: 'Agente',
  ai: 'IA',
  system: 'Sistema',
}

export const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
export const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'video/mp4',
  'application/zip',
]

export const ITEMS_PER_PAGE = 20
