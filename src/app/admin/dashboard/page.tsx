'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
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
import { LoadingState } from '@/components/common/LoadingState'
import {
  Ticket,
  UserCheck,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/format'
import { TICKET_STATUS_LABELS, TICKET_STATUS_COLORS } from '@/lib/utils/constants'

interface DashboardData {
  openTickets: number
  myTickets: number
  slaBreached: number
  resolvedToday: number
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

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/admin/analytics/overview')
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch {
        // handle error
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  if (isLoading) {
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
      title: 'Resolvidos Hoje',
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
