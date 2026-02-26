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
        'text-xs font-medium',
        PRIORITY_COLORS[priority] || 'bg-zinc-500/20 text-zinc-500',
        className
      )}
    >
      {label}
    </Badge>
  )
}
