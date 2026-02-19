'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LoadingState } from '@/components/common/LoadingState'
import { EmptyState } from '@/components/common/EmptyState'
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  BookOpen,
  Loader2,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'
import type { KnowledgeBaseArticle, Product } from '@/lib/supabase/types'

interface ArticleForm {
  title: string
  content: string
  category: string
  product_id: string
  is_active: boolean
}

const emptyForm: ArticleForm = {
  title: '',
  content: '',
  category: '',
  product_id: '',
  is_active: true,
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<KnowledgeBaseArticle[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ArticleForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 })

  const loadArticles = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: String(pagination.page) })
      if (search) params.set('search', search)
      const res = await fetch(`/api/admin/knowledge-base?${params}`)
      const json = await res.json()
      if (json.success) {
        setArticles(json.data)
        setPagination((p) => ({ ...p, ...json.pagination }))
      }
    } catch {
      toast.error('Erro ao carregar artigos')
    } finally {
      setIsLoading(false)
    }
  }, [search, pagination.page])

  useEffect(() => {
    loadArticles()
  }, [loadArticles])

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setProducts(json.data)
      })
  }, [])

  function openNew() {
    setForm(emptyForm)
    setEditingId(null)
    setDialogOpen(true)
  }

  function openEdit(article: KnowledgeBaseArticle) {
    setForm({
      title: article.title,
      content: article.content,
      category: article.category || '',
      product_id: article.product_id || '',
      is_active: article.is_active,
    })
    setEditingId(article.id)
    setDialogOpen(true)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error('Titulo e conteudo sao obrigatorios')
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        title: form.title,
        content: form.content,
        category: form.category || null,
        product_id: form.product_id || null,
        is_active: form.is_active,
      }

      const url = editingId
        ? `/api/admin/knowledge-base/${editingId}`
        : '/api/admin/knowledge-base'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()

      if (json.success) {
        toast.success(editingId ? 'Artigo atualizado' : 'Artigo criado')
        setDialogOpen(false)
        loadArticles()
      } else {
        toast.error(json.error)
      }
    } catch {
      toast.error('Erro ao salvar artigo')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este artigo?')) return

    try {
      const res = await fetch(`/api/admin/knowledge-base/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('Artigo excluido')
        loadArticles()
      }
    } catch {
      toast.error('Erro ao excluir artigo')
    }
  }

  return (
    <>
      <Header title="Base de Conhecimento" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar artigos..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPagination((p) => ({ ...p, page: 1 }))
              }}
              className="bg-muted pl-10"
            />
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" />
            Novo artigo
          </Button>
        </div>

        {isLoading ? (
          <LoadingState message="Carregando artigos..." />
        ) : articles.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="p-12">
              <EmptyState
                icon={BookOpen}
                title="Nenhum artigo"
                description={search ? 'Nenhum artigo encontrado para a busca.' : 'Comece adicionando artigos para a IA usar nas respostas.'}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-border bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Titulo</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-center">Uso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Atualizado</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => {
                    const product = (article as unknown as { product?: { name: string } }).product
                    return (
                      <TableRow key={article.id}>
                        <TableCell>
                          <div className="max-w-[300px]">
                            <p className="font-medium truncate">{article.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {article.content.substring(0, 80)}...
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {article.category ? (
                            <Badge variant="outline">{article.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {product?.name || '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <BarChart3 className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{article.usage_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              article.is_active
                                ? 'border-green-500/50 text-green-400'
                                : 'border-zinc-500/50 text-zinc-400'
                            }
                          >
                            {article.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(article.updated_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEdit(article)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(article.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Card>

            {pagination.pages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {pagination.total} artigo{pagination.total !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page <= 1}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={pagination.page >= pagination.pages}
                    onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                  >
                    Proximo
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Article Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? 'Editar artigo' : 'Novo artigo'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Titulo</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Como resetar a senha"
                className="mt-1 bg-muted"
              />
            </div>
            <div>
              <Label>Conteudo</Label>
              <Textarea
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
                placeholder="Escreva o conteudo do artigo. Quanto mais detalhado, melhor sera a resposta da IA."
                className="mt-1 min-h-[200px] bg-muted"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ex: Conta, Pagamento"
                  className="mt-1 bg-muted"
                />
              </div>
              <div>
                <Label>Produto</Label>
                <Select
                  value={form.product_id || 'none'}
                  onValueChange={(v) => setForm({ ...form, product_id: v === 'none' ? '' : v })}
                >
                  <SelectTrigger className="mt-1 bg-muted">
                    <SelectValue placeholder="Nenhum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum (geral)</SelectItem>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="active"
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <Label htmlFor="active">Artigo ativo</Label>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Salvar' : 'Criar artigo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
