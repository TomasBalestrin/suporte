'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import { LoadingState } from '@/components/common/LoadingState'
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Monitor,
  Star,
  Loader2,
  Clock,
} from 'lucide-react'
import { formatDate, formatRelativeTime } from '@/lib/utils/format'
import { SENDER_TYPE_LABELS } from '@/lib/utils/constants'
import type { Message, TicketWithRelations } from '@/lib/supabase/types'
import { motion } from 'framer-motion'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadTicket = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/by-token/${token}`)
      const json = await res.json()
      if (json.success) {
        setTicket(json.data)
        if (
          (json.data.status === 'resolved' || json.data.status === 'resolved_ia') &&
          !json.data.satisfaction_rating
        ) {
          setShowRating(true)
        }
      }
    } catch {
      // handle error silently
    }
  }, [token])

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/tickets/${token}/messages`)
      const json = await res.json()
      if (json.success) setMessages(json.data)
    } catch {
      // handle error silently
    }
  }, [token])

  useEffect(() => {
    async function init() {
      await Promise.all([loadTicket(), loadMessages()])
      setIsLoading(false)
    }
    init()

    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  }, [loadTicket, loadMessages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend() {
    if (!newMessage.trim() || isSending) return
    setIsSending(true)

    try {
      const res = await fetch(`/api/tickets/${token}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newMessage.trim() }),
      })
      const json = await res.json()
      if (json.success) {
        setNewMessage('')
        loadMessages()
        loadTicket()
      }
    } catch {
      // handle error
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
        body: JSON.stringify({ rating, comment: ratingComment }),
      })
      const json = await res.json()
      if (json.success) {
        setShowRating(false)
        loadTicket()
      }
    } catch {
      // handle error
    } finally {
      setIsRating(false)
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LoadingState message="Carregando ticket..." />
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <h1 className="mb-2 text-2xl font-bold">Ticket nao encontrado</h1>
        <p className="mb-4 text-muted-foreground">
          Verifique o link ou tente consultar pelo codigo
        </p>
        <Link href="/suporte">
          <Button variant="outline">Voltar ao suporte</Button>
        </Link>
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
              <Card className="mb-4 border-green-500/30 bg-green-500/5">
                <CardContent className="p-4">
                  <p className="mb-3 text-center font-medium text-green-400">
                    Seu ticket foi resolvido! Como foi o atendimento?
                  </p>
                  <div className="mb-3 flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= rating
                              ? 'fill-yellow-400 text-yellow-400'
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
          <div className="space-y-4">
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
      {ticket.status !== 'closed' && (
        <div className="border-t border-border bg-card/50 backdrop-blur-lg">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
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
              disabled={!newMessage.trim() || isSending}
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
      )}
    </div>
  )
}
