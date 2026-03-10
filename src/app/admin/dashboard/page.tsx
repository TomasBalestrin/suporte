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
} from 'lucide-react'
import { formatRelativeTime, formatMinutesToHuman } from '@/lib/utils/format'
import { adminFetch } from '@/lib/fetch'
import { TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '@/lib/utils/constants'

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
      const res = await adminFetch(`/api/admin/analytics/overview${query ? `?${query}` : ''}`)
      const json = await res.json()
      if (json.success) setData(json.data)
      else setHasError(true)
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

  const kpiCards = [
    {
      title: 'Tickets Abertos',
      value: data.openTickets,
      icon: Ticket,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      title: 'Meus Tickets',
      value: data.myTickets,
      icon: UserCheck,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      title: 'SLA Estourado',
      value: data.slaBreached,
      icon: AlertTriangle,
      color: data.slaBreached > 0 ? 'text-red-400' : 'text-green-400',
      bg: data.slaBreached > 0 ? 'bg-red-500/10' : 'bg-green-500/10',
    },
    {
      title: data.resolvedLabel || 'Resolvidos Hoje',
      value: data.resolvedToday,
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {kpiCards.map((card) => (
            <Card key={card.title} className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="mt-1 text-3xl font-bold">{card.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {/* Avg Resolution Time KPI */}
          <Card className="border-border bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tempo Médio Resolução</p>
                  <p className="mt-1 text-3xl font-bold">
                    {data.avgResolutionMinutes != null
                      ? formatMinutesToHuman(data.avgResolutionMinutes)
                      : '-'}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
                  <Clock className="h-6 w-6 text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Categories - Kanban */}
        {data.topCategories && data.topCategories.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderOpen className="h-5 w-5 text-muted-foreground" />
                Problemas Mais Comuns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.topCategories.map((cat) => {
                  const statusSegments = [
                    { key: 'open', label: 'Aberto', count: cat.open, color: 'bg-blue-500' },
                    { key: 'in_progress', label: 'Em Andamento', count: cat.in_progress, color: 'bg-cyan-500' },
                    { key: 'awaiting_customer', label: 'Aguardando', count: cat.awaiting_customer, color: 'bg-yellow-500' },
                    { key: 'resolved', label: 'Resolvido', count: cat.resolved, color: 'bg-green-500' },
                    { key: 'resolved_ia', label: 'Resolvido IA', count: cat.resolved_ia, color: 'bg-emerald-500' },
                    { key: 'closed', label: 'Fechado', count: cat.closed, color: 'bg-zinc-500' },
                  ].filter((s) => s.count > 0)

                  return (
                    <div key={cat.id} className="rounded-xl border border-border p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-sm font-semibold text-foreground">{cat.name}</h4>
                        <span className="text-lg font-bold text-foreground">{cat.total}</span>
                      </div>
                      {/* Stacked bar */}
                      <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-muted">
                        {statusSegments.map((seg) => (
                          <div
                            key={seg.key}
                            className={`${seg.color} transition-all`}
                            style={{ width: `${(seg.count / cat.total) * 100}%` }}
                            title={`${seg.label}: ${seg.count}`}
                          />
                        ))}
                      </div>
                      {/* Legend */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {statusSegments.map((seg) => (
                          <span key={seg.key} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <span className={`inline-block h-2 w-2 rounded-full ${seg.color}`} />
                            {seg.count}
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

        {/* Status Distribution */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border bg-card lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Tickets por Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => {
                  const count = data.statusCounts[status] || 0
                  const percentage = data.totalTickets > 0
                    ? Math.round((count / data.totalTickets) * 100)
                    : 0

                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                      <div className="mt-1 h-2 rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${
                            status === 'open' ? 'bg-blue-500' :
                            status === 'in_progress' ? 'bg-cyan-500' :
                            status === 'awaiting_customer' ? 'bg-yellow-500' :
                            status === 'resolved' || status === 'resolved_ia' ? 'bg-green-500' :
                            'bg-zinc-500'
                          }`}
                          style={{ width: `${percentage}%` }}
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
                      <TableHead>Código</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Quando</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentTickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                        onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/admin/tickets/${ticket.id}`) } }}
                        tabIndex={0}
                        role="link"
                      >
                        <TableCell className="font-mono text-sm font-medium text-primary">
                          {ticket.ticket_code}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {ticket.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ticket.customer?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={ticket.priority} />
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatRelativeTime(ticket.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.recentTickets.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
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
