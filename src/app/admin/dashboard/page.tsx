'use client'

import { useState, useEffect, useCallback } from 'react'
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
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/format'
import { TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '@/lib/utils/constants'

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
      } catch {
        // silent
      }
    }
    loadOptions()
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)
      if (productFilter !== 'all') params.set('product_id', productFilter)
      if (categoryFilter !== 'all') params.set('category_id', categoryFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)

      const query = params.toString()
      const res = await fetch(`/api/admin/analytics/overview${query ? `?${query}` : ''}`)
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch {
      // handle error
    } finally {
      setIsLoading(false)
    }
  }, [dateFrom, dateTo, productFilter, categoryFilter, statusFilter, priorityFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const hasActiveFilters = dateFrom || dateTo || productFilter !== 'all' || categoryFilter !== 'all' || statusFilter !== 'all' || priorityFilter !== 'all'

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

  if (!data) {
    return (
      <>
        <Header title="Dashboard" />
        <div className="p-6 text-center text-muted-foreground">
          Erro ao carregar dados do dashboard
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
      <div className="p-6 space-y-6">
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
                {hasActiveFilters && (
                  <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                    {[dateFrom || dateTo ? 1 : 0, productFilter !== 'all' ? 1 : 0, categoryFilter !== 'all' ? 1 : 0, statusFilter !== 'all' ? 1 : 0, priorityFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0)}
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
                  <Label className="text-xs text-muted-foreground">Data Inicio</Label>
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
                      <SelectItem value="medium">Media</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>

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
                      <TableHead>Codigo</TableHead>
                      <TableHead>Titulo</TableHead>
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
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
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
