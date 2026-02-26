'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { LoadingState } from '@/components/common/LoadingState'
import { FileUploadButton, AttachmentPreview, MessageAttachments } from '@/components/chat/FileUploadButton'
import type { Attachment } from '@/components/chat/FileUploadButton'
import { useRealtimeMessages } from '@/hooks/useRealtimeMessages'
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Monitor,
  Star,
  Loader2,
  Clock,
  Wifi,
  WifiOff,
  MessageSquare,
  AlertCircle,
  Lock,
} from 'lucide-react'
import { formatRelativeTime } from '@/lib/utils/format'
import { SENDER_TYPE_LABELS } from '@/lib/utils/constants'
import type { Message, TicketWithRelations } from '@/lib/supabase/types'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

export default function TicketTrackingPage() {
  const params = useParams()
  const token = params.token as string

  const [ticket, setTicket] = useState<TicketWithRelations | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [showRating, setShowRating] = useState(false)
  const [rating, setRating] = useState(0)
  const [ratingComment, setRatingComment] = useState('')
  const [isRating, setIsRating] = useState(false)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loadError, setLoadError] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/by-token/${token}`)
      const json = await res.json()
      if (json.success) {
        setTicket(json.data)
        setLoadError(false)
        if (
          (json.data.status === 'resolved' || json.data.status === 'resolved_ia') &&
          !json.data.satisfaction_rating
        ) {
          setShowRating(true)
        }
      }
    } catch {
      setLoadError(true)
    }
  }, [token])

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${token}/messages`)
      const json = await res.json()
      if (json.success) setMessages(json.data)
    } catch {
      // polling silencioso - nao mostrar erro repetido
    }
  }, [token])

  // Realtime subscription for new messages
  const handleNewMessage = useCallback(
    (message: Message) => {
      // Only show non-internal messages in customer view
      if (message.is_internal_note) return
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev
        return [...prev, message]
      })
      // Reload ticket data if status might have changed
      loadTicket()
    },
    [loadTicket]
  )

  const { isConnected, hasConnectionError } = useRealtimeMessages({
    ticketId: ticket?.id || null,
    onNewMessage: handleNewMessage,
  })

  useEffect(() => {
    async function init() {
      await Promise.all([loadTicket(), loadMessages()])
      setIsLoading(false)
    }
    init()

    // Fallback polling every 30s (in case Realtime disconnects)
    const interval = setInterval(loadMessages, 30000)
    return () => clearInterval(interval)
  }, [loadTicket, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if ((!newMessage.trim() && attachments.length === 0) || isSending) return
    setIsSending(true)

    const savedMessage = newMessage
    const savedAttachments = [...attachments]

    try {
      const res = await fetch(`/api/tickets/${token}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: savedMessage.trim() || '[Arquivo anexado]',
          attachments: savedAttachments,
        }),
      })
      const json = await res.json()
      if (json.success) {
        setNewMessage('')
        setAttachments([])
        if (!isConnected) loadMessages()
        loadTicket()
      } else {
        toast.error('Erro ao enviar mensagem. Tente novamente.')
      }
    } catch {
      toast.error('Erro de conexao. Verifique sua internet.')
    } finally {
      setIsSending(false)
    }
  }

  async function handleRate() {
    if (rating === 0 || isRating) return
    setIsRating(true)

    try {
      const res = await fetch(`/api/tickets/${token}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment: ratingComment.slice(0, 1000) }),
      })
      const json = await res.json()
      if (json.success) {
        setShowRating(false)
        loadTicket()
        toast.success('Avaliacao enviada! Obrigado.')
      } else {
        toast.error('Erro ao enviar avaliacao. Tente novamente.')
      }
    } catch {
      toast.error('Erro de conexao. Verifique sua internet.')
    } finally {
      setIsRating(false)
    }
  }

  function getSenderIcon(senderType: string) {
    switch (senderType) {
      case 'ai':
        return <Bot className="h-4 w-4 text-primary" />
      case 'agent':
        return <Monitor className="h-4 w-4 text-green-600" />
      case 'system':
        return <Clock className="h-4 w-4 text-muted-foreground" />
      default:
        return <User className="h-4 w-4 text-blue-600" />
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState message="Carregando ticket..." />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <AlertCircle className="h-8 w-8 text-muted-foreground" />
        </div>
        {loadError ? (
          <>
            <h1 className="mb-2 text-2xl font-bold">Erro de conexao</h1>
            <p className="mb-6 text-center text-muted-foreground">
              Nao foi possivel carregar o ticket. Verifique sua internet e tente novamente.
            </p>
            <Button onClick={() => { setIsLoading(true); setLoadError(false); loadTicket().then(() => loadMessages()).finally(() => setIsLoading(false)) }}>
              Tentar novamente
            </Button>
          </>
        ) : (
          <>
            <h1 className="mb-2 text-2xl font-bold">Ticket nao encontrado</h1>
            <p className="mb-1 text-center text-muted-foreground">
              O link pode estar incorreto ou ter expirado.
            </p>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Tente buscar pelo codigo do ticket na pagina de suporte.
            </p>
            <Link href="/suporte">
              <Button variant="outline">Voltar ao suporte</Button>
            </Link>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-4 px-4">
          <Link href="/suporte" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-primary">
                {ticket.ticket_code}
              </span>
              <StatusBadge status={ticket.status} />
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {ticket.product?.name} &middot; {ticket.category?.name}
            </p>
          </div>
          <div
            role="status"
            aria-label={isConnected ? 'Conectado em tempo real' : hasConnectionError ? 'Conexao perdida' : 'Reconectando...'}
            title={isConnected ? 'Conectado em tempo real' : hasConnectionError ? 'Conexao perdida — atualizando a cada 30s' : 'Reconectando...'}
          >
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-600" aria-hidden="true" />
            ) : hasConnectionError ? (
              <WifiOff className="h-4 w-4 text-destructive" aria-hidden="true" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground animate-pulse motion-reduce:animate-none" aria-hidden="true" />
            )}
          </div>
        </div>
      </header>

      {/* Messages area */}
      <div className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-4">
          {/* Rating banner */}
          {showRating && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="mb-4 border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <p className="mb-3 text-center font-medium text-green-700">
                    Seu ticket foi resolvido! Como foi o atendimento?
                  </p>
                  <div className="mb-3 flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        aria-label={`${star} estrela${star > 1 ? 's' : ''}`}
                        aria-pressed={star <= rating}
                        className="rounded-md transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary/50"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= rating
                              ? 'fill-yellow-400 text-yellow-500'
                              : 'text-muted-foreground'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  {rating > 0 && (
                    <>
                      <Input
                        placeholder="Comentario (opcional)"
                        value={ratingComment}
                        onChange={(e) => setRatingComment(e.target.value)}
                        className="mb-3 bg-muted"
                      />
                      <Button
                        onClick={handleRate}
                        disabled={isRating}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        {isRating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : null}
                        Enviar avaliacao
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Messages */}
          <div className="space-y-4" aria-live="polite" aria-relevant="additions">
            {messages.length === 0 && (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <MessageSquare className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhuma mensagem ainda</p>
                <p className="text-xs text-muted-foreground">
                  Envie uma mensagem para iniciar a conversa com a equipe.
                </p>
              </div>
            )}
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

              const isCustomer = msg.sender_type === 'customer'
              const msgAttachments = (msg.attachments as unknown as Attachment[]) || []

              return (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${isCustomer ? 'justify-end' : 'justify-start'}`}
                >
                  {!isCustomer && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                      {getSenderIcon(msg.sender_type)}
                    </div>
                  )}
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      isCustomer
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card border border-border'
                    }`}
                  >
                    {!isCustomer && (
                      <p className="mb-1 text-xs font-medium text-muted-foreground">
                        {msg.sender_type === 'ai' ? 'IA Sofia' : SENDER_TYPE_LABELS[msg.sender_type]}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <MessageAttachments attachments={msgAttachments} />
                    <p
                      className={`mt-1 text-right text-xs ${
                        isCustomer ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}
                    >
                      {formatRelativeTime(msg.created_at)}
                    </p>
                  </div>
                  {isCustomer && (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input area */}
      {ticket.status === 'closed' ? (
        <div className="border-t border-border bg-card/50 backdrop-blur-lg">
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 px-4 py-4">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Este ticket foi encerrado. Precisa de mais ajuda?{' '}
              <Link href="/suporte/ajuda" className="font-medium text-primary hover:underline">
                Abrir novo ticket
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="border-t border-border bg-card/50 backdrop-blur-lg">
          <div className="mx-auto max-w-3xl px-4 py-3">
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
            <div className="flex items-center gap-2">
              <FileUploadButton
                ticketId={ticket.id}
                accessToken={token}
                onUpload={(att) => setAttachments((prev) => [...prev, att])}
                disabled={isSending}
              />
              <Textarea
                placeholder="Digite sua mensagem..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                className="min-h-[44px] max-h-[120px] resize-none bg-muted"
                rows={1}
              />
              <Button
                onClick={handleSend}
                disabled={(!newMessage.trim() && attachments.length === 0) || isSending}
                size="icon"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
