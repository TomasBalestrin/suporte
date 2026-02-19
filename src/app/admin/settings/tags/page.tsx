'use client'

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tagSchema, type TagFormData } from '@/lib/utils/validation'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Plus, Pencil, Trash2, TagIcon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Tag } from '@/lib/supabase/types'

const PRESET_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899']

export default function TagsSettingsPage() {
  const [tags, setTags] = useState<Tag[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<TagFormData>({
    resolver: zodResolver(tagSchema),
  })

  const loadTags = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/tags')
      const json = await res.json()
      if (json.success) setTags(json.data)
    } catch {
      toast.error('Erro ao carregar tags')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTags()
  }, [loadTags])

  function openCreate() {
    setEditing(null)
    setSelectedColor(PRESET_COLORS[0])
    reset({ name: '', color: PRESET_COLORS[0] })
    setDialogOpen(true)
  }

  function openEdit(tag: Tag) {
    setEditing(tag)
    setSelectedColor(tag.color)
    reset({ name: tag.name, color: tag.color })
    setDialogOpen(true)
  }

  async function onSubmit(data: TagFormData) {
    setIsSaving(true)
    try {
      const url = editing ? `/api/admin/tags/${editing.id}` : '/api/admin/tags'
      const method = editing ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      toast.success(editing ? 'Tag atualizada' : 'Tag criada')
      setDialogOpen(false)
      loadTags()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar tag')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta tag? Ela sera removida de todos os tickets.')) return
    try {
      const res = await fetch(`/api/admin/tags/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Tag excluida')
      loadTags()
    } catch {
      toast.error('Erro ao excluir tag')
    }
  }

  return (
    <>
      <Header title="Tags" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Tags</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Crie tags para organizar e categorizar tickets
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Tag
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editing ? 'Editar Tag' : 'Nova Tag'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input id="name" {...register('name')} className="bg-muted" placeholder="Bug" />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Cor</Label>
                    <div className="flex flex-wrap gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => {
                            setSelectedColor(color)
                            setValue('color', color)
                          }}
                          className={`h-8 w-8 rounded-full border-2 transition-transform hover:scale-110 ${
                            selectedColor === color ? 'border-white scale-110' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <Input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => {
                        setSelectedColor(e.target.value)
                        setValue('color', e.target.value)
                      }}
                      className="h-10 w-20 cursor-pointer bg-muted p-1"
                    />
                    {errors.color && (
                      <p className="text-sm text-destructive">{errors.color.message}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Preview:</Label>
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: selectedColor }}
                    >
                      {editing?.name || 'Tag'}
                    </span>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {editing ? 'Salvar' : 'Criar'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState />
            ) : tags.length === 0 ? (
              <EmptyState
                icon={TagIcon}
                title="Nenhuma tag cadastrada"
                description="Crie tags para organizar seus tickets"
              />
            ) : (
              <div className="flex flex-wrap gap-3">
                {tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="group flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-muted/50"
                  >
                    <span
                      className="inline-flex rounded-full px-3 py-1 text-xs font-medium text-white"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.name}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => openEdit(tag)}
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(tag.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
