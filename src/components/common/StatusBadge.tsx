import { Badge } from '@/components/ui/badge'
import { TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '@/lib/utils/constants'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = TICKET_STATUS_LABELS[status] || status
  return (
    <Badge
      variant="outline"
      role="status"
      aria-label={`Status: ${label}`}
      className={cn(
        'gap-1.5 rounded-full border font-mono text-[11px] font-semibold tracking-wide',
        TICKET_STATUS_COLORS[status] || 'bg-slate-100 text-slate-500 border-slate-200',
        className
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  )
}
