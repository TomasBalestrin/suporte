import { Badge } from '@/components/ui/badge'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils/constants'
import { cn } from '@/lib/utils'

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const label = PRIORITY_LABELS[priority] || priority
  return (
    <Badge
      variant="outline"
      role="status"
      aria-label={`Prioridade: ${label}`}
      className={cn(
        'gap-1.5 rounded-full border font-mono text-[11px] font-semibold tracking-wide',
        PRIORITY_COLORS[priority] || 'bg-slate-100 text-slate-500 border-slate-200',
        className
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  )
}
