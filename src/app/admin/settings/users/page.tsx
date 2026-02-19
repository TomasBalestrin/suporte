'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Plus, Pencil, Trash2, Users, Loader2, Shield, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'
import type { User as UserType } from '@/lib/supabase/types'

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<UserType[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<UserType | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Form state (not using react-hook-form because of password field that's only for create)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formRole, setFormRole] = useState<'admin' | 'agent'>('agent')
  const [formActive, setFormActive] = useState(true)

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (json.success) setUsers(json.data)
    } catch {
      toast.error('Erro ao carregar usuarios')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  function openCreate() {
    setEditing(null)
    setFormName('')
    setFormEmail('')
    setFormPassword('')
    setFormRole('agent')
    setFormActive(true)
    setDialogOpen(true)
  }

  function openEdit(user: UserType) {
    setEditing(user)
    setFormName(user.name)
    setFormEmail(user.email)
    setFormPassword('')
    setFormRole(user.role)
    setFormActive(user.is_active)
    setDialogOpen(true)
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    try {
      if (editing) {
        const res = await fetch(`/api/admin/users/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName, role: formRole, is_active: formActive }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        toast.success('Usuario atualizado')
      } else {
        if (!formPassword || formPassword.length < 6) {
          toast.error('Senha deve ter pelo menos 6 caracteres')
          setIsSaving(false)
          return
        }
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            email: formEmail,
            password: formPassword,
            role: formRole,
          }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        toast.success('Usuario criado')
      }

      setDialogOpen(false)
      loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja desativar este usuario?')) return
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Usuario desativado')
      loadUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao desativar')
    }
  }

  return (
    <>
      <Header title="Usuarios" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Usuarios do Sistema</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Gerencie agentes e administradores
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editing ? 'Editar Usuario' : 'Novo Usuario'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmitForm} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="bg-muted"
                      required
                    />
                  </div>
                  {!editing && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formEmail}
                          onChange={(e) => setFormEmail(e.target.value)}
                          className="bg-muted"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Senha</Label>
                        <Input
                          id="password"
                          type="password"
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          className="bg-muted"
                          placeholder="Minimo 6 caracteres"
                          required
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Perfil</Label>
                    <Select value={formRole} onValueChange={(v) => setFormRole(v as 'admin' | 'agent')}>
                      <SelectTrigger className="bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agent">Agente</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {editing && (
                    <div className="flex items-center gap-2">
                      <Switch
                        id="is_active"
                        checked={formActive}
                        onCheckedChange={setFormActive}
                      />
                      <Label htmlFor="is_active">Ativo</Label>
                    </div>
                  )}
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
            ) : users.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nenhum usuario cadastrado"
                description="Crie o primeiro usuario do sistema"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Acoes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20 text-xs font-medium text-primary">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          {u.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1">
                          {u.role === 'admin' ? (
                            <ShieldCheck className="h-3 w-3" />
                          ) : (
                            <Shield className="h-3 w-3" />
                          )}
                          {u.role === 'admin' ? 'Admin' : 'Agente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            u.is_active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-500/20 text-zinc-400'
                          }`}
                        >
                          {u.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(u.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(u)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(u.id)}
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
