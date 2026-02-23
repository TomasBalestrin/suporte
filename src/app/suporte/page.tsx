'use client'

import { useState, useMemo, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Ticket,
  Search,
  ArrowRight,
  MessageCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
  Clock,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const quickTopics = [
  {
    icon: KeyRound,
    title: 'Acesso e Senha',
    description: 'Login, senha padrao e plataforma de acesso',
    color: 'text-blue-600 bg-blue-50',
    faqIndex: 0,
  },
  {
    icon: ShieldCheck,
    title: 'Garantia e Reembolso',
    description: 'Prazo de 7 dias e como solicitar',
    color: 'text-violet-600 bg-violet-50',
    faqIndex: 1,
  },
  {
    icon: Clock,
    title: 'Horario de Atendimento',
    description: 'Segunda a sexta, 8h30 as 20h',
    color: 'text-amber-600 bg-amber-50',
    faqIndex: 3,
  },
  {
    icon: HelpCircle,
    title: 'Como usar meu produto',
    description: 'Duvidas sobre aplicacao do conteudo',
    color: 'text-rose-600 bg-rose-50',
    faqIndex: 4,
  },
]

const faqItems = [
  {
    question: 'Como acesso meu produto apos a compra?',
    answer:
      'Depende do produto:\n\n• Produtos Julia Ottoni: juliaacademy.com.br (senha: ottoni123)\n• Produtos Cleiton: cleitonquerobin1.com.br/area-de-membros (senha: performance123)\n• 50 Scripts: scriptgo.app/login (senha: Script@123)\n• Couply: usecouply.app/login (senha: 12345678)\n\nUse sempre o e-mail da compra como login.',
    tags: ['acesso', 'login', 'senha', 'produto', 'compra', 'plataforma'],
  },
  {
    question: 'Tem garantia? Como funciona o reembolso?',
    answer: 'Sim! Voce tem 7 dias de garantia a partir da data da compra. Para solicitar o reembolso, entre em contato pela propria plataforma de compra (Hotmart ou Pagtrust).',
    tags: ['garantia', 'reembolso', '7 dias', 'devolucao', 'devolver'],
  },
  {
    question: 'Nao recebi o e-mail de confirmacao. E agora?',
    answer: 'Verifique sua caixa de spam ou lixo eletronico. O produto tambem e enviado por WhatsApp, porem esse nao e um canal de suporte. Se nao encontrar, abra um ticket aqui na plataforma informando seu nome, e-mail de compra e nome do produto.',
    tags: ['email', 'confirmacao', 'spam', 'nao recebi', 'whatsapp'],
  },
  {
    question: 'Qual o horario de atendimento?',
    answer: 'Nosso atendimento funciona de segunda a sexta-feira, das 8h30 as 20h (horario de Brasilia). Fora desse horario voce pode abrir um ticket normalmente e responderemos assim que retornarmos.',
    tags: ['horario', 'atendimento', 'funcionamento', 'segunda', 'sexta'],
  },
  {
    question: 'Como usar meu produto?',
    answer: 'Acesse a plataforma do seu produto usando o e-mail da compra e a senha padrao informada no e-mail de confirmacao. Se tiver duvidas sobre como aplicar o conteudo ou navegar na plataforma, abra um ticket e nossa equipe ira te orientar passo a passo.',
    tags: ['usar', 'produto', 'conteudo', 'aplicar', 'duvida', 'plataforma'],
  },
]

function isWithinSupportHours(): boolean {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  })
  const parts = formatter.formatToParts(now)
  const weekday = parts.find((p) => p.type === 'weekday')?.value
  const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
  const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)
  const timeInMinutes = hour * 60 + minute
  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  // Seg-Sex, 8h30 (510min) as 20h (1200min)
  return weekdays.includes(weekday || '') && timeInMinutes >= 510 && timeInMinutes < 1200
}

export default function SupportPage() {
  const router = useRouter()
  const [ticketCode, setTicketCode] = useState('')
  const [ticketEmail, setTicketEmail] = useState('')
  const [lookupStep, setLookupStep] = useState<'code' | 'email'>('code')
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showTicketLookup, setShowTicketLookup] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [highlightedFaq, setHighlightedFaq] = useState<number | null>(null)
  const [faqSearch, setFaqSearch] = useState('')

  const faqRef = useRef<HTMLDivElement>(null)
  const faqCardRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const isOnline = isWithinSupportHours()

  const scrollToFaq = useCallback((faqIndex: number) => {
    setFaqSearch('')
    setOpenFaq(faqIndex)
    setHighlightedFaq(faqIndex)
    setTimeout(() => {
      const card = faqCardRefs.current.get(faqIndex)
      card?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
    setTimeout(() => setHighlightedFaq(null), 2000)
  }, [])

  const filteredFaq = useMemo(() => {
    if (!faqSearch.trim()) return faqItems
    const search = faqSearch.toLowerCase().trim()
    return faqItems.filter(
      (item) =>
        item.question.toLowerCase().includes(search) ||
        item.answer.toLowerCase().includes(search) ||
        item.tags.some((tag) => tag.includes(search))
    )
  }, [faqSearch])

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
        setLookupError('Ticket nao encontrado ou e-mail nao confere. Verifique os dados e tente novamente.')
      }
    } catch {
      setLookupError('Erro de conexao. Verifique sua internet e tente novamente.')
    } finally {
      setIsSearching(false)
    }
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
          <div className="flex items-center gap-3">
            {/* Indicador de horario */}
            <div className="hidden items-center gap-1.5 sm:flex">
              <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
              <span className="text-xs text-muted-foreground">
                {isOnline ? 'Atendimento ativo' : 'Fora do horario'}
              </span>
            </div>
            <button
              onClick={() => setShowTicketLookup(!showTicketLookup)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Ticket className="h-4 w-4" />
              Acompanhar ticket
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="py-12 text-center md:py-16"
        >
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Ola! Como podemos te ajudar?
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-base text-muted-foreground">
            Tire suas duvidas rapidamente ou fale com nossa equipe de suporte
          </p>
          <Button
            size="lg"
            onClick={() => router.push('/suporte/ajuda')}
            className="h-12 rounded-xl px-8 text-base font-semibold shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Iniciar atendimento
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>

          {/* Horario de atendimento no mobile */}
          <div className="mt-4 flex items-center justify-center gap-1.5 sm:hidden">
            <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/40'}`} />
            <span className="text-xs text-muted-foreground">
              {isOnline ? 'Atendimento ativo agora' : 'Fora do horario — Seg a Sex, 8h30 as 20h'}
            </span>
          </div>
        </motion.section>

        {/* Ticket Lookup - Collapsible */}
        <AnimatePresence>
          {showTicketLookup && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 overflow-hidden"
            >
              <Card className="mx-auto max-w-md border-border bg-card shadow-sm">
                <CardContent className="p-5">
                  <h3 className="mb-3 text-center text-sm font-semibold text-foreground">
                    Acompanhar meu ticket
                  </h3>
                  <div className="space-y-2.5">
                    <Input
                      placeholder="Codigo do ticket (ex: SUP-2026-0001)"
                      value={ticketCode}
                      onChange={(e) => {
                        setTicketCode(e.target.value.toUpperCase())
                        setLookupError(null)
                        if (lookupStep === 'email') setLookupStep('code')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleLookup()
                      }}
                      className="bg-muted text-center font-mono text-sm"
                    />
                    {lookupStep === 'email' && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Input
                          type="email"
                          placeholder="Seu e-mail cadastrado"
                          value={ticketEmail}
                          onChange={(e) => {
                            setTicketEmail(e.target.value)
                            setLookupError(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleLookup()
                          }}
                          className="bg-muted text-center text-sm"
                          autoFocus
                        />
                      </motion.div>
                    )}
                    {lookupError && (
                      <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        <p className="text-sm text-destructive">{lookupError}</p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      onClick={handleLookup}
                      disabled={
                        isSearching ||
                        (lookupStep === 'code' && !ticketCode.trim()) ||
                        (lookupStep === 'email' && !ticketEmail.trim())
                      }
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
            </motion.section>
          )}
        </AnimatePresence>

        {/* Quick Topics */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-12"
        >
          <h2 className="mb-6 text-center text-lg font-semibold text-foreground">
            Topicos mais procurados
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {quickTopics.map((topic, i) => {
              const Icon = topic.icon
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <Card
                    className="group cursor-pointer border-border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md"
                    onClick={() => scrollToFaq(topic.faqIndex)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${topic.color}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-foreground">
                          {topic.title}
                        </h3>
                        <p className="truncate text-xs text-muted-foreground">
                          {topic.description}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </motion.section>

        {/* FAQ Accordion with Search */}
        <motion.section
          ref={faqRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-12"
        >
          <h2 className="mb-4 text-center text-lg font-semibold text-foreground">
            Perguntas frequentes
          </h2>
          <div className="mx-auto max-w-2xl">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar nas perguntas frequentes..."
                value={faqSearch}
                onChange={(e) => {
                  setFaqSearch(e.target.value)
                  setOpenFaq(null)
                }}
                className="bg-muted pl-10 text-sm"
              />
            </div>
            <div className="space-y-2">
              {filteredFaq.length > 0 ? (
                filteredFaq.map((item, i) => {
                  const originalIndex = faqItems.indexOf(item)
                  return (
                    <Card
                      key={originalIndex}
                      ref={(el) => { if (el) faqCardRefs.current.set(originalIndex, el) }}
                      className={`border-border bg-card shadow-sm overflow-hidden transition-all ${highlightedFaq === originalIndex ? 'ring-2 ring-primary/50 border-primary/30' : ''}`}
                    >
                      <button
                        onClick={() => setOpenFaq(openFaq === originalIndex ? null : originalIndex)}
                        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="pr-4 text-sm font-medium text-foreground">
                          {item.question}
                        </span>
                        {openFaq === originalIndex ? (
                          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                      </button>
                      <AnimatePresence>
                        {openFaq === originalIndex && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-border px-4 pb-4 pt-3">
                              <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                {item.answer}
                              </p>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  )
                })
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Nenhuma pergunta encontrada para &quot;{faqSearch}&quot;
                  </p>
                  <Button
                    variant="link"
                    className="mt-2 text-sm"
                    onClick={() => router.push('/suporte/ajuda')}
                  >
                    Abrir um chamado com nossa equipe
                  </Button>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* CTA Banner */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 shadow-sm">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center md:flex-row md:text-left">
              <div className="flex-1">
                <h3 className="mb-1 text-lg font-semibold text-foreground">
                  Nao encontrou o que procurava?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Nossa equipe esta pronta para te ajudar de forma rapida e personalizada.
                </p>
              </div>
              <Button
                onClick={() => router.push('/suporte/ajuda')}
                className="shrink-0 rounded-xl shadow-md shadow-primary/20"
              >
                Falar com a equipe
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:justify-between md:text-left">
            <div>
              <p className="text-sm font-semibold text-foreground">Bethel Suporte</p>
              <p className="text-xs text-muted-foreground">
                Sistema de atendimento inteligente
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <p>Atendimento: Seg a Sex, 8h30 as 20h</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
