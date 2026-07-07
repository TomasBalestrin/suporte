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
import { AtendimentoBadge } from '@/components/common/AtendimentoBadge'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Search, Ticket, ChevronLeft, ChevronRight, AlertTriangle, RefreshCw, Wand2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
  const [atendimentoFilter, setAtendimentoFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [isBatchCorrecting, setIsBatchCorrecting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  async function handleCorrigirLote(dryRun: boolean) {
    if (isBatchCorrecting) return
    const confirmMsg = dryRun
      ? 'Simular correção em lote? Nada será alterado.'
      : 'Re-executar Sofia nos últimos 20 tickets abertos com mensagem da IA? Respostas que diferirem serão substituídas.'
    if (!confirm(confirmMsg)) return
    setIsBatchCorrecting(true)
    try {
      const url = `/api/admin/tickets/sofia-corrigir-lote?limit=20${dryRun ? '&dry_run=1' : ''}`
      const res = await adminFetch(url, { method: 'POST' })
      const json = await res.json()
      if (!json.success) {
        toast.error(json.error || 'Falha no lote')
        return
      }
      const suffix = dryRun ? ' (dry-run)' : ''
      toast.success(`Processados ${json.processados}, alterados ${json.alterados}${suffix}`)
      console.log('[sofia-corrigir-lote] detalhes:', json.detalhes)
    } catch {
      toast.error('Erro ao rodar lote')
    } finally {
      setIsBatchCorrecting(false)
    }
  }

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
      if (atendimentoFilter !== 'all') params.set('atendimento', atendimentoFilter)
      if (search) params.set('search', search)

      const res = await adminFetch(`/api/admin/tickets?${params}`)
      const json = await res.json()

      if (json.success) {
        setTickets(json.data)
        if (json.pagination) {
          setTotalPages(json.pagination.totalPages)
          setTotal(json.pagination.total)
        }
      } else {
        setHasError(true)
      }
    } catch (err) {
      console.error('[Tickets] Failed to load tickets:', err)
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter, priorityFilter, atendimentoFilter, search])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  return (
    <>
      <Header title="Tickets" />
      <div className="p-4 md:p-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <CardTitle>
                Fila de Tickets
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({total} tickets)
                </span>
              </CardTitle>
              {/* Filters — empilhados no mobile, linha no desktop */}
              <div className="flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar..."
                    value={searchInput}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="bg-muted pl-9 w-full md:w-[200px]"
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
                    <SelectTrigger className="flex-1 bg-muted md:w-[160px] md:flex-none">
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
                    <SelectTrigger className="flex-1 bg-muted md:w-[140px] md:flex-none">
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
                  <Select value={atendimentoFilter} onValueChange={(v) => { setAtendimentoFilter(v); setPage(1) }}>
                    <SelectTrigger className="flex-1 bg-muted md:w-[170px] md:flex-none">
                      <SelectValue placeholder="Atendimento" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todo atendimento</SelectItem>
                      <SelectItem value="sofia">🤖 Só Sofia</SelectItem>
                      <SelectItem value="humano">👤 Teve humano</SelectItem>
                      <SelectItem value="aguardando">⏳ Cliente aguardando</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Corrigir em lote — ícone no mobile, texto no desktop */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCorrigirLote(false)}
                  disabled={isBatchCorrecting}
                  title="Re-executar Sofia nos últimos 20 tickets abertos — corrige respostas da IA que não batem mais"
                  className="min-h-[44px] md:min-h-0"
                >
                  {isBatchCorrecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden md:inline">Corrigir em lote</span>
                </Button>
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
                {/* Mobile: lista de cards (< md) */}
                <div className="flex flex-col gap-2 md:hidden">
                  {tickets.map((ticket) => (
                    <button
                      key={ticket.id}
                      type="button"
                      onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                      className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 min-h-[44px]"
                    >
                      {/* Linha 1: código + status */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-primary">
                          {ticket.ticket_code}
                        </span>
                        <StatusBadge status={ticket.status} />
                      </div>
                      {/* Título — até 2 linhas */}
                      <p className="mt-1.5 line-clamp-2 text-sm font-medium leading-snug">
                        {ticket.title}
                      </p>
                      {/* Linha 3: cliente · produto */}
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {ticket.customer?.name || '—'}
                        {ticket.product?.name ? ` · ${ticket.product.name}` : ''}
                      </p>
                      {/* Linha 4: atendimento (Sofia/humano + última resposta) */}
                      <div className="mt-2">
                        <AtendimentoBadge sofiaOnly={ticket.sofia_only} lastSender={ticket.last_sender} />
                      </div>
                      {/* Linha 5: prioridade + atualizado */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <PriorityBadge priority={ticket.priority} />
                        <span className="text-xs text-muted-foreground">
                          {formatRelativeTime(ticket.updated_at)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Desktop: tabela (>= md) */}
                <div className="hidden overflow-x-auto md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Título</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Prioridade</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Atendimento</TableHead>
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
                          <TableCell>
                            <AtendimentoBadge sofiaOnly={ticket.sofia_only} lastSender={ticket.last_sender} />
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
                      className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      className="min-h-[44px] min-w-[44px] md:min-h-0 md:min-w-0"
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
