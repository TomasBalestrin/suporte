import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function safeParse(date: string | Date): Date {
  const d = typeof date === 'string' ? parseISO(date) : date
  if (!isValid(d)) return new Date()
  return d
}

export function formatDate(date: string | Date): string {
  return format(safeParse(date), "dd/MM/yyyy HH:mm", { locale: ptBR })
}

export function formatDateShort(date: string | Date): string {
  return format(safeParse(date), "dd/MM/yyyy", { locale: ptBR })
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(safeParse(date), { addSuffix: true, locale: ptBR })
}

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function phoneMask(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 11)
  if (cleaned.length <= 2) return cleaned
  if (cleaned.length <= 7) return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`
}

export function formatMinutesToHuman(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours < 24) return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`
}
