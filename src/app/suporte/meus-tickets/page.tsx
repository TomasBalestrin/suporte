'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriorityBadge } from '@/components/common/PriorityBadge'
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Ticket,
  Search,
  Clock,
  Package,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatRelativeTime } from '@/lib/utils/format'
import { cpfMask } from '@/lib/utils/format'

interface TicketItem {
  id: string
  ticket_code: string
  title: string
  status: string
  priority: string
  access_token: string
  created_at: string
  updated_at: string
  product: { id: string; name: string } | null
  category: { id: string; name: string } | null
}

interface CustomerData {
  name: string
  email: string
}

export default function MeusTicketsPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [tickets, setTickets] = useState<TicketItem[]>([])
  const [hasSearched, setHasSearched] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !cpf.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/tickets/my-tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), cpf: cpf.replace(/\D/g, '') }),
      })
      const json = await res.json()

      if (json.success) {
        setCustomer(json.data.customer)
        setTickets(json.data.tickets)
        setHasSearched(true)
      } else {
        setError(json.error || 'Erro ao buscar tickets')
      }
    } catch {
      setError('Erro de conexão. Verifique sua internet e tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleReset() {
    setCustomer(null)
    setTickets([])
    setHasSearched(false)
    setError(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <span className="text-sm font-bold text-primary-foreground">B</span>
            </div>
            <span className="text-lg font-bold text-foreground">Bethel Suporte</span>
          </div>
          <button
            onClick={() => router.push('/suporte')}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Ticket className="h-7 w-7 text-primary" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Meus Tickets
          </h1>
          <p className="mb-8 text-sm text-muted-foreground">
            Consulte o histórico de todos os seus tickets de suporte
          </p>
        </motion.div>

        {/* Search Form */}
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="mx-auto max-w-md border-border bg-card shadow-sm">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
                      E-mail
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Seu e-mail de cadastro"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null) }}
                      className="bg-muted text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="cpf" className="mb-1.5 block text-sm font-medium text-foreground">
                      CPF
                    </label>
                    <Input
                      id="cpf"
                      type="text"
                      placeholder="000.000.000-00"
                      value={cpf}
                      onChange={(e) => { setCpf(cpfMask(e.target.value)); setError(null) }}
                      className="bg-muted text-sm"
                      maxLength={14}
                      required
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3"
                      >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <p className="text-sm text-destructive">{error}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button type="submit" className="w-full" disabled={isLoading || !email.trim() || cpf.replace(/\D/g, '').length < 11}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Buscar meus tickets
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        {hasSearched && customer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Customer info + back */}
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Olá, <span className="font-medium text-foreground">{customer.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">{customer.email}</p>
              </div>
              <Button variant="outline" size="sm" onClick={handleReset}>
                Nova busca
              </Button>
            </div>

            {tickets.length === 0 ? (
              <Card className="border-border bg-card shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                    <Ticket className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="mb-1 text-lg font-semibold">Nenhum ticket encontrado</h3>
                  <p className="mb-4 max-w-md text-sm text-muted-foreground">
                    Você ainda não possui tickets de suporte registrados.
                  </p>
                  <Button variant="outline" onClick={() => router.push('/suporte/ajuda')}>
                    Abrir novo ticket
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} encontrado{tickets.length !== 1 ? 's' : ''}
                </p>
                {tickets.map((ticket, i) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Card
                      className="group cursor-pointer border-border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                      onClick={() => router.push(`/suporte/ticket/${ticket.access_token}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex items-center gap-2">
                              <span className="font-mono text-xs font-medium text-primary">
                                {ticket.ticket_code}
                              </span>
                              <StatusBadge status={ticket.status} />
                              <PriorityBadge priority={ticket.priority} />
                            </div>
                            <h3 className="mb-2 truncate text-sm font-medium text-foreground">
                              {ticket.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              {ticket.product && (
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {ticket.product.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatRelativeTime(ticket.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <p className="text-xs text-muted-foreground">
            Bethel Suporte — Sistema de atendimento inteligente
          </p>
        </div>
      </footer>
    </div>
  )
}
