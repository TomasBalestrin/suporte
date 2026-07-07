import { Badge } from '@/components/ui/badge'
import { Bot, User, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AtendimentoBadgeProps {
  /** true = nenhum agente humano respondeu (atendido só pela Sofia) */
  sofiaOnly?: boolean
  /** sender_type da última mensagem: 'ai' | 'agent' | 'customer' */
  lastSender?: string | null
  className?: string
}

/**
 * Mostra DOIS sinais no menu de tickets:
 *  1) Selo principal — 🤖 Sofia (atendido só pela IA) vs 👤 Humano (teve agente).
 *  2) Quem respondeu por último (ícone) — Sofia / humano / ⏳ cliente aguardando.
 */
export function AtendimentoBadge({ sofiaOnly, lastSender, className }: AtendimentoBadgeProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      {sofiaOnly ? (
        <Badge
          variant="outline"
          aria-label="Atendido só pela Sofia"
          className="gap-1 rounded-full border font-mono text-[11px] font-semibold tracking-wide border-emerald-200 bg-emerald-100 text-emerald-700"
        >
          <Bot className="h-3 w-3" aria-hidden />
          Sofia
        </Badge>
      ) : (
        <Badge
          variant="outline"
          aria-label="Teve atendimento humano"
          className="gap-1 rounded-full border font-mono text-[11px] font-semibold tracking-wide border-blue-200 bg-blue-100 text-blue-700"
        >
          <User className="h-3 w-3" aria-hidden />
          Humano
        </Badge>
      )}

      {lastSender === 'customer' ? (
        <span title="Cliente aguardando resposta" className="inline-flex items-center text-amber-500" aria-label="Cliente aguardando resposta">
          <Clock className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : lastSender === 'agent' ? (
        <span title="Última resposta: humano" className="inline-flex items-center text-muted-foreground" aria-label="Última resposta: humano">
          <User className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : lastSender === 'ai' ? (
        <span title="Última resposta: Sofia" className="inline-flex items-center text-muted-foreground" aria-label="Última resposta: Sofia">
          <Bot className="h-3.5 w-3.5" aria-hidden />
        </span>
      ) : null}
    </div>
  )
}
