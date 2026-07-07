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

// Soft+color (tema claro) — pastel sólido de fundo + texto escuro legível.
// Compartilhado admin (.admin) + portal (.portal-light), ambos claros.
export const TICKET_STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200',
  awaiting_customer: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  resolved_ia: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-200 text-slate-600 border-slate-300',
}

export const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
}

export const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-500 border-slate-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  urgent: 'bg-red-100 text-red-700 border-red-200',
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
