'use client'

import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { LoadingState } from '@/components/common/LoadingState'
import { Clock, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { PRIORITY_LABELS } from '@/lib/utils/constants'
import type { SlaConfig } from '@/lib/supabase/types'

interface SlaForm {
  priority: string
  first_response_minutes: number
  resolution_minutes: number
  is_active: boolean
}

const DEFAULT_SLA: SlaForm[] = [
  { priority: 'low', first_response_minutes: 480, resolution_minutes: 2880, is_active: true },
  { priority: 'medium', first_response_minutes: 240, resolution_minutes: 1440, is_active: true },
  { priority: 'high', first_response_minutes: 60, resolution_minutes: 480, is_active: true },
  { priority: 'urgent', first_response_minutes: 15, resolution_minutes: 120, is_active: true },
]

function formatMinutes(minutes: number): string {
  if (minutes >= 1440) return `${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h`
  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}min`
  return `${minutes}min`
}

export default function SLASettingsPage() {
  const [configs, setConfigs] = useState<SlaForm[]>(DEFAULT_SLA)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sla-configs')
      const json = await res.json()
      if (json.success && json.data.length > 0) {
        const merged = DEFAULT_SLA.map((def) => {
          const existing = json.data.find((c: SlaConfig) => c.priority === def.priority)
          return existing
            ? {
                priority: existing.priority,
                first_response_minutes: existing.first_response_minutes,
                resolution_minutes: existing.resolution_minutes,
                is_active: existing.is_active,
              }
            : def
        })
        setConfigs(merged)
      }
    } catch {
      toast.error('Erro ao carregar configuracoes')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConfigs()
  }, [loadConfigs])

  function updateConfig(priority: string, field: keyof SlaForm, value: number | boolean) {
    setConfigs((prev) =>
      prev.map((c) => (c.priority === priority ? { ...c, [field]: value } : c))
    )
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/sla-configs', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      toast.success('Configuracoes de SLA salvas')
    } catch {
      toast.error('Erro ao salvar configuracoes')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <Header title="SLA" />
      <div className="p-6">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Configuracoes de SLA
                </CardTitle>
                <CardDescription className="mt-1">
                  Defina os tempos de resposta e resolucao para cada prioridade
                </CardDescription>
              </div>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Salvar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState />
            ) : (
              <div className="space-y-6">
                {configs.map((config) => (
                  <div
                    key={config.priority}
                    className={`rounded-lg border p-4 transition-colors ${
                      config.is_active
                        ? 'border-border bg-card'
                        : 'border-border/50 bg-muted/20 opacity-60'
                    }`}
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">
                          {PRIORITY_LABELS[config.priority]}
                        </h3>
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                            config.is_active
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-zinc-500/20 text-zinc-400'
                          }`}
                        >
                          {config.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                      <Switch
                        checked={config.is_active}
                        onCheckedChange={(v) => updateConfig(config.priority, 'is_active', v)}
                      />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Primeira resposta (minutos)</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min={1}
                            value={config.first_response_minutes}
                            onChange={(e) =>
                              updateConfig(config.priority, 'first_response_minutes', parseInt(e.target.value) || 1)
                            }
                            className="bg-muted"
                          />
                          <span className="whitespace-nowrap text-sm text-muted-foreground">
                            = {formatMinutes(config.first_response_minutes)}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Resolucao (minutos)</Label>
                        <div className="flex items-center gap-3">
                          <Input
                            type="number"
                            min={1}
                            value={config.resolution_minutes}
                            onChange={(e) =>
                              updateConfig(config.priority, 'resolution_minutes', parseInt(e.target.value) || 1)
                            }
                            className="bg-muted"
                          />
                          <span className="whitespace-nowrap text-sm text-muted-foreground">
                            = {formatMinutes(config.resolution_minutes)}
                          </span>
                        </div>
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
