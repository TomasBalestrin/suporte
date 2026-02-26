'use client'

import { useState, useEffect } from 'react'
import { adminFetch } from '@/lib/fetch'
import { Header } from '@/components/layout/Header'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/common/LoadingState'
import {
  BarChart3,
  TrendingUp,
  Bot,
  Star,
  Clock,
  Loader2,
  Download,
} from 'lucide-react'
import { PRIORITY_LABELS } from '@/lib/utils/constants'

interface AnalyticsData {
  period: number
  totalTickets: number
  resolvedCount: number
  aiResolvedCount: number
  aiResolutionRate: number
  csat: {
    average: number
    total: number
    distribution: number[]
  }
  dailyData: Array<{ date: string; created: number; resolved: number }>
  agentPerformance: Array<{
    name: string
    total: number
    resolved: number
    resolutionRate: number
    avgResponseMinutes: number
  }>
  priorityCounts: Record<string, number>
}

function formatMinutes(minutes: number): string {
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
  return `${minutes}m`
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const res = await adminFetch(`/api/admin/analytics/detailed?period=${period}`)
        const json = await res.json()
        if (json.success) setData(json.data)
      } catch {
        // handle error
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [period])

  function exportCSV() {
    if (!data) return
    const rows = [
      ['Data', 'Criados', 'Resolvidos'],
      ...data.dailyData.map((d) => [d.date, d.created.toString(), d.resolved.toString()]),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${period}d.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <Header title="Analytics" />
      <div className="p-6 space-y-6">
        {/* Header controls */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dashboard Analitico</h2>
            <p className="text-sm text-muted-foreground">
              Metricas e performance do sistema de suporte
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40 bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Ultimos 7 dias</SelectItem>
                <SelectItem value="30">Ultimos 30 dias</SelectItem>
                <SelectItem value="90">Ultimos 90 dias</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCSV} disabled={!data}>
              <Download className="mr-2 h-4 w-4" />
              Exportar CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : data ? (
          <>
            {/* Top KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Tickets</p>
                      <p className="mt-1 text-3xl font-bold">{data.totalTickets}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10">
                      <TrendingUp className="h-6 w-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Resolvidos</p>
                      <p className="mt-1 text-3xl font-bold">{data.resolvedCount}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.totalTickets > 0 ? Math.round((data.resolvedCount / data.totalTickets) * 100) : 0}% taxa de resolucao
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                      <BarChart3 className="h-6 w-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Resolvidos por IA</p>
                      <p className="mt-1 text-3xl font-bold">{data.aiResolvedCount}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.aiResolutionRate}% do total
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10">
                      <Bot className="h-6 w-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">CSAT Medio</p>
                      <p className="mt-1 text-3xl font-bold">{data.csat.average || '-'}</p>
                      <p className="text-xs text-muted-foreground">
                        {data.csat.total} avaliacoes
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-500/10">
                      <Star className="h-6 w-6 text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts area */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Daily tickets chart (text-based bar chart) */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Tickets por Dia</CardTitle>
                  <CardDescription>Criados vs Resolvidos</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {data.dailyData.slice(-14).map((d) => {
                      const maxVal = Math.max(
                        ...data.dailyData.slice(-14).map((dd) => Math.max(dd.created, dd.resolved)),
                        1
                      )
                      return (
                        <div key={d.date} className="flex items-center gap-3 text-sm">
                          <span className="w-20 shrink-0 text-xs text-muted-foreground">
                            {new Date(d.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </span>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 rounded bg-blue-500"
                                style={{ width: `${(d.created / maxVal) * 100}%`, minWidth: d.created > 0 ? '4px' : '0' }}
                              />
                              <span className="text-xs">{d.created}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-3 rounded bg-green-500"
                                style={{ width: `${(d.resolved / maxVal) * 100}%`, minWidth: d.resolved > 0 ? '4px' : '0' }}
                              />
                              <span className="text-xs">{d.resolved}</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded bg-blue-500" /> Criados
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded bg-green-500" /> Resolvidos
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* CSAT Distribution */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Satisfacao do Cliente (CSAT)</CardTitle>
                  <CardDescription>Distribuicao de avaliacoes</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = data.csat.distribution[star - 1]
                      const percentage = data.csat.total > 0
                        ? Math.round((count / data.csat.total) * 100)
                        : 0
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex w-14 items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-medium">{star}</span>
                          </div>
                          <div className="flex-1 h-4 rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-yellow-500 transition-all"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <span className="w-12 text-right text-sm text-muted-foreground">
                            {count} ({percentage}%)
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-2xl font-bold">
                      {data.csat.average > 0 ? data.csat.average.toFixed(1) : '-'}
                      <span className="text-base text-muted-foreground"> / 5.0</span>
                    </p>
                    <p className="text-sm text-muted-foreground">{data.csat.total} avaliacoes no periodo</p>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Distribuicao por Prioridade</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(PRIORITY_LABELS).map(([key, label]) => {
                      const count = data.priorityCounts[key] || 0
                      const percentage = data.totalTickets > 0
                        ? Math.round((count / data.totalTickets) * 100)
                        : 0
                      const colors: Record<string, string> = {
                        low: 'bg-zinc-500',
                        medium: 'bg-blue-500',
                        high: 'bg-orange-500',
                        urgent: 'bg-red-500',
                      }
                      return (
                        <div key={key} className="rounded-lg border border-border p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">{label}</span>
                            <Badge variant="secondary">{count}</Badge>
                          </div>
                          <div className="h-2 rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${colors[key]}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{percentage}%</p>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Agent Performance */}
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="text-base">Performance dos Agentes</CardTitle>
                </CardHeader>
                <CardContent>
                  {data.agentPerformance.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Nenhum agente com tickets no periodo
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Agente</TableHead>
                          <TableHead className="text-center">Tickets</TableHead>
                          <TableHead className="text-center">Resolvidos</TableHead>
                          <TableHead className="text-center">Taxa</TableHead>
                          <TableHead className="text-center">Tempo Medio</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.agentPerformance.map((agent) => (
                          <TableRow key={agent.name}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                                  {agent.name.charAt(0)}
                                </div>
                                {agent.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{agent.total}</TableCell>
                            <TableCell className="text-center">{agent.resolved}</TableCell>
                            <TableCell className="text-center">
                              <span className={agent.resolutionRate >= 80 ? 'text-green-400' : agent.resolutionRate >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                                {agent.resolutionRate}%
                              </span>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex items-center justify-center gap-1 text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {agent.avgResponseMinutes > 0 ? formatMinutes(agent.avgResponseMinutes) : '-'}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <p className="text-center text-muted-foreground">Erro ao carregar dados</p>
        )}
      </div>
    </>
  )
}
