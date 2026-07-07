import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon?: LucideIcon
  /** texto pequeno abaixo do valor (ex: "▲ 12%", "2 aguardando") */
  hint?: string
  hintTone?: 'up' | 'down' | 'neutral'
  /** cor custom do valor (ex: destaque de perigo) */
  valueClassName?: string
  className?: string
}

/**
 * KPI card no estilo do tema claro do Fluxon: superfície elevada (slate-100),
 * valor em fonte mono tabular grande, rótulo caption uppercase.
 * Usado no dashboard/analytics/perfil. Consome os tokens do .admin.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  hintTone = 'neutral',
  valueClassName,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--border-strong)] bg-[rgb(var(--t-elevated))] p-4',
        className
      )}
    >
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />}
        <span className="truncate">{label}</span>
      </div>
      <div
        className={cn(
          'mt-2 font-mono text-[30px] font-bold leading-none tabular-nums tracking-tight',
          valueClassName
        )}
      >
        {value}
      </div>
      {hint && (
        <div
          className={cn(
            'mt-1 font-mono text-xs font-semibold',
            hintTone === 'up' ? 'text-[#16a34a]' : hintTone === 'down' ? 'text-[#dc2626]' : 'text-[var(--text-muted)]'
          )}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
