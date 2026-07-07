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
import { StatCard } from '@/components/common/StatCard'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { LoadingState } from '@/components/common/LoadingState'
import {
  BarChart3,
  TrendingUp,
  Bot,
  Star,
  Clock,
  Download,
  AlertTriangle,
  RefreshCw,
  LineChart,
  SmilePlus,
  Flag,
  Users,
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

function formatDay(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  })
}

/** Arredonda o topo do eixo Y para um valor "limpo" (sempre par → tick do meio inteiro). */
function niceMax(v: number): number {
  if (v <= 4) return 4
  if (v <= 40) return Math.ceil(v / 4) * 4
  if (v <= 100) return Math.ceil(v / 10) * 10
  return Math.ceil(v / 50) * 50
}

const DATA = {
  blue: '#3b82f6',
  emerald: '#059669',
  amber: '#f59e0b',
  red: '#dc2626',
  cyan: '#0891b2',
  grid: 'rgba(30,41,59,.07)',
} as const

const PRIORITY_BAR: Record<string, string> = {
  low: '#64748b',
  medium: DATA.blue,
  high: DATA.amber,
  urgent: DATA.red,
}

/** Gráfico de linha/área SVG: Criados (azul, área) vs Resolvidos (esmeralda, linha). */
function TicketsChart({ series }: { series: Array<{ date: string; created: number; resolved: number }> }) {
  const W = 560
  const H = 210
  const padL = 30
  const padR = 12
  const padT = 14
  const padB = 26
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const n = series.length

  const rawMax = Math.max(1, ...series.map((d) => Math.max(d.created, d.resolved)))
  const top = niceMax(rawMax)
  const baseY = padT + innerH

  const x = (i: number) => (n <= 1 ? padL + innerW / 2 : padL + (i / (n - 1)) * innerW)
  const y = (v: number) => padT + innerH - (v / top) * innerH

  const createdPts = series.map((d, i) => `${x(i).toFixed(1)},${y(d.created).toFixed(1)}`).join(' ')
  const resolvedPts = series.map((d, i) => `${x(i).toFixed(1)},${y(d.resolved).toFixed(1)}`).join(' ')
  const areaPath =
    `M ${x(0).toFixed(1)} ${baseY.toFixed(1)} ` +
    series.map((d, i) => `L ${x(i).toFixed(1)} ${y(d.created).toFixed(1)}`).join(' ') +
    ` L ${x(n - 1).toFixed(1)} ${baseY.toFixed(1)} Z`

  const gridFracs = [0, 0.25, 0.5, 0.75, 1]
  const yLabelFracs = [0, 0.5, 1]
  const xIdx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1]

  const last = n - 1
  const lastCreated = series[last]
  const lastResolved = series[last]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Gráfico de tickets criados versus resolvidos por dia no período"
    >
      <defs>
        <linearGradient id="createdArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={DATA.blue} stopOpacity="0.20" />
          <stop offset="100%" stopColor={DATA.blue} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grid horizontal */}
      {gridFracs.map((f) => {
        const gy = padT + innerH - f * innerH
        return (
          <line
            key={f}
            x1={padL}
            x2={W - padR}
            y1={gy}
            y2={gy}
            stroke={DATA.grid}
            strokeWidth={1}
          />
        )
      })}

      {/* rótulos eixo Y */}
      {yLabelFracs.map((f) => {
        const val = Math.round(top * f)
        return (
          <text
            key={f}
            x={padL - 7}
            y={padT + innerH - f * innerH + 3}
            textAnchor="end"
            className="font-mono tabular-nums"
            fontSize={10}
            fill="rgba(17,24,39,0.50)"
          >
            {val}
          </text>
        )
      })}

      {/* área criados */}
      <path d={areaPath} fill="url(#createdArea)" />

      {/* linha criados */}
      <polyline
        points={createdPts}
        fill="none"
        stroke={DATA.blue}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* linha resolvidos */}
      <polyline
        points={resolvedPts}
        fill="none"
        stroke={DATA.emerald}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* pontos finais */}
      {last >= 0 && (
        <>
          <circle cx={x(last)} cy={y(lastResolved.resolved)} r={3.4} fill={DATA.emerald} stroke="#fff" strokeWidth={1.5} />
          <circle cx={x(last)} cy={y(lastCreated.created)} r={3.4} fill={DATA.blue} stroke="#fff" strokeWidth={1.5} />
        </>
      )}

      {/* rótulos eixo X */}
      {xIdx.map((i, k) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          textAnchor={k === 0 ? 'start' : k === xIdx.length - 1 ? 'end' : 'middle'}
          className="font-mono tabular-nums"
          fontSize={10}
          fill="rgba(17,24,39,0.50)"
        >
          {series[i] ? formatDay(series[i].date) : ''}
        </text>
      ))}
    </svg>
  )
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [period, setPeriod] = useState('30')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      setHasError(false)
      try {
        const res = await adminFetch(`/api/admin/analytics/detailed?period=${period}`)
        const json = await res.json()
        if (json.success) setData(json.data)
        else setHasError(true)
      } catch {
        setHasError(true)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [period, retryCount])

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

  const resolutionRate =
    data && data.totalTickets > 0 ? Math.round((data.resolvedCount / data.totalTickets) * 100) : 0

  return (
    <>
      <Header title="Analytics" />
      <div className="space-y-6 p-6">
        {/* Header controls */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Dashboard Analítico</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Métricas e performance do sistema de suporte
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40 bg-muted">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
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
        ) : hasError || !data ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertTriangle className="mb-4 h-10 w-10 text-[var(--text-muted)]" />
            <p className="mb-4 text-[var(--text-secondary)]">Erro ao carregar dados analíticos</p>
            <Button variant="outline" onClick={() => setRetryCount((c) => c + 1)} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            {/* Top KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Total de Tickets"
                value={data.totalTickets}
                icon={TrendingUp}
                hint={`Últimos ${data.period} dias`}
              />
              <StatCard
                label="Resolvidos"
                value={data.resolvedCount}
                icon={BarChart3}
                hint={`${resolutionRate}% de resolução`}
                hintTone="up"
              />
              <StatCard
                label="Resolvidos por IA"
                value={data.aiResolvedCount}
                icon={Bot}
                hint={`${data.aiResolutionRate}% do total`}
              />
              <StatCard
                label="CSAT Médio"
                value={data.csat.average > 0 ? data.csat.average.toFixed(1) : '—'}
                icon={Star}
                hint={`${data.csat.total} avaliações`}
              />
            </div>

            {/* Charts area */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Daily tickets — SVG line/area chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <LineChart className="h-4 w-4 text-primary" />
                    Tickets por Dia
                  </CardTitle>
                  <CardDescription className="text-[var(--text-secondary)]">
                    Criados vs Resolvidos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.dailyData.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                      Sem dados no período
                    </p>
                  ) : (
                    <TicketsChart series={data.dailyData} />
                  )}
                  <div className="mt-3 flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: DATA.blue }} /> Criados
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: DATA.emerald }} /> Resolvidos
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* CSAT Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <SmilePlus className="h-4 w-4 text-primary" />
                    Satisfação do Cliente (CSAT)
                  </CardTitle>
                  <CardDescription className="text-[var(--text-secondary)]">
                    Distribuição de avaliações
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = data.csat.distribution[star - 1] ?? 0
                      const percentage =
                        data.csat.total > 0 ? Math.round((count / data.csat.total) * 100) : 0
                      return (
                        <div key={star} className="flex items-center gap-3">
                          <div className="flex w-10 shrink-0 items-center gap-1">
                            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
                              {star}
                            </span>
                            <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b]" aria-hidden />
                          </div>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[rgba(30,41,59,0.06)]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percentage}%`, background: DATA.amber }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                            {count} · {percentage}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="mt-4 border-t border-[var(--hairline)] pt-4 text-center">
                    <p className="font-mono text-2xl font-bold tabular-nums text-foreground">
                      {data.csat.average > 0 ? data.csat.average.toFixed(1) : '—'}
                      <span className="text-base font-normal text-[var(--text-muted)]"> / 5.0</span>
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">
                      {data.csat.total} avaliações no período
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Priority Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <Flag className="h-4 w-4 text-primary" />
                    Distribuição por Prioridade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.keys(PRIORITY_LABELS).map((key) => {
                      const count = data.priorityCounts[key] || 0
                      const percentage =
                        data.totalTickets > 0 ? Math.round((count / data.totalTickets) * 100) : 0
                      return (
                        <div key={key} className="flex items-center gap-3">
                          <div className="w-24 shrink-0">
                            <PriorityBadge priority={key} />
                          </div>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[rgba(30,41,59,0.06)]">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${percentage}%`, background: PRIORITY_BAR[key] }}
                            />
                          </div>
                          <span className="w-16 shrink-0 text-right font-mono text-xs tabular-nums text-[var(--text-secondary)]">
                            {count} · {percentage}%
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Agent Performance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base text-foreground">
                    <Users className="h-4 w-4 text-primary" />
                    Performance dos Agentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {data.agentPerformance.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[var(--text-muted)]">
                      Nenhum agente com tickets no período
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-[var(--text-secondary)]">Agente</TableHead>
                            <TableHead className="text-right text-[var(--text-secondary)]">Tickets</TableHead>
                            <TableHead className="text-right text-[var(--text-secondary)]">Resolvidos</TableHead>
                            <TableHead className="text-right text-[var(--text-secondary)]">Taxa</TableHead>
                            <TableHead className="text-right text-[var(--text-secondary)]">Tempo Médio</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.agentPerformance.map((agent) => (
                            <TableRow key={agent.name}>
                              <TableCell className="font-medium text-foreground">
                                <div className="flex items-center gap-2">
                                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                                    {agent.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="truncate">{agent.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-foreground">
                                {agent.total}
                              </TableCell>
                              <TableCell className="text-right font-mono tabular-nums text-foreground">
                                {agent.resolved}
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className="font-mono font-semibold tabular-nums"
                                  style={{
                                    color:
                                      agent.resolutionRate >= 80
                                        ? '#16a34a'
                                        : agent.resolutionRate >= 50
                                          ? '#ca8a04'
                                          : '#dc2626',
                                  }}
                                >
                                  {agent.resolutionRate}%
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 font-mono tabular-nums text-[var(--text-secondary)]">
                                  <Clock className="h-3 w-3 shrink-0" aria-hidden />
                                  {agent.avgResponseMinutes > 0
                                    ? formatMinutes(agent.avgResponseMinutes)
                                    : '—'}
                                </div>
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
        )}
      </div>
    </>
  )
}
