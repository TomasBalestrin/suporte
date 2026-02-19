'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Ticket, Search, ArrowRight, MessageCircle, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'

export default function SupportPage() {
  const router = useRouter()
  const [ticketCode, setTicketCode] = useState('')
  const [ticketEmail, setTicketEmail] = useState('')
  const [lookupStep, setLookupStep] = useState<'code' | 'email'>('code')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  async function handleLookup() {
    if (lookupStep === 'code') {
      if (!ticketCode.trim()) return
      setLookupStep('email')
      return
    }

    setIsSearching(true)
    setLookupError(null)

    try {
      const res = await fetch(
        `/api/tickets/by-code/${encodeURIComponent(ticketCode.trim())}?email=${encodeURIComponent(ticketEmail.trim())}`
      )
      const json = await res.json()

      if (json.success && json.data) {
        router.push(`/suporte/ticket/${json.data.access_token}`)
      } else {
        setLookupError('Ticket nao encontrado ou email nao confere')
      }
    } catch {
      setLookupError('Erro ao buscar ticket')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-4xl items-center px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">B</span>
            </div>
            <span className="text-lg font-bold">Bethel Suporte</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="mb-4 text-4xl font-bold tracking-tight">
            Como podemos te <span className="text-primary">ajudar</span>?
          </h1>
          <p className="text-lg text-muted-foreground">
            Nossa equipe e inteligencia artificial estao prontas para resolver seu problema
          </p>
        </motion.div>

        {/* Two main paths */}
        <div className="mb-12 grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card
              className="group cursor-pointer border-border bg-card transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
              onClick={() => router.push('/suporte/ajuda')}
            >
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <MessageCircle className="h-8 w-8 text-primary" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">Preciso de ajuda</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Nossa IA vai tentar resolver seu problema. Se nao conseguir, abrimos um ticket automaticamente.
                </p>
                <Button variant="outline" className="group-hover:border-primary group-hover:text-primary">
                  Iniciar atendimento
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border bg-card">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary/10">
                  <Ticket className="h-8 w-8 text-secondary" />
                </div>
                <h2 className="mb-2 text-xl font-semibold">Ja tenho um ticket</h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  Digite o codigo do seu ticket para acompanhar o andamento.
                </p>

                <div className="w-full space-y-3">
                  <Input
                    placeholder="SUP-2026-0001"
                    value={ticketCode}
                    onChange={(e) => {
                      setTicketCode(e.target.value.toUpperCase())
                      setLookupError(null)
                      if (lookupStep === 'email') setLookupStep('code')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLookup()
                    }}
                    className="bg-muted text-center font-mono"
                  />
                  {lookupStep === 'email' && (
                    <Input
                      type="email"
                      placeholder="Seu email cadastrado"
                      value={ticketEmail}
                      onChange={(e) => {
                        setTicketEmail(e.target.value)
                        setLookupError(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLookup()
                      }}
                      className="bg-muted text-center"
                      autoFocus
                    />
                  )}
                  {lookupError && (
                    <p className="text-sm text-destructive">{lookupError}</p>
                  )}
                  <Button
                    variant="outline"
                    onClick={handleLookup}
                    disabled={isSearching || (lookupStep === 'code' && !ticketCode.trim()) || (lookupStep === 'email' && !ticketEmail.trim())}
                    className="w-full"
                  >
                    {isSearching ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    {lookupStep === 'code' ? 'Buscar ticket' : 'Verificar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        Bethel Suporte &mdash; Sistema de atendimento inteligente
      </footer>
    </div>
  )
}
