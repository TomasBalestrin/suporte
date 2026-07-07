'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch } from '@/lib/fetch'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
  Mail,
  Phone,
  CreditCard,
  Ticket,
  CheckCircle,
  Bot,
  Star,
  Calendar,
  Package,
} from 'lucide-react'
import { formatRelativeTime, formatDate, formatPhone } from '@/lib/utils/format'

interface CustomerProfile {
  customer: {
    id: string
    name: string
    email: string
    cpf: string | null
    phone: string | null
    created_at: string
  }
  stats: {
    total_tickets: number
    open_tickets: number
    resolved_tickets: number
    resolved_by_ai: number
    avg_satisfaction: number | null
    first_contact: string | null
    last_contact: string | null
  }
  tickets: Array<{
    id: string
    ticket_code: string
    title: string
    status: string
    priority: string
    created_at: string
    updated_at: string
    resolved_at: string | null
    satisfaction_rating: number | null
    product: { id: string; name: string } | null
    category: { id: string; name: string } | null
  }>
  products: string[]
}

export default function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<CustomerProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const loadCustomer = useCallback(async () => {
    setIsLoading(true)
    setHasError(false)
    try {
      const res = await adminFetch(`/api/admin/customers/${id}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      } else {
        setHasError(true)
      }
    } catch {
      setHasError(true)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadCustomer()
  }, [loadCustomer])

  if (isLoading) {
    return (
      <>
        <Header title="Perfil do Cliente" />
        <div className="p-6"><LoadingState /></div>
      </>
    )
  }

  if (hasError || !data) {
    return (
      <>
        <Header title="Perfil do Cliente" />
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <AlertTriangle className="mb-4 h-10 w-10 text-muted-foreground" />
          <p className="mb-4 text-muted-foreground">Erro ao carregar perfil do cliente</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/customers')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" onClick={loadCustomer}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      </>
    )
  }

  const { customer, stats, tickets, products } = data

  function formatCpf(cpf: string | null): string {
    if (!cpf) return '-'
    const clean = cpf.replace(/\D/g, '')
    if (clean.length === 11) {
      return `${clean.slice(0, 3)}.${clean.slice(3, 6)}.${clean.slice(6, 9)}-${clean.slice(9)}`
    }
    return cpf
  }

  return (
    <>
      <Header title="Perfil do Cliente">
        <Button variant="outline" size="sm" onClick={() => router.push('/admin/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </Header>
      <div className="space-y-6 p-4 md:p-6">
        {/* Customer Info */}
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xl font-bold text-primary">
                {customer.name?.charAt(0)?.toUpperCase() || '?'}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-foreground">{customer.name}</h2>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4" />
                    {customer.email}
                  </span>
                  {customer.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="font-mono tabular-nums">{formatPhone(customer.phone)}</span>
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="font-mono tabular-nums">{formatCpf(customer.cpf)}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    Cliente desde {formatDate(customer.created_at)}
                  </span>
                </div>
                {products.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {products.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                      >
                        <Package className="h-3 w-3" />
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total de tickets" value={stats.total_tickets} icon={Ticket} />
          <StatCard
            label="Abertos"
            value={stats.open_tickets}
            icon={Ticket}
            valueClassName={stats.open_tickets > 0 ? 'text-[#d97706]' : undefined}
          />
          <StatCard label="Resolvidos" value={stats.resolved_tickets} icon={CheckCircle} />
          <StatCard label="Resolvidos por IA" value={stats.resolved_by_ai} icon={Bot} />
          <StatCard
            label="Satisfação média"
            value={stats.avg_satisfaction ?? '-'}
            icon={Star}
            hint={stats.avg_satisfaction != null ? 'de 5' : undefined}
          />
        </div>

        {/* Tickets Table */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle>
              Tickets
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({tickets.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {tickets.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum ticket registrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Prioridade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado</TableHead>
                      <TableHead>Satisfação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                        tabIndex={0}
                        role="link"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            router.push(`/admin/tickets/${ticket.id}`)
                          }
                        }}
                      >
                        <TableCell className="font-mono text-sm font-medium text-primary">
                          {ticket.ticket_code}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {ticket.title}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {ticket.product && typeof ticket.product === 'object' && 'name' in ticket.product
                            ? ticket.product.name
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <PriorityBadge priority={ticket.priority} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={ticket.status} />
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatRelativeTime(ticket.created_at)}
                        </TableCell>
                        <TableCell className="text-center">
                          {ticket.satisfaction_rating ? (
                            <span className="flex items-center justify-center gap-1">
                              <Star className="h-3.5 w-3.5 text-amber-500" />
                              {ticket.satisfaction_rating}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
