'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema, type CategoryFormData } from '@/lib/utils/validation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
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
import { Plus, Pencil, Trash2, FolderOpen, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'
import { useConfirmDialog } from '@/components/common/ConfirmDialog'
import type { Category } from '@/lib/supabase/types'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const { confirm, dialog: confirmDialog } = useConfirmDialog()

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { is_active: true },
  })

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories')
      const json = await res.json()
      if (json.success) setCategories(json.data)
    } catch {
      toast.error('Erro ao carregar categorias')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadCategories()
  }, [loadCategories])

  function openCreate() {
    setEditingCategory(null)
    reset({ name: '', description: '', icon: '', color: '#00B8D9', is_active: true })
    setDialogOpen(true)
  }

  function openEdit(category: Category) {
    setEditingCategory(category)
    reset({
      name: category.name,
      description: category.description || '',
      icon: category.icon || '',
      color: category.color || '#00B8D9',
      is_active: category.is_active,
    })
    setDialogOpen(true)
  }

  async function onSubmit(data: CategoryFormData) {
    setIsSaving(true)
    try {
      const url = editingCategory
        ? `/api/admin/categories/${editingCategory.id}`
        : '/api/admin/categories'
      const method = editingCategory ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      toast.success(editingCategory ? 'Categoria atualizada' : 'Categoria criada')
      setDialogOpen(false)
      loadCategories()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar categoria')
    } finally {
      setIsSaving(false)
    }
  }

  function handleDelete(id: string) {
    confirm({
      title: 'Desativar categoria',
      description: 'Tem certeza que deseja desativar esta categoria?',
      confirmLabel: 'Desativar',
      variant: 'destructive',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/categories/${id}`, { method: 'DELETE' })
          const json = await res.json()
          if (!json.success) throw new Error(json.error)
          toast.success('Categoria desativada')
          loadCategories()
        } catch {
          toast.error('Erro ao desativar categoria')
        }
      },
    })
  }

  return (
    <>
      {confirmDialog}
      <Header title="Categorias" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Categorias cadastradas</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Categoria
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" {...register('name')} className="bg-muted" />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Descricao</Label>
                    <Textarea
                      id="description"
                      {...register('description')}
                      className="bg-muted"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="icon">Icone (Lucide)</Label>
                      <Input
                        id="icon"
                        placeholder="ex: HelpCircle"
                        {...register('icon')}
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">Cor</Label>
                      <div className="flex gap-2">
                        <Input
                          id="color"
                          type="color"
                          {...register('color')}
                          className="h-10 w-14 cursor-pointer bg-muted p-1"
                        />
                        <Input
                          {...register('color')}
                          placeholder="#00B8D9"
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      defaultChecked={editingCategory?.is_active ?? true}
                      onCheckedChange={(v) => setValue('is_active', v)}
                    />
                    <Label htmlFor="is_active">Ativa</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    {editingCategory ? 'Salvar' : 'Criar'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState />
            ) : categories.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                title="Nenhuma categoria cadastrada"
                description="Crie sua primeira categoria para organizar os tickets"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cor</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Descricao</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: category.color || '#6B7280' }}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            category.is_active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-500/20 text-zinc-300'
                          }`}
                        >
                          {category.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(category.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(category.id)}
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
