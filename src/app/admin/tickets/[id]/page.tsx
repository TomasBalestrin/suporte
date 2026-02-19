'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { LoadingState } from '@/components/common/LoadingState'
import { FileUploadButton, AttachmentPreview, MessageAttachments } from '@/components/chat/FileUploadButton'
import type { Attachment } from '@/components/chat/FileUploadButton'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import {
  Send,
  Bot,
  User,
  Monitor,
  Clock,
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Lock,
  AlertTriangle,
  Star,
  Wifi,
  WifiOff,
  Sparkles,
  History,
} from 'lucide-react'
import { formatDate, formatRelativeTime, formatPhone } from '@/lib/utils/format'
import { SENDER_TYPE_LABELS, TICKET_STATUS_LABELS, PRIORITY_LABELS } from '@/lib/utils/constants'
import { toast } from 'sonner'
import type { Message, TicketWithRelations, User as UserType, QuickReply, Ticket } from '@/lib/supabase/types'

export default function TicketDetailPage() {
  const params = useParams()
  const router = useRouter()
  const ticketId = params.id as string

  const [ticket, setTicket] = useState<TicketWithRelations | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [agents, setAgents] = useState<UserType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([])
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  const [qrFilter, setQrFilter] = useState('')
  const [customerHistory, setCustomerHistory] = useState<Ticket[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`)
      const json = await res.json()
      if (json.success) setTicket(json.data)
    } catch {
      // handle error
    }
  }, [ticketId])

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`)
      const json = await res.json()
      if (json.success) setMessages(json.data)
    } catch {
      // handle error
    }
  }, [ticketId])

  // Realtime subscription
  const handleNewMessage = useCallback(
    (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
      loadTicket()
    },
    [loadTicket]
  )

  const { isConnected } = useRealtimeMessages({
    ticketId,
    onNewMessage: handleNewMessage,
  })

  useEffect(() => {
    async function init() {
      await Promise.all([loadTicket(), loadMessages()])
      setIsLoading(false)

      // Load quick replies and agents in background
      fetch('/api/admin/quick-replies')
        .then((r) => r.json())
        .then((j) => { if (j.success) setQuickReplies(j.data.filter((qr: QuickReply) => qr.is_active)) })
        .catch(() => {})

      fetch('/api/admin/users')
        .then((r) => r.json())
        .then((j) => { if (j.success) setAgents(j.data.filter((u: UserType) => u.is_active)) })
        .catch(() => {})
    }
    init()

    // Fallback polling every 30s
    const interval = setInterval(loadMessages, 30000)
    return () => clearInterval(interval)
  }, [loadTicket, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load customer history when ticket is loaded
  useEffect(() => {
    if (!ticket?.customer_id) return
    fetch(`/api/admin/tickets?customer_id=${ticket.customer_id}&limit=5`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setCustomerHistory(j.data.filter((t: Ticket) => t.id !== ticketId))
      })
      .catch(() => {})
  }, [ticket?.customer_id, ticketId])

  async function handleSend() {
    if ((!newMessage.trim() && attachments.length === 0) || isSending) return
    setIsSending(true)

    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newMessage.trim() || '[Arquivo anexado]',
          is_internal_note: isInternalNote,
          attachments,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setNewMessage('')
        setAttachments([])
        if (!isConnected) loadMessages()
        loadTicket()
      }
    } catch {
      toast.error('Erro ao enviar mensagem')
    } finally {
      setIsSending(false)
    }
  }

  async function updateTicket(field: string, value: string) {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      const json = await res.json()
      if (json.success) {
        loadTicket()
        toast.success('Ticket atualizado')
      }
    } catch {
      toast.error('Erro ao atualizar ticket')
    }
  }

  async function handleSuggest() {
    if (isSuggesting) return
    setIsSuggesting(true)
    try {
      // Find the last customer message
      const customerMessages = messages.filter((m) => m.sender_type === 'customer')
      const lastCustomerMsg = customerMessages[customerMessages.length - 1]

      if (!lastCustomerMsg) {
        toast.error('Nenhuma mensagem do cliente encontrada')
        return
      }

      const res = await fetch('/api/admin/ai-suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_description: ticket?.description || '',
          messages: messages.slice(-8).map((m) => ({
            sender_type: m.sender_type,
            content: m.content,
          })),
          customer_question: lastCustomerMsg.content,
        }),
      })
      const json = await res.json()
      if (json.success && json.data.suggestion) {
        setNewMessage(json.data.suggestion)
        toast.success(`Sugestao gerada (${json.data.articles_count} artigos usados)`)
      } else {
        toast.error(json.data?.message || json.error || 'Sem sugestao disponivel')
      }
    } catch {
      toast.error('Erro ao gerar sugestao')
    } finally {
      setIsSuggesting(false)
    }
  }

  function getSenderIcon(senderType: string) {
    switch (senderType) {
      case 'ai':
        return <Bot className="h-4 w-4 text-primary" />
      case 'agent':
        return <Monitor className="h-4 w-4 text-green-400" />
      case 'system':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      default:
        return <User className="h-4 w-4 text-blue-400" />
    }
  }

  if (isLoading) {
    return (
      <>
        <Header title="Ticket" />
        <div className="p-6">
          <LoadingState message="Carregando ticket..." />
        </div>
      </>
    )
  }

  if (!ticket) {
    return (
      <>
        <Header title="Ticket" />
        <div className="flex flex-col items-center p-12">
          <h2 className="text-xl font-bold">Ticket nao encontrado</h2>
          <Button variant="outline" onClick={() => router.push('/admin/tickets')} className="mt-4">
            Voltar
          </Button>
        </div>
      </>
    )
  }

  const customer = ticket.customer as TicketWithRelations['customer']

  return (
    <>
      <Header>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/admin/tickets')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-bold text-primary">
            {ticket.ticket_code}
          </span>
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <div title={isConnected ? 'Tempo real ativo' : 'Reconectando...'}>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </Header>

      <div className="flex h-[calc(100vh-64px)]">
        {/* Main chat area */}
        <div className="flex flex-1 flex-col">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="mx-auto max-w-3xl space-y-4">
              {/* Ticket description as first message */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h3 className="mb-2 font-semibold">{ticket.title}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {ticket.description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Aberto por {customer?.name} em {formatDate(ticket.created_at)}
                </p>
              </div>

              {messages.map((msg) => {
                if (msg.sender_type === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="rounded-full bg-muted px-4 py-1.5 text-xs text-muted-foreground">
                        {msg.content}
                      </span>
                    </div>
                  )
                }

                const isAgent = msg.sender_type === 'agent'
                const isInternal = msg.is_internal_note
                const msgAttachments = (msg.attachments as unknown as Attachment[]) || []

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isAgent ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isAgent && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                        {getSenderIcon(msg.sender_type)}
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                        isInternal
                          ? 'border-2 border-yellow-500/30 bg-yellow-500/5'
                          : isAgent
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-card border border-border'
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2">
                        <p className={`text-xs font-medium ${isAgent && !isInternal ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          {SENDER_TYPE_LABELS[msg.sender_type]}
                        </p>
                        {isInternal && (
                          <Badge variant="outline" className="border-yellow-500/50 text-yellow-400 text-xs px-1.5 py-0">
                            <Lock className="mr-1 h-3 w-3" />
                            Nota interna
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <MessageAttachments attachments={msgAttachments} />
                      <p className={`mt-1 text-right text-xs ${isAgent && !isInternal ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatRelativeTime(msg.created_at)}
                      </p>
                    </div>
                    {isAgent && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-500/20">
                        <Monitor className="h-4 w-4 text-green-400" />
                      </div>
                    )}
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className={`border-t p-4 ${isInternalNote ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border'}`}>
            <div className="mx-auto max-w-3xl">
              <div className="mb-2 flex items-center gap-3">
                <Switch
                  id="internal"
                  checked={isInternalNote}
                  onCheckedChange={setIsInternalNote}
                />
                <Label htmlFor="internal" className="text-sm">
                  {isInternalNote ? (
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Lock className="h-3 w-3" /> Nota interna
                    </span>
                  ) : (
                    'Resposta para o cliente'
                  )}
                </Label>
              </div>
              {/* Attachment previews */}
              {attachments.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-2">
                  {attachments.map((att, i) => (
                    <AttachmentPreview
                      key={i}
                      attachment={att}
                      onRemove={() => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
                    />
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex flex-col gap-1">
                  <FileUploadButton
                    ticketId={ticketId}
                    onUpload={(att) => setAttachments((prev) => [...prev, att])}
                    disabled={isSending}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleSuggest}
                    disabled={isSuggesting || isInternalNote}
                    title="Sugestao da IA"
                    className="text-primary hover:text-primary"
                  >
                    {isSuggesting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="relative flex-1">
                  {showQuickReplies && (
                    <div className="absolute bottom-full left-0 right-0 mb-1 max-h-48 overflow-y-auto rounded-lg border border-border bg-card shadow-lg z-10">
                      {quickReplies
                        .filter((qr) =>
                          !qrFilter || qr.shortcut.includes(qrFilter) || qr.title.toLowerCase().includes(qrFilter.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((qr) => (
                          <button
                            key={qr.id}
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                            onClick={() => {
                              setNewMessage(qr.content)
                              setShowQuickReplies(false)
                              setQrFilter('')
                            }}
                          >
                            <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-primary">
                              /{qr.shortcut}
                            </code>
                            <span className="truncate text-muted-foreground">{qr.title}</span>
                          </button>
                        ))}
                      {quickReplies.filter((qr) =>
                        !qrFilter || qr.shortcut.includes(qrFilter) || qr.title.toLowerCase().includes(qrFilter.toLowerCase())
                      ).length === 0 && (
                        <p className="px-3 py-2 text-xs text-muted-foreground">Nenhuma resposta encontrada</p>
                      )}
                    </div>
                  )}
                  <Textarea
                    placeholder={isInternalNote ? 'Escreva uma nota interna... (/ para atalhos)' : 'Escreva uma resposta... (/ para atalhos)'}
                    value={newMessage}
                    onChange={(e) => {
                      const val = e.target.value
                      setNewMessage(val)
                      if (val.startsWith('/')) {
                        setShowQuickReplies(true)
                        setQrFilter(val.slice(1))
                      } else {
                        setShowQuickReplies(false)
                        setQrFilter('')
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        handleSend()
                      }
                      if (e.key === 'Escape') {
                        setShowQuickReplies(false)
                      }
                    }}
                    onBlur={() => setTimeout(() => setShowQuickReplies(false), 200)}
                    className="min-h-[60px] max-h-[150px] resize-none bg-muted"
                    rows={2}
                  />
                </div>
                <Button
                  onClick={handleSend}
                  disabled={(!newMessage.trim() && attachments.length === 0) || isSending}
                  className={isInternalNote ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                >
                  {isSending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Ctrl+Enter para enviar
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="hidden w-80 border-l border-border lg:block">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-6">
              {/* Ticket Info */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Informacoes
                </h3>
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <Select
                      value={ticket.status}
                      onValueChange={(v) => updateTicket('status', v)}
                    >
                      <SelectTrigger className="mt-1 bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TICKET_STATUS_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Prioridade</Label>
                    <Select
                      value={ticket.priority}
                      onValueChange={(v) => updateTicket('priority', v)}
                    >
                      <SelectTrigger className="mt-1 bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Produto</Label>
                    <p className="mt-1 text-sm">{ticket.product?.name || '-'}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Categoria</Label>
                    <p className="mt-1 text-sm">{ticket.category?.name || '-'}</p>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Criado em</Label>
                    <p className="mt-1 text-sm">{formatDate(ticket.created_at)}</p>
                  </div>

                  {/* SLA indicators */}
                  {ticket.sla_first_response_at && !ticket.first_response_at && (
                    <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
                      <div className="flex items-center gap-2 text-yellow-400">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-xs font-medium">SLA Primeira Resposta</span>
                      </div>
                      <p className="mt-1 text-sm">
                        {formatRelativeTime(ticket.sla_first_response_at)}
                      </p>
                    </div>
                  )}

                  {ticket.satisfaction_rating && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <Label className="text-xs text-muted-foreground">Avaliacao</Label>
                      <div className="mt-1 flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`h-4 w-4 ${s <= ticket.satisfaction_rating! ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                          />
                        ))}
                      </div>
                      {ticket.satisfaction_comment && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          &ldquo;{ticket.satisfaction_comment}&rdquo;
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Customer Info */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Cliente
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-medium text-primary">
                      {customer?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium">{customer?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{customer?.email}</span>
                  </div>
                  {customer?.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{formatPhone(customer.phone)}</span>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Agent Assignment */}
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  Agente Responsavel
                </h3>
                <Select
                  value={ticket.assigned_agent_id || '_none'}
                  onValueChange={(v) => updateTicket('assigned_agent_id', v === '_none' ? '' : v)}
                >
                  <SelectTrigger className="bg-muted">
                    <SelectValue placeholder="Nenhum agente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">Nenhum agente</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer History */}
              {customerHistory.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      <History className="h-4 w-4" />
                      Historico do Cliente
                    </h3>
                    <div className="space-y-2">
                      {customerHistory.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => router.push(`/admin/tickets/${t.id}`)}
                          className="w-full rounded-lg border border-border p-2 text-left transition-colors hover:bg-muted/50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-primary">{t.ticket_code}</span>
                            <StatusBadge status={t.status} />
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">{t.title}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  )
}
