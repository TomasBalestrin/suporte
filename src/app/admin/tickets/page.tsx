'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch } from '@/lib/fetch'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Search, Ticket, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/format'
import type { TicketWithRelations } from '@/lib/supabase/types'

export default function TicketsPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<TicketWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Debounce search input
  function handleSearchChange(value: string) {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setSearch(value); setPage(1) }, 400)
  }

  const loadTickets = useCallback(async () => {
    setIsLoading(true)
    setHasError(false)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '20')
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (priorityFilter !== 'all') params.set('priority', priorityFilter)
      if (search) params.set('search', search)

      const res = await adminFetch(`/api/admin/tickets?${params}`)
      const json = await res.json()

      if (json.success) {
        setTickets(json.data)
        setTotalPages(json.pagination.totalPages)
        setTotal(json.pagination.total)
      } else {
        setHasError(true)
      }
    } catch (err) {
      console.error('[Tickets] Failed to load tickets:', err)
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter, priorityFilter, search])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Reset page when filters change (called directly in handlers, no separate effect needed)

  return (
    <>
      <Header title="Tickets" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>
                Fila de Tickets
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({total} tickets)
                </span>
              </CardTitle>
              <div className="flex flex-wrap gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="bg-muted pl-9 w-[200px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[160px] bg-muted">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    <SelectItem value="open">Aberto</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="awaiting_customer">Aguardando Cliente</SelectItem>
                    <SelectItem value="resolved">Resolvido</SelectItem>
                    <SelectItem value="resolved_ia">Resolvido por IA</SelectItem>
                    <SelectItem value="closed">Fechado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1) }}>
                  <SelectTrigger className="w-[140px] bg-muted">
                    <SelectValue placeholder="Prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="urgent">Urgente</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="low">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {hasError ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertTriangle className="mb-4 h-10 w-10 text-muted-foreground" />
                <p className="mb-4 text-muted-foreground">Erro ao carregar tickets</p>
                <Button variant="outline" onClick={loadTickets} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Tentar novamente
                </Button>
              </div>
            ) : isLoading ? (
              <LoadingState />
            ) : tickets.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title="Nenhum ticket encontrado"
                description="Ajuste os filtros ou aguarde novos tickets"
              />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Agente</TableHead>
                        <TableHead>Atualizado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tickets.map((ticket) => (
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
                          <TableCell className="text-muted-foreground">
                            {ticket.product?.name || '-'}
                          </TableCell>
                          <TableCell>
                            <PriorityBadge priority={ticket.priority} />
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={ticket.status} />
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {ticket.assigned_agent?.name || (
                              <span className="text-yellow-400">Não atribuído</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {formatRelativeTime(ticket.updated_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
