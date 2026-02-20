'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ticketFormSchema, type TicketFormData } from '@/lib/utils/validation'
import { phoneMask } from '@/lib/utils/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowLeft, Send, Loader2, Bot, User, CheckCircle, XCircle, ThumbsUp, ThumbsDown, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Product, Category } from '@/lib/supabase/types'
import Link from 'next/link'

type Step = 'form' | 'ai' | 'creating' | 'done'

interface AiMessage {
  role: 'user' | 'ai'
  content: string
  confidence?: number
}

export default function HelpPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('form')
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [aiMessages, setAiMessages] = useState<AiMessage[]>([])
  const [aiName, setAiName] = useState('Sofia')
  const [isAiLoading, setIsAiLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState(false)
  const [ticketResult, setTicketResult] = useState<{
    ticket_code: string
    access_token: string
  } | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const { register, handleSubmit, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<TicketFormData>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: {
      product_id: '',
      category_id: '',
    },
  })

  const phoneValue = watch('phone')

  useEffect(() => {
    async function loadData() {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/categories'),
        ])
        const prodJson = await prodRes.json()
        const catJson = await catRes.json()
        if (prodJson.success) {
          const mainProducts = ['50 Scripts', 'Teste dos Arquétipos']
          const sorted = [...(prodJson.data as Product[])].sort((a, b) => {
            const aIdx = mainProducts.findIndex((name) => a.name.toLowerCase().includes(name.toLowerCase()))
            const bIdx = mainProducts.findIndex((name) => b.name.toLowerCase().includes(name.toLowerCase()))
            if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
            if (aIdx !== -1) return -1
            if (bIdx !== -1) return 1
            return a.name.localeCompare(b.name)
          })
          setProducts(sorted)
        }
        if (catJson.success) setCategories(catJson.data)
      } catch {
        // Dados nao carregaram, selects ficarao vazios
      } finally {
        setIsLoadingData(false)
      }
    }
    loadData()
  }, [])

  async function onFormSubmit(data: TicketFormData) {
    if (isAiLoading) return
    setStep('ai')
    setIsAiLoading(true)

    setAiMessages([{ role: 'user', content: data.description }])

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: data.description,
          product_id: data.product_id,
          category_id: data.category_id,
        }),
      })
      const json = await res.json()

      if (json.success && json.data?.ai_name) {
        setAiName(json.data.ai_name)
      }

      if (json.success && json.data?.answer) {
        setAiMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: json.data.answer,
            confidence: json.data.confidence,
          },
        ])
      } else {
        setAiMessages((prev) => [
          ...prev,
          {
            role: 'ai',
            content: 'Nao encontrei uma resposta na base de conhecimento. Vou abrir um ticket para voce!',
          },
        ])
      }
    } catch {
      setAiMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: 'Desculpe, tive um problema ao buscar a resposta. Vou abrir um ticket para voce!',
        },
      ])
    } finally {
      setIsAiLoading(false)
    }
  }

  async function sendFeedback(helpful: boolean) {
    setFeedbackGiven(true)
    try {
      const userMsg = aiMessages.find((m) => m.role === 'user')
      if (userMsg) {
        await fetch('/api/ai/feedback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: userMsg.content, helpful }),
        })
      }
    } catch {
      // non-blocking
    }
  }

  async function handleResolved() {
    if (!feedbackGiven) sendFeedback(true)
    setStep('done')
    setTicketResult(null)
  }

  async function handleNotResolved() {
    if (isCreating) return
    if (!feedbackGiven) sendFeedback(false)
    setStep('creating')
    setIsCreating(true)
    setCreateError(null)

    const formData = watch()

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          product_id: formData.product_id,
          category_id: formData.category_id,
          title: formData.description.slice(0, 100),
          description: formData.description,
          ai_messages: aiMessages,
        }),
      })
      const json = await res.json()

      if (json.success) {
        setTicketResult({
          ticket_code: json.data.ticket_code,
          access_token: json.data.access_token,
        })
        setStep('done')
      } else {
        throw new Error(json.error || 'Erro desconhecido')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
      setCreateError(`Nao foi possivel criar o ticket: ${errorMsg}`)
      setStep('ai')
    } finally {
      setIsCreating(false)
    }
  }

  const stepLabels = [
    { key: 'form', label: 'Dados' },
    { key: 'ai', label: 'IA' },
    { key: 'done', label: 'Conclusao' },
  ]

  const currentStepIndex = step === 'form' ? 0 : step === 'ai' ? 1 : 2

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-2xl items-center gap-4 px-4">
          <Link href="/suporte" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">B</span>
            </div>
            <span className="text-lg font-bold">Bethel Suporte</span>
          </div>
        </div>
        {/* Stepper */}
        <div className="mx-auto max-w-2xl px-4 pb-3">
          <div className="flex items-center justify-between">
            {stepLabels.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    i < currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : i === currentStepIndex
                        ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {i < currentStepIndex ? (
                    <CheckCircle className="h-3.5 w-3.5" />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={`text-xs font-medium ${
                    i <= currentStepIndex ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {s.label}
                </span>
                {i < stepLabels.length - 1 && (
                  <div
                    className={`mx-2 h-px w-8 sm:w-16 ${
                      i < currentStepIndex ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {/* Erro de criacao de ticket */}
        <AnimatePresence>
          {createError && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 flex items-center gap-2 rounded-lg bg-destructive/10 p-3"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
              <p className="flex-1 text-sm text-destructive">{createError}</p>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-destructive text-destructive hover:bg-destructive/10"
                onClick={() => { setCreateError(null); handleNotResolved() }}
              >
                Tentar novamente
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle>Preciso de ajuda</CardTitle>
                  <CardDescription>
                    Preencha os dados abaixo para que possamos te atender da melhor forma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome completo *</Label>
                        <Input
                          id="name"
                          {...register('name')}
                          className="bg-muted"
                          placeholder="Seu nome"
                        />
                        {errors.name && (
                          <p className="text-sm text-destructive">{errors.name.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          {...register('email')}
                          className="bg-muted"
                          placeholder="seu@email.com"
                        />
                        {errors.email && (
                          <p className="text-sm text-destructive">{errors.email.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Telefone *</Label>
                      <Input
                        id="phone"
                        {...register('phone')}
                        className="bg-muted"
                        placeholder="(XX) XXXXX-XXXX"
                        value={phoneValue || ''}
                        onChange={(e) => setValue('phone', phoneMask(e.target.value))}
                      />
                      {errors.phone && (
                        <p className="text-sm text-destructive">{errors.phone.message}</p>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Produto *</Label>
                        <Controller
                          name="product_id"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={isLoadingData}>
                              <SelectTrigger className="bg-muted">
                                <SelectValue placeholder={isLoadingData ? 'Carregando...' : 'Selecione'} />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.product_id && (
                          <p className="text-sm text-destructive">{errors.product_id.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>Tipo de dificuldade *</Label>
                        <Controller
                          name="category_id"
                          control={control}
                          render={({ field }) => (
                            <Select value={field.value} onValueChange={field.onChange} disabled={isLoadingData}>
                              <SelectTrigger className="bg-muted">
                                <SelectValue placeholder={isLoadingData ? 'Carregando...' : 'Selecione'} />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        {errors.category_id && (
                          <p className="text-sm text-destructive">{errors.category_id.message}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Descreva seu problema *</Label>
                      <Textarea
                        id="description"
                        {...register('description')}
                        className="min-h-[120px] bg-muted"
                        placeholder="Descreva com detalhes o que esta acontecendo..."
                      />
                      {errors.description && (
                        <p className="text-sm text-destructive">{errors.description.message}</p>
                      )}
                    </div>

                    <Button type="submit" className="w-full" disabled={isSubmitting || isAiLoading}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Buscando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 h-4 w-4" />
                          Buscar solucao
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary" />
                    {aiName} — Assistente IA
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {aiMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {msg.role === 'ai' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}
                      >
                        {msg.role === 'ai' && (
                          <p className="mb-1 text-xs font-medium text-muted-foreground">
                            {aiName}
                            {msg.confidence != null && (
                              <span className={`ml-2 ${msg.confidence >= 80 ? 'text-green-600' : msg.confidence >= 60 ? 'text-yellow-600' : 'text-red-500'}`}>
                                {msg.confidence}% confianca
                              </span>
                            )}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        {msg.role === 'ai' && !feedbackGiven && i === aiMessages.length - 1 && !isAiLoading && (
                          <div className="mt-2 flex items-center gap-2 border-t border-border/50 pt-2">
                            <span className="text-xs text-muted-foreground">Foi util?</span>
                            <button
                              onClick={() => sendFeedback(true)}
                              className="rounded p-1 text-muted-foreground hover:bg-green-100 hover:text-green-600 transition-colors"
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => sendFeedback(false)}
                              className="rounded p-1 text-muted-foreground hover:bg-red-100 hover:text-red-500 transition-colors"
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                        {msg.role === 'ai' && feedbackGiven && i === aiMessages.length - 1 && (
                          <p className="mt-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                            Obrigado pelo feedback!
                          </p>
                        )}
                      </div>
                      {msg.role === 'user' && (
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  ))}

                  {isAiLoading && (
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div className="rounded-2xl bg-muted px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {!isAiLoading && aiMessages.length > 1 && (
                <Card className="border-border bg-card">
                  <CardContent className="p-4">
                    <p className="mb-3 text-center text-sm text-muted-foreground">
                      Isso resolveu seu problema?
                    </p>
                    <div className="flex gap-3">
                      <Button
                        onClick={handleResolved}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Sim, resolveu!
                      </Button>
                      <Button
                        onClick={handleNotResolved}
                        variant="outline"
                        className="flex-1 border-destructive text-destructive hover:bg-destructive/10"
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Nao, preciso de ajuda
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {step === 'creating' && (
            <motion.div
              key="creating"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center py-12"
            >
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
              <p className="text-lg font-medium">Criando seu ticket...</p>
              <p className="text-sm text-muted-foreground">Aguarde um momento</p>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-border bg-card">
                <CardContent className="flex flex-col items-center p-8 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>

                  {ticketResult ? (
                    <>
                      <h2 className="mb-2 text-2xl font-bold">Ticket criado!</h2>
                      <p className="mb-4 text-muted-foreground">
                        Seu ticket foi criado com sucesso. Voce recebera um email com os detalhes.
                      </p>
                      <div className="mb-6 rounded-lg bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Codigo do ticket</p>
                        <p className="text-2xl font-bold text-primary">
                          {ticketResult.ticket_code}
                        </p>
                      </div>
                      <Button
                        onClick={() =>
                          router.push(`/suporte/ticket/${ticketResult.access_token}`)
                        }
                        className="w-full"
                      >
                        Acompanhar meu ticket
                      </Button>
                    </>
                  ) : (
                    <>
                      <h2 className="mb-2 text-2xl font-bold">Problema resolvido!</h2>
                      <p className="mb-6 text-muted-foreground">
                        Que bom que conseguimos ajudar. Se precisar de algo mais, estamos aqui!
                      </p>
                      <Button onClick={() => router.push('/suporte')} variant="outline">
                        Voltar ao inicio
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
