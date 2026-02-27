'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingState } from '@/components/common/LoadingState'
import { EmptyState } from '@/components/common/EmptyState'
import { HelpCircle, Check, Trash2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { adminFetch } from '@/lib/fetch'
import { formatDate } from '@/lib/utils/format'
import type { AiUnansweredQuestion } from '@/lib/supabase/types'

export default function UnansweredPage() {
  const [questions, setQuestions] = useState<AiUnansweredQuestion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending')
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })

  const loadQuestions = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        resolved: tab === 'resolved' ? 'true' : 'false',
        page: String(pagination.page),
      })
      const res = await adminFetch(`/api/admin/unanswered?${params}`)
      const json = await res.json()
      if (json.success) {
        setQuestions(json.data)
        setPagination((p) => ({ ...p, ...json.pagination }))
      }
    } catch {
      toast.error('Erro ao carregar perguntas')
    } finally {
      setIsLoading(false)
    }
  }, [tab, pagination.page])

  useEffect(() => {
    setIsLoading(true)
    loadQuestions()
  }, [loadQuestions])

  async function markResolved(id: string) {
    try {
      const res = await adminFetch(`/api/admin/unanswered/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolved: true }),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Marcada como resolvida')
        loadQuestions()
      }
    } catch {
      toast.error('Erro ao atualizar')
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await adminFetch(`/api/admin/unanswered/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Pergunta removida')
        loadQuestions()
      }
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <>
      <Header title="Perguntas Sem Resposta" />
      <div className="p-6">
        <div className="mb-6">
          <p className="mb-4 text-sm text-muted-foreground">
            Perguntas que a IA não conseguiu responder. Use-as para melhorar a base de conhecimento.
          </p>
          <Tabs value={tab} onValueChange={(v) => {
            setTab(v as 'pending' | 'resolved')
            setPagination((p) => ({ ...p, page: 1 }))
          }}>
            <TabsList>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="resolved">Resolvidas</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <LoadingState message="Carregando perguntas..." />
        ) : questions.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-12">
              <EmptyState
                icon={tab === 'pending' ? HelpCircle : Check}
                title={tab === 'pending' ? 'Nenhuma pergunta pendente' : 'Nenhuma pergunta resolvida'}
                description={
                  tab === 'pending'
                    ? 'Quando a IA não conseguir responder, as perguntas aparecerão aqui.'
                    : 'Perguntas marcadas como resolvidas aparecerão aqui.'
                }
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pergunta</TableHead>
                    <TableHead>Similaridade</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="w-[120px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q) => (
                    <TableRow key={q.id}>
                      <TableCell>
                        <p className="max-w-[400px] text-sm">{q.question}</p>
                        {q.context && (
                          <p className="mt-1 max-w-[400px] text-xs text-muted-foreground truncate">
                            Contexto: {q.context}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {q.similarity_score ? (
                          <Badge
                            variant="outline"
                            className={
                              q.similarity_score >= 0.5
                                ? 'border-yellow-500/50 text-yellow-400'
                                : 'border-red-500/50 text-red-400'
                            }
                          >
                            {(q.similarity_score * 100).toFixed(0)}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(q.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {tab === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => markResolved(q.id)}
                              title="Marcar como resolvida"
                            >
                              <Check className="h-4 w-4 text-green-400" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(q.id)}
                            className="text-destructive hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {pagination.pages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{pagination.total} pergunta{pagination.total !== 1 ? 's' : ''}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm" disabled={pagination.page >= pagination.pages} onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}>
                    Próximo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
