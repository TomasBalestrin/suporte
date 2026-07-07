'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { StatCard } from '@/components/common/StatCard'
import { LoadingState } from '@/components/common/LoadingState'
import {
  Ticket,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  Filter,
  X,
  RefreshCw,
  Loader2,
  Clock,
  FolderOpen,
  Users,
  Zap,
  MessageSquareText,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatRelativeTime, formatMinutesToHuman } from '@/lib/utils/format'
import { adminFetch } from '@/lib/fetch'
import { TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '@/lib/utils/constants'

// Paleta de dados (hex) por status — mesma família dos badges, tom sólido suave
// para barras/segmentos. Semântica separada do accent azul da UI.
const STATUS_HEX: Record<string, string> = {
  open: '#3b82f6',
  in_progress: '#0891b2',
  awaiting_customer: '#f59e0b',
  resolved: '#059669',
  resolved_ia: '#10b981',
  closed: '#94a3b8',
}

interface CategoryData {
  id: string
  name: string
  total: number
  open: number
  in_progress: number
  awaiting_customer: number
  resolved: number
  resolved_ia: number
  closed: number
}

interface DashboardData {
  openTickets: number
  myTickets: number
  slaBreached: number
  resolvedToday: number
  resolvedLabel?: string
  totalTickets: number
  statusCounts: Record<string, number>
  recentTickets: Array<{
    id: string
    ticket_code: string
    title: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    customer?: { name: string; email: string }
    product?: { name: string }
    assigned_agent?: { name: string }
  }>
  topCategories?: CategoryData[]
  avgResolutionMinutes?: number | null
}

interface AgentPerformance {
  name: string
  total: number
  resolved: number
  resolutionRate: number
  avgResponseMinutes: number
}

interface Product {
  id: string
  name: string
}

interface Category {
  id: string
  name: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [agentData, setAgentData] = useState<AgentPerformance[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // Filters
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [productFilter, setProductFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Filter options
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [showFilters, setShowFilters] = useState(false)

  // Load filter options
  useEffect(() => {
    async function loadOptions() {
      try {
        const [productsRes, categoriesRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
        ])
        const productsJson = await productsRes.json()
        const categoriesJson = await categoriesRes.json()
        if (productsJson.success) setProducts(productsJson.data || [])
        if (categoriesJson.success) setCategories(categoriesJson.data || [])
      } catch (err) {
        console.error('[Dashboard] Failed to load filter options:', err)
      }
    }
    loadOptions()
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setHasError(false)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (productFilter !== 'all') params.set('product_id', productFilter)
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)

      const query = params.toString()

      // Build detailed params for agent performance
      const detailedParams = new URLSearchParams()
      if (productFilter !== 'all') detailedParams.set('product_id', productFilter)
      if (categoryFilter !== 'all') detailedParams.set('category_id', categoryFilter)
      if (dateFrom && dateTo) {
        const diffDays = Math.ceil((new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24))
        detailedParams.set('period', String(Math.max(diffDays, 1)))
      }
      const detailedQuery = detailedParams.toString()

      const [overviewRes, detailedRes] = await Promise.all([
        adminFetch(`/api/admin/analytics/overview${query ? `?${query}` : ''}`),
        adminFetch(`/api/admin/analytics/detailed${detailedQuery ? `?${detailedQuery}` : ''}`),
      ])

      const [overviewJson, detailedJson] = await Promise.all([
        overviewRes.json(),
        detailedRes.json(),
      ])

      if (overviewJson.success) setData(overviewJson.data)
      else setHasError(true)

      if (detailedJson.success) setAgentData(detailedJson.data.agentPerformance || [])
    } catch (err) {
      console.error('[Dashboard] Failed to load overview data:', err)
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo, productFilter, categoryFilter, statusFilter, priorityFilter])

  const filterDebounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  useEffect(() => {
    if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current)
    filterDebounceRef.current = setTimeout(() => loadData(), 300)
    return () => { if (filterDebounceRef.current) clearTimeout(filterDebounceRef.current) }
  }, [loadData])

  const hasActiveFilters = dateFrom || dateTo || productFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all'

  const activeFilterCount = [
    dateFrom || dateTo,
    productFilter !== 'all',
    categoryFilter !== 'all',
    statusFilter !== 'all',
    priorityFilter !== 'all',
  ].filter(Boolean).length

  function clearFilters() {
    setDateFrom('')
    setDateTo('')
    setProductFilter('all')
    setCategoryFilter('all')
    setStatusFilter('all')
    setPriorityFilter('all')
  }

  if (isLoading && !data) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="p-6">
          <LoadingState />
        </div>
      </>
    )
  }

  if (!data || hasError) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">Erro ao carregar dados do dashboard</p>
          <Button variant="outline" onClick={loadData} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </Button>
        </div>
      </>
    )
  }

  const resolvedByIA = data.statusCounts?.resolved_ia ?? 0
  const kpiCards: {
    label: string
    value: string | number
    icon: LucideIcon
    hint?: string
    hintTone?: 'up' | 'down' | 'neutral'
    valueClassName?: string
  }[] = [
    { label: 'Tickets Abertos', value: data.openTickets, icon: Ticket },
    { label: 'Meus Tickets', value: data.myTickets, icon: UserCheck },
    {
      label: 'SLA Estourado',
      value: data.slaBreached,
      icon: AlertTriangle,
      valueClassName: data.slaBreached > 0 ? 'text-[#dc2626]' : undefined,
      hint: data.slaBreached > 0 ? 'Fora do prazo' : 'Tudo no prazo',
      hintTone: data.slaBreached > 0 ? 'down' : 'up',
    },
    {
      label: data.resolvedLabel || 'Resolvidos Hoje',
      value: data.resolvedToday,
      icon: CheckCircle,
    },
    {
      label: 'Tempo Médio',
      value: data.avgResolutionMinutes != null ? formatMinutesToHuman(data.avgResolutionMinutes) : '—',
      icon: Clock,
    },
    { label: 'Resolvidos por IA', value: resolvedByIA, icon: Sparkles },
  ]

  return (
    <>
      <Header title="Dashboard" />
      <div className="relative p-6 space-y-6">
        {/* Loading overlay when filtering with existing data */}
        {isLoading && data && (
          <div className="absolute inset-0 z-10 flex items-start justify-center bg-background/50 pt-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {/* Filters */}
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant={showFilters ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
                {activeFilterCount > 0 && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground">
                  <X className="h-3 w-3" />
                  Limpar filtros
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data Início</Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="bg-muted h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Data Fim</Label>
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="bg-muted h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Produto</Label>
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger className="bg-muted h-9 w-full">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Produtos</SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Categoria</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="bg-muted h-9 w-full">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Categorias</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="bg-muted h-9 w-full">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="bg-muted h-9 w-full">
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Prioridades</SelectItem>
                      <SelectItem value="urgent">Urgente</SelectItem>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {kpiCards.map((card) => (
            <StatCard
              key={card.label}
              label={card.label}
              value={card.value}
              icon={card.icon}
              hint={card.hint}
              hintTone={card.hintTone}
              valueClassName={card.valueClassName}
            />
          ))}
        </div>

        {/* Top Categories - Kanban */}
        {data.topCategories && data.topCategories.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="h-5 w-5 text-[var(--text-muted)]" />
                Problemas Mais Comuns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.topCategories.map((cat) => {
                  const statusSegments = [
                    { key: 'open', label: 'Aberto', count: cat.open },
                    { key: 'in_progress', label: 'Em Andamento', count: cat.in_progress },
                    { key: 'awaiting_customer', label: 'Aguardando', count: cat.awaiting_customer },
                    { key: 'resolved', label: 'Resolvido', count: cat.resolved },
                    { key: 'resolved_ia', label: 'Resolvido IA', count: cat.resolved_ia },
                    { key: 'closed', label: 'Fechado', count: cat.closed },
                  ].filter((s) => s.count > 0)

                  return (
                    <div
                      key={cat.id}
                      className="rounded-xl border border-[var(--hairline)] bg-[rgb(var(--t-elevated))] p-4"
                    >
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <h4 className="truncate text-sm font-semibold text-foreground">{cat.name}</h4>
                        <span className="font-mono text-lg font-bold tabular-nums text-foreground">{cat.total}</span>
                      </div>
                      {/* Stacked bar */}
                      <div className="mb-3 flex h-2.5 overflow-hidden rounded-full bg-[var(--hairline)]">
                        {statusSegments.map((seg) => (
                          <div
                            key={seg.key}
                            style={{ width: `${(seg.count / cat.total) * 100}%`, backgroundColor: STATUS_HEX[seg.key] }}
                            title={`${seg.label}: ${seg.count}`}
                          />
                        ))}
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {statusSegments.map((seg) => (
                          <span key={seg.key} className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                            <span
                              aria-hidden
                              className="inline-block h-2 w-2 rounded-full"
                              style={{ backgroundColor: STATUS_HEX[seg.key] }}
                            />
                            <span className="font-mono tabular-nums">{seg.count}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Agent Performance */}
        {agentData.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-5 w-5 text-[var(--text-muted)]" />
                Performance dos Agentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {agentData.map((agent) => (
                  <div
                    key={agent.name}
                    className="rounded-xl border border-[var(--hairline)] bg-[rgb(var(--t-elevated))] p-4"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] font-mono text-sm font-bold text-primary">
                        {agent.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold text-foreground">{agent.name}</h4>
                        <p className="text-xs text-[var(--text-muted)]">
                          <span className="font-mono tabular-nums">{agent.total}</span> tickets atribuídos
                        </p>
                      </div>
                    </div>
                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="rounded-lg border border-[var(--hairline)] bg-[rgb(var(--t-bg))] p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <CheckCircle className="h-3 w-3 text-[#059669]" />
                          <span className="font-mono text-sm font-bold tabular-nums text-foreground">{agent.resolved}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Resolvidos</p>
                      </div>
                      <div className="rounded-lg border border-[var(--hairline)] bg-[rgb(var(--t-bg))] p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Zap className="h-3 w-3 text-[#f59e0b]" />
                          <span className="font-mono text-sm font-bold tabular-nums text-foreground">{agent.resolutionRate}%</span>
                        </div>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Taxa</p>
                      </div>
                      <div className="rounded-lg border border-[var(--hairline)] bg-[rgb(var(--t-bg))] p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <MessageSquareText className="h-3 w-3 text-[#3b82f6]" />
                          <span className="font-mono text-sm font-bold tabular-nums text-foreground">{agent.avgResponseMinutes > 0 ? formatMinutesToHuman(agent.avgResponseMinutes) : '—'}</span>
                        </div>
                        <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">Resposta</p>
                      </div>
                    </div>
                    {/* Resolution bar (accent) */}
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--hairline)]">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${agent.resolutionRate}%` }}
                        title={`Taxa de resolução: ${agent.resolutionRate}%`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Distribution */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border bg-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Tickets por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3.5">
                {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => {
                  const count = data.statusCounts[status] || 0
                  const percentage = data.totalTickets > 0
                    ? Math.round((count / data.totalTickets) * 100)
                    : 0

                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">{label}</span>
                        <span className="font-mono font-semibold tabular-nums text-foreground">{count}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--hairline)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percentage}%`, backgroundColor: STATUS_HEX[status] || '#94a3b8' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Recent Tickets */}
          <Card className="border-border bg-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Tickets Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Código</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Título</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Cliente</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Status</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Prioridade</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Quando</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentTickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-[rgb(var(--t-elevated))] focus-visible:bg-[rgb(var(--t-elevated))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/admin/tickets/${ticket.id}`) } }}
                        tabIndex={0}
                        role="link"
                      >
                        <TableCell className="whitespace-nowrap font-mono text-sm font-semibold text-primary">
                          {ticket.ticket_code}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-foreground">
                          {ticket.title}
                        </TableCell>
                        <TableCell className="text-[var(--text-secondary)]">
                          {ticket.customer?.name || '—'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={ticket.priority} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums text-[var(--text-muted)]">
                          {formatRelativeTime(ticket.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.recentTickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-[var(--text-muted)]">
                          Nenhum ticket encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
