'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle2, AlertTriangle, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { adminFetch } from '@/lib/fetch'

/**
 * Fatia 5 — Observability UI da knowledge base.
 *
 * Banner no topo de /admin/settings/ai/knowledge-base mostra saúde geral
 * + última sync do pipeline vault Obsidian → Action → embedding.
 *
 * Pull único no mount (não polling — operador refresha página se quiser fresh data).
 * Endpoint: GET /api/admin/kb/health (PR-2 A Lenda + Δ13 lib/kb-health.ts).
 */

interface HealthData {
  articles_with_null_embedding: number
  total_articles: number
  articles_from_vault: number
  articles_legacy_no_slug: number
  last_successful_sync: string | null
  hours_since_last_sync: number | null
  health_status: 'healthy' | 'degraded' | 'critical'
}

const VAULT_REPO_URL = 'https://github.com/eduardotkfm-maker/sofia-knowledge-base'

export function HealthBanner() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await adminFetch('/api/admin/kb/health')
        const json = await res.json()
        if (cancelled) return
        if (json.success) setData(json.data)
        else setError(json.error || 'Falha ao consultar saúde')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erro de rede')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando saúde da KB...
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-yellow-500/40 bg-yellow-500/5">
        <CardContent className="flex items-center gap-3 p-4 text-sm">
          <AlertTriangle className="h-4 w-4 text-yellow-400" />
          <span>Não foi possível consultar saúde da KB ({error || 'sem dados'}).</span>
        </CardContent>
      </Card>
    )
  }

  const config = {
    healthy: {
      icon: CheckCircle2,
      color: 'text-green-400',
      border: 'border-green-500/40',
      bg: 'bg-green-500/5',
      label: 'Saúde: OK',
    },
    degraded: {
      icon: AlertTriangle,
      color: 'text-yellow-400',
      border: 'border-yellow-500/40',
      bg: 'bg-yellow-500/5',
      label: 'Saúde: Degradada',
    },
    critical: {
      icon: XCircle,
      color: 'text-red-400',
      border: 'border-red-500/40',
      bg: 'bg-red-500/5',
      label: 'Saúde: Crítica',
    },
  }[data.health_status]
  const Icon = config.icon

  const lastSync = data.last_successful_sync
    ? formatRelative(data.hours_since_last_sync)
    : 'nunca (pipeline ainda não rodou pela 1ª vez)'

  return (
    <Card className={`${config.border} ${config.bg}`}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Icon className={`mt-0.5 h-5 w-5 ${config.color}`} />
            <div className="space-y-1">
              <p className="font-medium">{config.label}</p>
              <div className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                <span>
                  Total ativos: <strong className="text-foreground">{data.total_articles}</strong>
                </span>
                <span>
                  Do vault: <strong className="text-foreground">{data.articles_from_vault}</strong>{' '}
                  · Legacy (sem slug): <strong className="text-foreground">{data.articles_legacy_no_slug}</strong>
                </span>
                <span>
                  Sem embedding:{' '}
                  <strong className={data.articles_with_null_embedding > 0 ? 'text-yellow-400' : 'text-foreground'}>
                    {data.articles_with_null_embedding}
                  </strong>
                </span>
                <span>
                  Última sync (vault): <strong className="text-foreground">{lastSync}</strong>
                </span>
              </div>
            </div>
          </div>
          <a
            href={VAULT_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground"
          >
            Vault repo
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

function formatRelative(hours: number | null): string {
  if (hours === null) return 'nunca'
  if (hours < 1) return `${Math.round(hours * 60)} min atrás`
  if (hours < 24) return `${hours.toFixed(1)} h atrás`
  const days = Math.floor(hours / 24)
  return `${days} ${days === 1 ? 'dia' : 'dias'} atrás`
}
