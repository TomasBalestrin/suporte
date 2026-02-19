'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { EmptyState } from '@/components/common/EmptyState'
import { LoadingState } from '@/components/common/LoadingState'
import { Plus, Zap, Loader2, Trash2, Pencil, Play, Pause } from 'lucide-react'
import { toast } from 'sonner'

interface AutomationRule {
  id: string
  name: string
  description: string | null
  trigger_type: string
  conditions: Record<string, unknown>
  actions: Record<string, unknown>
  is_active: boolean
  created_at: string
}

const TRIGGER_TYPES: Record<string, string> = {
  ticket_created: 'Ticket criado',
  ticket_updated: 'Ticket atualizado',
  status_changed: 'Status alterado',
  sla_approaching: 'SLA proximo',
  sla_breached: 'SLA violado',
  no_response: 'Sem resposta',
}

const ACTION_TYPES: Record<string, string> = {
  assign_agent: 'Atribuir agente',
  change_priority: 'Alterar prioridade',
  change_status: 'Alterar status',
  send_notification: 'Enviar notificacao',
  add_tag: 'Adicionar tag',
}

export default function AutomationsSettingsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AutomationRule | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formTrigger, setFormTrigger] = useState('ticket_created')
  const [formConditionField, setFormConditionField] = useState('')
  const [formConditionValue, setFormConditionValue] = useState('')
  const [formActionType, setFormActionType] = useState('assign_agent')
  const [formActionValue, setFormActionValue] = useState('')

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/automations')
      const json = await res.json()
      if (json.success) setRules(json.data || [])
    } catch {
      toast.error('Erro ao carregar automacoes')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadRules()
  }, [loadRules])

  function openCreate() {
    setEditing(null)
    setFormName('')
    setFormDescription('')
    setFormTrigger('ticket_created')
    setFormConditionField('')
    setFormConditionValue('')
    setFormActionType('assign_agent')
    setFormActionValue('')
    setDialogOpen(true)
  }

  function openEdit(rule: AutomationRule) {
    setEditing(rule)
    setFormName(rule.name)
    setFormDescription(rule.description || '')
    setFormTrigger(rule.trigger_type)
    const cond = rule.conditions || {}
    const condKeys = Object.keys(cond)
    setFormConditionField(condKeys[0] || '')
    setFormConditionValue(condKeys[0] ? String((cond as Record<string, unknown>)[condKeys[0]]) : '')
    const act = rule.actions || {}
    const actType = (act as Record<string, unknown>).type as string || 'assign_agent'
    setFormActionType(actType)
    setFormActionValue((act as Record<string, unknown>).value as string || '')
    setDialogOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)

    const conditions: Record<string, unknown> = {}
    if (formConditionField && formConditionValue) {
      conditions[formConditionField] = formConditionValue
    }
    const actions = { type: formActionType, value: formActionValue }

    try {
      if (editing) {
        const res = await fetch(`/api/admin/automations/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            description: formDescription || null,
            trigger_type: formTrigger,
            conditions,
            actions,
          }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        toast.success('Automacao atualizada')
      } else {
        const res = await fetch('/api/admin/automations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName,
            description: formDescription || null,
            trigger_type: formTrigger,
            conditions,
            actions,
          }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        toast.success('Automacao criada')
      }

      setDialogOpen(false)
      loadRules()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar')
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleActive(rule: AutomationRule) {
    try {
      const res = await fetch(`/api/admin/automations/${rule.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !rule.is_active }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setRules((prev) =>
        prev.map((r) => (r.id === rule.id ? { ...r, is_active: !r.is_active } : r))
      )
      toast.success(rule.is_active ? 'Automacao desativada' : 'Automacao ativada')
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir esta automacao?')) return
    try {
      const res = await fetch(`/api/admin/automations/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Automacao excluida')
      loadRules()
    } catch {
      toast.error('Erro ao excluir')
    }
  }

  return (
    <>
      <Header title="Automacoes" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Regras de Automacao
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Configure acoes automaticas baseadas em gatilhos
              </p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Regra
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>
                    {editing ? 'Editar Automacao' : 'Nova Automacao'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome</Label>
                    <Input
                      id="name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="bg-muted"
                      placeholder="Ex: Atribuir tickets urgentes"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desc">Descricao</Label>
                    <Textarea
                      id="desc"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      className="bg-muted"
                      placeholder="Descricao opcional"
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Gatilho</Label>
                    <Select value={formTrigger} onValueChange={setFormTrigger}>
                      <SelectTrigger className="bg-muted">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(TRIGGER_TYPES).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <p className="text-sm font-medium">Condicao (opcional)</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Campo</Label>
                        <Input
                          value={formConditionField}
                          onChange={(e) => setFormConditionField(e.target.value)}
                          className="bg-muted"
                          placeholder="Ex: priority"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Valor</Label>
                        <Input
                          value={formConditionValue}
                          onChange={(e) => setFormConditionValue(e.target.value)}
                          className="bg-muted"
                          placeholder="Ex: urgent"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border p-3 space-y-3">
                    <p className="text-sm font-medium">Acao</p>
                    <div className="space-y-2">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={formActionType} onValueChange={setFormActionType}>
                        <SelectTrigger className="bg-muted">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(ACTION_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Valor</Label>
                      <Input
                        value={formActionValue}
                        onChange={(e) => setFormActionValue(e.target.value)}
                        className="bg-muted"
                        placeholder="Ex: agent-id ou high"
                        required
                      />
                    </div>
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
            ) : rules.length === 0 ? (
              <EmptyState
                icon={Zap}
                title="Nenhuma automacao cadastrada"
                description="Crie regras para automatizar acoes no sistema"
              />
            ) : (
              <div className="space-y-4">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`rounded-lg border p-4 transition-colors ${
                      rule.is_active
                        ? 'border-border bg-card'
                        : 'border-border/50 bg-muted/20 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold">{rule.name}</h3>
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                              rule.is_active
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-zinc-500/20 text-zinc-400'
                            }`}
                          >
                            {rule.is_active ? 'Ativo' : 'Inativo'}
                          </span>
                        </div>
                        {rule.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {rule.description}
                          </p>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs text-primary">
                            Gatilho: {TRIGGER_TYPES[rule.trigger_type] || rule.trigger_type}
                          </span>
                          {rule.actions && (rule.actions as Record<string, unknown>).type ? (
                            <span className="inline-flex items-center gap-1 rounded bg-secondary/10 px-2 py-1 text-xs text-secondary">
                              Acao: {ACTION_TYPES[(rule.actions as Record<string, unknown>).type as string] || String((rule.actions as Record<string, unknown>).type)}
                            </span>
                          ) : null}
                          {rule.conditions && Object.keys(rule.conditions).length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                              Condicao: {Object.entries(rule.conditions).map(([k, v]) => `${k}=${v}`).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleActive(rule)}
                          title={rule.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {rule.is_active ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(rule)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(rule.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
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
