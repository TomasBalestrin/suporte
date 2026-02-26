'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Mail, Send, CheckCircle2, XCircle, Clock, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'

interface NotificationLog {
  id: string
  ticket_id: string | null
  recipient_email: string
  subject: string
  template: string
  status: 'sent' | 'failed' | 'bounced'
  resend_id: string | null
  created_at: string
}

interface EmailStats {
  totalSent: number
  totalFailed: number
  last24h: number
  resendConfigured: boolean
  emailFrom: string
}

const TEMPLATE_LABELS: Record<string, string> = {
  ticket_created: 'Ticket criado',
  new_message: 'Nova mensagem',
  ticket_resolved: 'Ticket resolvido',
  ticket_assigned: 'Ticket atribuido',
  satisfaction_reminder: 'Pesquisa satisfacao',
  test: 'Teste',
}

export default function EmailSettingsPage() {
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [testEmail, setTestEmail] = useState('')
  const [isSending, setIsSending] = useState(false)

  const loadData = useCallback(async (p: number) => {
    try {
      const res = await fetch(`/api/admin/email?page=${p}`)
      const json = await res.json()
      if (json.success) {
        setLogs(json.data.logs)
        setStats(json.data.stats)
        setTotalPages(json.data.totalPages)
      }
    } catch {
      toast.error('Erro ao carregar dados de email')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData(page)
  }, [loadData, page])

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault()
    if (!testEmail) return
    setIsSending(true)
    try {
      const res = await fetch('/api/admin/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testEmail }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Email de teste enviado!')
      setTestEmail('')
      loadData(1)
      setPage(1)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar email de teste')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <Header title="Email" />
      <div className="space-y-6 p-6">
        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Resend API</p>
                  <p className="mt-1 text-lg font-bold">
                    {isLoading ? '...' : stats?.resendConfigured ? 'Conectado' : 'Nao configurado'}
                  </p>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  stats?.resendConfigured ? 'bg-green-500/20' : 'bg-red-500/20'
                }`}>
                  {stats?.resendConfigured ? (
                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-400" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Emails enviados</p>
                  <p className="mt-1 text-2xl font-bold">{isLoading ? '...' : stats?.totalSent ?? 0}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                  <Send className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Falhas</p>
                  <p className="mt-1 text-2xl font-bold">{isLoading ? '...' : stats?.totalFailed ?? 0}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                  <XCircle className="h-5 w-5 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ultimas 24h</p>
                  <p className="mt-1 text-2xl font-bold">{isLoading ? '...' : stats?.last24h ?? 0}</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/20">
                  <Clock className="h-5 w-5 text-secondary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration & Test */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="h-4 w-4 text-primary" />
                Configuracao
              </CardTitle>
              <CardDescription>
                Configuracoes de email do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Remetente</Label>
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  {stats?.emailFrom || 'noreply@bethelsystems.com.br'}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Provedor</Label>
                <div className="rounded-md bg-muted px-3 py-2 text-sm">
                  Resend
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Status</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={stats?.resendConfigured ? 'default' : 'destructive'}>
                    {stats?.resendConfigured ? 'Configurado' : 'API Key ausente'}
                  </Badge>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Templates disponiveis</Label>
                <div className="flex flex-wrap gap-1">
                  {Object.values(TEMPLATE_LABELS).filter(l => l !== 'Teste').map((label) => (
                    <Badge key={label} variant="outline" className="text-xs">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Send className="h-4 w-4 text-primary" />
                Enviar Email de Teste
              </CardTitle>
              <CardDescription>
                Verifique se a configuracao esta funcionando
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendTest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="testEmail">Email de destino</Label>
                  <Input
                    id="testEmail"
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="bg-muted"
                    placeholder="seuemail@exemplo.com"
                    required
                  />
                </div>
                <Button type="submit" disabled={isSending || !stats?.resendConfigured} className="w-full">
                  {isSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar Teste
                </Button>
                {!stats?.resendConfigured && !isLoading && (
                  <p className="text-xs text-muted-foreground">
                    Configure a variavel RESEND_API_KEY para habilitar o envio de emails.
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Notification Logs */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base">Historico de Emails</CardTitle>
            <CardDescription>
              Ultimos emails enviados pelo sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState />
            ) : logs.length === 0 ? (
              <EmptyState
                icon={Mail}
                title="Nenhum email enviado"
                description="O historico aparecera aqui quando emails forem enviados"
              />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Destinatario</TableHead>
                      <TableHead>Assunto</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {log.recipient_email}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {log.subject}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {TEMPLATE_LABELS[log.template] || log.template}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.status === 'sent'
                              ? 'bg-green-500/20 text-green-400'
                              : log.status === 'failed'
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-yellow-500/20 text-yellow-400'
                          }`}>
                            {log.status === 'sent' ? (
                              <CheckCircle2 className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            {log.status === 'sent' ? 'Enviado' : log.status === 'failed' ? 'Falhou' : 'Bounce'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(log.created_at)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {totalPages > 1 && (
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
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
