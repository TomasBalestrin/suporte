import { Badge } from '@/components/ui/badge'
import { PRIORITY_LABELS, PRIORITY_COLORS } from '@/lib/utils/constants'
import { cn } from '@/lib/utils'

interface PriorityBadgeProps {
  priority: string
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-xs font-medium',
        PRIORITY_COLORS[priority] || 'bg-zinc-500/20 text-zinc-400',
        className
      )}
    >
      {PRIORITY_LABELS[priority] || priority}
    </Badge>
  )
}
