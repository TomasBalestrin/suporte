'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { quickReplySchema, type QuickReplyFormData } from '@/lib/utils/validation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Plus, Pencil, Trash2, MessageSquareText, Loader2, Copy } from 'lucide-react'
import { toast } from 'sonner'
import type { QuickReply } from '@/lib/supabase/types'

export default function QuickRepliesSettingsPage() {
  const [replies, setReplies] = useState<QuickReply[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<QuickReply | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<QuickReplyFormData>({
    resolver: zodResolver(quickReplySchema),
    defaultValues: { is_active: true },
  })

  const loadReplies = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/quick-replies')
      const json = await res.json()
      if (json.success) setReplies(json.data)
    } catch {
      toast.error('Erro ao carregar respostas rapidas')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadReplies()
  }, [loadReplies])

  function openCreate() {
    setEditing(null)
    reset({ shortcut: '', title: '', content: '', category: '', is_active: true })
    setDialogOpen(true)
  }

  function openEdit(reply: QuickReply) {
    setEditing(reply)
    reset({
      shortcut: reply.shortcut,
      title: reply.title,
      content: reply.content,
      category: reply.category || '',
      is_active: reply.is_active,
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: QuickReplyFormData) {
    setIsSaving(true)
    try {
      const url = editing
        ? `/api/admin/quick-replies/${editing.id}`
        : '/api/admin/quick-replies'
      const method = editing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      toast.success(editing ? 'Resposta atualizada' : 'Resposta criada')
      setDialogOpen(false)
      loadReplies()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja desativar esta resposta rapida?')) return
    try {
      const res = await fetch(`/api/admin/quick-replies/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Resposta desativada')
      loadReplies()
    } catch {
      toast.error('Erro ao desativar resposta')
    }
  }

  const filtered = replies.filter(
    (r) =>
      r.shortcut.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Header title="Respostas Rapidas" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Respostas Rapidas</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Use o atalho <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">/</kbd> no chat para inserir respostas rapidas
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 bg-muted"
              />
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={openCreate}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Resposta
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {editing ? 'Editar Resposta Rapida' : 'Nova Resposta Rapida'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="shortcut">Atalho (sem /)</Label>
                        <Input id="shortcut" {...register('shortcut')} className="bg-muted font-mono" placeholder="saudacao" />
                        {errors.shortcut && (
                          <p className="text-sm text-destructive">{errors.shortcut.message}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Input id="category" {...register('category')} className="bg-muted" placeholder="Geral" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title">Titulo</Label>
                      <Input id="title" {...register('title')} className="bg-muted" placeholder="Saudacao inicial" />
                      {errors.title && (
                        <p className="text-sm text-destructive">{errors.title.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="content">Conteudo</Label>
                      <Textarea
                        id="content"
                        {...register('content')}
                        className="min-h-[120px] bg-muted"
                        placeholder="Ola! Como posso te ajudar hoje?"
                      />
                      {errors.content && (
                        <p className="text-sm text-destructive">{errors.content.message}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_active"
                        defaultChecked={editing?.is_active ?? true}
                        onCheckedChange={(v) => setValue('is_active', v)}
                      />
                      <Label htmlFor="is_active">Ativa</Label>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSaving}>
                      {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {editing ? 'Salvar' : 'Criar'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState />
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={MessageSquareText}
                title={search ? 'Nenhuma resposta encontrada' : 'Nenhuma resposta cadastrada'}
                description={search ? 'Tente outra busca' : 'Crie sua primeira resposta rapida'}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Atalho</TableHead>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Usos</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((reply) => (
                    <TableRow key={reply.id}>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono text-primary">
                          /{reply.shortcut}
                        </code>
                      </TableCell>
                      <TableCell className="font-medium">{reply.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {reply.category || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{reply.usage_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            reply.is_active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-500/20 text-zinc-400'
                          }`}
                        >
                          {reply.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Copiar conteudo"
                            onClick={() => {
                              navigator.clipboard.writeText(reply.content)
                              toast.success('Copiado!')
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(reply)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(reply.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
