import { Badge } from '@/components/ui/badge'
import { TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '@/lib/utils/constants'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium',
        TICKET_STATUS_COLORS[status] || 'bg-zinc-500/20 text-zinc-400',
        className
      )}
    >
      {TICKET_STATUS_LABELS[status] || status}
    </Badge>
  )
}
