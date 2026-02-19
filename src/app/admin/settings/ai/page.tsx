'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Slider } from '@/components/ui/slider'
import { LoadingState } from '@/components/common/LoadingState'
import { Brain, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'

export default function AISettingsPage() {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    fetch('/api/admin/ai-config')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setConfig(json.data)
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function handleSave() {
    setIsSaving(true)
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      const json = await res.json()
      if (json.success) {
        toast.success('Configuracoes salvas')
      } else {
        toast.error(json.error)
      }
    } catch {
      toast.error('Erro ao salvar configuracoes')
    } finally {
      setIsSaving(false)
    }
  }

  function updateConfig(key: string, value: string) {
    setConfig((prev) => ({ ...prev, [key]: value }))
  }

  if (isLoading) {
    return (
      <>
        <Header title="Configuracoes de IA" />
        <div className="p-6">
          <LoadingState message="Carregando configuracoes..." />
        </div>
      </>
    )
  }

  return (
    <>
      <Header title="Configuracoes de IA" />
      <div className="mx-auto max-w-3xl p-6 space-y-6">
        {/* General */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-primary" />
              Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="font-medium">IA habilitada</Label>
                <p className="text-xs text-muted-foreground">
                  Ativar ou desativar a IA no portal de suporte
                </p>
              </div>
              <Switch
                checked={config.ai_enabled === 'true'}
                onCheckedChange={(v) => updateConfig('ai_enabled', v ? 'true' : 'false')}
              />
            </div>
            <div>
              <Label>Nome da IA</Label>
              <Input
                value={config.ai_name || ''}
                onChange={(e) => updateConfig('ai_name', e.target.value)}
                placeholder="Sofia"
                className="mt-1 bg-muted"
              />
            </div>
          </CardContent>
        </Card>

        {/* System Prompt */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Prompt do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.system_prompt || ''}
              onChange={(e) => updateConfig('system_prompt', e.target.value)}
              placeholder="Instrucoes para a IA..."
              className="min-h-[150px] bg-muted"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Define o comportamento da IA. Explique o tom, regras e limites.
            </p>
          </CardContent>
        </Card>

        {/* Parameters */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Parametros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex items-center justify-between">
                <Label>Temperatura</Label>
                <span className="text-sm font-mono text-primary">
                  {config.temperature || '0.3'}
                </span>
              </div>
              <Slider
                value={[parseFloat(config.temperature || '0.3')]}
                onValueChange={([v]) => updateConfig('temperature', v.toFixed(1))}
                min={0}
                max={1}
                step={0.1}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Menor = mais preciso e consistente. Maior = mais criativo.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <Label>Limiar de confianca</Label>
                <span className="text-sm font-mono text-primary">
                  {config.confidence_threshold || '0.7'}
                </span>
              </div>
              <Slider
                value={[parseFloat(config.confidence_threshold || '0.7')]}
                onValueChange={([v]) => updateConfig('confidence_threshold', v.toFixed(1))}
                min={0.1}
                max={1}
                step={0.1}
                className="mt-2"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Similaridade minima para considerar um artigo relevante (0.7 recomendado).
              </p>
            </div>

            <div>
              <Label>Max tokens</Label>
              <Input
                type="number"
                value={config.max_tokens || '500'}
                onChange={(e) => updateConfig('max_tokens', e.target.value)}
                className="mt-1 bg-muted"
                min={100}
                max={2000}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Tamanho maximo da resposta da IA (100-2000).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Fallback Message */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg">Mensagem de fallback</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.fallback_message || ''}
              onChange={(e) => updateConfig('fallback_message', e.target.value)}
              placeholder="Mensagem quando a IA nao encontra resposta..."
              className="min-h-[80px] bg-muted"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Exibida quando a IA nao encontra artigos relevantes na base.
            </p>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving} size="lg">
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Salvar configuracoes
          </Button>
        </div>
      </div>
    </>
  )
}
